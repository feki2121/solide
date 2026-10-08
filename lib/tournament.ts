import { prisma } from './prisma'

export const CRITERIA = ['technique', 'vocabulary', 'originality', 'musicality', 'execution'] as const

export const CRITERION_WEIGHT = 0.2
export const JUDGES_PER_ROUND = 3
export const VOTES_PER_ROUND = CRITERIA.length * JUDGES_PER_ROUND

export type Score = { candidateAScore: number; candidateBScore: number; winnerId: string | null }

function scoreFromVotes(values: number[]): number {
  if (values.length !== JUDGES_PER_ROUND) throw new Error('INCOMPLETE_VOTES')
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function calculateScores(valuesByCriterion: Map<string, number[]>, candidateAId: string, candidateBId: string): Score {
  if (valuesByCriterion.size !== CRITERIA.length || CRITERIA.some((criterion) => !valuesByCriterion.has(criterion))) {
    throw new Error('INCOMPLETE_CRITERIA')
  }
  let candidateAScore = 0
  let candidateBScore = 0
  for (const criterion of CRITERIA) {
    const average = scoreFromVotes(valuesByCriterion.get(criterion) ?? [])
    candidateAScore += (100 - average) * CRITERION_WEIGHT
    candidateBScore += average * CRITERION_WEIGHT
  }
  return {
    candidateAScore,
    candidateBScore,
    winnerId: candidateAScore === candidateBScore ? null : candidateAScore > candidateBScore ? candidateAId : candidateBId,
  }
}

export async function calculateRoundResult(roundId: string) {
  const round = await prisma.round.findUnique({ where: { id: roundId }, include: { votes: true, match: true } })
  if (!round) throw new Error('ROUND_NOT_FOUND')
  if (round.status !== 'CLOSED') throw new Error('ROUND_NOT_CLOSED')
  if (!round.match.candidateAId || !round.match.candidateBId) throw new Error('MATCH_CANDIDATES_REQUIRED')
  if (round.votes.length !== VOTES_PER_ROUND) throw new Error('INCOMPLETE_VOTES')

  const grouped = new Map<string, number[]>()
  for (const vote of round.votes) grouped.set(vote.criterion, [...(grouped.get(vote.criterion) ?? []), vote.value])
  const result = calculateScores(grouped, round.match.candidateAId, round.match.candidateBId)

  return prisma.roundResult.upsert({
    where: { roundId },
    create: { roundId, ...result },
    update: { candidateAScore: result.candidateAScore, candidateBScore: result.candidateBScore, winnerId: result.winnerId, calculatedAt: new Date() },
  })
}

export async function calculateMatchResult(matchId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { rounds: { include: { result: true } } } })
  if (!match || !match.candidateAId || !match.candidateBId) throw new Error('MATCH_NOT_READY')
  if (match.rounds.length !== 3 || match.rounds.some((round) => round.status !== 'CLOSED' || !round.result)) throw new Error('MATCH_NOT_READY')

  const candidateAScore = match.rounds.reduce((sum, round) => sum + Number(round.result!.candidateAScore), 0) / 3
  const candidateBScore = match.rounds.reduce((sum, round) => sum + Number(round.result!.candidateBScore), 0) / 3
  if (candidateAScore === candidateBScore) throw new Error('TIE_REQUIRES_RESOLUTION')
  const winnerId = candidateAScore > candidateBScore ? match.candidateAId : match.candidateBId

  return prisma.$transaction(async (tx) => {
    const result = await tx.matchResult.upsert({ where: { matchId }, create: { matchId, candidateAScore, candidateBScore, winnerId }, update: { candidateAScore, candidateBScore, winnerId, calculatedAt: new Date() } })
    await tx.match.update({ where: { id: matchId }, data: { winnerId } })
    const next = await tx.match.findFirst({ where: { OR: [{ nextMatchAId: matchId }, { nextMatchBId: matchId }] } })
    if (next) await tx.match.update({ where: { id: next.id }, data: next.nextMatchAId === matchId ? { candidateAId: winnerId } : { candidateBId: winnerId } })
    return result
  })
}

export async function calculateTournamentResult(tournamentId: string) {
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId }, include: { matches: { include: { result: true } } } })
  if (!tournament || tournament.matches.length !== 7) throw new Error('TOURNAMENT_NOT_READY')
  const final = tournament.matches.find((match) => match.stage === 'FINAL')
  if (!final?.result?.winnerId) throw new Error('TOURNAMENT_NOT_READY')
  const updated = await prisma.tournament.update({ where: { id: tournamentId }, data: { winnerId: final.result.winnerId, status: 'COMPLETED' } })
  await prisma.auditLog.create({ data: { action: 'tournament result calculated', entityId: tournamentId, metadata: { winnerId: final.result.winnerId } } })
  return updated
}

export function validateTournamentShape(matches: Array<{ stage: string }>) {
  return matches.length === 7 && matches.filter((match) => match.stage === 'QUARTER_FINAL').length === 4 && matches.filter((match) => match.stage === 'SEMI_FINAL').length === 2 && matches.filter((match) => match.stage === 'FINAL').length === 1
}

export { calculateTournamentResult as calculateTournament }
