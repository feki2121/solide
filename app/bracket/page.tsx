'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Trophy, Users } from 'lucide-react'

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
    stage: 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'
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

/** Dernier round d'un match. */
function currentRound(m: Match): Round | null {
    return m.rounds[m.rounds.length - 1] ?? null
}

/** Statut global du match (le plus « avancé »). */
function matchStatus(m: Match): 'PENDING' | 'OPEN' | 'CLOSED' {
    if (m.winnerId) return 'CLOSED'
    const r = currentRound(m)
    return r?.status ?? 'PENDING'
}

const stageConfig: Record<
    Match['stage'],
    { label: string; cols: number }
> = {
    QUARTER_FINAL: { label: 'Quarts de finale', cols: 4 },
    SEMI_FINAL: { label: 'Demi-finales', cols: 2 },
    FINAL: { label: 'Finale', cols: 1 },
}

export default function BracketPage() {
    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const data = await readJson<Match[]>(await fetch('/api/matches', { cache: 'no-store' }))
            setMatches(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    const quarters = matches
        .filter((m) => m.stage === 'QUARTER_FINAL')
        .sort((a, b) => a.id.localeCompare(b.id))
    const semis = matches
        .filter((m) => m.stage === 'SEMI_FINAL')
        .sort((a, b) => a.id.localeCompare(b.id))
    const final = matches.filter((m) => m.stage === 'FINAL')[0] ?? null

    const hasAny = quarters.length + semis.length + (final ? 1 : 0) > 0

    return (
        <AdminLayout>
            <header className="flex h-[76px] items-center justify-between border-b border-[#fee2e2] bg-white px-5 sm:px-8 shadow-2xs">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                        Compétition
                    </p>
                    <h1 className="mt-0.5 text-[20px] font-black tracking-tight text-[#0f172a]">Tableau du tournoi</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden rounded-full bg-[#fff1f2] border border-rose-200 px-3 py-1.5 text-[11px] font-bold text-[#e63946] sm:inline-flex">
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

            <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">
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
                    <div className="overflow-x-auto pb-4">
                        <div className="mx-auto flex min-w-[1000px] items-stretch gap-6">
                            <BracketColumn
                                title={stageConfig.QUARTER_FINAL.label}
                                badge={`${quarters.length}/4`}
                                matches={quarters}
                            />

                            <ColumnConnector />

                            <BracketColumn
                                title={stageConfig.SEMI_FINAL.label}
                                badge={`${semis.length}/2`}
                                matches={semis}
                            />

                            <ColumnConnector />

                            <BracketColumn
                                title={stageConfig.FINAL.label}
                                badge={final ? (final.winnerId ? 'Terminée' : 'En cours') : '0/1'}
                                matches={final ? [final] : []}
                                isFinal
                            />
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    )
}

/* ────────── Colonne du bracket ────────── */

function BracketColumn({
    title,
    badge,
    matches,
    isFinal = false,
}: {
    title: string
    badge: string
    matches: Match[]
    isFinal?: boolean
}) {
    const slots = isFinal ? 1 : matches.length === 1 ? 2 : matches.length || 1

    return (
        <div className="flex flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                    {title}
                </h2>
                <span className="rounded-full bg-rose-50 border border-rose-100 px-2.5 py-0.5 text-[10px] font-bold text-[#e63946]">
                    {badge}
                </span>
            </div>

            <div className={`flex flex-1 flex-col justify-around gap-4`}>
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

function ColumnConnector() {
    return (
        <div className="flex w-6 items-center justify-center">
            <div className="h-0.5 w-full bg-rose-200" />
        </div>
    )
}

/* ────────── Carte de match ────────── */

function MatchCard({ match, highlight }: { match: Match; highlight?: boolean }) {
    const status = matchStatus(match)
    const round = currentRound(match)

    const scoreA = round?.result ? Number(round.result.candidateAScore) : null
    const scoreB = round?.result ? Number(round.result.candidateBScore) : null

    const isWinnerA = match.winnerId && match.winnerId === match.candidateA?.id
    const isWinnerB = match.winnerId && match.winnerId === match.candidateB?.id
    const isFinished = Boolean(match.winnerId)

    const badge = {
        PENDING: { bg: '#f1f5f9', fg: '#64748b', label: 'En attente' },
        OPEN: { bg: '#fff7ed', fg: '#ea580c', label: 'En cours' },
        CLOSED: { bg: '#ecfdf5', fg: '#059669', label: 'Terminé' },
    }[status]

    return (
        <Link
            href={`/vote/${match.id}`}
            className={`group block rounded-2xl border bg-white p-4 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 ${highlight && isFinished
                ? 'border-[#ff6b4a] shadow-[0_0_0_3px_rgba(255,107,74,0.18)]'
                : 'border-rose-100 hover:border-[#e63946]'
                }`}
        >
            <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                    {match.name}
                </span>
                <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border"
                    style={{ backgroundColor: badge.bg, color: badge.fg, borderColor: `${badge.fg}30` }}
                >
                    {badge.label}
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <CandidateRow
                    name={match.candidateA?.name ?? 'TBD'}
                    country={match.candidateA?.country ?? null}
                    seed={match.candidateA?.seed ?? null}
                    score={scoreA}
                    isWinner={Boolean(isWinnerA)}
                />
                <CandidateRow
                    name={match.candidateB?.name ?? 'TBD'}
                    country={match.candidateB?.country ?? null}
                    seed={match.candidateB?.seed ?? null}
                    score={scoreB}
                    isWinner={Boolean(isWinnerB)}
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
        </Link>
    )
}

function CandidateRow({
    name,
    country,
    seed,
    score,
    isWinner,
}: {
    name: string
    country: string | null
    seed: number | null
    score: number | null
    isWinner: boolean
}) {
    const display = !name || /^(tbd|to be determined|à définir|en attente|pending)$/i.test(name)
        ? 'En attente'
        : name

    return (
        <div
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition-all ${isWinner
                ? 'border-emerald-500 bg-emerald-50/60'
                : 'border-slate-100 bg-[#fafafc] group-hover:border-rose-100'
                }`}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <Users className={`size-3.5 shrink-0 ${isWinner ? 'text-emerald-600' : 'text-[#94a3b8]'}`} />
                <span
                    className={`truncate text-xs font-bold ${isWinner ? 'text-emerald-700' : 'text-[#0f172a]'
                        }`}
                >
                    {display}
                </span>
                {seed != null && (
                    <span className="shrink-0 rounded-md bg-white border border-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-[#e63946]">
                        #{seed}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {country && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#94a3b8]">
                        {country}
                    </span>
                )}
                {score != null && (
                    <span
                        className={`w-12 text-right text-sm font-black ${isWinner ? 'text-emerald-600' : 'text-[#64748b]'
                            }`}
                    >
                        {score.toFixed(1)}
                    </span>
                )}
            </div>
        </div>
    )
}

function EmptySlot() {
    return (
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-rose-200 bg-white p-4">
            <span className="text-[11px] font-semibold text-[#94a3b8]">
                Match non défini
            </span>
        </div>
    )
}