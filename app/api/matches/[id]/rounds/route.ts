import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return NextResponse.json(await prisma.round.findMany({ where: { matchId: id }, include: { criteria: true, result: true }, orderBy: { number: 'asc' } })) }
