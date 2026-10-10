'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Trophy, Users, Swords, Clock } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { AdminLayout } from '@/components/ui/admin/Layout'

type Candidate = { id: string; name: string; country: string | null; seed: number | null }
type Round = {
    id: string
    number: number
    status: 'PENDING' | 'OPEN' | 'CLOSED'
    result: { candidateAScore: string; candidateBScore: string; winnerId: string | null } | null
}
type Match = {
    id: string
    name: string
    stage: 'QUALIFICATION' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'
    winnerId: string | null
    candidateA: Candidate | null
    candidateB: Candidate | null
    rounds: Round[]
    tournament: { id: string; name: string }
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Erreur.')
    return body
}

function currentRound(m: Match): Round | null {
    return m.rounds[m.rounds.length - 1] ?? null
}

function matchStatus(m: Match): 'PENDING' | 'OPEN' | 'CLOSED' {
    if (m.winnerId) return 'CLOSED'
    const r = currentRound(m)
    return r?.status ?? 'PENDING'
}

const stageConfig: Record<Match['stage'], { label: string; short: string; accent: string }> = {
    QUALIFICATION: { label: 'Qualification', short: 'Q', accent: 'from-teal-500 to-cyan-500' },
    QUARTER_FINAL: { label: 'Quarts de finale', short: 'QF', accent: 'from-sky-500 to-indigo-500' },
    SEMI_FINAL: { label: 'Demi-finales', short: 'SF', accent: 'from-violet-500 to-fuchsia-500' },
    FINAL: { label: 'Finale', short: 'F', accent: 'from-amber-500 to-orange-500' },
}

