'use client'

import { useCallback, useEffect, useState } from 'react'
import { Plus, ShieldCheck, Trash2, UserX, X } from 'lucide-react'
import { AdminLayout } from '@/components/ui/admin/Layout'
type Judge = {
    id: string
    active: boolean
    user: {
        id: string
        name: string
        email: string
        role: 'ADMIN' | 'JUDGE'
    }
    assignments: {
        match: {
            id: string
            name: string
            tournamentId: string
        }
    }[]
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Une erreur est survenue.')
    return body
}

export default function JudgesPage() {
    const [judges, setJudges] = useState<Judge[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            setJudges(await readJson<Judge[]>(await fetch('/api/judges', { cache: 'no-store' })))
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void load()
    }, [load])

    async function handleDelete(judge: Judge) {
        if (!confirm(`Supprimer le juge « ${judge.user.name} » ?\nSes assignations seront également supprimées.`)) return
        try {
            const res = await fetch(`/api/judges/${judge.id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Suppression impossible.')
            setJudges((prev) => prev.filter((j) => j.id !== judge.id))
            setMessage({ type: 'success', text: `« ${judge.user.name} » supprimé.` })
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#f7f8fa] text-[#202532]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    {/* En-tête */}
                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a0a8b6]">
                                Gestion
                            </p>
                            <h1 className="mt-1 text-[28px] font-bold tracking-tight sm:text-[32px]">
                                Jurys
                            </h1>
                            <p className="mt-1 text-sm text-[#7e8798]">
                                {judges.length} juge{judges.length > 1 ? 's' : ''} enregistré
                                {judges.length > 1 ? 's' : ''}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                setShowForm(true)
                                setMessage(null)
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#1b66f9] px-5 py-3 text-sm font-bold text-white shadow-sm hover:bg-[#1059e5]"
                        >
                            <Plus className="size-4" />
                            Ajouter un juge
                        </button>
                    </div>

                    {/* Message */}
                    {message && (
                        <div
                            role="status"
                            className={`mb-5 rounded-xl border px-4 py-3 text-sm font-semibold ${message.type === 'success'
                                ? 'border-[#c8efd9] bg-[#eefbf4] text-[#24a363]'
                                : 'border-[#f9d0d0] bg-[#fff3f1] text-[#f25555]'
                                }`}
                        >
                            {message.text}
                        </div>
                    )}

                    {/* Formulaire modal */}
                    {showForm && (
                        <JudgeForm
                            onClose={() => setShowForm(false)}
                            onCreated={(judge) => {
                                setJudges((prev) => [...prev, judge])
                                setShowForm(false)
                                setMessage({ type: 'success', text: `« ${judge.user.name} » ajouté.` })
                            }}
                        />
                    )}

                    {/* Liste */}
                    {loading ? (
                        <section className="rounded-2xl border border-[#e5e8ee] bg-white p-10 text-center text-sm text-[#7e8798]">
                            Chargement…
                        </section>
                    ) : judges.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#e5e8ee] bg-white p-12 text-center">
                            <ShieldCheck className="size-8 text-[#a0a8b6]" />
                            <p className="text-sm font-semibold">Aucun juge pour le moment</p>
                            <p className="text-xs text-[#7e8798]">
                                Créez un compte juge pour qu'il puisse évaluer les matchs.
                            </p>
                        </section>
                    ) : (
                        <section className="overflow-hidden rounded-2xl border border-[#e5e8ee] bg-white shadow-[0_8px_30px_rgba(31,45,75,0.04)]">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[#edf0f4] bg-[#fbfcfe] text-left text-[11px] font-bold uppercase tracking-[.14em] text-[#a0a8b6]">
                                        <th className="px-5 py-3">Juge</th>
                                        <th className="px-5 py-3">Email</th>
                                        <th className="px-5 py-3">Statut</th>
                                        <th className="px-5 py-3">Matchs assignés</th>
                                        <th className="px-5 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {judges.map((judge) => (
                                        <tr
                                            key={judge.id}
                                            className="border-b border-[#f1f3f7] last:border-0 hover:bg-[#fbfcfe]"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="grid size-8 place-items-center rounded-full bg-[#dbe7ff] text-xs font-bold text-[#1b66f9]">
                                                        {judge.user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-semibold">{judge.user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-[#7e8798]">{judge.user.email}</td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${judge.active
                                                        ? 'bg-[#eefbf4] text-[#24a363]'
                                                        : 'bg-[#f5f7fa] text-[#a0a8b6]'
                                                        }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${judge.active ? 'bg-[#37c47b]' : 'bg-[#a0a8b6]'
                                                            }`}
                                                    />
                                                    {judge.active ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs font-bold text-[#7e8798]">
                                                {judge.assignments.length === 0
                                                    ? '—'
                                                    : `${judge.assignments.length} match${judge.assignments.length > 1 ? 's' : ''}`}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => void handleDelete(judge)}
                                                    className="inline-flex items-center gap-1.5 rounded-lg border border-[#f9d0d0] bg-white px-3 py-1.5 text-xs font-bold text-[#f25555] hover:bg-[#fff3f1]"
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

function JudgeForm({
    onClose,
    onCreated,
}: {
    onClose: () => void
    onCreated: (judge: Judge) => void
}) {
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [active, setActive] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/judges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim().toLowerCase(),
                    password,
                    active,
                }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Création impossible.')

            // Le backend renvoie { id, user, active } → on complète pour matcher le type Judge
            const judge: Judge = {
                id: body.id,
                active: body.active,
                user: { id: body.user.id, name: body.user.name, email: body.user.email, role: 'JUDGE' },
                assignments: [],
            }
            onCreated(judge)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <AdminLayout>

            <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={onClose}
            >
                <form
                    onSubmit={handleSubmit}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
                >
                    <div className="mb-5 flex items-start justify-between">
                        <div>
                            <h2 className="text-lg font-bold">Nouveau juge</h2>
                            <p className="mt-0.5 text-xs text-[#7e8798]">
                                Un compte JUDGE sera créé automatiquement.
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            aria-label="Fermer"
                            className="text-[#a0a8b6] hover:text-[#202532]"
                        >
                            <X className="size-5" />
                        </button>
                    </div>

                    <label className="mb-4 block">
                        <span className="text-xs font-semibold text-[#7e8798]">
                            Nom complet <span className="text-[#f25555]">*</span>
                        </span>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ahmed Ben Salah"
                            className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm outline-none focus:border-[#1b66f9]"
                        />
                    </label>

                    <label className="mb-4 block">
                        <span className="text-xs font-semibold text-[#7e8798]">
                            Email <span className="text-[#f25555]">*</span>
                        </span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="juge@dancebattle.fr"
                            className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm outline-none focus:border-[#1b66f9]"
                        />
                    </label>

                    <label className="mb-4 block">
                        <span className="text-xs font-semibold text-[#7e8798]">
                            Mot de passe <span className="text-[#f25555]">*</span>
                        </span>
                        <input
                            type="password"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="•••••••• (min. 8 caractères)"
                            className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm outline-none focus:border-[#1b66f9]"
                        />
                        <p className="mt-1 text-[11px] text-[#a0a8b6]">
                            Le juge utilisera ces identifiants dans l'app mobile.
                        </p>
                    </label>

                    <label className="mb-5 flex items-center gap-2">
                        <input
                            type="checkbox"
                            checked={active}
                            onChange={(e) => setActive(e.target.checked)}
                            className="size-4 rounded border-[#e2e6ed] text-[#1b66f9] focus:ring-[#1b66f9]"
                        />
                        <span className="text-xs font-semibold text-[#7e8798]">
                            Compte actif (peut être assigné à des matchs)
                        </span>
                    </label>

                    {error && (
                        <p className="mb-4 text-xs font-semibold text-[#f25555]">{error}</p>
                    )}

                    <div className="mt-2 flex justify-end gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-[#e2e6ed] px-4 py-2.5 text-sm font-semibold text-[#7e8798] hover:bg-[#f7f8fa]"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting || !name.trim() || !email.trim() || password.length < 8}
                            className="rounded-xl bg-[#1b66f9] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#1059e5] disabled:bg-[#aebbd4]"
                        >
                            {submitting ? 'Création…' : 'Créer le juge'}
                        </button>
                    </div>
                </form>
            </div>
        </AdminLayout>

    )
}