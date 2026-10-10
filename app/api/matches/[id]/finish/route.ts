import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    const user = await currentUser(request as any)
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { id } = await params
    console.log('🎬 [finish] POST reçu pour match:', id)

    const match = await prisma.match.findUnique({
        where: { id },
        include: {
            rounds: { include: { result: true }, orderBy: { number: 'asc' } },
        },
    })

    if (!match) {
        return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    }

    // 👇 Aucun round requis. On ne garde QUE les rounds avec résultat.
    const roundsWithResult = match.rounds.filter((r) => r.result)

    if (roundsWithResult.length === 0) {
        return NextResponse.json(
            { error: 'Aucun round avec résultat. Clôturez au moins un round avant.' },
            { status: 409 },
        )
    }

    if (!match.candidateAId || !match.candidateBId) {
        return NextResponse.json({ error: 'Candidats manquants' }, { status: 409 })
    }

    const sumA = roundsWithResult.reduce((s, r) => s + Number(r.result!.candidateAScore), 0)
    const sumB = roundsWithResult.reduce((s, r) => s + Number(r.result!.candidateBScore), 0)
    const avgA = sumA / roundsWithResult.length
    const avgB = sumB / roundsWithResult.length

    const winnerId =
        avgA > avgB ? match.candidateAId : avgB > avgA ? match.candidateBId : match.candidateAId

    const result = await prisma.matchResult.upsert({
        where: { matchId: id },
        update: { candidateAScore: avgA, candidateBScore: avgB, winnerId, calculatedAt: new Date() },
        create: { matchId: id, candidateAScore: avgA, candidateBScore: avgB, winnerId },
    })

    await prisma.match.update({ where: { id }, data: { winnerId } })

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: 'match finished',
            entityId: id,
            metadata: { avgA, avgB, winnerId, roundsUsed: roundsWithResult.length },
        },
    })

    return NextResponse.json({ match: { id: match.id, winnerId }, result })
}