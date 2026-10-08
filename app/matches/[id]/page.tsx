'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ArrowLeft, Lock, LockOpen, Plus, X } from 'lucide-react'
import { AdminLayout } from '@/components/ui/admin/Layout'

type MatchDetail = {
    id: string
    name: string
    stage: string
    candidateA: { id: string; name: string } | null
    candidateB: { id: string; name: string } | null
    rounds: Round[]
}

type Round = {
    id: string
    number: number
    status: 'PENDING' | 'OPEN' | 'CLOSED'
    criteria: { id: string; name: string; weight: string }[]
    result: { candidateAScore: string; candidateBScore: string; winnerId: string | null } | null
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Une erreur est survenue.')
    return body
}

const statusColors: Record<string, string> = {
    PENDING: '#d08500',
    OPEN: '#24a363',
    CLOSED: '#7e8798',
}

const criteriaNames = ['technique', 'vocabulary', 'originality', 'musicality', 'execution']
const defaultWeights: Record<string, number> = {
    technique: 0.2,
    vocabulary: 0.2,
    originality: 0.2,
    musicality: 0.2,
    execution: 0.2,
}

export default function MatchDetailPage() {
    const { id } = useParams<{ id: string }>()
    const [match, setMatch] = useState<MatchDetail | null>(null)
    const [loading, setLoading] = useState(true)
    const [showRoundForm, setShowRoundForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setMatch(await readJson<MatchDetail>(await fetch(`/api/matches/${id}`, { cache: 'no-store' })))
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        } finally {
            setLoading(false)
        }
    }, [id])

    useEffect(() => { void load() }, [load])

    async function openRound(round: Round) {
        try {
            const res = await fetch(`/api/rounds/${round.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'OPEN' }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Ouverture impossible.')
            setMessage({ type: 'success', text: `Round ${round.number} ouvert.` })
            await load()
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    async function closeRound(round: Round) {
        if (!confirm(`Fermer le round ${round.number} et calculer les résultats ?`)) return
        try {
            const res = await fetch(`/api/rounds/${round.id}/close`, { method: 'POST' })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Fermeture impossible.')

            const a = Number(body.result?.candidateAScore ?? 0).toFixed(1)
            const b = Number(body.result?.candidateBScore ?? 0).toFixed(1)
            setMessage({
                type: 'success',
                text: `Round ${round.number} fermé. Score : ${a} / ${b}`,
            })
            await load()
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    async function reopenRound(round: Round) {
        if (!confirm(`Réouvrir le round ${round.number} ? Les votes déjà enregistrés seront conservés mais le résultat sera supprimé.`)) return
        try {
            const res = await fetch(`/api/rounds/${round.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'OPEN' }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Réouverture impossible.')
            setMessage({ type: 'success', text: `Round ${round.number} réouvert.` })
            await load()
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    if (loading) return <main className="min-h-screen bg-[#f7f8fa] p-10 text-center text-sm text-[#7e8798]">Chargement…</main>
    if (!match) return <main className="min-h-screen bg-[#f7f8fa] p-10 text-center text-sm text-[#f25555]">Match introuvable.</main>

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#f7f8fa] text-[#202532]">
                <div className="mx-auto max-w-[1100px] px-5 py-7 sm:px-8">
                    <a href="/matches" className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#7e8798] hover:text-[#1b66f9]">
                        <ArrowLeft className="size-3.5" /> Retour aux matchs
                    </a>

                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a0a8b6]">{match.stage.replace('_', ' ')}</p>
                            <h1 className="mt-1 text-[28px] font-bold tracking-tight">{match.name}</h1>
                            <p className="mt-1 text-sm text-[#7e8798]">
                                {match.candidateA?.name ?? 'TBD'} <span className="text-[#f25555] font-bold">vs</span> {match.candidateB?.name ?? 'TBD'}
                            </p>
                        </div>
                        <button onClick={() => setShowRoundForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#1b66f9] px-5 py-3 text-sm font-bold text-white hover:bg-[#1059e5]">
                            <Plus className="size-4" /> Nouveau round
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-[#c8efd9] bg-[#eefbf4] text-[#24a363]' : 'border-[#f9d0d0] bg-[#fff3f1] text-[#f25555]'}`}>
                            {message.text}
                        </div>
                    )}

                    {showRoundForm && (
                        <RoundForm
                            matchId={match.id}
                            nextNumber={match.rounds.length + 1}
                            onClose={() => setShowRoundForm(false)}
                            onCreated={() => {
                                setShowRoundForm(false)
                                setMessage({ type: 'success', text: 'Round créé.' })
                                void load()
                            }}
                        />
                    )}

                    <section className="flex flex-col gap-4">
                        {match.rounds.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-[#e5e8ee] bg-white p-12 text-center">
                                <p className="text-sm font-semibold">Aucun round</p>
                                <p className="mt-1 text-xs text-[#7e8798]">Ajoutez un round pour permettre les votes.</p>
                            </div>
                        ) : match.rounds.map((round) => (
                            <article
                                key={round.id}
                                onClick={() => round.status === 'PENDING' && void openRound(round)}
                                className={`rounded-2xl border bg-white p-5 shadow-[0_8px_30px_rgba(31,45,75,0.04)] transition ${round.status === 'PENDING'
                                    ? 'cursor-pointer border-[#e5e8ee] hover:border-[#1b66f9] hover:bg-[#fbfcfe]'
                                    : 'border-[#e5e8ee]'
                                    }`}
                            >
                                <div className="mb-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className="grid size-9 place-items-center rounded-xl bg-[#edf4ff] text-sm font-bold text-[#1b66f9]">R{round.number}</span>
                                        <div>
                                            <h3 className="font-bold">Round {round.number}</h3>
                                            <p className="text-xs text-[#a0a8b6]">{round.criteria.length} critère(s)</p>
                                        </div>
                                    </div>
                                    <span className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${statusColors[round.status]}20`, color: statusColors[round.status] }}>
                                        {round.status}
                                    </span>
                                </div>

                                <div className="mb-4 flex flex-wrap gap-2">
                                    {round.criteria.map((c) => (
                                        <span key={c.id} className="rounded-lg bg-[#f5f7fa] px-2.5 py-1 text-[11px] font-semibold text-[#7e8798]">
                                            {c.name} · {Math.round(Number(c.weight) * 100)}%
                                        </span>
                                    ))}
                                </div>

                                <div className="flex items-center justify-between border-t border-[#f1f3f7] pt-4">
                                    <div>
                                        {round.result ? (
                                            <p className="text-sm">
                                                <span className="font-bold text-[#1b66f9]">{Number(round.result.candidateAScore).toFixed(1)}</span>
                                                <span className="mx-1 text-[#c7ccd5]">:</span>
                                                <span className="font-bold text-[#f25555]">{Number(round.result.candidateBScore).toFixed(1)}</span>
                                            </p>
                                        ) : (
                                            <p className="text-xs text-[#a0a8b6]">Pas encore de résultat</p>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        {round.status === 'PENDING' && (
                                            <button
                                                onClick={() => void openRound(round)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#eefbf4] px-3 py-1.5 text-xs font-bold text-[#24a363] hover:bg-[#d9f6e5]"
                                            >
                                                <LockOpen className="size-3.5" /> Ouvrir
                                            </button>
                                        )}
                                        {round.status === 'OPEN' && (
                                            <button
                                                onClick={() => void closeRound(round)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff3f1] px-3 py-1.5 text-xs font-bold text-[#f25555] hover:bg-[#ffe4e0]"
                                            >
                                                <Lock className="size-3.5" /> Fermer & calculer
                                            </button>
                                        )}
                                        {round.status === 'CLOSED' && !round.result && (
                                            <button
                                                onClick={() => void closeRound(round)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff3f1] px-3 py-1.5 text-xs font-bold text-[#f25555] hover:bg-[#ffe4e0]"
                                            >
                                                <Lock className="size-3.5" /> Recalculer
                                            </button>
                                        )}
                                        {round.status === 'CLOSED' && round.result && (
                                            <button
                                                onClick={() => void reopenRound(round)}
                                                className="inline-flex items-center gap-1.5 rounded-lg bg-[#fff8e6] px-3 py-1.5 text-xs font-bold text-[#d08500] hover:bg-[#ffefcc]"
                                            >
                                                <LockOpen className="size-3.5" /> Réouvrir
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        ))}
                    </section>
                </div>
            </main>
        </AdminLayout>
    )
}

function RoundForm({ matchId, nextNumber, onClose, onCreated }: { matchId: string; nextNumber: number; onClose: () => void; onCreated: () => void }) {
    const [number, setNumber] = useState(nextNumber)
    const [status, setStatus] = useState<'PENDING' | 'OPEN'>('PENDING')
    const [selected, setSelected] = useState<string[]>(criteriaNames)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function toggle(c: string) {
        setSelected((prev) => prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c])
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/rounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId, number, status,
                    criteria: selected.map((name) => ({ name, weight: defaultWeights[name] ?? 0.2 })),
                }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Création impossible.')
            onCreated()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-lg font-bold">Nouveau round</h2>
                    <button type="button" onClick={onClose} className="text-[#a0a8b6] hover:text-[#202532]"><X className="size-5" /></button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-xs font-semibold text-[#7e8798]">Numéro</span>
                        <input type="number" min={1} value={number} onChange={(e) => setNumber(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm" />
                    </label>
                    <label className="block">
                        <span className="text-xs font-semibold text-[#7e8798]">Statut initial</span>
                        <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm">
                            <option value="PENDING">En attente</option>
                            <option value="OPEN">Ouvert</option>
                        </select>
                    </label>
                </div>

                <div className="mb-4">
                    <span className="text-xs font-semibold text-[#7e8798]">Critères</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {criteriaNames.map((c) => (
                            <button key={c} type="button" onClick={() => toggle(c)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold capitalize transition ${selected.includes(c) ? 'border-[#1b66f9] bg-[#edf4ff] text-[#1b66f9]' : 'border-[#e2e6ed] bg-white text-[#7e8798]'}`}>
                                {c}
                            </button>
                        ))}
                    </div>
                </div>

                {error && <p className="mb-4 text-xs font-semibold text-[#f25555]">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e6ed] px-4 py-2.5 text-sm font-semibold text-[#7e8798]">Annuler</button>
                    <button type="submit" disabled={submitting || selected.length === 0} className="rounded-xl bg-[#1b66f9] px-5 py-2.5 text-sm font-bold text-white disabled:bg-[#aebbd4]">
                        {submitting ? 'Création…' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    )
}