import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import { prisma } from './prisma'

const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET)
export async function hashPassword(password: string) { return bcrypt.hash(password, 12) }
export async function verifyPassword(password: string, hash: string) { return bcrypt.compare(password, hash) }
export async function issueToken(user: { id: string; role: string }) { return new SignJWT({ role: user.role }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime('7d').sign(secret) }
export async function currentUser(request: NextRequest) {
  const header = request.headers.get('authorization')
  const token = header?.startsWith('Bearer ') ? header.slice(7) : request.cookies.get('clash_token')?.value
  if (!token) return null
  try { const { payload } = await jwtVerify(token, secret); return prisma.user.findUnique({ where: { id: String(payload.sub) }, include: { judge: true } }) } catch { return null }
}
export async function requireUser(request: NextRequest, role?: 'ADMIN' | 'JUDGE') { const user = await currentUser(request); if (!user || (role && user.role !== role)) throw new Error('UNAUTHORIZED'); return user }
