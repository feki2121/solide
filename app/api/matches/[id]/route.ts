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
                    // 👇 ADMIN → tous les votes, JUDGE → seulement les siens
                    votes: isAdmin ? true : { where: { judgeId: user.id } },
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