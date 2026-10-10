'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Users, X } from 'lucide-react'
import { AdminLayout } from '@/components/ui/admin/Layout'

type Candidate = {
    id: string
    name: string
    country: string | null
    seed: number | null
    createdAt: string
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Une erreur est survenue.')
    return body
}

export default function CandidatesPage() {
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [showForm, setShowForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const data = await readJson<Candidate[]>(
                await fetch('/api/candidates', { cache: 'no-store' }),
            )
            setCandidates(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Chargement impossible.')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Supprimer le candidat « ${name} » ?`)) return
        try {
            const res = await fetch(`/api/candidates/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Suppression impossible.')
            setCandidates((prev) => prev.filter((c) => c.id !== id))
            setMessage({ type: 'success', text: 'Candidat supprimé.' })
        } catch (err) {
            setMessage({
                type: 'error',
                text: err instanceof Error ? err.message : 'Erreur.',
            })
        }
    }

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    {/* En-tête */}
                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                                Gestion
                            </p>
                            <h1 className="mt-1 text-[28px] font-black tracking-tight text-[#0f172a] sm:text-[32px]">
                                Candidats
                            </h1>
                            <p className="mt-1 text-sm font-medium text-[#64748b]">
                                {candidates.length} candidat{candidates.length > 1 ? 's' : ''} enregistré
                                {candidates.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowForm(true)
                                setMessage(null)
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 transition-all active:scale-[0.99]"
                        >
                            <Plus className="size-4" />
                            Ajouter un candidat
                        </button>
                    </div>

                    {/* Message */}
                    {message && (
                        <div
                            role="status"
                            className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xs ${message.type === 'success'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-rose-200 bg-[#fff1f2] text-[#dc2626]'
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {/* Formulaire (modal) */}
                    {showForm && (
                        <CandidateForm
                            onClose={() => setShowForm(false)}
                            onCreated={(candidate) => {
                                setCandidates((prev) => [...prev, candidate].sort((a, b) => (a.seed ?? 0) - (b.seed ?? 0)))
                                setShowForm(false)
                                setMessage({ type: 'success', text: `« ${candidate.name} » ajouté.` })
                            }}
                        />
                    )}

                    {/* Liste */}
                    {loading ? (
                        <section className="rounded-2xl border border-rose-100 bg-white p-10 text-center text-sm font-medium text-[#64748b]">
                            Chargement…
                        </section>
                    ) : error ? (
                        <section className="rounded-2xl border border-rose-200 bg-white p-10 text-center text-sm font-semibold text-[#dc2626]">
                            {error}
                        </section>
                    ) : candidates.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                            <Users className="size-9 text-[#ff6b4a]" />
                            <p className="text-sm font-bold text-[#0f172a]">Aucun candidat pour le moment</p>
                            <p className="text-xs text-[#64748b]">
                                Commencez par ajouter les danseurs du tournoi.
                            </p>
                        </section>
                    ) : (
                        <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xs">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-rose-100 bg-[#fff1f2]/40 text-left text-[11px] font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                                        <th className="px-5 py-3.5">Seed</th>
                                        <th className="px-5 py-3.5">Nom</th>
                                        <th className="px-5 py-3.5">Pays</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {candidates.map((candidate) => (
                                        <tr
                                            key={candidate.id}
                                            className="border-b border-rose-100/60 last:border-0 hover:bg-[#fff1f2]/20 transition-colors"
                                        >
                                            <td className="px-5 py-4 text-xs font-bold text-[#e63946]">
                                                #{candidate.seed ?? '—'}
                                            </td>
                                            <td className="px-5 py-4 font-bold text-[#0f172a]">{candidate.name}</td>
                                            <td className="px-5 py-4 font-semibold text-[#64748b]">
                                                {candidate.country ?? '—'}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => void handleDelete(candidate.id, candidate.name)}
                                                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-[#fff1f2] px-3.5 py-1.5 text-xs font-bold text-[#dc2626] hover:bg-rose-100 transition-colors"
                                                >
                                                    <Trash2 className="size-3.5" />
                                                    Supprimer
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </section>
                    )}
                </div>
            </main>
        </AdminLayout>
    )
}

/* ────────── Formulaire modal ────────── */

function CandidateForm({
    onClose,
    onCreated,
}: {
    onClose: () => void
    onCreated: (candidate: Candidate) => void
}) {
    const [name, setName] = useState('')
    const [country, setCountry] = useState('')
    const [seed, setSeed] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const payload: Record<string, unknown> = { name: name.trim() }
            if (country.trim()) payload.country = country.trim()
            if (seed.trim()) payload.seed = Number(seed)

            const res = await fetch('/api/candidates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Création impossible.')
            onCreated(body as Candidate)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-100"
            >
                <div className="mb-5 flex items-start justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-[#0f172a]">Nouveau candidat</h2>
                        <p className="mt-0.5 text-xs text-[#64748b]">
                            Ajoutez un danseur au tournoi.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Fermer"
                        className="text-[#94a3b8] hover:text-[#e63946] transition-colors"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">
                        Nom <span className="text-[#e63946]">*</span>
                    </span>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="B-Boy Nova"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                    />
                </label>

                <div className="grid grid-cols-2 gap-4">
                    <label className="mb-4 block">
                        <span className="text-xs font-bold text-[#0f172a]">Pays</span>
                        <input
                            type="text"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            placeholder="FR"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                        />
                    </label>

                    <label className="mb-4 block">
                        <span className="text-xs font-bold text-[#0f172a]">Seed</span>
                        <input
                            type="number"
                            min={1}
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            placeholder="1"
                            className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                        />
                    </label>
                </div>

                {error && (
                    <p className="mb-4 text-xs font-semibold text-[#dc2626]">{error}</p>
                )}

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
                        disabled={submitting || !name.trim()}
                        className="rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-50 transition-all"
                    >
                        {submitting ? 'Création…' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    )
}