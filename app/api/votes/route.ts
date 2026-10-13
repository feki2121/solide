import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { currentUser, requireUser } from '@/lib/auth'
import { calculateRoundResult, calculateMatchResult } from '@/lib/tournament'

const input = z.object({
    roundId: z.string(),
    votes: z
        .array(
            z.object({
                criterion: z.string().min(1),
                value: z.number().int().min(0).max(100),
            })
        )
        .length(5),
})

export async function GET(request: Request) {
    try {
        const user = await requireUser(request as any)
        const roundId = new URL(request.url).searchParams.get('roundId')
        return NextResponse.json(
            await prisma.vote.findMany({
                where: { judgeId: user.id, ...(roundId ? { roundId } : {}) },
                orderBy: { createdAt: 'asc' },
            })
        )
    } catch {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
}

export async function POST(request: Request) {
    try {
        const user = await currentUser(request as any)
        if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
        if (user.role !== 'JUDGE') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

        const body = await request.json()
        const data = input.parse(body)

        const round = await prisma.round.findUnique({
            where: { id: data.roundId },
            include: { match: { include: { assignments: true } } },
        })
        if (!round) return NextResponse.json({ error: 'Round introuvable' }, { status: 404 })
        if (round.status !== 'OPEN') return NextResponse.json({ error: 'Round fermé' }, { status: 409 })

        const judgeId = user.judge?.id
        if (!judgeId || !round.match.assignments.some((a) => a.judgeId === judgeId)) {
            return NextResponse.json({ error: 'Match non autorisé' }, { status: 403 })
        }

        // Crée ou met à jour les votes (upsert pour tolérer les modifications)
        const created = await prisma.$transaction(
            data.votes.map((vote) =>
                prisma.vote.upsert({
                    where: {
                        judgeId_roundId_criterion: {
                            judgeId: user.id,
                            roundId: round.id,
                            criterion: vote.criterion,
                        },
                    },
                    update: { value: vote.value },
                    create: {
                        judgeId: user.id,
                        roundId: round.id,
                        criterion: vote.criterion,
                        value: vote.value,
                    },
                })
            )
        )

        await prisma.auditLog.create({
            data: { userId: user.id, action: 'vote submitted', entityId: round.id },
        })

        // 👇 Vérifie si TOUS les juges assignés ont voté
        const totalJudges = round.match.assignments.length
        const distinctVoters = await prisma.vote.findMany({
            where: { roundId: round.id },
            distinct: ['judgeId'],
            select: { judgeId: true },
        })

        const allJudgesVoted = distinctVoters.length >= totalJudges

        let roundResult = null
        let matchResult = null

        if (allJudgesVoted) {
            // 🎯 Calcule le résultat du round
            roundResult = await calculateRoundResult(round.id)

            // Ferme le round
            await prisma.round.update({
                where: { id: round.id },
                data: { status: 'CLOSED', closedAt: new Date() },
            })

            await prisma.auditLog.create({
                data: {
                    userId: user.id,
                    action: 'round auto-closed',
                    entityId: round.id,
                    metadata: { reason: 'all judges voted' },
                },
            })

            // 🎯 Si tous les rounds du match sont fermés → calcule le résultat du match
            const remainingRounds = await prisma.round.count({
                where: {
                    matchId: round.matchId,
                    status: { not: 'CLOSED' },
                },
            })

            if (remainingRounds === 0) {
                matchResult = await calculateMatchResult(round.matchId)
            }
        }

        return NextResponse.json(
            { votes: created, roundResult, matchResult, allJudgesVoted },
            { status: 201 }
        )
    } catch (error) {
        console.error('❌ [votes] erreur:', error)
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Données invalides', issues: error.issues },
                { status: 400 }
            )
        }
        return NextResponse.json(
            { error: 'Vote déjà enregistré ou opération impossible', detail: String(error) },
            { status: 409 }
        )
    }
}