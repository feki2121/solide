import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const STAGES = ['QUALIFICATION', 'ROUND_OF_16', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] as const

type Stage = (typeof STAGES)[number]

const input = z.object({
    tournamentId: z.string(),
    stage: z.enum(STAGES),
    roundsCount: z.number().int().min(1).max(10).optional(),
    stageRounds: z.record(z.enum(STAGES), z.number().int().min(1).max(10)).optional(),
    candidateNames: z.array(z.string().min(1)).min(2),
    judgeIds: z.array(z.string()).optional(),
})

const stageLabels: Record<Stage, string> = {
    QUALIFICATION: 'Qualification',
    ROUND_OF_16: 'Huitième de finale',
    QUARTER_FINAL: 'Quart de finale',
    SEMI_FINAL: 'Demi-finale',
    FINAL: 'Finale',
}

/** Ordre des stages pour le chaînage. */
const STAGE_ORDER: Stage[] = [
    'QUALIFICATION',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'FINAL',
]

/** Critères par défaut pour chaque round. */
const DEFAULT_CRITERIA = [
    { name: 'technique', weight: 0.25 },
    { name: 'vocabulary', weight: 0.20 },
    { name: 'originality', weight: 0.20 },
    { name: 'musicality', weight: 0.20 },
    { name: 'execution', weight: 0.15 },
]

/** Shuffle Fisher-Yates. */
function shuffle<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

/**
 * Crée un match avec ses N rounds et leurs critères.
 */
async function createMatchWithRounds(
    tx: any,
    params: {
        tournamentId: string
        name: string
        stage: Stage
        roundsCount: number
        judgeIds?: string[]
        candidateAId?: string
        candidateBId?: string
        roundStatus: 'OPEN' | 'PENDING'
    }
) {
    const match = await tx.match.create({
        data: {
            tournamentId: params.tournamentId,
            name: params.name,
            stage: params.stage,
            roundsCount: params.roundsCount,
            candidateAId: params.candidateAId,
            candidateBId: params.candidateBId,
            assignments: params.judgeIds?.length
                ? { create: params.judgeIds.map((judgeId) => ({ judgeId })) }
                : undefined,
        },
    })

    // Créer les N rounds
    for (let r = 1; r <= params.roundsCount; r++) {
        await tx.round.create({
            data: {
                matchId: match.id,
                number: r,
                status: params.roundStatus,
                startedAt: params.roundStatus === 'OPEN' ? new Date() : null,
                criteria: { create: DEFAULT_CRITERIA },
            },
        })
    }

    return match
}

