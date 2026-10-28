'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { RefreshCw } from 'lucide-react'

type Criterion = 'technique' | 'vocabulary' | 'originality' | 'musicality' | 'execution'

const CRITERIA: { key: Criterion; label: string; short: string }[] = [
    { key: 'technique', label: 'Technique', short: 'TECH' },
    { key: 'vocabulary', label: 'Vocabulaire', short: 'VOC' },
    { key: 'originality', label: 'Originalité', short: 'ORIG' },
    { key: 'musicality', label: 'Musicalité', short: 'MUS' },
    { key: 'execution', label: 'Exécution', short: 'EXEC' },
]

type Vote = {
    judgeId: string
    roundId: string
    criterion: string
    value: number
}

type Round = {
    id: string
    number: number
    status: 'PENDING' | 'OPEN' | 'CLOSED'
    votes: Vote[]
    result: { candidateAScore: string; candidateBScore: string; winnerId: string | null } | null
}

type Judge = { id: string; name: string; email: string }

type MatchDetail = {
    id: string
    name: string
    stage: string
    candidateA: { id: string; name: string } | null
    candidateB: { id: string; name: string } | null
    rounds: Round[]
    assignedJudges: Judge[]
}

const POLL_INTERVAL = 3000

/**
 * Vérifie que TOUS les jurys assignés ont voté pour ce round.
 */
function isRoundComplete(round: Round, assignedJudgeIds: string[]): boolean {
    if (round.status === 'CLOSED') return true
    if (!assignedJudgeIds || assignedJudgeIds.length === 0) return false
    const votes = round.votes ?? []
    if (votes.length === 0) return false
    const votersSet = new Set(votes.map((v) => v.judgeId))
    return assignedJudgeIds.every((judgeId) => votersSet.has(judgeId))
}


/**
 * Vérifie que TOUS les rounds du match sont terminés.
 */
function isMatchComplete(match: MatchDetail, assignedJudgeIds: string[]): boolean {
    if (match.rounds.length === 0) return false
    return match.rounds.every(round => isRoundComplete(round, assignedJudgeIds))
}

/**
 * Détermine le vainqueur d'un round par MAJORITÉ DE JURYS.
 * Un round remporté = 1 point (pas le nombre de votes individuels).
 * Retourne `null` en cas d'égalité parfaite.
 */
function winnerOfRound(round: Round, match: MatchDetail): string | null {
    if (round.result?.winnerId) return round.result.winnerId
    if (!round.votes || round.votes.length === 0) return null

    const visibleVotes = round.votes.filter((v) => v.criterion !== 'HIDDEN')
    if (visibleVotes.length === 0) return null

    const byJudge = new Map<string, number[]>()
    for (const v of visibleVotes) {
        byJudge.set(v.judgeId, [...(byJudge.get(v.judgeId) ?? []), v.value])
    }

    let judgesForA = 0
    let judgesForB = 0

    for (const values of byJudge.values()) {
        if (values.length === 0) continue
        const avg = values.reduce((s, v) => s + v, 0) / values.length
        if (avg < 50) judgesForA++
        else if (avg > 50) judgesForB++
    }

    if (judgesForA > judgesForB) return match.candidateA?.id ?? null
    if (judgesForB > judgesForA) return match.candidateB?.id ?? null
    return null
}

function ScoreBox({ color }: { color: 'blue' | 'orange' }) {
    return (
        <div
            className={`h-[21px] w-[72px] rounded-[3px] shadow-sm ${color === 'blue' ? 'bg-[#1838a9]' : 'bg-[#f5a000]'
                }`}
        />
    )
}

