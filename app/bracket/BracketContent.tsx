// app/bracket/BracketContent.tsx
'use client'

import { useCallback, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
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

const stageConfig: Record<
    Match['stage'],
    { label: string; short: string; accent: string }
> = {
    QUALIFICATION: { label: 'Qualifications', short: 'Q', accent: 'from-slate-500 to-slate-700' },
    QUARTER_FINAL: { label: 'Quarts', short: 'QF', accent: 'from-sky-500 to-indigo-500' },
    SEMI_FINAL: { label: 'Demies', short: 'SF', accent: 'from-violet-500 to-fuchsia-500' },
    FINAL: { label: 'Finale', short: 'F', accent: 'from-amber-500 to-orange-500' },
}

export default function BracketContent() {
    const searchParams = useSearchParams()
    const tournamentId = searchParams.get('tournamentId')

    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const url = tournamentId
                ? `/api/matches?tournamentId=${encodeURIComponent(tournamentId)}`
                : '/api/matches'
            const data = await readJson<Match[]>(await fetch(url, { cache: 'no-store' }))
            setMatches(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setLoading(false)
        }
    }, [tournamentId])

    useEffect(() => { void load() }, [load])

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

    // Colonnes actives : on ne garde que celles qui ont des matchs
    const columns: { stage: Match['stage']; matches: Match[] }[] = []
    if (qualifications.length > 0) columns.push({ stage: 'QUALIFICATION', matches: qualifications })
    if (quarters.length > 0) columns.push({ stage: 'QUARTER_FINAL', matches: quarters })
    if (semis.length > 0) columns.push({ stage: 'SEMI_FINAL', matches: semis })
    if (final) columns.push({ stage: 'FINAL', matches: [final] })

    return (
        <AdminLayout>
            {/* Header compact sticky */}
            <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-[#fee2e2] bg-white/90 px-4 py-2.5 backdrop-blur sm:px-6">
                <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                        Compétition
                    </p>
                    <h1 className="truncate text-base font-black tracking-tight text-[#0f172a] sm:text-lg">
                        Tableau du tournoi
                    </h1>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                    <span className="hidden rounded-full border border-rose-200 bg-[#fff1f2] px-3 py-1 text-[11px] font-bold text-[#e63946] sm:inline-flex">
                        {matches.length} match{matches.length > 1 ? 's' : ''}
                    </span>
                    <Link
                        href="/matches"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-[#e63946] transition-all hover:border-[#ff6b4a] hover:bg-[#fff1f2]"
                    >
                        Gérer <ArrowRight className="size-3.5" />
                    </Link>
                </div>
            </header>

            {/* Zone principale : fit-to-screen, aucune scrollbar */}
            <div className="flex h-[calc(100dvh-53px)] flex-col overflow-hidden px-3 py-3 sm:px-5">
                {error && (
                    <div className="mb-3 shrink-0 rounded-xl border border-rose-200 bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#dc2626]">
                        {error}
                    </div>
                )}

                {loading ? (
                    <div className="flex flex-1 items-center justify-center">
                        <div className="rounded-2xl border border-rose-100 bg-white px-6 py-4 text-sm font-medium text-[#64748b]">
                            Chargement…
                        </div>
                    </div>
                ) : !hasAny ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-8 text-center">
                        <Trophy className="size-9 text-[#ff6b4a]" />
                        <p className="text-sm font-bold text-[#0f172a]">Aucun match dans le tableau</p>
                        <p className="text-xs text-[#64748b]">
                            Créez des matchs avec les stages qualification, quart, demi et finale.
                        </p>
                    </div>
                ) : (
                    <Bracket columns={columns} />
                )}
            </div>
        </AdminLayout>
    )
}

/* ══════════════════════════════════════════════════════
   BRACKET — Layout à positions calculées + lignes SVG
   ══════════════════════════════════════════════════════ */

