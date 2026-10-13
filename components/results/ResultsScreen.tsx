'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, RefreshCw, Trophy } from 'lucide-react'

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

const POLL_INTERVAL = 3000   // 3 secondes

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

    // Score final = dernier round avec résultat (ou le round OPEN en cours)
    const currentRound =
        match.rounds.find((r) => r.status === 'OPEN') ??
        match.rounds[match.rounds.length - 1] ??
        null

    const scoreA = currentRound?.result ? Number(currentRound.result.candidateAScore) : null
    const scoreB = currentRound?.result ? Number(currentRound.result.candidateBScore) : null

    // Compte les votes "A" (value < 50) et "B" (value > 50) par juge pour le round courant
    function judgeVoteColor(judgeId: string, criterion: string): 'blue' | 'red' | null {
        if (!currentRound) return null
        const vote = currentRound.votes.find(
            (v) => v.judgeId === judgeId && v.criterion === criterion
        )
        if (!vote) return null
        if (vote.value < 50) return 'red'   // penche A (gauche)
        if (vote.value > 50) return 'blue'  // penche B (droite)
        return null
    }

    // Compte les victoires de rounds pour le score final
    const roundsFinished = match.rounds.filter((r) => r.result).length

    const winsA = match.rounds.filter(
        (r) => r.result && r.result.winnerId === match.candidateA?.id
    ).length
    const winsB = match.rounds.filter(
        (r) => r.result && r.result.winnerId === match.candidateB?.id
    ).length

    return (
        <div className="battle-screen" style={{ backgroundColor: '#000', color: '#f5f5f5' }}>
            <section className="scoreboard">
                {/* Retour */}
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

                    {match.rounds.map((round) => (
                        <div className="round-row" key={round.id}>
                            <div className="round-name">ROUND {round.number}</div>

                            {judges.map((j) => {
                                // Affiche une cellule colorée selon le vote du juge sur le critère principal
                                // Ici on résume : le juge a-t-il voté ? Pour qui globalement ?
                                const judgeVotes = round.votes.filter((v) => v.judgeId === j.id)
                                const avg =
                                    judgeVotes.length > 0
                                        ? judgeVotes.reduce((s, v) => s + v.value, 0) /
                                        judgeVotes.length
                                        : null
                                const cls =
                                    avg == null
                                        ? ''
                                        : avg < 50
                                            ? 'red'
                                            : avg > 50
                                                ? 'blue'
                                                : ''

                                return (
                                    <div className="judge-cell" key={j.id}>
                                        {cls ? <span className={`result ${cls}`} /> : <span className="text-[10px] text-[#475569]">—</span>}
                                    </div>
                                )
                            })}
                        </div>
                    ))}
                </div>

                {/* Titre */}
                <div className="battle-title">{match.name.toUpperCase()}</div>

                {/* Score final (victoires de rounds) */}
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