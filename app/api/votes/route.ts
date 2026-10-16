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

        // 👇 Compte les juges assignés AU MATCH qui ont voté
        // On se base sur les votes réels, pas sur tous les juges en base.
        const votesInRound = await prisma.vote.findMany({
            where: { roundId: round.id },
            select: { judgeId: true, criterion: true },
        })

        // Groupe par juge pour vérifier que chaque juge a voté TOUS les critères
        const byJudge = new Map<string, Set<string>>()
        for (const v of votesInRound) {
            if (!byJudge.has(v.judgeId)) byJudge.set(v.judgeId, new Set())
            byJudge.get(v.judgeId)!.add(v.criterion)
        }

        // Liste des User.id qui ont voté les 5 critères (car Vote.judgeId pointe vers User.id)
        const completedUserIds = [...byJudge.entries()]
            .filter(([_, criteria]) => criteria.size === 5)
            .map(([userId]) => userId)

        // Liste des Judge.id assignés au match (via JudgeAssignment)
        const assignedJudgeIds = round.match.assignments.map((a) => a.judgeId)

        // Pont via Judge.userId pour récupérer les User.id correspondants
        const assignedJudges = await prisma.judge.findMany({
            where: { id: { in: assignedJudgeIds } },
            select: { id: true, userId: true },
        })
        const assignedUserIds = assignedJudges.map((j) => j.userId)

        // Tous les juges assignés ont voté leurs 5 critères ?
        const allJudgesVoted =
            assignedUserIds.length > 0 &&
            assignedUserIds.every((uid) => completedUserIds.includes(uid))

        console.log('🔍 [votes] assignedUserIds:', assignedUserIds)
        console.log('🔍 [votes] completedUserIds:', completedUserIds)
        console.log('🔍 [votes] allJudgesVoted:', allJudgesVoted)

        let roundResult = null
        let matchResult = null

        if (allJudgesVoted) {
            // 🎯 Calcule le résultat du round
            roundResult = await calculateRoundResult(round.id)
            console.log('📊 [votes] roundResult:', roundResult)

            // Ferme le round
            await prisma.round.update({
                where: { id: round.id },
                data: { status: 'CLOSED', closedAt: new Date() },
            })
            console.log(`🔒 [votes] round ${round.id} fermé (CLOSED)`)

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
            console.log(`🔍 [votes] rounds non fermés restants pour match ${round.matchId}:`, remainingRounds)

            if (remainingRounds === 0) {
                matchResult = await calculateMatchResult(round.matchId)
                console.log('🏆 [votes] matchResult:', matchResult)
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