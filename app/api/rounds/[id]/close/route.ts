import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { currentUser } from '@/lib/auth'
import { calculateRoundResult } from '@/lib/tournament'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await currentUser(request as any)
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { id } = await params
    const round = await prisma.round.findUnique({
      where: { id },
      include: { votes: true, result: true },
    })

    if (!round) return NextResponse.json({ error: 'Round introuvable' }, { status: 404 })

    const canClose = round.status === 'OPEN' || (round.status === 'CLOSED' && !round.result)
    if (!canClose) {
      return NextResponse.json({ error: 'Round déjà fermé et calculé' }, { status: 409 })
    }

    // 👇 Aucune contrainte de nombre de votes — on ferme même avec 0 vote
    const closed = await prisma.round.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: round.closedAt ?? new Date() },
    })

    const result = await calculateRoundResult(id)

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'round closed and calculated',
        entityId: id,
        metadata: { votes: round.votes.length },
      },
    })

    return NextResponse.json({ round: closed, result })
  } catch (error) {
    console.error('❌ [round-close] erreur:', error)
    if (error instanceof Error && error.message === 'NO_VOTES') {
      return NextResponse.json(
        { error: 'Aucun vote enregistré pour ce round.' },
        { status: 409 },
      )
    }
    return NextResponse.json(
      {
        error: 'Opération impossible',
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}