export function ResultsScreen({
    matchId,
    tournamentId,
}: {
    matchId: string
    tournamentId?: string
}) {
    const requestedForRoundCount = useRef<number | null>(null)
    const isRequestingExtraRound = useRef(false)

    const [match, setMatch] = useState<MatchDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

    const mountedRef = useRef(true)

    const load = useCallback(async () => {
        try {
            const res = await fetch(`/api/matches/${matchId}`, { cache: 'no-store' })
            if (res.status === 401) {
                window.location.href = '/login'
                return
            }
            if (!res.ok) throw new Error('Chargement impossible')
            const data = (await res.json()) as MatchDetail

            if (mountedRef.current) {
                setMatch(data)
                setLastUpdate(new Date())
                setError(null)
            }
        } catch (err) {
            if (mountedRef.current) {
                setError(err instanceof Error ? err.message : 'Erreur')
            }
        } finally {
            if (mountedRef.current) setLoading(false)
        }
    }, [matchId])

    // 1. Chargement initial + polling
    useEffect(() => {
        mountedRef.current = true
        void load()
        const interval = setInterval(() => void load(), POLL_INTERVAL)
        return () => {
            mountedRef.current = false
            clearInterval(interval)
        }
    }, [load])

    // 2. Rechargement au focus
    useEffect(() => {
        const onFocus = () => void load()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [load])

    // 3. Détection de fin de match et déclenchement du round supplémentaire
    useEffect(() => {
        if (!match) return

        const assignedJudgeIds = match.assignedJudges.map(j => j.id)
        const isDone = isMatchComplete(match, assignedJudgeIds)
        const isEven = match.rounds.length > 0 && match.rounds.length % 2 === 0

        // Task 1: logs des valeurs isDone et isEven
        console.log('[ResultsScreen] isDone:', isDone, '| isEven:', isEven, '| rounds:', match.rounds.length)

        if (
            isDone &&
            isEven &&
            requestedForRoundCount.current !== match.rounds.length &&
            !isRequestingExtraRound.current
        ) {
            const currentRoundCount = match.rounds.length
            requestedForRoundCount.current = currentRoundCount
            isRequestingExtraRound.current = true

            console.log(`🟢 [DEBUG] Match terminé avec ${currentRoundCount} rounds (pair), création du round ${currentRoundCount + 1}...`)

            fetch(`/api/matches/${matchId}/check-extra-round`, { method: 'POST' })
                .then(async (res) => {
                    const data = await res.json()
                    // Task 1: log de la réponse du fetch
                    console.log('🟢 [DEBUG] Réponse check-extra-round fetch :', data)

                    if (data.added || data.reason?.includes('déjà') || data.reason?.includes('impair')) {
                        await load()
                    } else {
                        // En cas de refus temporaire, autoriser un nouvel essai
                        requestedForRoundCount.current = null
                    }
                })
                .catch((err) => {
                    console.error('🔴 [DEBUG] Erreur check-extra-round fetch :', err)
                    // En cas d'erreur réseau, autoriser un nouvel essai
                    requestedForRoundCount.current = null
                })
                .finally(() => {
                    isRequestingExtraRound.current = false
                })
        }
    }, [match, matchId, load])

    if (loading && !match) {
        return (
            <main className="flex h-screen w-full items-center justify-center overflow-hidden bg-[#fe0000] text-white">
                <div className="flex items-center gap-3">
                    <RefreshCw className="size-5 animate-spin text-[#f0e6d9]" />
                    <span className="text-sm font-bold uppercase">Chargement…</span>
                </div>
            </main>
        )
    }

    if (error || !match) {
        return (
            <main className="flex h-screen w-full flex-col items-center justify-center gap-4 overflow-hidden bg-[#fe0000] p-6 text-white">
                <p className="text-lg font-bold uppercase text-[#f0e6d9]">
                    {error ?? 'Match introuvable'}
                </p>
                <Link
                    href={tournamentId ? `/bracket?tournamentId=${tournamentId}` : '/bracket'}
                    className="rounded-[3px] bg-[#f0e6d9] px-6 py-3 text-sm font-black uppercase text-[#a62e23]"
                >
                    Retour au bracket
                </Link>
            </main>
        )
    }

    const nameA = match.candidateA?.name ?? 'TBD'
    const nameB = match.candidateB?.name ?? 'TBD'
    const judges = match.assignedJudges
    const assignedJudgeIds = judges.map((j) => j.id)

    const matchComplete = isMatchComplete(match, assignedJudgeIds)

    // ────────── Score final ──────────
    let winsA = 0
    let winsB = 0

    // On ne calcule les scores finaux que si le match est 100% terminé
    if (matchComplete) {
        for (const round of match.rounds) {
            const winnerId = winnerOfRound(round, match)
            if (!winnerId) continue
            if (winnerId === match.candidateA?.id) winsA += 1
            else if (winnerId === match.candidateB?.id) winsB += 1
        }
    }

    return (
        <main className="relative flex h-screen w-full items-center justify-center overflow-hidden bg-[#fe0000] text-white">
            {/* Arrière-plan */}
            <div className="absolute inset-x-[14.7%] top-[2.2%] bottom-0 bg-[#fe0000]/55" />

            <div className="relative z-10 mx-auto flex h-full w-full max-w-[1440px] flex-col items-center px-4 py-5 sm:px-8">
                {/* En-tête gauche */}
                <header className="absolute left-[2%] top-[2.5%] z-20">
                    <h1 className="font-[Impact,sans-serif] text-[30px] font-black uppercase leading-[0.88] tracking-[-1.5px] sm:text-[42px] md:text-[54px]">
                        PHILOSO
                        <br />
                        FLOOR
                    </h1>
                    <p className="mt-1 text-[15px] font-extrabold uppercase leading-none sm:text-[20px]">
                        FESTIVAL
                    </p>
                </header>

                {/* En-tête droite + Live + MAJ */}
                <header className="absolute right-[2%] top-[2.5%] z-20 text-right">
                    <h2 className="font-[Impact,sans-serif] text-[30px] font-black uppercase leading-[0.88] tracking-[-1.5px] sm:text-[42px] md:text-[54px]">
                        BREAKING
                        <br />
                        BATTLE
                    </h2>
                </header>

                {/* Lien retour bracket */}
                <div className="absolute left-[2%] bottom-[2%] z-20">
                    <Link
                        href={tournamentId ? `/bracket?tournamentId=${tournamentId}` : '/bracket'}
                        className="text-[11px] font-extrabold uppercase tracking-wide text-white/70 hover:text-white"
                    >
                        ← Tableau
                    </Link>
                </div>

                {/* Logo central */}
                <section className="flex w-full flex-col items-center">
                    <div
                        className="relative mt-8 flex h-[245px] w-[280px] items-center justify-center sm:mt-0 sm:h-[280px] sm:w-[340px]"
                        style={{ perspective: '1200px' }}
                    >                        <svg
                        viewBox="0 0 300 300"
                        role="img"
                        aria-label="Logo Philosofloor"
                        className="h-full w-full drop-shadow-[0_12px_8px_rgba(60,0,0,0.2)]"
                        style={{
                            animation: 'logo-spin-y 8s linear infinite',
                            transformStyle: 'preserve-3d',
                            backfaceVisibility: 'visible',
                            willChange: 'transform',
                        }}
                    >
                            <path
                                fill="#fff"
                                d="
                  M 65 24
                  C 35 24, 20 42, 30 66
                  C 39 86, 67 101, 98 116
                  C 117 125, 117 132, 98 141
                  C 64 157, 28 177, 27 204
                  C 26 231, 48 249, 78 249
                  L 222 249
                  C 252 249, 274 231, 273 204
                  C 272 177, 236 157, 202 141
                  C 183 132, 183 125, 202 116
                  C 233 101, 261 86, 270 66
                  C 280 42, 265 24, 235 24
                  Z

                  M 150 39
                  C 178 39, 192 59, 185 83
                  C 180 101, 165 119, 166 139
                  C 167 162, 184 187, 181 207
                  C 178 225, 166 233, 150 233
                  C 134 233, 122 225, 119 207
                  C 116 187, 133 162, 134 139
                  C 135 119, 120 101, 115 83
                  C 108 59, 122 39, 150 39
                  Z
                "
                                fillRule="evenodd"
                            />
                        </svg>
                    </div>

                    {/* Affiche du battle */}
                    <div className="mt-7 w-full max-w-[1100px]">
                        {/* Joueurs */}
                        <div className="grid grid-cols-[1fr_72px_1fr] items-center gap-2 sm:grid-cols-[1fr_100px_1fr] sm:gap-3">
                            <div className="flex h-[43px] items-center justify-center rounded-[3px] bg-[#1939b1] shadow-md px-3">
                                <span className="text-center text-[17px] font-black uppercase sm:text-[25px] truncate">
                                    {nameA}
                                </span>
                            </div>

                            <div className="text-center font-[Impact,sans-serif] text-[35px] font-black leading-none sm:text-[48px]">
                                VS
                            </div>

                            <div className="flex h-[43px] items-center justify-center rounded-[3px] bg-[#f3a000] shadow-md px-3">
                                <span className="text-center text-[17px] font-black uppercase sm:text-[25px] truncate">
                                    {nameB}
                                </span>
                            </div>
                        </div>

                        {/* Juges */}
                        <div
                            className="mt-1 grid gap-2 text-center sm:gap-3"
                            style={{
                                gridTemplateColumns: `1fr 72px repeat(${Math.max(judges.length, 1)}, 1fr)`,
                            }}
                        >
                            <div />
                            <p className="text-[11px] font-medium uppercase sm:text-[13px]">
                                ROUNDS
                            </p>
                            {judges.map((j, i) => (
                                <p
                                    key={j.id}
                                    className="text-[11px] font-medium uppercase sm:text-[13px] truncate"
                                >
                                    {j.name || `JUGE ${i + 1}`}
                                </p>
                            ))}
                        </div>

                        {/* Résultats par round */}
                        <div className="mt-2 space-y-[9px]">
                            {match.rounds.map((round) => {
                                const isComplete = isRoundComplete(round, assignedJudgeIds)
                                const votersCount =
                                    round.votes.length > 0
                                        ? new Set(round.votes.map((v) => v.judgeId)).size
                                        : 0
                                const totalJudges = assignedJudgeIds.length

                                return (
                                    <div
                                        key={round.id}
                                        className="grid items-center gap-2 sm:gap-3"
                                        style={{
                                            gridTemplateColumns: `1fr 72px repeat(${Math.max(
                                                judges.length,
                                                1
                                            )}, 1fr)`,
                                        }}
                                    >
                                        {/* Round label */}
                                        <div className="flex items-center justify-start gap-2 pl-1">
                                            <span className="whitespace-nowrap text-[12px] font-black uppercase tracking-wide sm:text-[15px]">
                                                ROUND {round.number}
                                            </span>
                                            {!isComplete && totalJudges > 0 && (
                                                <span className="text-[9px] font-bold text-[#f0e6d9]">
                                                    {votersCount}/{totalJudges}
                                                </span>
                                            )}
                                        </div>

                                        {/* Spacer sous "ROUNDS" */}
                                        <div />

                                        {/* Cellules par juge */}
                                        {judges.map((j) => {
                                            const judgeVotes = (round.votes ?? []).filter(
                                                (v) => v.judgeId === j.id
                                            )
                                            const hasVoted = judgeVotes.length > 0

                                            // 1. Si le match n'est pas 100% terminé, on garde la confidentialité (✅ ou —)
                                            if (!matchComplete) {
                                                return (
                                                    <div key={j.id} className="flex justify-center items-center">
                                                        {hasVoted ? (
                                                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 text-2xl shadow-sm">
                                                                ✅
                                                            </span>
                                                        ) : (
                                                            <span className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 text-xl font-bold text-white/40">
                                                                —
                                                            </span>
                                                        )}
                                                    </div>
                                                )
                                            }

                                            // 2. Si le match EST terminé, on révèle les couleurs
                                            const avg = hasVoted
                                                ? judgeVotes.reduce((s, v) => s + v.value, 0) / judgeVotes.length
                                                : null

                                            const color: 'blue' | 'orange' | null =
                                                avg === null
                                                    ? null
                                                    : avg < 50
                                                        ? 'blue'
                                                        : avg > 50
                                                            ? 'orange'
                                                            : null

                                            return (
                                                <div key={j.id} className="flex justify-center">
                                                    {color ? (
                                                        <ScoreBox color={color} />
                                                    ) : (
                                                        <span className="text-[14px] font-bold text-white/40">
                                                            —
                                                        </span>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>

                        {/* Séparateur de finale / nom du match */}
                        <div className="mt-3 flex h-[35px] items-center justify-center rounded-[2px] bg-[#f0e6d9] text-[#a62e23]">
                            <span className="text-[14px] font-black uppercase sm:text-[17px] truncate px-2">
                                {match.name.toUpperCase()}
                            </span>
                        </div>

                        {/* Score final */}
                        <div className="mx-auto mt-2 grid w-[94%] grid-cols-[1fr_65px_1fr] items-center gap-2 sm:w-[84%] sm:grid-cols-[1fr_80px_1fr]">
                            <div className="flex h-[44px] items-center justify-between rounded-[3px] bg-[#1939a8] px-3 sm:px-4">
                                <span className="text-[15px] font-bold uppercase sm:text-[24px] truncate">
                                    {nameA}
                                </span>
                                <span className="text-[21px] font-bold sm:text-[27px]">
                                    {matchComplete ? winsA : '-'}
                                </span>
                            </div>

                            <div className="text-center font-[Impact,sans-serif] text-[27px] font-black sm:text-[36px]">
                                VS
                            </div>

                            <div className="flex h-[44px] items-center justify-between rounded-[3px] bg-[#f3a000] px-3 sm:px-4">
                                <span className="text-[15px] font-bold uppercase sm:text-[24px] truncate">
                                    {nameB}
                                </span>
                                <span className="text-[21px] font-bold sm:text-[27px]">
                                    {matchComplete ? winsB : '-'}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </main>
    )
}