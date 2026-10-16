'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw } from 'lucide-react'

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
    if (assignedJudgeIds.length === 0) return false
    const votersSet = new Set(round.votes.map((v) => v.judgeId))
    return assignedJudgeIds.every((judgeId) => votersSet.has(judgeId))
}

/**
 * Détermine le vainqueur d'un round par MAJORITÉ DE JURYS.
 * Un round remporté = 1 point (pas le nombre de votes individuels).
 * Retourne `null` en cas d'égalité parfaite.
 */
function winnerOfRound(round: Round, match: MatchDetail): string | null {
    if (round.result?.winnerId) return round.result.winnerId
    if (!round.votes || round.votes.length === 0) return null

    // Regroupe les votes par jury
    const byJudge = new Map<string, number[]>()
    for (const v of round.votes) {
        byJudge.set(v.judgeId, [...(byJudge.get(v.judgeId) ?? []), v.value])
    }

    // Chaque jury vote globalement A ou B selon la moyenne de ses notes
    let judgesForA = 0
    let judgesForB = 0

    for (const values of byJudge.values()) {
        if (values.length === 0) continue
        const avg = values.reduce((s, v) => s + v, 0) / values.length
        if (avg < 50) judgesForA++
        else if (avg > 50) judgesForB++
        // avg === 50 → neutre, ne compte pas
    }

    if (judgesForA > judgesForB) return match.candidateA?.id ?? null
    if (judgesForB > judgesForA) return match.candidateB?.id ?? null
    return null // égalité parfaite (ex. 1-1 avec un juge neutre, ou aucun vote)
}

export function ResultsScreen({
    matchId,
    tournamentId,
}: {
    matchId: string
    tournamentId?: string
}) {
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

    // Chargement initial + polling
    useEffect(() => {
        mountedRef.current = true
        void load()
        const interval = setInterval(() => void load(), POLL_INTERVAL)
        return () => {
            mountedRef.current = false
            clearInterval(interval)
        }
    }, [load])

    // Re-fetch au retour de focus
    useEffect(() => {
        const onFocus = () => void load()
        window.addEventListener('focus', onFocus)
        return () => window.removeEventListener('focus', onFocus)
    }, [load])

    if (loading && !match) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="flex items-center gap-3">
                    <RefreshCw className="size-5 animate-spin text-[#ff6b4a]" />
                    <span className="text-sm">Chargement…</span>
                </div>
            </div>
        )
    }

    if (error || !match) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-black p-6 text-white">
                <p className="text-lg font-bold text-rose-400">{error ?? 'Match introuvable'}</p>
                <Link
                    href={tournamentId ? `/bracket?tournamentId=${tournamentId}` : '/bracket'}
                    className="rounded-xl bg-[#ff6b4a] px-6 py-3 text-sm font-bold"
                >
                    Retour au bracket
                </Link>
            </div>
        )
    }

    const nameA = match.candidateA?.name ?? 'TBD'
    const nameB = match.candidateB?.name ?? 'TBD'
    const judges = match.assignedJudges
    const assignedJudgeIds = judges.map((j) => j.id)

    // ────────── Score final ──────────
    // Pour chaque round :
    //   1. Vérifier que TOUS les jurys assignés ont voté → sinon on ignore le round
    //   2. Déterminer le vainqueur par majorité de jurys
    //   3. Ajouter 1 point (et pas plus) au candidat vainqueur
    let winsA = 0
    let winsB = 0

    for (const round of match.rounds) {
        // 1. Le round doit être complet
        if (!isRoundComplete(round, assignedJudgeIds)) continue

        // 2. Qui a remporté ce round ?
        const winnerId = winnerOfRound(round, match)
        if (!winnerId) continue // égalité → personne ne marque

        // 3. +1 point pour le vainqueur
        if (winnerId === match.candidateA?.id) winsA += 1
        else if (winnerId === match.candidateB?.id) winsB += 1
    }

    return (
        <div className="battle-screen" style={{ backgroundColor: '#000', color: '#f5f5f5' }}>
            <section className="scoreboard">
                {/* Retour + Live */}
                <div className="mb-3 flex items-center justify-between">
                    <Link
                        href={tournamentId ? `/bracket?tournamentId=${tournamentId}` : '/bracket'}
                        className="flex items-center gap-1.5 text-xs font-bold text-[#94a3b8] hover:text-white"
                    >
                        <ArrowLeft className="size-3.5" /> Bracket
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            <span className="size-1.5 animate-pulse rounded-full bg-emerald-400" />
                            Live
                        </span>
                        <span className="text-[10px] text-[#64748b]">
                            MAJ {lastUpdate.toLocaleTimeString('fr-FR')}
                        </span>
                    </div>
                </div>

                {/* Header joueurs */}
                <div className="players-header">
                    <div className="player-name player-a">{nameA}</div>
                    <div className="versus">VS</div>
                    <div className="player-name player-b">{nameB}</div>
                </div>

                {/* Tableau des juges */}
                <div className="rounds-table">
                    <div className="round-labels">
                        <div></div>
                        {judges.map((j, i) => (
                            <div className="judge-title" key={j.id}>
                                {j.name || `JUGE ${i + 1}`}
                            </div>
                        ))}
                    </div>

                    {match.rounds.map((round) => {
                        const isComplete = isRoundComplete(round, assignedJudgeIds)
                        const votersCount =
                            round.votes.length > 0
                                ? new Set(round.votes.map((v) => v.judgeId)).size
                                : 0
                        const totalJudges = assignedJudgeIds.length

                        return (
                            <div className="round-row" key={round.id}>
                                <div className="round-name">
                                    ROUND {round.number}
                                    {!isComplete && totalJudges > 0 && (
                                        <span className="ml-2 text-[9px] font-bold text-[#f59e0b]">
                                            {votersCount}/{totalJudges}
                                        </span>
                                    )}
                                </div>

                                {judges.map((j) => {
                                    // Récupère les votes de ce juge pour ce round
                                    const judgeVotes = round.votes.filter(
                                        (v) => v.judgeId === j.id
                                    )
                                    // Moyenne des votes de ce juge pour ce round
                                    const avg =
                                        judgeVotes.length > 0
                                            ? judgeVotes.reduce((s, v) => s + v.value, 0) /
                                            judgeVotes.length
                                            : null

                                    // Couleur : rouge si penche A (< 50), bleu si penche B (> 50)
                                    const cls =
                                        avg === null
                                            ? ''
                                            : avg < 50
                                                ? 'red'
                                                : avg > 50
                                                    ? 'blue'
                                                    : ''

                                    return (
                                        <div className="judge-cell" key={j.id}>
                                            {cls ? (
                                                <span className={`result ${cls}`} />
                                            ) : (
                                                <span className="text-[10px] text-[#475569]">
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

                {/* Titre du combat */}
                <div className="battle-title">{match.name.toUpperCase()}</div>

                {/* Score final */}
                <div className="final-score">
                    <div className="score-player score-a">
                        <span>{nameA}</span>
                        <span className="score-number">{winsA}</span>
                    </div>
                    <div className="final-versus">VS</div>
                    <div className="score-player score-b">
                        <span>{nameB}</span>
                        <span className="score-number">{winsB}</span>
                    </div>
                </div>
            </section>
        </div>
    )
}