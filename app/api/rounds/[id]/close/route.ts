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
      include: { votes: true, result: true },   // 👈 ajoute result
    })

    if (!round) return NextResponse.json({ error: 'Round introuvable' }, { status: 404 })

    // 👇 Autorise si : OPEN, ou CLOSED sans résultat (réparation)
    const canClose = round.status === 'OPEN' || (round.status === 'CLOSED' && !round.result)
    if (!canClose) {
      return NextResponse.json({ error: 'Round déjà fermé et calculé' }, { status: 409 })
    }

    // if (round.votes.length !== 15) {
    //   return NextResponse.json({ error: 'Votes incomplets: 15 votes requis' }, { status: 409 })
    // }

    const closed = await prisma.round.update({
      where: { id },
      data: { status: 'CLOSED', closedAt: round.closedAt ?? new Date() },
    })

    const result = await calculateRoundResult(id)

    await prisma.auditLog.create({
      data: { userId: user.id, action: 'round closed and calculated', entityId: id, metadata: { votes: round.votes.length } },
    })

    return NextResponse.json({ round: closed, result })
  } catch (error) {
    console.error('❌ [round-close] erreur:', error)
    // ...
  }
}
// export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
//   try {
//     const user = await currentUser(request as any)
//     if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
//     if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
//     const { id } = await params
//     const round = await prisma.round.findUnique({ where: { id }, include: { votes: true } })
//     if (!round) return NextResponse.json({ error: 'Round introuvable' }, { status: 404 })
//     if (round.status !== 'OPEN') return NextResponse.json({ error: 'Le round doit être ouvert' }, { status: 409 })
//     if (round.votes.length !== 15) return NextResponse.json({ error: 'Votes incomplets: 15 votes requis' }, { status: 409 })
//     const closed = await prisma.round.update({ where: { id }, data: { status: 'CLOSED', closedAt: new Date() } })
//     const result = await calculateRoundResult(id)
//     await prisma.auditLog.create({ data: { userId: user.id, action: 'round closed and calculated', entityId: id, metadata: { votes: round.votes.length } } })
//     return NextResponse.json({ round: closed, result })
//   } catch (error) {
//     console.error('❌ [round-close] erreur:', error)

//     if (error instanceof Error && error.message === 'UNAUTHORIZED') {
//       return NextResponse.json({ error: 'Non authentifié ou accès refusé' }, { status: 401 })
//     }
//     if (error instanceof Error && error.message === 'INCOMPLETE_VOTES') {
//       return NextResponse.json({ error: 'Votes incomplets: 15 votes requis' }, { status: 409 })
//     }
//     if (error instanceof Error && 'code' in error && error.code === 'P2025') {
//       return NextResponse.json({ error: 'Round introuvable' }, { status: 404 })
//     }

//     // 👇 Pour voir la vraie cause en dev
//     return NextResponse.json(
//       {
//         error: 'Opération impossible',
//         detail: error instanceof Error ? error.message : String(error),
//         stack: error instanceof Error ? error.stack : undefined,
//       },
//       { status: 500 },
//     )
//   }
// }
