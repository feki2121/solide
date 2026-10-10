import { prisma } from './prisma'

// ───────────── Constantes ─────────────

export const CRITERIA = [
  'technique',
  'vocabulary',
  'originality',
  'musicality',
  'execution',
] as const

/** Poids par défaut — utilisé si un critère n'a pas de poids en base. */
export const CRITERION_WEIGHT = 0.2

/** Optionnel : plus utilisé pour valider, mais conservé pour info. */
export const JUDGES_PER_ROUND = 3
export const VOTES_PER_ROUND = CRITERIA.length * JUDGES_PER_ROUND

export type Score = {
  candidateAScore: number
  candidateBScore: number
  winnerId: string | null
}

// ───────────── Calcul des scores ─────────────

/**
 * Calcule les scores à partir d'une map `critère -> valeurs[]`.
 * Tolérant : accepte un nombre partiel de critères et/ou de votes.
 * Normalise sur le poids total des critères présents.
 */
export function calculateScores(
  valuesByCriterion: Map<string, number[]>,
  candidateAId: string,
  candidateBId: string,
): Score {
  // Au moins un vote requis
  let totalVotes = 0
  for (const values of valuesByCriterion.values()) totalVotes += values.length

  if (totalVotes === 0) {
    throw new Error('NO_VOTES')
  }

  let candidateAScore = 0
  let candidateBScore = 0
  let totalWeight = 0

  for (const [criterion, values] of valuesByCriterion) {
    if (values.length === 0) continue

    const average = values.reduce((s, v) => s + v, 0) / values.length
    const weight = CRITERION_WEIGHT
    candidateAScore += (100 - average) * weight
    candidateBScore += average * weight
    totalWeight += weight
  }

  if (totalWeight === 0) throw new Error('NO_VOTES')

  // Normalise pour ramener les scores sur l'échelle 0-100
  candidateAScore = candidateAScore / totalWeight
  candidateBScore = candidateBScore / totalWeight

  return {
    candidateAScore,
    candidateBScore,
    winnerId:
      candidateAScore === candidateBScore
        ? null
        : candidateAScore > candidateBScore
          ? candidateAId
          : candidateBId,
  }
}

// ───────────── Résultat d'un round ─────────────

/**
 * Calcule le résultat d'un round à partir des votes en base.
 * - Pas de contrainte sur le nombre de votes.
 * - Pas de contrainte sur le statut du round (utile pour recalcul).
 * - Retourne `null` si aucun vote.
 */
export async function calculateRoundResult(roundId: string) {
  const round = await prisma.round.findUnique({
    where: { id: roundId },
    include: { votes: true, match: true },
  })

  if (!round) throw new Error('ROUND_NOT_FOUND')
  if (!round.match.candidateAId || !round.match.candidateBId) {
    throw new Error('MATCH_CANDIDATES_REQUIRED')
  }

  // Groupe les votes par critère
  const grouped = new Map<string, number[]>()
  for (const vote of round.votes) {
    grouped.set(vote.criterion, [
      ...(grouped.get(vote.criterion) ?? []),
      vote.value,
    ])
  }

  // Si aucun vote → on supprime tout résultat existant et on renvoie null
  if (grouped.size === 0) {
    await prisma.roundResult.deleteMany({ where: { roundId } })
    return null
  }

  const result = calculateScores(
    grouped,
    round.match.candidateAId,
    round.match.candidateBId,
  )

  return prisma.roundResult.upsert({
    where: { roundId },
    create: { roundId, ...result },
    update: {
      candidateAScore: result.candidateAScore,
      candidateBScore: result.candidateBScore,
      winnerId: result.winnerId,
      calculatedAt: new Date(),
    },
  })
}

// ───────────── Résultat d'un match ─────────────

/**
 * Calcule le résultat final d'un match.
 * - Accepte 1 round ou plus.
 * - Ignore les rounds sans résultat.
 * - Échoue uniquement s'il n'y a AUCUN round avec résultat.
 */
export async function calculateMatchResult(matchId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: { rounds: { include: { result: true } } },
  })

  if (!match || !match.candidateAId || !match.candidateBId) {
    throw new Error('MATCH_NOT_READY')
  }

  const roundsWithResult = match.rounds.filter((r) => r.result)

  if (roundsWithResult.length === 0) {
    throw new Error('NO_ROUND_RESULT')
  }

  const candidateAScore =
    roundsWithResult.reduce((s, r) => s + Number(r.result!.candidateAScore), 0) /
    roundsWithResult.length
  const candidateBScore =
    roundsWithResult.reduce((s, r) => s + Number(r.result!.candidateBScore), 0) /
    roundsWithResult.length

  // Égalité : on force le candidat A comme vainqueur (MatchResult.winnerId est obligatoire)
  const winnerId =
    candidateAScore >= candidateBScore ? match.candidateAId : match.candidateBId

  return prisma.$transaction(async (tx) => {
    const result = await tx.matchResult.upsert({
      where: { matchId },
      create: { matchId, candidateAScore, candidateBScore, winnerId },
      update: {
        candidateAScore,
        candidateBScore,
        winnerId,
        calculatedAt: new Date(),
      },
    })

    await tx.match.update({
      where: { id: matchId },
      data: { winnerId },
    })

    // Propagation vers le match suivant (bracket)
    const next = await tx.match.findFirst({
      where: { OR: [{ nextMatchAId: matchId }, { nextMatchBId: matchId }] },
    })
    if (next) {
      await tx.match.update({
        where: { id: next.id },
        data:
          next.nextMatchAId === matchId
            ? { candidateAId: winnerId }
            : { candidateBId: winnerId },
      })
    }

    return result
  })
}

// ───────────── Résultat d'un tournoi ─────────────

/**
 * Calcule le résultat final d'un tournoi.
 * - Accepte un tournoi qui contient au moins une finale avec un résultat.
 * - Pas de contrainte sur le nombre total de matchs.
 */
export async function calculateTournamentResult(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { matches: { include: { result: true } } },
  })

  if (!tournament) throw new Error('TOURNAMENT_NOT_FOUND')

  const final = tournament.matches.find((m) => m.stage === 'FINAL')
  if (!final?.result?.winnerId) throw new Error('TOURNAMENT_NOT_READY')

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: { winnerId: final.result.winnerId, status: 'COMPLETED' },
  })

  await prisma.auditLog.create({
    data: {
      action: 'tournament result calculated',
      entityId: tournamentId,
      metadata: { winnerId: final.result.winnerId },
    },
  })

  return updated
}

// ───────────── Validation de la forme d'un tournoi ─────────────

/**
 * Retourne `true` si le tournoi respecte le format classique
 * (4 quarts, 2 demis, 1 finale). Ne bloque rien, juste informatif.
 */
export function validateTournamentShape(matches: Array<{ stage: string }>) {
  return (
    matches.filter((m) => m.stage === 'QUARTER_FINAL').length === 4 &&
    matches.filter((m) => m.stage === 'SEMI_FINAL').length === 2 &&
    matches.filter((m) => m.stage === 'FINAL').length === 1
  )
}

export { calculateTournamentResult as calculateTournament }