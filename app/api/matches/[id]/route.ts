import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    // 1. Récupère l'utilisateur connecté
    const user = await currentUser(request as any)

    const { id } = await params

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
                    // 2. Ne renvoie QUE les votes du juge connecté
                    votes: user ? { where: { judgeId: user.id } } : false,
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

    return NextResponse.json({
        ...matchData,
        assignedJudges: assignments.map(({ judge }) => judge.user),
    })
}