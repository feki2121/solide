'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
    AlertCircle,
    ArrowLeft,
    CheckCircle2,
    Loader2,
} from 'lucide-react'

import { CriterionRow } from './CriterionRow'
import { RoundResultBlock } from './RoundResultBlock'
import { CandidateSelector } from './CandidateSelector'
import { FullscreenButton } from './FullscreenButton'

type Criterion = 'technique' | 'vocabulary' | 'originality' | 'musicality' | 'execution'

type Vote = {
    id: string
    judgeId: string
    roundId: string
    criterion: string
    value: number
    createdAt: string
}

type Round = {
    id: string
    matchId: string
    number: number
    status: 'PENDING' | 'OPEN' | 'CLOSED'
    result: {
        candidateAScore: string
        candidateBScore: string
        winnerId: string | null
    } | null
    votes?: Vote[]
}

type MatchDetail = {
    id: string
    name: string
    stage: 'QUALIFICATION' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'
    candidateA: { id: string; name: string } | null
    candidateB: { id: string; name: string } | null
    rounds: Round[]
}

type Notice = { tone: 'success' | 'error'; message: string } | null

const criteria: { key: Criterion; label: string; icon: string }[] = [
    { key: 'technique', label: 'Technique', icon: '⚡' },
    { key: 'vocabulary', label: 'Vocabulaire', icon: '📖' },
    { key: 'originality', label: 'Originalité', icon: '✨' },
    { key: 'musicality', label: 'Musicalité', icon: '🎵' },
    { key: 'execution', label: 'Exécution', icon: '✓' },
]

const EMPTY_SCORES: Record<Criterion, number> = {
    technique: 50,
    vocabulary: 50,
    originality: 50,
    musicality: 50,
    execution: 50,
}

const STAGE_LABELS: Record<string, string> = {
    QUALIFICATION: 'Qualification',
    QUARTER_FINAL: 'Quart de finale',
    SEMI_FINAL: 'Demi-finale',
    FINAL: 'Finale',
}

function getInitialScores(round: Round | null | undefined): Record<Criterion, number> {
    if (!round?.votes || round.votes.length === 0) return { ...EMPTY_SCORES }
    return criteria.reduce<Record<Criterion, number>>(
        (scores, criterion) => {
            const vote = round.votes?.find((v) => v.criterion === criterion.key)
            scores[criterion.key] = vote?.value ?? 50
            return scores
        },
        { ...EMPTY_SCORES },
    )
}

