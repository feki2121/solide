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
    // console.error('❌ [matches] 401 — currentUser a renvoyé null')
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

const STAGES = ['QUALIFICATION', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] as const

const createSchema = z.object({
  tournamentId: z.string(),
  name: z.string().min(1),
  stage: z.enum(STAGES),
  candidateAId: z.string().optional(),
  candidateBId: z.string().optional(),
  judgeIds: z.array(z.string()).optional(),
})

export async function POST(request: Request) {
  console.log('📥 [matches POST] reçu')

  let user
  try {
    user = await requireUser(request as any, 'ADMIN')
    // console.log('👤 [matches POST] user:', { id: user.id, role: user.role })
  } catch (e) {
    // console.error('❌ [matches POST] requireUser a échoué:', e)
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
    // console.log('📦 [matches POST] body brut:', JSON.stringify(body, null, 2))
  } catch (e) {
    // console.error('❌ [matches POST] JSON invalide:', e)
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  let data
  try {
    data = createSchema.parse(body)
    console.log('✅ [matches POST] Zod OK:', JSON.stringify(data))
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('❌ [matches POST] Zod a échoué:', JSON.stringify(e.flatten(), null, 2))
      return NextResponse.json(
        { error: 'Données invalides', details: e.flatten() },
        { status: 400 }
      )
    }
    // console.error('❌ [matches POST] erreur Zod inconnue:', e)
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  try {
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

    console.log('✅ [matches POST] match créé:', match.id)

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'match creation', entityId: match.id },
    })

    return NextResponse.json(
      { ...match, assignedJudges: match.assignments.map((a) => a.judge.user) },
      { status: 201 }
    )
  } catch (e) {
    // console.error('❌ [matches POST] Prisma a échoué:', e)
    return NextResponse.json(
      { error: 'Données invalides', details: e instanceof Error ? e.message : String(e) },
      { status: 400 }
    )
  }
}