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
            <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    {/* En-tête */}
                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                                Gestion
                            </p>
                            <h1 className="mt-1 text-[28px] font-black tracking-tight text-[#0f172a] sm:text-[32px]">
                                Jurys
                            </h1>
                            <p className="mt-1 text-sm font-medium text-[#64748b]">
                                {judges.length} juge{judges.length > 1 ? 's' : ''} enregistré
                                {judges.length > 1 ? 's' : ''}
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
                            Ajouter un juge
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
                        <section className="rounded-2xl border border-rose-100 bg-white p-10 text-center text-sm font-medium text-[#64748b]">
                            Chargement…
                        </section>
                    ) : judges.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                            <ShieldCheck className="size-9 text-[#ff6b4a]" />
                            <p className="text-sm font-bold text-[#0f172a]">Aucun juge pour le moment</p>
                            <p className="text-xs text-[#64748b]">
                                Créez un compte juge pour qu'il puisse évaluer les matchs.
                            </p>
                        </section>
                    ) : (
                        <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xs">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-rose-100 bg-[#fff1f2]/40 text-left text-[11px] font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                                        <th className="px-5 py-3.5">Juge</th>
                                        <th className="px-5 py-3.5">Email</th>
                                        <th className="px-5 py-3.5">Statut</th>
                                        <th className="px-5 py-3.5">Matchs assignés</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {judges.map((judge) => (
                                        <tr
                                            key={judge.id}
                                            className="border-b border-rose-100/60 last:border-0 hover:bg-[#fff1f2]/20 transition-colors"
                                        >
                                            <td className="px-5 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-xs font-bold text-white shadow-xs">
                                                        {judge.user.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <span className="font-bold text-[#0f172a]">{judge.user.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 font-semibold text-[#64748b]">{judge.user.email}</td>
                                            <td className="px-5 py-4">
                                                <span
                                                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${judge.active
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                                        : 'bg-slate-100 text-slate-500 border border-slate-200'
                                                        }`}
                                                >
                                                    <span
                                                        className={`size-1.5 rounded-full ${judge.active ? 'bg-emerald-500' : 'bg-slate-400'
                                                            }`}
                                                    />
                                                    {judge.active ? 'Actif' : 'Inactif'}
                                                </span>
                                            </td>
                                            <td className="px-5 py-4 text-xs font-bold text-[#64748b]">
                                                {judge.assignments.length === 0
                                                    ? '—'
                                                    : `${judge.assignments.length} match${judge.assignments.length > 1 ? 's' : ''}`}
                                            </td>
                                            <td className="px-5 py-4 text-right">
                                                <button
                                                    onClick={() => void handleDelete(judge)}
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
                        <h2 className="text-lg font-bold text-[#0f172a]">Nouveau juge</h2>
                        <p className="mt-0.5 text-xs text-[#64748b]">
                            Un compte JUDGE sera créé automatiquement.
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
                        Nom complet <span className="text-[#e63946]">*</span>
                    </span>
                    <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Ahmed Ben Salah"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                    />
                </label>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">
                        Email <span className="text-[#e63946]">*</span>
                    </span>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="juge@dancebattle.fr"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                    />
                </label>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">
                        Mot de passe <span className="text-[#e63946]">*</span>
                    </span>
                    <input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="•••••••• (min. 8 caractères)"
                        className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all"
                    />
                    <p className="mt-1.5 text-[11px] font-medium text-[#94a3b8]">
                        Le juge utilisera ces identifiants dans l'app mobile.
                    </p>
                </label>

                <label className="mb-5 flex items-center gap-2.5 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={active}
                        onChange={(e) => setActive(e.target.checked)}
                        className="size-4 rounded accent-[#e63946]"
                    />
                    <span className="text-xs font-semibold text-[#64748b]">
                        Compte actif (peut être assigné à des matchs)
                    </span>
                </label>

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
                        disabled={submitting || !name.trim() || !email.trim() || password.length < 8}
                        className="rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-50 transition-all"
                    >
                        {submitting ? 'Création…' : 'Créer le juge'}
                    </button>
                </div>
            </form>
        </div>
    )
}