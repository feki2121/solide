import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { currentUser, requireUser } from '@/lib/auth'
const input = z.object({ roundId: z.string(), votes: z.array(z.object({ criterion: z.string().min(1), value: z.number().int().min(0).max(100) })).length(5) })
export async function GET(request: Request) { try { const user = await requireUser(request as any); const roundId = new URL(request.url).searchParams.get('roundId'); return NextResponse.json(await prisma.vote.findMany({ where: { judgeId: user.id, ...(roundId ? { roundId } : {}) }, orderBy: { createdAt: 'asc' } })) } catch { return NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) } }

export async function POST(request: Request) {
    try {
        const user = await currentUser(request as any)
        if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        if (user.role !== 'JUDGE') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

        const body = await request.json()
        console.log('📥 [votes] body reçu:', JSON.stringify(body, null, 2))

        const data = input.parse(body)
        console.log('✅ [votes] validé:', JSON.stringify(data, null, 2))

        const round = await prisma.round.findUnique({
            where: { id: data.roundId },
            include: { match: { include: { assignments: true } } },
        })
        if (!round) return NextResponse.json({ error: 'Round introuvable' }, { status: 404 })
        if (round.status !== 'OPEN') return NextResponse.json({ error: 'Round fermé' }, { status: 409 })

        const judgeId = user.judge?.id
        console.log('👤 [votes] user.id:', user.id, '| judge.id:', judgeId)
        console.log('🔗 [votes] assignments:', round.match.assignments.map((a) => a.judgeId))

        if (!judgeId || !round.match.assignments.some((a) => a.judgeId === judgeId)) {
            return NextResponse.json({ error: 'Match non autorisé' }, { status: 403 })
        }

        const created = await prisma.$transaction(
            data.votes.map((vote) =>
                prisma.vote.create({
                    data: {
                        judgeId: user.id,
                        roundId: round.id,
                        criterion: vote.criterion,
                        value: vote.value,
                    },
                }),
            ),
        )

        await prisma.auditLog.create({
            data: { userId: user.id, action: 'vote submitted', entityId: round.id },
        })

        return NextResponse.json({ votes: created }, { status: 201 })
    } catch (error) {
        console.error('❌ [votes] erreur:', error)
        if (error instanceof z.ZodError) {
            console.error('❌ [votes] Zod issues:', JSON.stringify(error.issues, null, 2))
            return NextResponse.json(
                { error: 'Données invalides', issues: error.issues },
                { status: 400 },
            )
        }
        return NextResponse.json(
            { error: 'Vote déjà enregistré ou opération impossible', detail: String(error) },
            { status: 409 },
        )
    }
}