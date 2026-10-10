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

const defaultCriteria = [
    { name: 'technique', weight: 0.25 },
    { name: 'vocabulary', weight: 0.2 },
    { name: 'originality', weight: 0.2 },
    { name: 'musicality', weight: 0.2 },
    { name: 'execution', weight: 0.15 },
]

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

    async function toggleStatus(round: Round, newStatus: 'OPEN' | 'CLOSED') {
        try {
            const res = await fetch(`/api/rounds/${round.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus }),
            })
            if (!res.ok) throw new Error('Mise à jour impossible.')
            setMessage({ type: 'success', text: `Round ${round.number} → ${newStatus}` })
            await load()
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    if (loading) return <main className="min-h-screen bg-[#fafafc] p-10 text-center text-sm font-medium text-[#64748b]">Chargement…</main>
    if (!match) return <main className="min-h-screen bg-[#fafafc] p-10 text-center text-sm font-semibold text-[#dc2626]">Match introuvable.</main>

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
                <div className="mx-auto max-w-[1100px] px-5 py-7 sm:px-8">
                    <a href="/matches" className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#64748b] hover:text-[#e63946] transition-colors">
                        <ArrowLeft className="size-3.5" /> Retour aux matchs
                    </a>

                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                                {match.stage.replace('_', ' ')}
                            </p>
                            <h1 className="mt-1 text-[28px] font-black tracking-tight text-[#0f172a]">{match.name}</h1>
                            <p className="mt-1 text-sm font-medium text-[#64748b]">
                                {match.candidateA?.name ?? 'TBD'}{' '}
                                <span className="font-black text-[#e63946]">VS</span>{' '}
                                {match.candidateB?.name ?? 'TBD'}
                            </p>
                        </div>
                        <button
                            onClick={() => setShowRoundForm(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 transition-all active:scale-[0.99]"
                        >
                            <Plus className="size-4" /> Nouveau round
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xs ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-[#fff1f2] text-[#dc2626]'}`}>
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
                            <div className="rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                                <p className="text-sm font-bold text-[#0f172a]">Aucun round</p>
                                <p className="mt-1 text-xs text-[#64748b]">
                                    Ajoutez un round pour permettre les votes des juges.
                                </p>
                            </div>
                        ) : (
                            match.rounds.map((round) => (
                                <article key={round.id} className="rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-sm font-extrabold text-white shadow-xs">
                                                R{round.number}
                                            </span>
                                            <div>
                                                <h3 className="font-bold text-[#0f172a]">Round {round.number}</h3>
                                                <p className="text-xs font-medium text-[#94a3b8]">{round.criteria.length} critère(s)</p>
                                            </div>
                                        </div>
                                        <span
                                            className="rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider border"
                                            style={{ backgroundColor: `${statusColors[round.status]}15`, color: statusColors[round.status], borderColor: `${statusColors[round.status]}30` }}
                                        >
                                            {round.status}
                                        </span>
                                    </div>

                                    <div className="mb-4 flex flex-wrap gap-2">
                                        {round.criteria.map((c) => (
                                            <span key={c.id} className="rounded-lg bg-[#fff1f2]/50 border border-rose-100 px-2.5 py-1 text-[11px] font-bold text-[#e63946]">
                                                {c.name} · {Math.round(Number(c.weight) * 100)}%
                                            </span>
                                        ))}
                                    </div>

                                    <div className="flex items-center justify-between border-t border-rose-100/60 pt-4">
                                        <div>
                                            {round.result ? (
                                                <p className="text-sm">
                                                    <span className="font-extrabold text-[#e63946]">
                                                        {Number(round.result.candidateAScore).toFixed(1)}
                                                    </span>
                                                    <span className="mx-1 font-bold text-[#94a3b8]">:</span>
                                                    <span className="font-extrabold text-[#ff6b4a]">
                                                        {Number(round.result.candidateBScore).toFixed(1)}
                                                    </span>
                                                </p>
                                            ) : (
                                                <p className="text-xs text-[#94a3b8]">Pas encore de résultat</p>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {round.status !== 'OPEN' && (
                                                <button
                                                    onClick={() => void toggleStatus(round, 'OPEN')}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
                                                >
                                                    <LockOpen className="size-3.5" /> Ouvrir
                                                </button>
                                            )}
                                            {round.status === 'OPEN' && (
                                                <button
                                                    onClick={() => void toggleStatus(round, 'CLOSED')}
                                                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                                                >
                                                    <Lock className="size-3.5" /> Fermer
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            ))
                        )}
                    </section>
                </div>
            </main>
        </AdminLayout>

    )
}

/* ────────── Formulaire modal ────────── */

function RoundForm({
    matchId,
    nextNumber,
    onClose,
    onCreated,
}: {
    matchId: string
    nextNumber: number
    onClose: () => void
    onCreated: () => void
}) {
    const [number, setNumber] = useState(nextNumber)
    const [status, setStatus] = useState<'PENDING' | 'OPEN'>('PENDING')
    const [criteria, setCriteria] = useState(defaultCriteria)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    function updateWeight(name: string, weight: number) {
        setCriteria((prev) => prev.map((c) => (c.name === name ? { ...c, weight } : c)))
    }

    function toggleCriterion(name: string) {
        setCriteria((prev) => {
            const exists = prev.some((c) => c.name === name)
            if (exists) return prev.filter((c) => c.name !== name)
            return [...prev, { name, weight: 0.2 }]
        })
    }

    const totalWeight = criteria.reduce((s, c) => s + c.weight, 0)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/rounds', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    matchId,
                    number,
                    status,
                    criteria,
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

    const allCriterionNames = ['technique', 'vocabulary', 'originality', 'musicality', 'execution']

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={onClose}>
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-rose-100"
            >
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-lg font-bold text-[#0f172a]">Nouveau round</h2>
                    <button type="button" onClick={onClose} className="text-[#94a3b8] hover:text-[#e63946] transition-colors">
                        <X className="size-5" />
                    </button>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-xs font-bold text-[#0f172a]">Numéro</span>
                        <input
                            type="number"
                            min={1}
                            value={number}
                            onChange={(e) => setNumber(Number(e.target.value))}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                        />
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold text-[#0f172a]">Statut initial</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as 'PENDING' | 'OPEN')}
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                        >
                            <option value="PENDING">En attente</option>
                            <option value="OPEN">Ouvert</option>
                        </select>
                    </label>
                </div>

                <div className="mb-4">
                    <div className="mb-2.5 flex items-center justify-between">
                        <span className="text-xs font-bold text-[#0f172a]">Critères et poids</span>
                        <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-bold border ${Math.abs(totalWeight - 1) < 0.001
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-[#fff1f2] text-[#dc2626] border-rose-200'
                                }`}
                        >
                            Total : {Math.round(totalWeight * 100)}%
                        </span>
                    </div>

                    <div className="mb-3 flex flex-wrap gap-2">
                        {allCriterionNames.map((name) => (
                            <button
                                key={name}
                                type="button"
                                onClick={() => toggleCriterion(name)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold capitalize transition-all ${criteria.some((c) => c.name === name)
                                    ? 'border-[#e63946] bg-[#fff1f2] text-[#e63946]'
                                    : 'border-slate-200 bg-white text-[#64748b] hover:bg-slate-50'
                                    }`}
                            >
                                {name}
                            </button>
                        ))}
                    </div>

                    <div className="mt-3 flex flex-col gap-2">
                        {criteria.map((c) => (
                            <div key={c.name} className="flex items-center gap-3 rounded-xl border border-rose-100/80 bg-[#fafafc] px-3.5 py-2">
                                <span className="w-28 text-xs font-bold capitalize text-[#0f172a]">{c.name}</span>
                                <input
                                    type="range"
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    value={c.weight}
                                    onChange={(e) => updateWeight(c.name, Number(e.target.value))}
                                    className="flex-1 accent-[#e63946]"
                                />
                                <span className="w-12 text-right text-xs font-bold text-[#e63946]">{Math.round(c.weight * 100)}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {error && <p className="mb-4 text-xs font-semibold text-[#dc2626]">{error}</p>}

                <div className="mt-3 flex justify-end gap-2.5">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#64748b] hover:bg-slate-50 transition-colors"
                    >
                        Annuler
                    </button>
                    <button
                        type="submit"
                        disabled={submitting || criteria.length === 0 || Math.abs(totalWeight - 1) > 0.001}
                        className="rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-50 transition-all"
                    >
                        {submitting ? 'Création…' : 'Créer le round'}
                    </button>
                </div>
            </form>
        </div>
    )
}