export default function BracketPage() {
    const searchParams = useSearchParams()
    const tournamentId = searchParams.get('tournamentId')

    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [tournamentName, setTournamentName] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const url = tournamentId
                ? `/api/matches?tournamentId=${tournamentId}`
                : '/api/matches'

            const data = await readJson<Match[]>(
                await fetch(url, { cache: 'no-store' }),
            )
            setMatches(data)

            // Récupère le nom du tournoi si filtré
            if (tournamentId && data.length > 0) {
                const first = data[0] as any
                setTournamentName(first.tournament?.name ?? null)
            } else {
                setTournamentName(null)
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setLoading(false)
        }
    }, [tournamentId])

    useEffect(() => {
        void load()
    }, [load])


    const qualifications = matches
        .filter((m) => m.stage === 'QUALIFICATION')
        .sort((a, b) => a.id.localeCompare(b.id))
    const quarters = matches
        .filter((m) => m.stage === 'QUARTER_FINAL')
        .sort((a, b) => a.id.localeCompare(b.id))
    const semis = matches
        .filter((m) => m.stage === 'SEMI_FINAL')
        .sort((a, b) => a.id.localeCompare(b.id))
    const final = matches.filter((m) => m.stage === 'FINAL')[0] ?? null

    const hasAny =
        qualifications.length + quarters.length + semis.length + (final ? 1 : 0) > 0

    return (
        <AdminLayout>
            <header className="flex h-auto flex-col gap-3 border-b border-[#fee2e2] bg-white/80 backdrop-blur px-4 py-4 sm:h-[76px] sm:flex-row sm:items-center sm:justify-between sm:px-8 sm:py-0 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sticky top-0 z-10">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                        {tournamentName ? `Tournoi · ${tournamentName}` : 'Compétition'}
                    </p>
                    <h1 className="mt-0.5 text-[20px] font-black tracking-tight text-[#0f172a]">
                        {tournamentName ? 'Tableau filtré' : 'Tableau du tournoi'}
                    </h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    {tournamentId && (
                        <Link
                            href="/bracket"
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-[#64748b] hover:bg-slate-50"
                        >
                            Voir tous les tournois
                        </Link>
                    )}
                    <span className="inline-flex rounded-full bg-[#fff1f2] border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-[#e63946]">
                        {matches.length} match{matches.length > 1 ? 's' : ''}
                    </span>
                    <Link
                        href="/matches"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#e63946] hover:bg-[#fff1f2] hover:border-[#ff6b4a] transition-all"
                    >
                        Gérer <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-8 sm:py-7">
                {error && (
                    <div className="mb-5 rounded-2xl border border-rose-200 bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#dc2626] shadow-2xs">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-2xl border border-rose-100 bg-white p-10 text-center text-sm font-medium text-[#64748b]">
                        Chargement…
                    </div>
                ) : !hasAny ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                        <Trophy className="size-9 text-[#ff6b4a]" />
                        <p className="text-sm font-bold text-[#0f172a]">Aucun match dans le tableau</p>
                        <p className="text-xs text-[#64748b]">
                            Créez des matchs avec les stages quart, demi et finale.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Desktop bracket */}
                        <div className="hidden lg:block overflow-x-auto pb-4">
                            <div className="mx-auto flex min-w-[1080px] items-stretch gap-4 xl:gap-6">
                                {qualifications.length > 0 && (
                                    <>
                                        <BracketColumn
                                            stage="QUALIFICATION"
                                            badge={`${qualifications.length}`}
                                            matches={qualifications}
                                        />
                                        <ColumnConnector count={qualifications.length} />
                                    </>
                                )}
                                <BracketColumn
                                    stage="QUARTER_FINAL"
                                    badge={`${quarters.length}/4`}
                                    matches={quarters}
                                />
                                <ColumnConnector count={quarters.length} />
                                <BracketColumn
                                    stage="SEMI_FINAL"
                                    badge={`${semis.length}/2`}
                                    matches={semis}
                                />
                                <ColumnConnector count={semis.length} />
                                <BracketColumn
                                    stage="FINAL"
                                    badge={final ? (final.winnerId ? 'Terminée' : 'En cours') : '0/1'}
                                    matches={final ? [final] : []}
                                    isFinal
                                />
                            </div>
                        </div>

                        {/* Mobile / tablet : liste verticale par stage */}
                        <div className="flex flex-col gap-8 lg:hidden">
                            {qualifications.length > 0 && (
                                <MobileStageSection
                                    stage="QUALIFICATION"
                                    badge={`${qualifications.length}`}
                                    matches={qualifications}
                                />
                            )}
                            <MobileStageSection
                                stage="QUARTER_FINAL"
                                badge={`${quarters.length}/4`}
                                matches={quarters}
                            />
                            <MobileStageSection
                                stage="SEMI_FINAL"
                                badge={`${semis.length}/2`}
                                matches={semis}
                            />
                            <MobileStageSection
                                stage="FINAL"
                                badge={final ? (final.winnerId ? 'Terminée' : 'En cours') : '0/1'}
                                matches={final ? [final] : []}
                                isFinal
                            />
                        </div>
                    </>
                )}
            </div>
        </AdminLayout>
    )
}

/* ────────── Colonne du bracket (desktop) ────────── */

function BracketColumn({
    stage,
    badge,
    matches,
    isFinal = false,
}: {
    stage: Match['stage']
    badge: string
    matches: Match[]
    isFinal?: boolean
}) {
    const config = stageConfig[stage]
    const slots = isFinal ? 1 : matches.length === 1 ? 2 : matches.length || 1

    return (
        <div className="flex flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br ${config.accent} text-[10px] font-black text-white shadow-sm`}
                    >
                        {config.short}
                    </span>
                    <h2 className="text-xs font-extrabold uppercase tracking-[.18em] text-[#0f172a]">
                        {config.label}
                    </h2>
                </div>
                <span className="rounded-full bg-white border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-[#e63946] shadow-2xs">
                    {badge}
                </span>
            </div>

            <div className="flex flex-1 flex-col justify-around gap-4">
                {Array.from({ length: slots }).map((_, i) => {
                    const match = matches[i]
                    return match ? (
                        <MatchCard key={match.id} match={match} highlight={isFinal} />
                    ) : (
                        <EmptySlot key={i} />
                    )
                })}
            </div>
        </div>
    )
}

