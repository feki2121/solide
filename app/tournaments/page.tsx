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
    DRAFT: '#a0a8b6',
    ACTIVE: '#24a363',
    COMPLETED: '#1b66f9',
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
            <main className="min-h-screen bg-[#f7f8fa] text-[#202532]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a0a8b6]">Compétition</p>
                            <h1 className="mt-1 text-[28px] font-bold tracking-tight sm:text-[32px]">Tournois</h1>
                            <p className="mt-1 text-sm text-[#7e8798]">{tournaments.length} tournoi(s)</p>
                        </div>
                        <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#1b66f9] px-5 py-3 text-sm font-bold text-white hover:bg-[#1059e5]">
                            <Plus className="size-4" /> Nouveau tournoi
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success' ? 'border-[#c8efd9] bg-[#eefbf4] text-[#24a363]' : 'border-[#f9d0d0] bg-[#fff3f1] text-[#f25555]'}`}>
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
                        <section className="rounded-2xl border border-[#e5e8ee] bg-white p-10 text-center text-sm text-[#7e8798]">Chargement…</section>
                    ) : tournaments.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#e5e8ee] bg-white p-12 text-center">
                            <Trophy className="size-8 text-[#a0a8b6]" />
                            <p className="text-sm font-semibold">Aucun tournoi</p>
                            <p className="text-xs text-[#7e8798]">Créez un tournoi pour commencer.</p>
                        </section>
                    ) : (
                        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {tournaments.map((t) => (
                                <article key={t.id} className="rounded-2xl border border-[#e5e8ee] bg-white p-5 shadow-[0_8px_30px_rgba(31,45,75,0.04)]">
                                    <div className="mb-3 flex items-start justify-between">
                                        <div className="grid size-10 place-items-center rounded-xl bg-[#edf4ff] text-[#1b66f9]"><Trophy className="size-5" /></div>
                                        <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ backgroundColor: `${statusColors[t.status]}20`, color: statusColors[t.status] }}>
                                            {t.status}
                                        </span>
                                    </div>
                                    <h3 className="text-base font-bold">{t.name}</h3>
                                    <p className="mt-1 text-xs text-[#a0a8b6]">Créé le {new Date(t.createdAt).toLocaleDateString('fr-FR')}</p>
                                    <div className="mt-4 flex justify-end border-t border-[#f1f3f7] pt-3">
                                        <a href={`/matches?tournamentId=${t.id}`} className="text-xs font-bold text-[#1b66f9] hover:underline">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-lg font-bold">Nouveau tournoi</h2>
                    <button type="button" onClick={onClose} className="text-[#a0a8b6] hover:text-[#202532]"><X className="size-5" /></button>
                </div>

                <label className="mb-4 block">
                    <span className="text-xs font-semibold text-[#7e8798]">Nom <span className="text-[#f25555]">*</span></span>
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Test Battle 2025" className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm outline-none focus:border-[#1b66f9]" />
                </label>

                <label className="mb-4 block">
                    <span className="text-xs font-semibold text-[#7e8798]">Statut</span>
                    <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm outline-none focus:border-[#1b66f9]">
                        <option value="DRAFT">Brouillon</option>
                        <option value="ACTIVE">Actif</option>
                        <option value="COMPLETED">Terminé</option>
                    </select>
                </label>

                {error && <p className="mb-4 text-xs font-semibold text-[#f25555]">{error}</p>}

                <div className="flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="rounded-xl border border-[#e2e6ed] px-4 py-2.5 text-sm font-semibold text-[#7e8798] hover:bg-[#f7f8fa]">Annuler</button>
                    <button type="submit" disabled={submitting || !name.trim()} className="rounded-xl bg-[#1b66f9] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1059e5] disabled:bg-[#aebbd4]">
                        {submitting ? 'Création…' : 'Créer'}
                    </button>
                </div>
            </form>
        </div>
    )
}