function Bracket({
    columns,
}: {
    columns: { stage: Match['stage']; matches: Match[] }[]
}) {
    const totalColumns = columns.length
    /* Hauteur disponible par match en % (réparti sur la colonne 0 qui a le plus de matchs) */
    const baseCount = columns[0]?.matches.length ?? 1

    return (
        <div className="relative flex flex-1 overflow-hidden">
            {/* Rendu des colonnes */}
            {columns.map((col, ci) => {
                const isLast = ci === totalColumns - 1
                const prevMatches = ci > 0 ? columns[ci - 1].matches.length : 0

                return (
                    <div
                        key={col.stage}
                        className="relative flex min-h-0 flex-1"
                        style={{
                            /* Chaque colonne prend une fraction égale */
                            flex: '1 1 0',
                        }}
                    >
                        {/* Lignes de connexion (sauf pour la première colonne) */}
                        {ci > 0 && (
                            <ConnectorLines
                                count={col.matches.length}
                                prevCount={prevMatches}
                                baseCount={baseCount}
                            />
                        )}

                        {/* Cartes de la colonne */}
                        <div className="relative flex min-h-0 flex-1 flex-col justify-around gap-2 py-1">
                            {col.matches.map((match) => (
                                <MatchCard
                                    key={match.id}
                                    match={match}
                                    isFinal={col.stage === 'FINAL'}
                                />
                            ))}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

/* ────────── Lignes de connexion ──────────
   Dessine les lignes qui relient les matchs de la colonne précédente
   au match courant. Utilise un SVG qui couvre toute la colonne. */

function ConnectorLines({
    count,
    prevCount,
    baseCount,
}: {
    count: number
    prevCount: number
    baseCount: number
}) {
    /* Position verticale en % de chaque match de la colonne précédente */
    const prevPositions = Array.from({ length: prevCount }, (_, i) =>
        ((i + 0.5) / prevCount) * 100
    )
    /* Position verticale en % de chaque match de la colonne actuelle */
    const currPositions = Array.from({ length: count }, (_, i) =>
        ((i + 0.5) / count) * 100
    )

    return (
        <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
        >
            {currPositions.map((yCurr, i) => {
                /* Chaque match de la colonne actuelle est relié aux 2 matchs précédents
                   (sauf si prevCount < 2*count, alors on adapte) */
                const parentIndex1 = i * 2
                const parentIndex2 = i * 2 + 1
                const parents: number[] = []
                if (prevPositions[parentIndex1] !== undefined) parents.push(prevPositions[parentIndex1])
                if (prevPositions[parentIndex2] !== undefined) parents.push(prevPositions[parentIndex2])
                /* Fallback : si pas assez de parents, prend les adjacents */
                if (parents.length === 0) {
                    const ratio = prevCount / count
                    for (let k = 0; k < ratio; k++) {
                        const idx = i * ratio + k
                        if (prevPositions[idx] !== undefined) parents.push(prevPositions[idx])
                    }
                }

                return (
                    <g key={i}>
                        {parents.map((yPrev, j) => (
                            <path
                                key={j}
                                d={`M 0 ${yPrev} H 50 V ${yCurr} H 100`}
                                fill="none"
                                stroke="#fecdd3"
                                strokeWidth="0.5"
                                vectorEffect="non-scaling-stroke"
                            />
                        ))}
                    </g>
                )
            })}
        </svg>
    )
}

/* ────────── Carte de match ────────── */

function MatchCard({ match, isFinal }: { match: Match; isFinal?: boolean }) {
    const status = matchStatus(match)
    const round = currentRound(match)

    const scoreA = round?.result ? Number(round.result.candidateAScore) : null
    const scoreB = round?.result ? Number(round.result.candidateBScore) : null

    const isWinnerA = Boolean(match.winnerId && match.winnerId === match.candidateA?.id)
    const isWinnerB = Boolean(match.winnerId && match.winnerId === match.candidateB?.id)
    const isFinished = Boolean(match.winnerId)

    /* Bordure dynamique selon le statut */
    const borderColor =
        status === 'OPEN' ? '#fb923c'
            : status === 'CLOSED' ? '#10b981'
                : '#e5e7eb'

    return (
        <Link
            href={`/vote/${match.id}`}
            className={`group relative block shrink-0 overflow-hidden rounded-lg border bg-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${isFinal && isFinished
                ? 'border-amber-400 shadow-[0_0_0_2px_rgba(251,191,36,0.25)]'
                : ''
                }`}
            style={{
                borderColor: isFinal && isFinished ? undefined : borderColor,
                maxHeight: '100%',
            }}
        >
            {/* Bandeau stage */}
            <div
                className={`h-0.5 w-full bg-gradient-to-r ${stageConfig[match.stage].accent}`}
                aria-hidden
            />

            <div className="flex flex-col gap-0.5 p-1.5">
                {/* Joueur A (gauche) */}
                <PlayerRow
                    candidate={match.candidateA}
                    score={scoreA}
                    isWinner={isWinnerA}
                    side="A"
                />

                {/* VS centré */}
                <div className="flex items-center justify-center py-0.5">
                    <span className="text-[9px] font-black tracking-widest text-[#94a3b8]">
                        V
                    </span>
                </div>

                {/* Joueur B (droite) */}
                <PlayerRow
                    candidate={match.candidateB}
                    score={scoreB}
                    isWinner={isWinnerB}
                    side="B"
                />
            </div>
        </Link>
    )
}

/* ────────── Ligne joueur ────────── */

function PlayerRow({
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
            ? 'TBD'
            : rawName

    const initials =
        display === 'TBD'
            ? '?'
            : display
                .split(' ')
                .map((w) => w[0])
                .filter(Boolean)
                .slice(0, 2)
                .join('')
                .toUpperCase()

    /* Couleur unifiée par position */
    const sideColor = side === 'A'
        ? { bg: 'from-sky-400 to-indigo-500', ring: 'ring-sky-200', text: 'text-sky-700', scoreBg: 'bg-sky-100' }
        : { bg: 'from-fuchsia-400 to-rose-500', ring: 'ring-rose-200', text: 'text-rose-700', scoreBg: 'bg-rose-100' }

    return (
        <div
            className={`flex items-center gap-1.5 rounded px-1 py-0.5 ${isWinner ? 'bg-emerald-50' : ''}`}
        >
            <div
                className={`flex size-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[8px] font-black text-white shadow-sm ${isWinner ? 'from-emerald-400 to-emerald-600 ring-1 ring-emerald-300' : `${sideColor.bg}`
                    }`}
            >
                {initials}
            </div>
            <span
                className={`min-w-0 flex-1 truncate text-[10px] font-bold ${isWinner ? 'text-emerald-700' : 'text-[#0f172a]'
                    }`}
                title={display}
            >
                {display}
            </span>
            {score != null && (
                <span
                    className={`shrink-0 rounded px-1 text-[10px] font-black tabular-nums ${isWinner ? 'bg-emerald-500 text-white' : `${sideColor.scoreBg} ${sideColor.text}`
                        }`}
                >
                    {score.toFixed(0)}
                </span>
            )}
        </div>
    )
}