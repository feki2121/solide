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

/**
 * Calcule le résultat d'un round par **vote majoritaire** des juges.
 * Chaque juge vote globalement pour A ou B selon son vote moyen.
 * Le candidat avec le plus de votes de juges gagne le round.
 */
export function calculateRoundResultByVotes(
  votes: { judgeId: string; value: number }[],
  candidateAId: string,
  candidateBId: string,
): Score {
  if (votes.length === 0) {
    throw new Error('NO_VOTES')
  }

  // Regroupe les votes par juge
  const byJudge = new Map<string, number[]>()
  for (const v of votes) {
    byJudge.set(v.judgeId, [...(byJudge.get(v.judgeId) ?? []), v.value])
  }

  // Chaque juge vote pour A ou B selon la moyenne de ses votes
  let votesForA = 0
  let votesForB = 0

  for (const values of byJudge.values()) {
    if (values.length === 0) continue
    const avg = values.reduce((s, v) => s + v, 0) / values.length
    if (avg < 50) votesForA++
    else if (avg > 50) votesForB++
    // avg === 50 → neutre, ne compte pas
  }

  // Détermine le vainqueur
  let winnerId: string | null = null
  if (votesForA > votesForB) winnerId = candidateAId
  else if (votesForB > votesForA) winnerId = candidateBId
  // égalité parfaite → winnerId = null

  return {
    candidateAScore: votesForA,
    candidateBScore: votesForB,
    winnerId,
  }
}

// ───────────── Résultat d'un round ─────────────

/**
 * Calcule le résultat d'un round à partir des votes en base.
 * - Pas de contrainte sur le nombre de votes.
 * - Pas de contrainte sur le statut du round (utile pour recalcul).
 * - Retourne `null` si aucun vote.
 */
/**
 * Calcule le résultat d'un round à partir des votes en base.
 * - Utilise le VOTE MAJORITAIRE des jurys (pas la moyenne des notes).
 * - `candidateAScore` / `candidateBScore` = nombre de jurys ayant voté pour A / B.
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

  if (round.votes.length === 0) {
    await prisma.roundResult.deleteMany({ where: { roundId } })
    return null
  }

  // ✅ Utilise le VOTE MAJORITAIRE des jurys
  const result = calculateRoundResultByVotes(
    round.votes.map((v) => ({ judgeId: v.judgeId, value: v.value })),
    round.match.candidateAId,
    round.match.candidateBId,
  )

  const savedResult = await prisma.roundResult.upsert({
    where: { roundId },
    create: { roundId, ...result },
    update: {
      candidateAScore: result.candidateAScore,
      candidateBScore: result.candidateBScore,
      winnerId: result.winnerId,
      calculatedAt: new Date(),
    },
  })

  console.log(`📊 [roundResult] Round ${roundId} calculé:`, savedResult)

  return savedResult
}

// ───────────── Résultat d'un match ─────────────

/**
 * Calcule le résultat final d'un match.
 * - Accepte 1 round ou plus.
 * - Ignore les rounds sans résultat.
 * - Échoue uniquement s'il n'y a AUCUN round avec résultat.
 */
/**
 * Calcule le résultat final d'un match.
 * Le score = nombre de rounds gagnés par chaque candidat (1 point par round gagné).
 */
export async function calculateMatchResult(matchId: string) {
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
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

    // Compte les victoires de rounds
    const winsA = roundsWithResult.filter(
      (r) => r.result!.winnerId === match.candidateAId
    ).length
    const winsB = roundsWithResult.filter(
      (r) => r.result!.winnerId === match.candidateBId
    ).length

    // Le candidat avec le plus de victoires remporte le match
    const winnerId =
      winsA >= winsB ? match.candidateAId : match.candidateBId

    const result = await tx.matchResult.upsert({
      where: { matchId },
      create: {
        matchId,
        candidateAScore: winsA,
        candidateBScore: winsB,
        winnerId,
      },
      update: {
        candidateAScore: winsA,
        candidateBScore: winsB,
        winnerId,
        calculatedAt: new Date(),
      },
    })

    await tx.match.update({
      where: { id: matchId },
      data: { winnerId },
    })

    console.log(`🏆 [matchResult] Match ${matchId} calculé: winnerId=${winnerId}, score=${winsA}-${winsB}`)

    // Propagation vers le match suivant (bracket)
    // Si currentMatch.nextMatchAId existe, mettre winnerId dans candidateAId du match cible
    if (match.nextMatchAId) {
      console.log(
        `🚀 [propagation] Match ${matchId} -> winnerId ${winnerId} propagé dans candidateAId du match cible ${match.nextMatchAId}`
      )
      await tx.match.update({
        where: { id: match.nextMatchAId },
        data: { candidateAId: winnerId },
      })
    }

    // Idem pour nextMatchBId → candidateBId
    if (match.nextMatchBId) {
      console.log(
        `🚀 [propagation] Match ${matchId} -> winnerId ${winnerId} propagé dans candidateBId du match cible ${match.nextMatchBId}`
      )
      await tx.match.update({
        where: { id: match.nextMatchBId },
        data: { candidateBId: winnerId },
      })
    }

    if (!match.nextMatchAId && !match.nextMatchBId) {
      console.log(
        `🏁 [propagation] Match ${matchId} sans match suivant (ex. Finale)`
      )
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
 * (8 huitièmes si présent, 4 quarts, 2 demis, 1 finale). Ne bloque rien, juste informatif.
 */
export function validateTournamentShape(matches: Array<{ stage: string }>) {
  const hasR16 = matches.some((m) => m.stage === 'ROUND_OF_16')
  if (hasR16) {
    return (
      matches.filter((m) => m.stage === 'ROUND_OF_16').length === 8 &&
      matches.filter((m) => m.stage === 'QUARTER_FINAL').length === 4 &&
      matches.filter((m) => m.stage === 'SEMI_FINAL').length === 2 &&
      matches.filter((m) => m.stage === 'FINAL').length === 1
    )
  }
  return (
    matches.filter((m) => m.stage === 'QUARTER_FINAL').length === 4 &&
    matches.filter((m) => m.stage === 'SEMI_FINAL').length === 2 &&
    matches.filter((m) => m.stage === 'FINAL').length === 1
  )
}

export { calculateTournamentResult as calculateTournament }