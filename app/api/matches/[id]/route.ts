import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await currentUser(request as any)
    const { id } = await params

    if (!user) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const isAdmin = user.role === 'ADMIN'

    const match = await prisma.match.findUnique({
        where: { id },
        include: {
            tournament: true,
            candidateA: true,
            candidateB: true,
            assignments: {
                include: {
                    judge: {
                        include: {
                            user: { select: { id: true, name: true, email: true } },
                        },
                    },
                },
            },
            rounds: {
                include: {
                    criteria: true,
                    result: true,
                    // 👇 On récupère TOUS les votes pour que le frontend sache qui a voté
                    votes: true,
                },
                orderBy: { number: 'asc' },
            },
            result: true,
        },
    })

    if (!match) {
        return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    }

    const { assignments, ...matchData } = match

    // ────────── FILTRAGE DE CONFIDENTIALITÉ ──────────
    // Si l'utilisateur n'est pas admin, on masque la valeur des votes des autres juges
    // pour respecter la nouvelle règle de confidentialité, tout en gardant 
    // la trace du vote (pour déclencher le round 3 et afficher le ✅).
    if (!isAdmin) {
        matchData.rounds = matchData.rounds.map((round) => ({
            ...round,
            votes: (round.votes || []).map((vote) =>
                vote.judgeId === user.id
                    ? vote
                    : { ...vote, value: 0, criterion: 'HIDDEN' } // On masque la valeur
            ),
        }))
    }

    return NextResponse.json({
        ...matchData,
        assignedJudges: assignments.map(({ judge }) => judge.user),
    })
}