export function VoteScreen({ matchId }: { matchId: string }) {
    const [match, setMatch] = useState<MatchDetail | null>(null)
    const [selectedRoundId, setSelectedRoundId] = useState<string | null>(null)
    const [scores, setScores] = useState<Record<Criterion, number>>({ ...EMPTY_SCORES })
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [notice, setNotice] = useState<Notice>(null)
    const [error, setError] = useState<string | null>(null)

    const loadMatch = useCallback(
        async (preserveRoundId?: string) => {
            setIsLoading(true)
            setError(null)
            try {
                const res = await fetch(`/api/matches/${matchId}`, { cache: 'no-store' })
                if (res.status === 401) {
                    window.location.href = '/login'
                    return
                }
                if (!res.ok) throw new Error('Chargement impossible')
                const data = (await res.json()) as MatchDetail
                setMatch(data)
                const preferred =
                    data.rounds.find((r) => r.id === preserveRoundId) ??
                    data.rounds.find((r) => r.status === 'OPEN') ??
                    data.rounds[0]
                if (preferred) {
                    setSelectedRoundId(preferred.id)
                    setScores(getInitialScores(preferred))
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur')
            } finally {
                setIsLoading(false)
            }
        },
        [matchId],
    )

    useEffect(() => {
        void loadMatch()
    }, [loadMatch])

    const selectedRound = useMemo(
        () => match?.rounds.find((r) => r.id === selectedRoundId) ?? null,
        [match, selectedRoundId],
    )

    const submittedCriteria = useMemo(
        () => new Set(selectedRound?.votes?.map((v) => v.criterion) ?? []),
        [selectedRound],
    )

    const isRoundLocked =
        selectedRound?.status !== 'OPEN' || submittedCriteria.size === criteria.length

    const nameA = match?.candidateA?.name ?? 'TBD'
    const nameB = match?.candidateB?.name ?? 'TBD'

    const handleRoundSelect = (round: Round) => {
        if (round.id === selectedRoundId) return
        setSelectedRoundId(round.id)
        setScores(getInitialScores(round))
        setNotice(null)
    }

    const setAllTo = (side: 'A' | 'B' | 'neutral') => {
        const value = side === 'A' ? 0 : side === 'B' ? 100 : 50
        setScores(
            criteria.reduce<Record<Criterion, number>>(
                (acc, c) => {
                    acc[c.key] = value
                    return acc
                },
                { ...EMPTY_SCORES },
            ),
        )
    }

    const handleSubmit = async () => {
        if (!match || !selectedRound || isRoundLocked) return
        setIsSaving(true)
        setNotice(null)
        try {
            const res = await fetch('/api/votes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roundId: selectedRound.id,
                    votes: criteria.map((c) => ({
                        criterion: c.key,
                        value: Math.round(scores[c.key]),
                    })),
                }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Vote refusé')
            setNotice({ tone: 'success', message: 'Vote enregistré. Merci !' })
            await loadMatch(selectedRound.id)
        } catch (err) {
            setNotice({
                tone: 'error',
                message: err instanceof Error ? err.message : 'Erreur',
            })
        } finally {
            setIsSaving(false)
        }
    }

    /* ───── Loading ───── */
    if (isLoading && !match) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-[#fafafc]">
                <Loader2 className="size-8 animate-spin text-[#e63946]" />
            </div>
        )
    }

    /* ───── Error ───── */
    if (error || !match) {
        return (
            <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#fafafc] p-6">
                <AlertCircle className="size-12 text-[#e63946]" />
                <p className="text-center text-lg font-semibold text-[#0f172a]">
                    {error ?? 'Match introuvable'}
                </p>
                <Link
                    href="/"
                    className="rounded-xl bg-[#e63946] px-6 py-3 text-sm font-bold text-white shadow-md shadow-rose-500/20 transition hover:bg-[#ff6b4a]"
                >
                    Retour à l'accueil
                </Link>
            </div>
        )
    }

    /* ───── Rendu principal ───── */
    return (
        <div className="min-h-screen bg-[#fafafc] text-[#0f172a]">
            <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-5 px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
                {/* Barre du haut */}
                <header className="flex items-center justify-between gap-3">
                    <Link
                        href="/"
                        aria-label="Retour"
                        className="flex size-10 items-center justify-center rounded-full border border-rose-100 bg-white text-[#e63946] shadow-2xs transition hover:bg-[#fff1f2] hover:border-rose-200"
                    >
                        <ArrowLeft className="size-5" />
                    </Link>

                    <div className="flex items-center gap-2 rounded-full border border-rose-200 bg-[#fff1f2] px-3 py-1.5">
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#e63946]">
                            {STAGE_LABELS[match.stage] ?? match.stage}
                        </span>
                    </div>

                    <FullscreenButton />
                </header>

                {/* Affrontement A vs B */}
                <CandidateSelector
                    nameA={nameA}
                    nameB={nameB}
                    disabled={isRoundLocked}
                    onPickA={() => setAllTo('A')}
                    onPickB={() => setAllTo('B')}
                />

                <p className="text-center text-[11px] text-[#94a3b8]">
                    Tapez un nom pour tout mettre de son côté · glissez les sliders pour ajuster
                </p>

                {/* Sélecteur de rounds */}
                {match.rounds.length > 0 && (
                    <div className="flex gap-2">
                        {match.rounds.map((round) => {
                            const selected = round.id === selectedRoundId
                            const isOpen = round.status === 'OPEN'
                            const isClosed = round.status === 'CLOSED'
                            const accent = isOpen
                                ? '#22c55e'
                                : isClosed
                                    ? '#94a3b8'
                                    : '#f59e0b'
                            const label = isOpen ? 'Ouvert' : isClosed ? 'Fermé' : 'En attente'

                            return (
                                <button
                                    key={round.id}
                                    onClick={() => handleRoundSelect(round)}
                                    className={`flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-3 transition ${selected
                                        ? 'border-[#e63946] bg-[#fff1f2] shadow-2xs'
                                        : 'border-rose-100 bg-white hover:border-rose-200 hover:bg-[#fff1f2]/50'
                                        }`}
                                >
                                    <span
                                        className={`text-xs font-extrabold tracking-wide ${selected ? 'text-[#e63946]' : 'text-[#0f172a]'
                                            }`}
                                    >
                                        R{round.number}
                                    </span>
                                    <span className="flex items-center gap-1.5">
                                        <span
                                            className="size-1.5 rounded-full"
                                            style={{ backgroundColor: accent }}
                                        />
                                        <span className="text-[10px] font-bold" style={{ color: accent }}>
                                            {label}
                                        </span>
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {/* Bloc info si round fermé / en attente */}
                {selectedRound?.status === 'CLOSED' && selectedRound.result ? (
                    <RoundResultBlock
                        result={selectedRound.result}
                        nameA={nameA}
                        nameB={nameB}
                    />
                ) : selectedRound?.status === 'PENDING' ? (
                    <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5">
                        <AlertCircle className="size-5 shrink-0 text-amber-600" />
                        <p className="text-sm font-bold text-amber-700">
                            Ce round n'est pas ouvert au vote.
                        </p>
                    </div>
                ) : null}

                {/* Zone de vote */}
                {selectedRound?.status === 'OPEN' && (
                    <div className="flex flex-col gap-3">
                        {criteria.map((c) => (
                            <CriterionRow
                                key={c.key}
                                icon={c.icon}
                                label={c.label}
                                value={scores[c.key]}
                                nameA={nameA}
                                nameB={nameB}
                                disabled={isRoundLocked}
                                onChange={(v) =>
                                    setScores((cur) => ({ ...cur, [c.key]: v }))
                                }
                            />
                        ))}

                        {notice && (
                            <div
                                className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 ${notice.tone === 'success'
                                    ? 'border-emerald-200 bg-emerald-50'
                                    : 'border-rose-200 bg-[#fff1f2]'
                                    }`}
                            >
                                {notice.tone === 'success' ? (
                                    <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                                ) : (
                                    <AlertCircle className="size-5 shrink-0 text-[#e63946]" />
                                )}
                                <p
                                    className={`flex-1 text-sm font-bold ${notice.tone === 'success' ? 'text-emerald-700' : 'text-[#dc2626]'
                                        }`}
                                >
                                    {notice.message}
                                </p>
                            </div>
                        )}

                        <button
                            onClick={() => void handleSubmit()}
                            disabled={isSaving || isRoundLocked}
                            className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6b4a] to-[#e63946] px-6 py-4 text-sm font-extrabold text-white shadow-lg shadow-rose-500/20 transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:bg-none disabled:shadow-none"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="size-4 animate-spin" />
                                    Enregistrement…
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="size-4" />
                                    Valider mon vote
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}