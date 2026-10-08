import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'

const input = z.object({ name: z.string().min(1).optional(), country: z.string().nullable().optional(), seed: z.number().int().nullable().optional() })
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const candidate = await prisma.candidate.findUnique({ where: { id }, include: { matchesA: true, matchesB: true, wins: true } }); return candidate ? NextResponse.json(candidate) : NextResponse.json({ error: 'Candidat introuvable' }, { status: 404 }) }
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(request as any, 'ADMIN'); const { id } = await params; const candidate = await prisma.candidate.update({ where: { id }, data: input.parse(await request.json()) }); await prisma.auditLog.create({ data: { userId: user.id, action: 'candidate update', entityId: id } }); return NextResponse.json(candidate) } catch { return NextResponse.json({ error: 'Accès refusé ou données invalides' }, { status: 400 }) } }
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(request as any, 'ADMIN'); const { id } = await params; await prisma.candidate.delete({ where: { id } }); await prisma.auditLog.create({ data: { userId: user.id, action: 'candidate deletion', entityId: id } }); return NextResponse.json({ success: true }) } catch { return NextResponse.json({ error: 'Accès refusé ou candidat introuvable' }, { status: 400 }) } }