function ColumnConnector({ count }: { count: number }) {
    return (
        <div className="flex w-8 flex-col items-center justify-around py-10">
            {Array.from({ length: Math.max(1, Math.ceil(count / 2)) }).map((_, i) => (
                <div key={i} className="relative h-0.5 w-full rounded-full bg-gradient-to-r from-rose-200 via-rose-300 to-rose-200">
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 text-rose-300 text-xs">›</span>
                </div>
            ))}
        </div>
    )
}

/* ────────── Section mobile par stage ────────── */

function MobileStageSection({
    stage,
    badge,
    matches,
    isFinal = false,
}: {
    stage: Match['stage']
    badge: string
    matches: Match[]
    isFinal?: boolean
}) {
    const config = stageConfig[stage]
    const slots = isFinal ? 1 : matches.length || 1

    return (
        <section>
            <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br ${config.accent} text-[11px] font-black text-white shadow-sm`}
                    >
                        {config.short}
                    </span>
                    <h2 className="text-sm font-extrabold tracking-tight text-[#0f172a]">
                        {config.label}
                    </h2>
                </div>
                <span className="rounded-full bg-white border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-[#e63946] shadow-2xs">
                    {badge}
                </span>
            </div>

            <div className="flex flex-col gap-3">
                {Array.from({ length: slots }).map((_, i) => {
                    const match = matches[i]
                    return match ? (
                        <MatchCard key={match.id} match={match} highlight={isFinal} />
                    ) : (
                        <EmptySlot key={i} />
                    )
                })}
            </div>
        </section>
    )
}

/* ────────── Carte de match : Player A vs Player B ────────── */

function MatchCard({ match, highlight }: { match: Match; highlight?: boolean }) {
    const status = matchStatus(match)
    const round = currentRound(match)

    const scoreA = round?.result ? Number(round.result.candidateAScore) : null
    const scoreB = round?.result ? Number(round.result.candidateBScore) : null

    const isWinnerA = Boolean(match.winnerId && match.winnerId === match.candidateA?.id)
    const isWinnerB = Boolean(match.winnerId && match.winnerId === match.candidateB?.id)
    const isFinished = Boolean(match.winnerId)

    const statusBadge = {
        PENDING: { bg: '#f1f5f9', fg: '#64748b', label: 'En attente', Icon: Clock },
        OPEN: { bg: '#fff7ed', fg: '#ea580c', label: 'En cours', Icon: Swords },
        CLOSED: { bg: '#ecfdf5', fg: '#059669', label: 'Terminé', Icon: Trophy },
    }[status]

    const StatusIcon = statusBadge.Icon

    return (
        <Link
            href={`/vote/${match.id}`}
            className={`group relative block overflow-hidden rounded-2xl border bg-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 ${highlight && isFinished
                ? 'border-[#ff6b4a] shadow-[0_0_0_3px_rgba(255,107,74,0.18)]'
                : 'border-rose-100 hover:border-[#e63946]'
                }`}
        >
            {/* Barre d'accent top */}
            <div
                className={`h-1 w-full bg-gradient-to-r ${stageConfig[match.stage].accent}`}
                aria-hidden
            />

            <div className="p-3.5 sm:p-4">
                {/* Header */}
                <div className="mb-3 flex items-center justify-between gap-2">
                    <span className="truncate text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                        {match.name}
                    </span>
                    <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                        style={{
                            backgroundColor: statusBadge.bg,
                            color: statusBadge.fg,
                            borderColor: `${statusBadge.fg}30`,
                        }}
                    >
                        <StatusIcon className="size-3" />
                        {statusBadge.label}
                    </span>
                </div>

                {/* VS layout */}
                <div className="flex items-stretch gap-2 sm:gap-3">
                    <PlayerSide
                        candidate={match.candidateA}
                        score={scoreA}
                        isWinner={isWinnerA}
                        side="A"
                    />

                    <div className="flex w-10 shrink-0 flex-col items-center justify-center sm:w-12">
                        <span className="rounded-full border border-rose-100 bg-gradient-to-br from-rose-50 to-white px-2 py-1 text-[10px] font-black tracking-widest text-[#e63946] shadow-2xs">
                            VS
                        </span>
                    </div>

                    <PlayerSide
                        candidate={match.candidateB}
                        score={scoreB}
                        isWinner={isWinnerB}
                        side="B"
                    />
                </div>

                {isFinished && highlight && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/70 px-3 py-2">
                        <Trophy className="size-3.5 text-amber-600" />
                        <span className="text-[11px] font-bold text-amber-700">
                            Vainqueur du tournoi
                        </span>
                    </div>
                )}
            </div>
        </Link>
    )
}

function PlayerSide({
    candidate,
    score,
    isWinner,
    side,
}: {
    candidate: Candidate | null
    score: number | null
    isWinner: boolean
    side: 'A' | 'B'
}) {
    const rawName = candidate?.name ?? null
    const display =
        !rawName || /^(tbd|to be determined|à définir|en attente|pending)$/i.test(rawName)
            ? 'En attente'
            : rawName

    const initials = display === 'En attente'
        ? '?'
        : display
            .split(' ')
            .map((w) => w[0])
            .filter(Boolean)
            .slice(0, 2)
            .join('')
            .toUpperCase()

    const avatarBg = side === 'A'
        ? 'from-sky-400 to-indigo-500'
        : 'from-fuchsia-400 to-rose-500'

    return (
        <div
            className={`flex min-w-0 flex-1 flex-col items-center gap-2 rounded-xl border p-2.5 transition-all sm:flex-row sm:items-center sm:gap-3 sm:p-3 ${isWinner
                ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
                : 'border-slate-100 bg-[#fafafc] group-hover:border-rose-100'
                }`}
        >
            {/* Avatar */}
            <div
                className={`relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-black text-white shadow-sm ${isWinner ? 'from-emerald-400 to-emerald-600 ring-2 ring-emerald-200' : avatarBg
                    }`}
            >
                {initials}
                {isWinner && (
                    <span className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-white shadow ring-1 ring-emerald-200">
                        <Trophy className="size-2.5 text-emerald-600" />
                    </span>
                )}
            </div>

            {/* Infos */}
            <div className="flex min-w-0 flex-1 flex-col items-center text-center sm:items-start sm:text-left">
                <div className="flex max-w-full items-center gap-1.5">
                    <span
                        className={`truncate text-xs font-bold ${isWinner ? 'text-emerald-700' : 'text-[#0f172a]'
                            }`}
                        title={display}
                    >
                        {display}
                    </span>
                    {candidate?.seed != null && (
                        <span className="shrink-0 rounded-md bg-white border border-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-[#e63946]">
                            #{candidate.seed}
                        </span>
                    )}
                </div>
                {candidate?.country && (
                    <span className="mt-0.5 text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        {candidate.country}
                    </span>
                )}
            </div>

            {/* Score */}
            {score != null && (
                <span
                    className={`shrink-0 rounded-lg px-2 py-1 text-sm font-black tabular-nums ${isWinner
                        ? 'bg-emerald-500 text-white shadow-sm'
                        : 'bg-white border border-slate-200 text-[#64748b]'
                        }`}
                >
                    {score.toFixed(1)}
                </span>
            )}
        </div>
    )
}

function EmptySlot() {
    return (
        <div className="flex min-h-[110px] items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white/60 p-4">
            <div className="flex flex-col items-center gap-1.5">
                <Users className="size-4 text-rose-200" />
                <span className="text-[11px] font-semibold text-[#94a3b8]">
                    Match non défini
                </span>
            </div>
        </div>
    )
}