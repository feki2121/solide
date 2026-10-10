'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Lock, Plus, Swords, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { AdminLayout } from '@/components/ui/admin/Layout'

type Candidate = { id: string; name: string; country: string | null; seed: number | null }
type Judge = { id: string; user: { id: string; name: string; email: string } }
type Tournament = { id: string; name: string }
type Match = {
    id: string
    name: string
    stage: 'QUALIFICATION' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'
    winnerId: string | null
    candidateA: Candidate | null
    candidateB: Candidate | null
    assignedJudges: { id: string; name: string; email: string }[]
    rounds: { id: string; number: number; status: string }[]
    tournament: { id: string; name: string }
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Une erreur est survenue.')
    return body
}

const stageLabels: Record<string, string> = {
    QUALIFICATION: 'Qualification',
    QUARTER_FINAL: 'Quart de finale',
    SEMI_FINAL: 'Demi-finale',
    FINAL: 'Finale',
}

export default function MatchesPage() {
    const [matches, setMatches] = useState<Match[]>([])
    const [tournaments, setTournaments] = useState<Tournament[]>([])
    const [candidates, setCandidates] = useState<Candidate[]>([])
    const [judges, setJudges] = useState<Judge[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

    const load = useCallback(async () => {
        setLoading(true)
        try {
            const [m, t, c, j] = await Promise.all([
                readJson<Match[]>(await fetch('/api/matches', { cache: 'no-store' })),
                readJson<Tournament[]>(await fetch('/api/tournaments', { cache: 'no-store' })),
                readJson<Candidate[]>(await fetch('/api/candidates', { cache: 'no-store' })),
                readJson<Judge[]>(await fetch('/api/judges', { cache: 'no-store' })),
            ])
            setMatches(m); setTournaments(t); setCandidates(c); setJudges(j)
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    async function handleDelete(id: string, name: string) {
        if (!confirm(`Supprimer le match « ${name} » ?`)) return
        try {
            const res = await fetch(`/api/matches/${id}`, { method: 'DELETE' })
            if (!res.ok) throw new Error('Suppression impossible.')
            setMatches((prev) => prev.filter((m) => m.id !== id))
            setMessage({ type: 'success', text: 'Match supprimé.' })
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    async function handleFinish(m: Match) {
        const allRoundsClosed =
            m.rounds.length > 0 && m.rounds.every((r) => r.status === 'CLOSED')

        if (!allRoundsClosed) {
            setMessage({
                type: 'error',
                text: 'Tous les rounds doivent être fermés avant de terminer le match.',
            })
            return
        }

        if (!confirm(`Terminer le match « ${m.name} » ?\nLe résultat final sera calculé et définitif.`)) return

        try {
            const res = await fetch(`/api/matches/${m.id}/finish`, { method: 'POST' })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Impossible de terminer le match.')

            const a = Number(body.result?.candidateAScore ?? 0).toFixed(1)
            const b = Number(body.result?.candidateBScore ?? 0).toFixed(1)

            setMatches((prev) =>
                prev.map((x) => (x.id === m.id ? { ...x, winnerId: body.match.winnerId } : x)),
            )
            setMessage({ type: 'success', text: `Match terminé. Score final : ${a} / ${b}` })
        } catch (err) {
            setMessage({ type: 'error', text: err instanceof Error ? err.message : 'Erreur.' })
        }
    }

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">Compétition</p>
                            <h1 className="mt-1 text-[28px] font-black tracking-tight text-[#0f172a] sm:text-[32px]">Matchs</h1>
                            <p className="mt-1 text-sm font-medium text-[#64748b]">{matches.length} match(s)</p>
                        </div>
                        <button
                            onClick={() => setShowForm(true)}
                            disabled={candidates.length < 2 || tournaments.length === 0}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-5 py-3 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-50 transition-all active:scale-[0.99]"
                        >
                            <Plus className="size-4" /> Nouveau match
                        </button>
                    </div>

                    {message && (
                        <div className={`mb-5 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-2xs ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-[#fff1f2] text-[#dc2626]'}`}>
                            {message.text}
                        </div>
                    )}

                    {showForm && (
                        <MatchForm
                            tournaments={tournaments}
                            candidates={candidates}
                            judges={judges}
                            onClose={() => setShowForm(false)}
                            onCreated={(m) => {
                                setMatches((prev) => [...prev, m])
                                setShowForm(false)
                                setMessage({ type: 'success', text: `« ${m.name} » créé.` })
                            }}
                        />
                    )}

                    {loading ? (
                        <section className="rounded-2xl border border-rose-100 bg-white p-10 text-center text-sm font-medium text-[#64748b]">Chargement…</section>
                    ) : matches.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                            <Swords className="size-9 text-[#ff6b4a]" />
                            <p className="text-sm font-bold text-[#0f172a]">Aucun match</p>
                            <p className="text-xs text-[#64748b]">Créez un match à partir de deux candidats.</p>
                        </section>
                    ) : (
                        <section className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-2xs">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-rose-100 bg-[#fff1f2]/40 text-left text-[11px] font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                                        <th className="px-5 py-3.5">Match</th>
                                        <th className="px-5 py-3.5">Stage</th>
                                        <th className="px-5 py-3.5">Affrontement</th>
                                        <th className="px-5 py-3.5">Rounds</th>
                                        <th className="px-5 py-3.5">Statut</th>
                                        <th className="px-5 py-3.5 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {matches.map((m) => {
                                        const allRoundsClosed =
                                            m.rounds.length > 0 && m.rounds.every((r) => r.status === 'CLOSED')
                                        const isFinished = Boolean(m.winnerId)
                                        const winnerName =
                                            m.winnerId === m.candidateA?.id
                                                ? m.candidateA?.name
                                                : m.winnerId === m.candidateB?.id
                                                    ? m.candidateB?.name
                                                    : null

                                        return (
                                            <tr key={m.id} className="border-b border-rose-100/60 last:border-0 hover:bg-[#fff1f2]/20 transition-colors">
                                                <td className="px-5 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-[#0f172a]">{m.name}</span>
                                                        {isFinished && (
                                                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                                <CheckCircle2 className="size-3" /> Terminé
                                                            </span>
                                                        )}
                                                    </div>
                                                    {isFinished && winnerName && (
                                                        <p className="mt-0.5 text-[11px] font-semibold text-emerald-600">🏆 {winnerName}</p>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-[#ff6b4a]">
                                                    {stageLabels[m.stage] ?? m.stage}
                                                </td>
                                                <td className="px-5 py-4">
                                                    <span className={`font-bold ${m.winnerId === m.candidateA?.id ? 'text-emerald-600' : 'text-[#0f172a]'}`}>
                                                        {m.candidateA?.name ?? 'TBD'}
                                                    </span>
                                                    <span className="mx-2 font-black text-[#e63946]">VS</span>
                                                    <span className={`font-bold ${m.winnerId === m.candidateB?.id ? 'text-emerald-600' : 'text-[#0f172a]'}`}>
                                                        {m.candidateB?.name ?? 'TBD'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-4 text-xs font-semibold text-[#64748b]">{m.rounds.length} round(s)</td>
                                                <td className="px-5 py-4">
                                                    {isFinished ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                                                            <span className="size-1.5 rounded-full bg-emerald-500" />
                                                            Terminé
                                                        </span>
                                                    ) : allRoundsClosed ? (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                                                            <span className="size-1.5 rounded-full bg-amber-500" />
                                                            Prêt à clôturer
                                                        </span>
                                                    ) : (
                                                        <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#e63946]">
                                                            <span className="size-1.5 rounded-full bg-[#e63946]" />
                                                            En cours
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 text-right">
                                                    <div className="inline-flex items-center gap-2">
                                                        <Link
                                                            href={`/matches/${m.id}`}
                                                            className="rounded-xl border border-rose-200 bg-white px-3.5 py-1.5 text-xs font-bold text-[#e63946] hover:bg-[#fff1f2] transition-colors"
                                                        >
                                                            Rounds
                                                        </Link>

                                                        {isFinished ? (
                                                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-bold text-emerald-700">
                                                                <CheckCircle2 className="size-3.5" /> Clos
                                                            </span>
                                                        ) : (
                                                            <button
                                                                onClick={() => void handleFinish(m)}
                                                                disabled={!allRoundsClosed}
                                                                title={
                                                                    !allRoundsClosed
                                                                        ? 'Tous les rounds doivent être fermés'
                                                                        : 'Calculer le résultat final'
                                                                }
                                                                className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                                                            >
                                                                <Lock className="size-3.5" /> Clôturer
                                                            </button>
                                                        )}

                                                        <button
                                                            onClick={() => void handleDelete(m.id, m.name)}
                                                            disabled={isFinished}
                                                            title={isFinished ? 'Impossible de supprimer un match terminé' : undefined}
                                                            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-[#fff1f2] px-3 py-1.5 text-xs font-bold text-[#dc2626] hover:bg-rose-100 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400 transition-colors"
                                                        >
                                                            <Trash2 className="size-3.5" /> Suppr.
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </section>
                    )}
                </div>
            </main>
        </AdminLayout>
    )
}

function MatchForm({ tournaments, candidates, judges, onClose, onCreated }: {
    tournaments: Tournament[]; candidates: Candidate[]; judges: Judge[]
    onClose: () => void; onCreated: (m: Match) => void
}) {
    const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? '')
    const [name, setName] = useState('')
    const [stage, setStage] = useState<'QUALIFICATION' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'>('QUARTER_FINAL')
    const [candidateAId, setCandidateAId] = useState('')
    const [candidateBId, setCandidateBId] = useState('')
    const [judgeIds, setJudgeIds] = useState<string[]>([])
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/matches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId, name: name.trim(), stage,
                    candidateAId: candidateAId || undefined,
                    candidateBId: candidateBId || undefined,
                    judgeIds,
                }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Création impossible.')
            onCreated(body as Match)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setSubmitting(false)
        }
    }

    function toggleJudge(id: string) {
        setJudgeIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4" onClick={onClose}>
            <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-rose-100">
                <div className="mb-5 flex items-start justify-between">
                    <h2 className="text-lg font-bold text-[#0f172a]">Nouveau match</h2>
                    <button type="button" onClick={onClose} className="text-[#94a3b8] hover:text-[#e63946] transition-colors"><X className="size-5" /></button>
                </div>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">Tournoi <span className="text-[#e63946]">*</span></span>
                    <select required value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all">
                        {tournaments.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                </label>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">Nom du match <span className="text-[#e63946]">*</span></span>
                    <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Quarter Final #1" className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all" />
                </label>

                <label className="mb-4 block">
                    <span className="text-xs font-bold text-[#0f172a]">Stage <span className="text-[#e63946]">*</span></span>
                    <select value={stage} onChange={(e) => setStage(e.target.value as any)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all">
                        <option value="QUALIFICATION">Qualification</option>
                        <option value="QUARTER_FINAL">Quart de finale</option>
                        <option value="SEMI_FINAL">Demi-finale</option>
                        <option value="FINAL">Finale</option>
                    </select>
                </label>

                <div className="mb-4 grid grid-cols-2 gap-3">
                    <label className="block">
                        <span className="text-xs font-bold text-[#0f172a]">Candidat A</span>
                        <select value={candidateAId} onChange={(e) => setCandidateAId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all">
                            <option value="">— Sélectionner —</option>
                            {candidates.filter((c) => c.id !== candidateBId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <span className="text-xs font-bold text-[#0f172a]">Candidat B</span>
                        <select value={candidateBId} onChange={(e) => setCandidateBId(e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-[#e63946] focus:ring-2 focus:ring-[#e63946]/20 transition-all">
                            <option value="">— Sélectionner —</option>
                            {candidates.filter((c) => c.id !== candidateAId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </label>
                </div>

                <div className="mb-4">
                    <span className="text-xs font-bold text-[#0f172a]">Juges assignés</span>
                    <div className="mt-2 flex flex-wrap gap-2">
                        {judges.length === 0 ? (
                            <p className="text-xs text-[#94a3b8]">Aucun juge disponible.</p>
                        ) : judges.map((j) => (
                            <button
                                key={j.id}
                                type="button"
                                onClick={() => toggleJudge(j.id)}
                                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition-all ${judgeIds.includes(j.id)
                                    ? 'border-[#e63946] bg-[#fff1f2] text-[#e63946]'
                                    : 'border-slate-200 bg-white text-[#64748b] hover:bg-slate-50'
                                    }`}
                            >
                                {j.user.name}
                            </button>
                        ))}
                    </div>
                </div>

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