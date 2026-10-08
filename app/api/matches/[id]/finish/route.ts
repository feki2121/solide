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
            candidateA: true,
            candidateB: true,
            rounds: { include: { result: true, votes: true }, orderBy: { number: 'asc' } },
        },
    })

    if (!match) {
        console.error('❌ [finish] Match introuvable:', id)
        return NextResponse.json({ error: 'Match introuvable' }, { status: 404 })
    }

    console.log('🔍 [finish] rounds:', match.rounds.map((r) => ({
        number: r.number,
        status: r.status,
        hasResult: !!r.result,
        votes: r.votes.length,
        candidateAScore: r.result?.candidateAScore,
        candidateBScore: r.result?.candidateBScore,
    })))

    if (match.rounds.length === 0) {
        console.error('❌ [finish] Aucun round')
        return NextResponse.json({ error: 'Aucun round dans ce match' }, { status: 409 })
    }

    // Vérifie que tous les rounds sont CLOSED et ont un résultat
    const notClosed = match.rounds.filter((r) => r.status !== 'CLOSED' || !r.result)
    // if (notClosed.length > 0) {
    //     console.error('❌ [finish] Rounds non terminés:', notClosed.map((r) => `R${r.number} (status=${r.status}, hasResult=${!!r.result})`))
    //     return NextResponse.json(
    //         { error: `Rounds non terminés : ${notClosed.map((r) => `R${r.number}`).join(', ')}` },
    //         { status: 409 },
    //     )
    // }

    if (!match.candidateAId || !match.candidateBId) {
        console.error('❌ [finish] Candidats manquants')
        return NextResponse.json({ error: 'Candidats manquants' }, { status: 409 })
    }

    // Moyenne des scores de tous les rounds
    const sumA = match.rounds.reduce((s, r) => s + Number(r.result!.candidateAScore), 0)
    const sumB = match.rounds.reduce((s, r) => s + Number(r.result!.candidateBScore), 0)
    const avgA = sumA / match.rounds.length
    const avgB = sumB / match.rounds.length

    console.log('📊 [finish] scores:', { sumA, sumB, avgA, avgB, rounds: match.rounds.length })

    const winnerId = avgA > avgB ? match.candidateAId : avgB > avgA ? match.candidateBId : match.candidateAId

    console.log('🏆 [finish] winnerId:', winnerId)

    // Crée/met à jour le MatchResult
    const result = await prisma.matchResult.upsert({
        where: { matchId: id },
        update: { candidateAScore: avgA, candidateBScore: avgB, winnerId, calculatedAt: new Date() },
        create: { matchId: id, candidateAScore: avgA, candidateBScore: avgB, winnerId },
    })

    console.log('✅ [finish] MatchResult créé/mis à jour:', result.id)

    // Met à jour le match
    await prisma.match.update({
        where: { id },
        data: { winnerId },
    })

    await prisma.auditLog.create({
        data: {
            userId: user.id,
            action: 'match finished',
            entityId: id,
            metadata: { avgA, avgB, winnerId },
        },
    })

    return NextResponse.json({
        match: { id: match.id, winnerId },
        result,
    })
}