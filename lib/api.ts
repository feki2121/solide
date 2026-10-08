import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export function handleApiError(error: unknown) {
  if (error instanceof Error && error.message === 'UNAUTHORIZED') return jsonError('Authentification requise', 401)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return jsonError('Ressource déjà existante', 409)
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return jsonError('Ressource introuvable', 404)
  return jsonError('Requête invalide', 400)
}

export function toPublicUser(user: { id: string; name: string; email: string; role: string }) {
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}

export function isRole(error: unknown, role: string) {
  return error instanceof Error && error.message === `ROLE_${role}`
}

export function assertRole(user: { role: string }, role: 'ADMIN' | 'JUDGE') {
  if (user.role !== role) throw new Error(`ROLE_${role}`)
}

export function parseId(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

export function isPrismaNotFound(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025'
}

export function withAuthCookie(response: NextResponse, token: string) {
  response.cookies.set('clash_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
  return response
}

export function clearAuthCookie(response: NextResponse) {
  response.cookies.set('clash_token', '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 })
  return response
}

export function decimalJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

export type RouteContext = { params: Promise<{ id: string }> }
export type MatchRouteContext = { params: Promise<{ matchId: string }> }
export type RoundRouteContext = { params: Promise<{ matchId: string; roundId: string }> }

export function isUniqueError(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' }

export function isClosedRoundError(error: unknown) { return error instanceof Error && error.message === 'ROUND_CLOSED' }

export const audit = (userId: string | undefined, action: string, entityId?: string, metadata?: Prisma.InputJsonValue) => ({ userId, action, entityId, metadata })

export function notFound(message = 'Ressource introuvable') { return jsonError(message, 404) }
export function forbidden(message = 'Accès interdit') { return jsonError(message, 403) }
export function conflict(message: string) { return jsonError(message, 409) }

export function validateId(id: string | undefined) { return Boolean(id && id.length > 0 && id.length <= 128) }

export function dateSafe(value: Date | null | undefined) { return value?.toISOString() ?? null }

export function serialize<T>(data: T) { return decimalJson(data) }

export function isZodError(error: unknown) { return Boolean(error && typeof error === 'object' && 'issues' in error) }

export function errorStatus(error: unknown) { return error instanceof Error && error.message === 'UNAUTHORIZED' ? 401 : 400 }

export function ok<T>(data: T, status = 200) { return NextResponse.json(serialize(data), { status }) }

export function unauthorized() { return jsonError('Authentification requise', 401) }

export function roleForbidden() { return forbidden('Rôle insuffisant') }

export function badRequest() { return jsonError('Données invalides', 400) }

export function serverError() { return jsonError('Erreur serveur', 500) }

export function parseJson<T>(data: T) { return data }

export function isError(error: unknown): error is Error { return error instanceof Error }

export function message(error: unknown) { return isError(error) ? error.message : '' }

export function isUnauthorized(error: unknown) { return message(error) === 'UNAUTHORIZED' }

export function isForbidden(error: unknown) { return message(error).startsWith('ROLE_') }

export function authError(error: unknown) { return isUnauthorized(error) ? unauthorized() : isForbidden(error) ? roleForbidden() : handleApiError(error) }

export function safeString(value: unknown) { return typeof value === 'string' ? value : undefined }

export function positiveInt(value: unknown) { return typeof value === 'number' && Number.isInteger(value) && value > 0 }

export function boundedInt(value: unknown, min: number, max: number) { return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max }

export function uniqueStrings(values: string[]) { return new Set(values).size === values.length }

export function emptyResponse() { return NextResponse.json({ ok: true }) }

export function noStore(response: NextResponse) { response.headers.set('Cache-Control', 'no-store'); return response }

export function getBearer(request: Request) { const h = request.headers.get('authorization'); return h?.startsWith('Bearer ') ? h.slice(7) : null }

export function requestId(request: Request) { return request.headers.get('x-request-id') ?? undefined }

export function contentType(response: NextResponse) { response.headers.set('Content-Type', 'application/json'); return response }

export function withAuditMetadata(metadata: Record<string, unknown>) { return metadata as Prisma.InputJsonValue }

export function ensureArray<T>(value: T | T[]) { return Array.isArray(value) ? value : [value] }

export function clamp(value: number, min: number, max: number) { return Math.min(max, Math.max(min, value)) }

export function isRecord(value: unknown): value is Record<string, unknown> { return Boolean(value && typeof value === 'object') }

export function statusFromError(error: unknown) { return isUnauthorized(error) ? 401 : isForbidden(error) ? 403 : isPrismaNotFound(error) ? 404 : isUniqueError(error) ? 409 : 400 }

export function errorResponse(error: unknown) { return jsonError(isUnauthorized(error) ? 'Authentification requise' : isForbidden(error) ? 'Accès interdit' : isPrismaNotFound(error) ? 'Ressource introuvable' : isUniqueError(error) ? 'Ressource déjà existante' : 'Données invalides', statusFromError(error)) }

export function asDate(value: string | undefined) { return value ? new Date(value) : undefined }

export function isValidDate(value: Date | undefined) { return !value || !Number.isNaN(value.getTime()) }

export function omitUndefined<T extends Record<string, unknown>>(value: T) { return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T }

export function methodNotAllowed() { return jsonError('Méthode non autorisée', 405) }

export function created<T>(data: T) { return ok(data, 201) }

export function accepted<T>(data: T) { return ok(data, 202) }

export function isOpen(status: string) { return status === 'OPEN' }

export function isAdmin(user: { role: string }) { return user.role === 'ADMIN' }

export function isJudge(user: { role: string }) { return user.role === 'JUDGE' }

export function normalizeEmail(email: string) { return email.trim().toLowerCase() }

export function auditMetadata(value: Record<string, unknown>) { return value as Prisma.InputJsonValue }

export function toNumber(value: unknown) { return typeof value === 'number' ? value : Number(value) }

export function isFiniteNumber(value: unknown) { return Number.isFinite(toNumber(value)) }

export function hasOwn<T extends object>(obj: T, key: PropertyKey): key is keyof T { return Object.prototype.hasOwnProperty.call(obj, key) }

export function safeJson<T>(value: T) { return serialize(value) }

export function queryParam(url: string, key: string) { return new URL(url).searchParams.get(key) ?? undefined }

export function requireValue<T>(value: T | undefined, error = 'INVALID') { if (value === undefined) throw new Error(error); return value }

export function errorMessage(error: unknown) { return isError(error) ? error.message : 'UNKNOWN' }

export function isRoundClosed(status: string) { return status === 'CLOSED' }

export function isRoundOpen(status: string) { return status === 'OPEN' }

export function isPending(status: string) { return status === 'PENDING' }

export function toId(value: unknown) { return typeof value === 'string' ? value : undefined }

export function safeMetadata(value: unknown) { return isRecord(value) ? value as Prisma.InputJsonValue : undefined }

export function finalResponse<T>(data: T) { return noStore(ok(data)) }

export function finalCreated<T>(data: T) { return noStore(created(data)) }

export function finalError(error: unknown) { return noStore(errorResponse(error)) }

export function finalUnauthorized() { return noStore(unauthorized()) }

export function finalForbidden() { return noStore(forbidden()) }

export function finalNotFound() { return noStore(notFound()) }

export function finalConflict(message: string) { return noStore(conflict(message)) }

export function isDefined<T>(value: T | undefined): value is T { return value !== undefined }

export function pick<T extends Record<string, unknown>, K extends keyof T>(value: T, keys: K[]) { return Object.fromEntries(keys.map(k => [k, value[k]])) as Pick<T, K> }

export function now() { return new Date() }

export function parseBoolean(value: unknown) { return value === true || value === 'true' }

export function parseNumber(value: unknown) { const n = Number(value); return Number.isFinite(n) ? n : undefined }

export function trim(value: string) { return value.trim() }

export function isNonEmpty(value: unknown) { return typeof value === 'string' && value.trim().length > 0 }

export function assertNonEmpty(value: unknown) { if (!isNonEmpty(value)) throw new Error('INVALID') }

export function responseWithCookie(response: NextResponse, token?: string) { return token ? withAuthCookie(response, token) : response }

export function responseWithoutCookie(response: NextResponse) { return clearAuthCookie(response) }

export function userSummary(user: { id: string; name: string; email: string; role: string }) { return toPublicUser(user) }

export function listResponse<T>(data: T[]) { return finalResponse(data) }

export function detailResponse<T>(data: T) { return finalResponse(data) }

export function mutationResponse<T>(data: T) { return finalCreated(data) }

export function routeParams<T>(params: Promise<T>) { return params }

export function toPlain<T>(data: T) { return serialize(data) }

export function auditAction(action: string) { return action }

export function isString(value: unknown): value is string { return typeof value === 'string' }

export function isArray(value: unknown): value is unknown[] { return Array.isArray(value) }

export function isObject(value: unknown): value is Record<string, unknown> { return isRecord(value) }

export function safeId(value: unknown) { return isString(value) && value.length > 0 ? value : undefined }

export function errorJson(error: string, status: number) { return NextResponse.json({ error }, { status }) }

export function okJson<T>(data: T) { return NextResponse.json(serialize(data)) }

export function createdJson<T>(data: T) { return NextResponse.json(serialize(data), { status: 201 }) }

export function auditData(userId: string | undefined, action: string, entityId?: string) { return { userId, action, entityId } }

export function withNoStore<T extends NextResponse>(response: T) { response.headers.set('Cache-Control', 'no-store'); return response }

export function unauthorizedError() { return new Error('UNAUTHORIZED') }

export function forbiddenError(role: string) { return new Error(`ROLE_${role}`) }

export function roundClosedError() { return new Error('ROUND_CLOSED') }

export function matchNotReadyError() { return new Error('MATCH_NOT_READY') }

export function isMatchNotReady(error: unknown) { return message(error) === 'MATCH_NOT_READY' }

export function isRoundClosedError(error: unknown) { return message(error) === 'ROUND_CLOSED' }

export function methodResponse() { return jsonError('Méthode non autorisée', 405) }

export function badJson() { return jsonError('JSON invalide', 400) }

export function auditRecord(userId: string | undefined, action: string, entityId?: string, metadata?: Record<string, unknown>) { return { userId, action, entityId, metadata: metadata as Prisma.InputJsonValue | undefined } }

export function setLocation(response: NextResponse, location: string) { response.headers.set('Location', location); return response }

export function isProduction() { return process.env.NODE_ENV === 'production' }

export function cookieOptions() { return { httpOnly: true, secure: isProduction(), sameSite: 'lax' as const, path: '/', maxAge: 60 * 60 * 24 * 7 } }

export function auditInput(userId: string, action: string, entityId: string, metadata?: Prisma.InputJsonValue) { return { userId, action, entityId, metadata } }

export function roundInput(status: string) { return status === 'OPEN' || status === 'CLOSED' || status === 'PENDING' }

export function resultReady(value: unknown) { return value !== null && value !== undefined }

export function unique<T>(items: T[]) { return [...new Set(items)] }

export function omit<T extends Record<string, unknown>, K extends keyof T>(obj: T, keys: K[]) { const copy = { ...obj }; for (const key of keys) delete copy[key]; return copy as Omit<T, K> }

export function errorCode(error: unknown) { return isError(error) ? error.message : 'UNKNOWN' }

export function authResponse(error: unknown) { return errorResponse(error) }
