'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, Trash2, Trophy, X } from 'lucide-react'
import { AdminLayout } from '@/components/ui/admin/Layout'

type Tournament = {
    id: string
    name: string
    status: 'DRAFT' | 'ACTIVE' | 'COMPLETED'
    createdAt: string
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Une erreur est survenue.')
    return body
}

const statusColors: Record<string, string> = {
    DRAFT: '#94a3b8',
    ACTIVE: '#ff6b4a',
    COMPLETED: '#e63946',
}

export default function TournamentsPage() {
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setTournaments(await readJson<Tournament[]>(await fetch('/api/tournaments', { cache: 'no-store' })))
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">Compétition</p>
                            <h1 className="mt-1 text-[28px] font-black tracking-tight text-[#0f172a] sm:text-[32px]">Tournois</h1>
                            <p className="mt-1 text-sm font-medium text-[#64748b]">{tournaments.length} tournoi(s)</p>
                        </div>
                        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 transition-all active:scale-[0.99]">
                            <Plus className="size-4" /> Nouveau tournoi
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xs ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-[#fff1f2] text-[#dc2626]'}`}>
                            {message.text}
                        </div>
                    )}

                    {showForm && (
                        <TournamentForm
                            onClose={() => setShowForm(false)}
                            onCreated={(t) => {
                                setTournaments((prev) => [t, ...prev])
                                setShowForm(false)
                                setMessage({ type: 'success', text: `« ${t.name} » créé.` })
                            }}
                        />
                    )}

                    {loading ? (
                        <section className="rounded-2xl border border-rose-100 bg-white p-10 text-center text-sm font-medium text-[#64748b]">Chargement…</section>
                    ) : tournaments.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                            <Trophy className="size-9 text-[#ff6b4a]" />
                            <p className="text-sm font-bold text-[#0f172a]">Aucun tournoi</p>
                            <p className="text-xs text-[#64748b]">Créez un tournoi pour commencer.</p>
                        </section>
                    ) : (
                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {tournaments.map((t) => (
                                <article key={t.id} className="group rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs transition-all duration-200 hover:border-[#FF6B4A] hover:shadow-md hover:shadow-rose-950/5 hover:-translate-y-0.5">
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="grid size-10 place-items-center rounded-xl bg-[#fff1f2] text-[#e63946] transition-transform duration-200 group-hover:scale-105">
                                            <Trophy className="size-5" />
                                        </div>
                                        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border" style={{ backgroundColor: `${statusColors[t.status]}15`, color: statusColors[t.status], borderColor: `${statusColors[t.status]}30` }}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold text-[#0f172a]">{t.name}</h3>
                                    <p className="mt-1 text-xs font-medium text-[#94a3b8]">Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</p>
                                    <div className="mt-4 flex justify-end border-t border-rose-100/60 pt-3">
                                        <a href={`/matches?tournamentId=${t.id}`} className="text-xs font-bold text-[#e63946] hover:text-[#ff6b4a] transition-colors">
                                            Voir les matchs →
                                        </a>
                                    </div>
                                </article>
                            ))}
                        </section>
                    )}
                </div>
            </main>
        </AdminLayout>
    )
}

function TournamentForm({ onClose, onCreated }: { onClose: () => void; onCreated: (t: Tournament) => void }) {
    const [name, setName] = useState('')
    const [status, setStatus] = useState<'DRAFT' | 'ACTIVE' | 'COMPLETED'>('DRAFT')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/tournaments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: name.trim(), status }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Création impossible.')
            onCreated(body as Tournament)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-rose-100">
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-lg font-bold text-[#0f172a]">Nouveau tournoi</h2>
                    <button type="button" onClick={onClose} className="text-[#94a3b8] hover:text-[#e63946] transition-colors"><X className="size-5" /></button>
                </div>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">Nom <span className="text-[#e63946]">*</span></span>
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Test Battle 2025" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all" />
                </label>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">Statut</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all">
                        <option value="DRAFT">Brouillon</option>
                        <option value="ACTIVE">Actif</option>
                        <option value="COMPLETED">Terminé</option>
                    </select>
                </label>

                {error && <p className="mb-4 text-xs font-semibold text-[#dc2626]">{error}</p>}

                <div className="mt-3 flex justify-end gap-2.5">
                    <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#64748b] hover:bg-slate-50 transition-colors">Annuler</button>
                    <button type="submit" disabled={submitting || !name.trim()} className="rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-50 transition-all">
                        {submitting ? 'Création…' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    )
}