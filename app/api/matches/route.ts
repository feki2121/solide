import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser, requireUser } from '@/lib/auth'
import { z } from 'zod'

export async function GET(request: Request) {
  console.log('📥 [matches] GET reçu')
  console.log('📥 [matches] Authorization header:', request.headers.get('authorization'))

  const user = await currentUser(request as any)
  console.log('👤 [matches] user:', user ? { id: user.id, role: user.role, hasJudge: !!user.judge } : null)

  const tournamentId = new URL(request.url).searchParams.get('tournamentId')

  if (!user) {
    console.error('❌ [matches] 401 — currentUser a renvoyé null')
    return NextResponse.json({ error: 'Authentification requise' }, { status: 401 })
  }

  const where =
    user.role === 'JUDGE' && user.judge
      ? { assignments: { some: { judgeId: user.judge.id } } }
      : tournamentId
        ? { tournamentId }
        : undefined

  console.log('🔍 [matches] where:', JSON.stringify(where))

  const matches = await prisma.match.findMany({
    where,
    include: {
      candidateA: true,
      candidateB: true,
      assignments: {
        include: {
          judge: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
      rounds: { include: { result: true }, orderBy: { number: 'asc' } },
      result: true,
    },
    orderBy: { createdAt: 'asc' },
  })

  console.log('✅ [matches] résultats:', matches.length)

  return NextResponse.json(
    matches.map(({ assignments, ...match }) => ({
      ...match,
      assignedJudges: assignments.map(({ judge }) => judge.user),
    })),
  )
}

const createSchema = z.object({
  tournamentId: z.string(),
  name: z.string().min(1),
  stage: z.enum(['QUARTER_FINAL', 'SEMI_FINAL', 'FINAL']),
  candidateAId: z.string().optional(),
  candidateBId: z.string().optional(),
  judgeIds: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  let user
  try { user = await requireUser(request as any, 'ADMIN') }
  catch { return NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }

  try {
    const data = createSchema.parse(await request.json())
    const match = await prisma.match.create({
      data: {
        tournamentId: data.tournamentId,
        name: data.name,
        stage: data.stage,
        candidateAId: data.candidateAId,
        candidateBId: data.candidateBId,
        assignments: data.judgeIds?.length
          ? { create: data.judgeIds.map((judgeId) => ({ judgeId })) }
          : undefined,
      },
      include: {
        candidateA: true,
        candidateB: true,
        tournament: { select: { id: true, name: true } },
        rounds: { orderBy: { number: 'asc' } },
        assignments: { include: { judge: { include: { user: true } } } },
      },
    })
    await prisma.auditLog.create({ data: { userId: user.id, action: 'match creation', entityId: match.id } })
    return NextResponse.json({
      ...match,
      assignedJudges: match.assignments.map((a) => a.judge.user),
    }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }
}