export async function POST(request: Request) {
    let user
    try {
        user = await requireUser(request as any, 'ADMIN')
    } catch {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let data: z.infer<typeof input>
    try {
        data = input.parse(await request.json())
    } catch (e) {
        if (e instanceof z.ZodError) {
            return NextResponse.json(
                { error: 'Données invalides', details: e.flatten() },
                { status: 400 }
            )
        }
        return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    if (data.candidateNames.length % 2 !== 0) {
        return NextResponse.json(
            { error: 'Il faut un nombre pair de candidats.' },
            { status: 400 }
        )
    }

    // Vérifier les doublons
    const uniqueNames = new Set(data.candidateNames.map((n) => n.toLowerCase().trim()))
    if (uniqueNames.size !== data.candidateNames.length) {
        return NextResponse.json(
            { error: 'Les noms des candidats doivent être uniques.' },
            { status: 400 }
        )
    }

    // Mélange + paires
    const shuffled = shuffle(data.candidateNames)
    const pairs: { candidateA: string; candidateB: string }[] = []
    for (let i = 0; i < shuffled.length; i += 2) {
        pairs.push({ candidateA: shuffled[i], candidateB: shuffled[i + 1] })
    }

    /** Détermine le nombre de rounds pour un stage spécifique */
    function getRoundsForStage(s: Stage): number {
        if (data.stageRounds && typeof data.stageRounds[s] === 'number') {
            return Math.max(1, Math.min(10, data.stageRounds[s]))
        }
        return data.roundsCount ?? 3
    }

    try {
        const created = await prisma.$transaction(
            async (tx) => {
                const currentStageIdx = STAGE_ORDER.indexOf(data.stage)

                // Enregistre la configuration des rounds par étape sur le tournoi si fournie
                if (data.stageRounds) {
                    await tx.tournament.update({
                        where: { id: data.tournamentId },
                        data: { stageRounds: data.stageRounds },
                    })
                }

                // ═══════════════════════════════════════════════
                // 1. Créer tous les matchs du stage courant avec candidats
                // ═══════════════════════════════════════════════════
                const currentMatchIds: string[] = []
                const currentStageRounds = getRoundsForStage(data.stage)

                for (let i = 0; i < pairs.length; i++) {
                    const pair = pairs[i]

                    const candidateA = await tx.candidate.create({
                        data: { name: pair.candidateA },
                    })
                    const candidateB = await tx.candidate.create({
                        data: { name: pair.candidateB },
                    })

                    const match = await createMatchWithRounds(tx, {
                        tournamentId: data.tournamentId,
                        name: `${stageLabels[data.stage]} #${i + 1}`,
                        stage: data.stage,
                        roundsCount: currentStageRounds,
                        judgeIds: data.judgeIds,
                        candidateAId: candidateA.id,
                        candidateBId: candidateB.id,
                        roundStatus: 'OPEN', // Rounds du stage courant ouverts
                    })

                    currentMatchIds.push(match.id)
                }

                // ═══════════════════════════════════════════════
                // 2. Créer les matchs des stages SUIVANTS (vides) et chaîner
                // ═══════════════════════════════════════════════════
                let previousMatchIds = currentMatchIds

                for (let idx = currentStageIdx + 1; idx < STAGE_ORDER.length; idx++) {
                    const nextStage = STAGE_ORDER[idx]
                    const nextStageRounds = getRoundsForStage(nextStage)
                    const nextCount = Math.ceil(previousMatchIds.length / 2)

                    // Vérifier s'il existe déjà des matchs de ce stage pour ce tournoi
                    const existing = await tx.match.findMany({
                        where: {
                            tournamentId: data.tournamentId,
                            stage: nextStage,
                        },
                        orderBy: { createdAt: 'asc' },
                    })

                    const nextMatchIds: string[] = existing.map((m: any) => m.id)

                    // Créer les matchs manquants avec le nombre de rounds spécifique à cette étape
                    for (let i = nextMatchIds.length; i < nextCount; i++) {
                        const newMatch = await createMatchWithRounds(tx, {
                            tournamentId: data.tournamentId,
                            name: `${stageLabels[nextStage]} #${i + 1}`,
                            stage: nextStage,
                            roundsCount: nextStageRounds,
                            judgeIds: data.judgeIds,
                            roundStatus: 'PENDING', // Rounds des stages suivants en attente
                        })
                        nextMatchIds.push(newMatch.id)
                    }

                    // ═══════════════════════════════════════════════
                    // 3. Chaîner : chaque paire de matchs précédents → 1 match suivant
                    //    - pair[0] (idx 0) → nextMatchAId du match suivant
                    //    - pair[1] (idx 1) → nextMatchBId du match suivant
                    // ═══════════════════════════════════════════════
                    for (let i = 0; i < previousMatchIds.length; i++) {
                        const nextIdx = Math.floor(i / 2)
                        const nextMatchId = nextMatchIds[nextIdx]
                        if (!nextMatchId) continue

                        const isSlotA = i % 2 === 0

                        await tx.match.update({
                            where: { id: previousMatchIds[i] },
                            data: isSlotA
                                ? { nextMatchAId: nextMatchId }
                                : { nextMatchBId: nextMatchId },
                        })
                    }

                    // Passer au tour suivant pour la boucle
                    previousMatchIds = nextMatchIds
                }

                return currentMatchIds
            },
            {
                maxWait: 10000,
                timeout: 30000,
            }
        )

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'bulk match creation',
                metadata: {
                    count: created.length,
                    stage: data.stage,
                    stageRounds: data.stageRounds ?? { default: data.roundsCount ?? 3 },
                    shuffled: true,
                    chained: true,
                },
            },
        })

        return NextResponse.json({ created: created.length }, { status: 201 })
    } catch (e) {
        console.error('❌ [matches/bulk] erreur:', e)
        return NextResponse.json(
            {
                error: 'Création impossible',
                details: e instanceof Error ? e.message : String(e),
            },
            { status: 400 }
        )
    }
}