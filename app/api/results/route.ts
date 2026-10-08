import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) { const tournamentId = new URL(request.url).searchParams.get('tournamentId'); const results = await prisma.matchResult.findMany({ where: tournamentId ? { match: { tournamentId } } : undefined, include: { match: { include: { candidateA: true, candidateB: true } }, }, orderBy: { calculatedAt: 'desc' } }); return NextResponse.json(results) }
