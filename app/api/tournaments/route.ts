import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

const input = z.object({ name: z.string().min(1), status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED']).optional() })
export async function GET() { return NextResponse.json(await prisma.tournament.findMany({ include: { matches: true, winner: true }, orderBy: { createdAt: 'desc' } })) }
export async function POST(request: Request) { try { const user = await requireUser(request as any, 'ADMIN'); const data = input.parse(await request.json()); const tournament = await prisma.tournament.create({ data }); await prisma.auditLog.create({ data: { userId: user.id, action: 'tournament creation', entityId: tournament.id } }); return NextResponse.json(tournament, { status: 201 }) } catch { return NextResponse.json({ error: 'Accès refusé ou données invalides' }, { status: 400 }) } }
