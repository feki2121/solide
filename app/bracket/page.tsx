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
            <header className="flex h-[76px] items-center justify-between border-b border-[#e7e9ee] bg-white px-5 sm:px-8">
                <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a0a8b6]">
                        Compétition
                    </p>
                    <h1 className="mt-1 text-[18px] font-bold tracking-tight">Tableau du tournoi</h1>
                </div>
                <div className="flex items-center gap-3">
                    <span className="hidden rounded-full bg-[#edf4ff] px-3 py-1.5 text-[11px] font-bold text-[#1b66f9] sm:inline-flex">
                        {matches.length} match{matches.length > 1 ? 's' : ''}
                    </span>
                    <Link
                        href="/matches"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[#e2e6ed] bg-white px-3 py-1.5 text-xs font-bold text-[#1b66f9] hover:bg-[#edf4ff]"
                    >
                        Gérer <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </header>

            <div className="mx-auto max-w-[1400px] px-5 py-7 sm:px-8">
                {error && (
                    <div className="mb-5 rounded-xl border border-[#f9d0d0] bg-[#fff3f1] px-4 py-3 text-sm font-semibold text-[#f25555]">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-2xl border border-[#e5e8ee] bg-white p-10 text-center text-sm text-[#7e8798]">
                        Chargement…
                    </div>
                ) : !hasAny ? (
                    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#e5e8ee] bg-white p-12 text-center">
                        <Trophy className="size-8 text-[#a0a8b6]" />
                        <p className="text-sm font-semibold">Aucun match dans le tableau</p>
                        <p className="text-xs text-[#7e8798]">
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
    // Répartit les matchs verticalement dans la colonne
    const slots = isFinal ? 1 : matches.length === 1 ? 2 : matches.length || 1

    return (
        <div className="flex flex-1 flex-col">
            <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-bold uppercase tracking-[.14em] text-[#a0a8b6]">
                    {title}
                </h2>
                <span className="rounded-full bg-[#f5f7fa] px-2.5 py-0.5 text-[10px] font-bold text-[#7e8798]">
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
            <div className="h-px w-full bg-[#d6d6e0]" />
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
        PENDING: { bg: '#f5f7fa', fg: '#7e8798', label: 'En attente' },
        OPEN: { bg: '#fff8e6', fg: '#d08500', label: 'En cours' },
        CLOSED: { bg: '#eefbf4', fg: '#24a363', label: 'Terminé' },
    }[status]

    return (
        <Link
            href={`/matches/${match.id}`}
            className={`group block rounded-2xl border bg-white p-4 transition hover:shadow-[0_8px_30px_rgba(31,45,75,0.06)] ${highlight && isFinished
                ? 'border-[#ffb84d] shadow-[0_0_0_3px_rgba(255,184,77,0.15)]'
                : 'border-[#e5e8ee] hover:border-[#1b66f9]'
                }`}
        >
            <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[.14em] text-[#a0a8b6]">
                    {match.name}
                </span>
                <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                    style={{ backgroundColor: badge.bg, color: badge.fg }}
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
                <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#fff8e6] px-3 py-2">
                    <Trophy className="size-3.5 text-[#d08500]" />
                    <span className="text-[11px] font-bold text-[#d08500]">
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
            className={`flex items-center gap-3 rounded-xl border px-3 py-2 transition ${isWinner
                ? 'border-[#24a363] bg-[#eefbf4]'
                : 'border-[#f1f3f7] bg-[#fbfcfe] group-hover:border-[#e5e8ee]'
                }`}
        >
            <div className="flex min-w-0 flex-1 items-center gap-2">
                <Users className={`size-3.5 shrink-0 ${isWinner ? 'text-[#24a363]' : 'text-[#a0a8b6]'}`} />
                <span
                    className={`truncate text-xs font-semibold ${isWinner ? 'text-[#24a363]' : 'text-[#202532]'
                        }`}
                >
                    {display}
                </span>
                {seed != null && (
                    <span className="shrink-0 rounded-md bg-white px-1.5 py-0.5 text-[9px] font-bold text-[#7e8798]">
                        #{seed}
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {country && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#a0a8b6]">
                        {country}
                    </span>
                )}
                {score != null && (
                    <span
                        className={`w-12 text-right text-sm font-black ${isWinner ? 'text-[#24a363]' : 'text-[#7e8798]'
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
        <div className="flex min-h-[120px] items-center justify-center rounded-2xl border border-dashed border-[#e5e8ee] bg-[#fbfcfe] p-4">
            <span className="text-[11px] font-semibold text-[#a0a8b6]">
                Match non défini
            </span>
        </div>
    )
}