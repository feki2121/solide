import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(request as any, 'ADMIN'); const { id } = await params; const round = await prisma.round.update({ where: { id }, data: { status: 'OPEN', startedAt: new Date(), closedAt: null } }); await prisma.auditLog.create({ data: { userId: user.id, action: 'round opened', entityId: id } }); return NextResponse.json(round) } catch { return NextResponse.json({ error: 'Accès refusé ou round introuvable' }, { status: 400 }) } }
