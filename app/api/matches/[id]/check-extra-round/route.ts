import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id: matchId } = await params

    console.log('🔍 [check-extra-round] matchId:', matchId)

    try {
        // 1. Transaction Prisma pour garantir l'idempotence et éviter les doublons si plusieurs clients appellent simultanément
        const result = await prisma.$transaction(async (tx) => {
            // Récupérer le match avec ses rounds et juges assignés
            const match = await tx.match.findUnique({
                where: { id: matchId },
                include: {
                    rounds: {
                        include: { votes: true },
                        orderBy: { number: 'asc' },
                    },
                    assignments: {
                        include: {
                            judge: true,
                        },
                    },
                },
            })

            if (!match) {
                console.error('❌ [check-extra-round] Match introuvable pour matchId:', matchId)
                throw new Error('Match introuvable')
            }

            const roundCount = match.rounds.length
            const isEven = roundCount > 0 && roundCount % 2 === 0

            console.log('🔍 [check-extra-round] nombre de rounds:', roundCount)
            console.log('🔍 [check-extra-round] résultat de la condition % 2 === 0 (isEven):', isEven)

            // Condition : Si le nombre de rounds est pair (> 0)
            if (isEven) {
                // Vérifier que TOUS les rounds existants sont bien terminés
                const assignedJudgeUserIds = match.assignments.map((a) => a.judge.userId)

                const allRoundsComplete = match.rounds.every((r) => {
                    if (r.status === 'CLOSED') return true
                    if (assignedJudgeUserIds.length === 0) return false
                    const votersSet = new Set(r.votes.map((v) => v.judgeId))
                    return assignedJudgeUserIds.every((uid) => votersSet.has(uid))
                })

                if (!allRoundsComplete) {
                    const reason = 'Tous les rounds ne sont pas terminés'
                    console.log('⏹️ [check-extra-round] Création non déclenchée, raison :', reason)
                    return { added: false, reason }
                }

                // Sécurité idempotence : vérifier si le round supplémentaire existe déjà
                const nextRoundNumber = roundCount + 1
                const alreadyExists = match.rounds.some((r) => r.number === nextRoundNumber)
                if (alreadyExists) {
                    const reason = `Le round ${nextRoundNumber} existe déjà`
                    console.log('⏹️ [check-extra-round] Création non déclenchée, raison :', reason)
                    return { added: false, reason }
                }

                // Clôturer les rounds précédents s'ils étaient encore OPEN
                for (const r of match.rounds) {
                    if (r.status !== 'CLOSED') {
                        await tx.round.update({
                            where: { id: r.id },
                            data: { status: 'CLOSED', closedAt: new Date() },
                        })
                    }
                }

                // Déclencher la création du round supplémentaire
                console.log(`🚀 [check-extra-round] Création du round supplémentaire déclenchée pour le round ${nextRoundNumber}`)

                const newRound = await tx.round.create({
                    data: {
                        matchId: match.id,
                        number: nextRoundNumber,
                        status: 'OPEN',
                        startedAt: new Date(),
                        criteria: {
                            create: [
                                { name: 'technique', weight: 0.25 },
                                { name: 'vocabulary', weight: 0.20 },
                                { name: 'originality', weight: 0.20 },
                                { name: 'musicality', weight: 0.20 },
                                { name: 'execution', weight: 0.15 },
                            ],
                        },
                    },
                    include: {
                        criteria: true,
                    },
                })

                // Mettre à jour roundsCount si le match en possède un
                if (match.roundsCount !== null && match.roundsCount !== undefined) {
                    await tx.match.update({
                        where: { id: match.id },
                        data: { roundsCount: nextRoundNumber },
                    })
                }

                return { added: true, newRound }
            }

            const reason = 'Nombre de rounds impair ou déjà traité'
            console.log('⏹️ [check-extra-round] Création non déclenchée, raison :', reason)
            return { added: false, reason }
        })

        return NextResponse.json(result)
    } catch (error) {
        console.error('❌ [check-extra-round] Erreur :', error)
        return NextResponse.json(
            { error: 'Erreur lors de la vérification', details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        )
    }
}