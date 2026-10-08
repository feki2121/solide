import { NextResponse } from 'next/server'
import { currentUser } from '@/lib/auth'

export async function GET(request: Request) {
    const user = await currentUser(request as any)
    if (!user) {
        return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }
    return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        judge: user.judge,
    })
}