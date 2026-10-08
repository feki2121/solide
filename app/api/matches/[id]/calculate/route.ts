import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireUser } from '@/lib/auth'
import { calculateMatchResult } from '@/lib/tournament'
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) { try { const user = await requireUser(request as any, 'ADMIN'); const { id } = await params; const result = await calculateMatchResult(id); await prisma.auditLog.create({ data: { userId: user.id, action: 'match calculated', entityId: id } }); return NextResponse.json(result) } catch (error) { return NextResponse.json({ error: error instanceof Error && error.message === 'MATCH_NOT_READY' ? 'Match non prêt' : 'Calcul impossible' }, { status: 409 }) } }
