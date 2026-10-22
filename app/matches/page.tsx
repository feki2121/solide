'use client'

import { useCallback, useEffect, useState } from 'react'
import { CheckCircle2, Lock, Plus, Swords, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { AdminLayout } from '@/components/ui/admin/Layout'
import { useRouter } from 'next/navigation'

type Candidate = { id: string; name: string; country: string | null; seed: number | null }
type Judge = { id: string; user: { id: string; name: string; email: string } }
type Tournament = { id: string; name: string }
type Match = {
    id: string
    name: string
    stage: 'QUALIFICATION' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'
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
    ROUND_OF_16: 'Huitième de finale',
    QUARTER_FINAL: 'Quart de finale',
    SEMI_FINAL: 'Demi-finale',
    FINAL: 'Finale',
}

/** Nombre de matchs (paires) générés selon le stage. */
const STAGE_PAIRS_COUNT: Record<string, number> = {
    QUALIFICATION: 1,
    ROUND_OF_16: 8,
    QUARTER_FINAL: 4,
    SEMI_FINAL: 2,
    FINAL: 1,
}

export default function MatchesPage() {
    const router = useRouter()
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
                            disabled={tournaments.length === 0}
                            title={tournaments.length === 0 ? 'Créez d\'abord un tournoi' : undefined}
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
                            judges={judges}
                            onClose={() => setShowForm(false)}
                            onCreated={(count, tournamentId) => {
                                setShowForm(false)
                                router.push(`/bracket?tournamentId=${tournamentId}`)
                            }}
                        />
                    )}

                    {loading ? (
                        <section className="rounded-2xl border border-rose-100 bg-white p-10 text-center text-sm font-medium text-[#64748b]">Chargement…</section>
                    ) : matches.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-rose-200 bg-white p-12 text-center">
                            <Swords className="size-9 text-[#ff6b4a]" />
                            <p className="text-sm font-bold text-[#0f172a]">Aucun match</p>
                            <p className="text-xs text-[#64748b]">
                                Créez un stage pour générer les matchs aléatoirement.
                            </p>
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

const STAGE_ORDER: ('QUALIFICATION' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL')[] = [
    'QUALIFICATION',
    'ROUND_OF_16',
    'QUARTER_FINAL',
    'SEMI_FINAL',
    'FINAL',
]

const STAGE_SHORT_LABELS: Record<string, string> = {
    QUALIFICATION: 'Qualif.',
    ROUND_OF_16: '1/8 Finale',
    QUARTER_FINAL: '1/4 Finale',
    SEMI_FINAL: '1/2 Finale',
    FINAL: 'Finale',
}

function MatchForm({
    tournaments,
    judges,
    onClose,
    onCreated,
}: {
    tournaments: Tournament[]
    judges: Judge[]
    onClose: () => void
    onCreated: (count: number, tournamentId: string) => void
}) {
    const [tournamentId, setTournamentId] = useState(tournaments[0]?.id ?? '')
    const [stage, setStage] = useState<'QUALIFICATION' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'>('ROUND_OF_16')
    
    // Configuration des rounds indépendants pour chaque étape
    const [stageRounds, setStageRounds] = useState<Record<string, number>>({
        QUALIFICATION: 2,
        ROUND_OF_16: 2,
        QUARTER_FINAL: 3,
        SEMI_FINAL: 3,
        FINAL: 5,
    })

    const [showPasteBox, setShowPasteBox] = useState(false)
    const [pasteText, setPasteText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Nombre de matchs / candidats selon le stage
    const pairsCount = STAGE_PAIRS_COUNT[stage] ?? 1
    const candidatesCount = pairsCount * 2

    // Un tableau de noms
    const [names, setNames] = useState<string[]>(
        Array.from({ length: candidatesCount }, () => '')
    )

    // Reset quand le stage change
    useEffect(() => {
        setNames(Array.from({ length: candidatesCount }, () => ''))
    }, [stage, candidatesCount])

    function updateName(index: number, value: string) {
        // Détection de collage multiple (séparé par retours à la ligne ou virgules)
        if (value.includes('\n') || value.includes(',') || value.includes('\t')) {
            const rawTokens = value
                .split(/[\n,\t]+/)
                .map((t) => t.trim())
                .filter(Boolean)
            if (rawTokens.length > 1) {
                setNames((prev) => {
                    const next = [...prev]
                    for (let k = 0; k < rawTokens.length && index + k < next.length; k++) {
                        next[index + k] = rawTokens[k]
                    }
                    return next
                })
                return
            }
        }
        setNames((prev) => prev.map((n, i) => (i === index ? value : n)))
    }

    function handleApplyBulkPaste() {
        if (!pasteText.trim()) return
        const tokens = pasteText
            .split(/[\n,;\t]+/)
            .map((s) => s.trim())
            .filter(Boolean)

        setNames((prev) => {
            const next = Array.from({ length: candidatesCount }, () => '')
            for (let i = 0; i < candidatesCount; i++) {
                if (tokens[i]) next[i] = tokens[i]
            }
            return next
        })
        setShowPasteBox(false)
        setPasteText('')
    }

    function setRoundsForStage(stg: string, val: number) {
        const clamped = Math.max(1, Math.min(10, val))
        setStageRounds((prev) => ({ ...prev, [stg]: clamped }))
    }

    function setAllActiveRounds(val: number) {
        const clamped = Math.max(1, Math.min(10, val))
        setStageRounds((prev) => {
            const updated = { ...prev }
            for (const stg of activeStages) {
                updated[stg] = clamped
            }
            return updated
        })
    }

    const currentStageIdx = STAGE_ORDER.indexOf(stage)
    const activeStages = STAGE_ORDER.slice(currentStageIdx)

    // Calcul du total des matchs générés
    let totalGeneratedMatches = 0
    let prevMatchesCount = pairsCount
    totalGeneratedMatches += prevMatchesCount
    for (let idx = currentStageIdx + 1; idx < STAGE_ORDER.length; idx++) {
        prevMatchesCount = Math.ceil(prevMatchesCount / 2)
        totalGeneratedMatches += prevMatchesCount
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        // Validation : tous les noms doivent être remplis
        const trimmed = names.map((n) => n.trim())
        for (let i = 0; i < trimmed.length; i++) {
            if (!trimmed[i]) {
                setError(`Candidat ${i + 1} : nom manquant.`)
                setSubmitting(false)
                return
            }
        }

        // Vérifie les doublons
        const unique = new Set(trimmed.map((n) => n.toLowerCase()))
        if (unique.size !== trimmed.length) {
            setError('Les noms des candidats doivent être uniques.')
            setSubmitting(false)
            return
        }

        try {
            const res = await fetch('/api/matches/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    tournamentId,
                    stage,
                    stageRounds, // Enregistrement des rounds indépendants par étape
                    roundsCount: stageRounds[stage] ?? 3, // Compatibilité ascendante
                    candidateNames: trimmed,
                    judgeIds: judges.map((j) => j.id),
                }),
            })
            const body = await res.json().catch(() => ({}))
            if (!res.ok) throw new Error(body.error || 'Création impossible.')
            onCreated(body.created ?? pairsCount, tournamentId)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 backdrop-blur-sm"
            onClick={onClose}
        >
            <form
                onSubmit={handleSubmit}
                onClick={(e) => e.stopPropagation()}
                className="flex h-[94vh] w-[96vw] max-w-7xl flex-col rounded-3xl border border-slate-200/80 bg-white shadow-2xl overflow-hidden"
            >
                {/* ── EN-TÊTE FIXE DE LA MODAL ── */}
                <div className="flex shrink-0 items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-white shadow-md shadow-red-500/20">
                            <Swords className="size-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black tracking-tight text-[#0f172a]">
                                Nouveau tableau de tournoi
                            </h2>
                            <p className="text-xs font-medium text-[#64748b]">
                                Configurez les étapes, les rounds indépendants et les participants
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl p-2 text-[#94a3b8] hover:bg-slate-100 hover:text-[#e63946] transition-colors"
                        title="Fermer"
                    >
                        <X className="size-5" />
                    </button>
                </div>

                {/* ── CORPS SCROLLABLE : 2 COLONNES CONFORTABLES SUR DESKTOP ── */}
                <div className="flex-1 overflow-y-auto bg-[#fafafc] p-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 items-start">
                        {/* ── COLONNE GAUCHE (CONFIGURATION DU TOURNOI & ROUNDS) ── */}
                        <div className="flex flex-col gap-5 lg:col-span-5">
                            {/* Carte 1 : Tournoi & Étape initiale */}
                            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                                <h3 className="text-xs font-black uppercase tracking-wider text-[#0f172a] mb-4">
                                    Paramètres du tournoi
                                </h3>

                                <label className="mb-4 block">
                                    <span className="text-xs font-bold text-[#0f172a]">
                                        Tournoi <span className="text-[#e63946]">*</span>
                                    </span>
                                    <select
                                        required
                                        value={tournamentId}
                                        onChange={(e) => setTournamentId(e.target.value)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#e63946] transition-colors"
                                    >
                                        {tournaments.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </label>

                                <label className="block">
                                    <span className="text-xs font-bold text-[#0f172a]">
                                        Étape de départ <span className="text-[#e63946]">*</span>
                                    </span>
                                    <select
                                        value={stage}
                                        onChange={(e) => setStage(e.target.value as typeof stage)}
                                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold outline-none focus:border-[#e63946] transition-colors"
                                    >
                                        <option value="QUALIFICATION">Qualification (2 candidats)</option>
                                        <option value="ROUND_OF_16">Huitième de finale (16 candidats · 8 matchs)</option>
                                        <option value="QUARTER_FINAL">Quart de finale (8 candidats · 4 matchs)</option>
                                        <option value="SEMI_FINAL">Demi-finale (4 candidats · 2 matchs)</option>
                                        <option value="FINAL">Finale seule (2 candidats · 1 match)</option>
                                    </select>
                                    <span className="mt-1.5 block text-[11px] font-medium text-[#64748b]">
                                        L'arbre générera automatiquement tous les tours suivants jusqu'à la Finale.
                                    </span>
                                </label>
                            </div>

                            {/* Carte 2 : Rounds indépendants par étape */}
                            <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                                <div className="mb-3 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                                            Rounds par étape
                                        </h3>
                                        <p className="text-[11px] font-medium text-[#64748b]">
                                            Définissez le nombre de rounds indépendamment pour chaque étape
                                        </p>
                                    </div>
                                </div>

                                {/* Raccourcis rapides */}
                                <div className="mb-4 flex items-center gap-1.5 rounded-xl bg-slate-50 p-2 text-xs text-[#64748b]">
                                    <span className="font-semibold text-[#0f172a] text-[11px]">Régler tous sur :</span>
                                    {[1, 2, 3, 5].map((val) => (
                                        <button
                                            key={val}
                                            type="button"
                                            onClick={() => setAllActiveRounds(val)}
                                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-[#0f172a] hover:border-[#e63946] hover:text-[#e63946] transition-colors"
                                        >
                                            {val} rds
                                        </button>
                                    ))}
                                </div>

                                {/* Liste des étapes actives avec configuration indépendante */}
                                <div className="flex flex-col gap-2.5">
                                    {activeStages.map((stg) => {
                                        const currentVal = stageRounds[stg] ?? 3
                                        const isFinal = stg === 'FINAL'
                                        return (
                                            <div
                                                key={stg}
                                                className={`flex items-center justify-between rounded-xl border p-3 transition-colors ${
                                                    isFinal
                                                        ? 'border-amber-200 bg-amber-50/40'
                                                        : 'border-slate-100 bg-[#f8fafc]'
                                                }`}
                                            >
                                                <div>
                                                    <span className="font-bold text-xs text-[#0f172a] block">
                                                        {stageLabels[stg]}
                                                    </span>
                                                    <span className="text-[10px] text-[#64748b]">
                                                        {STAGE_PAIRS_COUNT[stg]} match(s) à ce stade
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    {/* Stepper interactif */}
                                                    <div className="flex items-center rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                                                        <button
                                                            type="button"
                                                            onClick={() => setRoundsForStage(stg, currentVal - 1)}
                                                            disabled={currentVal <= 1}
                                                            className="px-2.5 py-1 text-sm font-bold text-[#64748b] hover:bg-slate-100 hover:text-[#e63946] disabled:opacity-30 transition-colors"
                                                        >
                                                            -
                                                        </button>
                                                        <span className="w-8 text-center text-xs font-black tabular-nums text-[#0f172a]">
                                                            {currentVal}
                                                        </span>
                                                        <button
                                                            type="button"
                                                            onClick={() => setRoundsForStage(stg, currentVal + 1)}
                                                            disabled={currentVal >= 10}
                                                            className="px-2.5 py-1 text-sm font-bold text-[#64748b] hover:bg-slate-100 hover:text-[#e63946] disabled:opacity-30 transition-colors"
                                                        >
                                                            +
                                                        </button>
                                                    </div>
                                                    <span className="text-xs font-medium text-[#64748b]">
                                                        rd(s)
                                                    </span>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Carte 3 : Informations Jurys */}
                            <div className="rounded-2xl border border-rose-100 bg-[#fff1f2]/40 p-4">
                                <p className="text-xs font-bold text-[#0f172a]">
                                    Assignation des jurys
                                </p>
                                <p className="mt-1 text-[11px] text-[#64748b]">
                                    {judges.length} jurys enregistrés seront assignés automatiquement à chaque match.
                                </p>
                            </div>
                        </div>

                        {/* ── COLONNE DROITE (GRILLE DES CANDIDATS / PARTICIPANTS) ── */}
                        <div className="flex flex-col gap-4 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm lg:col-span-7">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                <div>
                                    <h3 className="text-xs font-black uppercase tracking-wider text-[#0f172a]">
                                        Candidats ({candidatesCount} participants requis)
                                    </h3>
                                    <p className="text-[11px] font-medium text-[#64748b]">
                                        Renseignez les noms ou collez une liste complète
                                    </p>
                                </div>

                                <button
                                    type="button"
                                    onClick={() => setShowPasteBox(!showPasteBox)}
                                    className="rounded-xl border border-rose-200 bg-[#fff1f2] px-3 py-1.5 text-xs font-bold text-[#e63946] hover:bg-rose-100 transition-colors"
                                >
                                    {showPasteBox ? 'Fermer le collage' : '📋 Coller une liste'}
                                </button>
                            </div>

                            {/* Zone de collage rapide */}
                            {showPasteBox && (
                                <div className="rounded-xl border border-rose-200 bg-[#fff1f2]/50 p-3 flex flex-col gap-2">
                                    <span className="text-xs font-bold text-[#0f172a]">
                                        Collez les noms séparés par des retours à la ligne ou virgules :
                                    </span>
                                    <textarea
                                        rows={4}
                                        value={pasteText}
                                        onChange={(e) => setPasteText(e.target.value)}
                                        placeholder={`Nova\nVolt\nBlaze\nCypher\n...`}
                                        className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs font-mono outline-none focus:border-[#e63946]"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowPasteBox(false)}
                                            className="px-3 py-1 text-xs font-medium text-[#64748b] hover:underline"
                                        >
                                            Annuler
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleApplyBulkPaste}
                                            className="rounded-lg bg-[#e63946] px-3 py-1 text-xs font-bold text-white hover:bg-red-700"
                                        >
                                            Remplir les candidats
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Grille des candidats avec scroll fluide */}
                            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 max-h-[58vh] overflow-y-auto pr-1">
                                {names.map((name, i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-2 rounded-xl border border-slate-200 bg-[#f8fafc] px-3 py-2 focus-within:border-[#e63946] focus-within:bg-white transition-all"
                                    >
                                        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white text-[11px] font-black text-[#e63946] border border-rose-200 shadow-xs">
                                            {i + 1}
                                        </span>
                                        <input
                                            type="text"
                                            placeholder={`Nom du candidat ${i + 1}…`}
                                            value={name}
                                            onChange={(e) => updateName(i, e.target.value)}
                                            className="w-full bg-transparent text-sm font-medium outline-none text-[#0f172a] placeholder:text-[#94a3b8]"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {error && (
                        <p className="mt-5 rounded-2xl border border-rose-200 bg-[#fff1f2] px-4 py-3 text-xs font-semibold text-[#dc2626]">
                            {error}
                        </p>
                    )}
                </div>

                {/* ── PIED DE PAGE FIXE ── */}
                <div className="flex shrink-0 items-center justify-between border-t border-slate-100 bg-white px-6 py-4">
                    <div className="hidden sm:flex flex-col gap-0.5">
                        <span className="text-xs font-black text-[#0f172a]">
                            Total : {totalGeneratedMatches} match(s) générés ({pairsCount} match(s) à l'étape {stageLabels[stage]})
                        </span>
                        <span className="text-[11px] font-medium text-[#64748b]">
                            Rounds configurés : {activeStages.map((s) => `${STAGE_SHORT_LABELS[s] || stageLabels[s]}: ${stageRounds[s] ?? 3} rds`).join(' · ')}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-[#64748b] hover:bg-slate-50 transition-colors"
                        >
                            Annuler
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-red-500/20 hover:opacity-95 disabled:opacity-50 transition-all active:scale-[0.99]"
                        >
                            {submitting ? 'Création en cours…' : `Générer le tableau (${candidatesCount} candidats)`}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    )
}