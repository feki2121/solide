import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
    const email = 'ahmed@gmail.com'
    const password = 'feki2121'

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
        data: {
            email,
            passwordHash,
            name: 'Test admin',
            role: 'ADMIN', // ⚠️ doit matcher ton enum Prisma
        },
    })

    console.log('✅ Created:', user.email, '| role:', user.role)
}

main()
    .catch((e) => { console.error('❌', e.message); process.exit(1) })
    .finally(() => prisma.$disconnect())