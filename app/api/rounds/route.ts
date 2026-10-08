// app/api/rounds/route.ts
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

const input = z.object({
    matchId: z.string(),
    number: z.number().int().positive(),
    status: z.enum(['PENDING', 'OPEN']).default('PENDING'),
    criteria: z.array(z.object({
        name: z.string().min(1),
        weight: z.number().min(0).max(1),
    })).min(1),
})

export async function POST(request: Request) {
    let user
    try { user = await requireUser(request as any, 'ADMIN') }
    catch { return NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }

    try {
        const data = input.parse(await request.json())
        const round = await prisma.round.create({
            data: {
                matchId: data.matchId,
                number: data.number,
                status: data.status,
                startedAt: data.status === 'OPEN' ? new Date() : null,
                criteria: { create: data.criteria },
            },
            include: { criteria: true },
        })
        await prisma.auditLog.create({ data: { userId: user.id, action: 'round creation', entityId: round.id } })
        return NextResponse.json(round, { status: 201 })
    } catch {
        return NextResponse.json({ error: 'Données invalides ou numéro déjà utilisé' }, { status: 400 })
    }
}