import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { hashPassword, requireUser } from '@/lib/auth'

const input = z.object({ email: z.string().email(), name: z.string().min(1), password: z.string().min(8), active: z.boolean().optional() })

export async function GET(request: Request) {
  try { await requireUser(request as any, 'ADMIN'); return NextResponse.json(await prisma.judge.findMany({ include: { user: { select: { id: true, name: true, email: true, role: true } }, assignments: { select: { match: { select: { id: true, name: true, tournamentId: true } } } } } })) }
  catch { return NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
}

export async function POST(request: Request) {
  try { const admin = await requireUser(request as any, 'ADMIN'); const data = input.parse(await request.json()); const user = await prisma.user.create({ data: { email: data.email, name: data.name, passwordHash: await hashPassword(data.password), role: 'JUDGE', judge: { create: { active: data.active ?? true } } }, include: { judge: true } }); await prisma.auditLog.create({ data: { userId: admin.id, action: 'judge creation', entityId: user.judge!.id } }); return NextResponse.json({ id: user.judge!.id, user: { id: user.id, name: user.name, email: user.email }, active: user.judge!.active }, { status: 201 }) }
  catch (error) { return NextResponse.json({ error: error instanceof z.ZodError ? 'Données invalides' : 'Impossible de créer le juge' }, { status: 400 }) }
}
