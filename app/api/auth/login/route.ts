import { NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { issueToken, verifyPassword } from '@/lib/auth'

const schema = z.object({ email: z.string().email(), password: z.string().min(8) })

export async function POST(request: Request) {
    try {
        const body = await request.json()
        const input = schema.parse(body)

        const user = await prisma.user.findUnique({ where: { email: input.email } })
        if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
            return NextResponse.json({ error: 'Identifiants invalides' }, { status: 401 })
        }

        const accessToken = await issueToken(user)
        await prisma.auditLog.create({ data: { userId: user.id, action: 'login' } })

        const response = NextResponse.json({
            accessToken,
            user: { id: user.id, name: user.name, email: user.email, role: user.role },
        })

        // 👇 Pose un cookie HttpOnly lisible par le serveur (pas par JS)
        response.cookies.set('clash_token', accessToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/',
            maxAge: 60 * 60 * 24 * 7, // 7 jours
        })

        return response
    } catch (err) {
        console.error('❌ login error:', err)
        return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    }
}