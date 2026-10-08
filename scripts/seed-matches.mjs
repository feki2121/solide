import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    // ────────────────────────────────────────────────
    // 1. Récupérer le user juge (créé précédemment)
    // ────────────────────────────────────────────────
    const user = await prisma.user.findUnique({
        where: { email: 'test@dancebattle.fr' },
    })
    if (!user) throw new Error('User test@dancebattle.fr introuvable. Lance create-user.mjs d\'abord.')

    // Créer le profil Judge s'il n'existe pas
    const judge = await prisma.judge.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, active: true },
    })
    console.log('👤 Judge:', judge.id)

    // ────────────────────────────────────────────────
    // 2. Candidats
    // ────────────────────────────────────────────────
    const [nova, volt] = await Promise.all([
        prisma.candidate.create({ data: { name: 'B-Boy Nova', country: 'FR', seed: 1 } }),
        prisma.candidate.create({ data: { name: 'B-Girl Volt', country: 'JP', seed: 2 } }),
    ])
    console.log('🕺 Candidats:', nova.name, 'vs', volt.name)

    // ────────────────────────────────────────────────
    // 3. Tournoi
    // ────────────────────────────────────────────────
    const tournament = await prisma.tournament.create({
        data: { name: 'Test Battle 2025', status: 'ACTIVE' },
    })
    console.log('🏆 Tournoi:', tournament.id)

    // ────────────────────────────────────────────────
    // 4. Match (avec candidats + assignation juge)
    // ────────────────────────────────────────────────
    const match = await prisma.match.create({
        data: {
            tournamentId: tournament.id,
            name: 'Quarter Final #1',
            stage: 'QUARTER_FINAL',
            candidateAId: nova.id,
            candidateBId: volt.id,
            assignments: {
                create: { judgeId: judge.id },
            },
        },
    })
    console.log('⚔️  Match:', match.id)

    // ────────────────────────────────────────────────
    // 5. Round 1 (CLOSED + critères + résultat)
    // ────────────────────────────────────────────────
    const round1 = await prisma.round.create({
        data: {
            matchId: match.id,
            number: 1,
            status: 'CLOSED',
            startedAt: new Date(Date.now() - 60 * 60 * 1000),
            closedAt: new Date(Date.now() - 30 * 60 * 1000),
            criteria: {
                create: [
                    { name: 'technique', weight: 0.25 },
                    { name: 'vocabulary', weight: 0.20 },
                    { name: 'originality', weight: 0.20 },
                    { name: 'musicality', weight: 0.20 },
                    { name: 'execution', weight: 0.15 },
                ],
            },
        },
    })
    await prisma.roundResult.create({
        data: {
            roundId: round1.id,
            candidateAScore: 78.5,
            candidateBScore: 71.2,
            winnerId: nova.id,
        },
    })
    console.log('🔒 Round 1 CLOSED (avec résultat)')

    // ────────────────────────────────────────────────
    // 6. Round 2 (OPEN pour tester le vote)
    // ────────────────────────────────────────────────
    const round2 = await prisma.round.create({
        data: {
            matchId: match.id,
            number: 2,
            status: 'OPEN',
            startedAt: new Date(),
            criteria: {
                create: [
                    { name: 'technique', weight: 0.25 },
                    { name: 'vocabulary', weight: 0.20 },
                    { name: 'originality', weight: 0.20 },
                    { name: 'musicality', weight: 0.20 },
                    { name: 'execution', weight: 0.15 },
                ],
            },
        },
    })
    console.log('🔓 Round 2 OPEN (prêt à voter)')

    console.log('\n✅ Seed terminé.')
    console.log('   Match ID  :', match.id)
    console.log('   Round OPEN:', round2.id)
    console.log('\n👉 Teste maintenant :')
    console.log('   POST http://192.168.1.50:3000/api/auth/login')
    console.log('   GET  http://192.168.1.50:3000/api/matches')
}

main()
    .catch((e) => { console.error('❌', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())