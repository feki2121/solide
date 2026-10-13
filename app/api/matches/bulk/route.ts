import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { z } from 'zod'

const STAGES = ['QUALIFICATION', 'QUARTER_FINAL', 'SEMI_FINAL', 'FINAL'] as const

const input = z.object({
    tournamentId: z.string(),
    stage: z.enum(STAGES),
    roundsCount: z.number().int().min(1).max(10),
    candidateNames: z.array(z.string().min(1)).min(2),
    judgeIds: z.array(z.string()).optional(),
})

const stageLabels: Record<string, string> = {
    QUALIFICATION: 'Qualification',
    QUARTER_FINAL: 'Quart de finale',
    SEMI_FINAL: 'Demi-finale',
    FINAL: 'Finale',
}

/** Shuffle Fisher-Yates. */
function shuffle<T>(array: T[]): T[] {
    const arr = [...array]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
}

export async function POST(request: Request) {
    let user
    try {
        user = await requireUser(request as any, 'ADMIN')
    } catch {
        return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    let data
    try {
        data = input.parse(await request.json())
    } catch (e) {
        if (e instanceof z.ZodError) {
            return NextResponse.json({ error: 'Données invalides', details: e.flatten() }, { status: 400 })
        }
        return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    if (data.candidateNames.length % 2 !== 0) {
        return NextResponse.json(
            { error: 'Il faut un nombre pair de candidats.' },
            { status: 400 }
        )
    }

    // Mélange les noms
    const shuffled = shuffle(data.candidateNames)

    // Forme les paires
    const pairs: { candidateA: string; candidateB: string }[] = []
    for (let i = 0; i < shuffled.length; i += 2) {
        pairs.push({ candidateA: shuffled[i], candidateB: shuffled[i + 1] })
    }

    try {
        const created = await prisma.$transaction(async (tx) => {
            const results = []

            for (let i = 0; i < pairs.length; i++) {
                const pair = pairs[i]

                const candidateA = await tx.candidate.create({ data: { name: pair.candidateA } })
                const candidateB = await tx.candidate.create({ data: { name: pair.candidateB } })

                const match = await tx.match.create({
                    data: {
                        tournamentId: data.tournamentId,
                        name: `${stageLabels[data.stage]} #${i + 1}`,
                        stage: data.stage,
                        candidateAId: candidateA.id,
                        candidateBId: candidateB.id,
                        assignments: data.judgeIds?.length
                            ? { create: data.judgeIds.map((judgeId) => ({ judgeId })) }
                            : undefined,
                    },
                })

                for (let r = 1; r <= data.roundsCount; r++) {
                    await tx.round.create({
                        data: {
                            matchId: match.id,
                            number: r,
                            status: 'OPEN',
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
                    })
                }

                results.push(match)
            }

            return results
        })

        await prisma.auditLog.create({
            data: {
                userId: user.id,
                action: 'bulk match creation',
                metadata: {
                    count: created.length,
                    stage: data.stage,
                    rounds: data.roundsCount,
                    shuffled: true,
                },
            },
        })

        return NextResponse.json({ created: created.length }, { status: 201 })
    } catch (e) {
        console.error('❌ [matches/bulk] erreur:', e)
        return NextResponse.json(
            { error: 'Création impossible', details: e instanceof Error ? e.message : String(e) },
            { status: 400 }
        )
    }
}