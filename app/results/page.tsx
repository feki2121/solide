'use client'

import { useCallback, useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { AdminLayout } from '@/components/ui/admin/Layout'

type MatchResult = {
    id: string
    candidateAScore: string
    candidateBScore: string
    winnerId: string
    calculatedAt: string
    match: {
        id: string
        name: string
        stage: string
        candidateA: { id: string; name: string } | null
        candidateB: { id: string; name: string } | null
    }
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Erreur.')
    return body
}

const stageLabels: Record<string, string> = {
    QUARTER_FINAL: 'Quart de finale',
    SEMI_FINAL: 'Demi-finale',
    FINAL: 'Finale',
}

export default function ResultsPage() {
    const [results, setResults] = useState<MatchResult[]>([])
    const [loading, setLoading] = useState(true)

    const load = useCallback(async () => {
        try {
            setResults(await readJson<MatchResult[]>(await fetch('/api/results', { cache: 'no-store' })))
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { void load() }, [load])

    return (
        <AdminLayout>
            <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    <div className="mb-7">
                        <p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#E63946]">Compétition</p>
                        <h1 className="mt-1 text-[28px] font-extrabold tracking-tight text-[#0f172a] sm:text-[32px]">Résultats</h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {results.length} match{results.length > 1 ? 's' : ''} terminé{results.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    {loading ? (
                        <section className="rounded-2xl border border-slate-100 bg-white p-10 text-center text-sm text-slate-500 shadow-xs">
                            Chargement…
                        </section>
                    ) : results.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
                            <Trophy className="size-8 text-slate-300" />
                            <p className="text-sm font-semibold text-slate-700">Aucun résultat disponible</p>
                            <p className="text-xs text-slate-500">
                                Les résultats apparaissent après avoir clôturé un match.
                            </p>
                        </section>
                    ) : (
                        <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            {results.map((r) => {
                                const a = Number(r.candidateAScore)
                                const b = Number(r.candidateBScore)
                                const winnerName =
                                    r.winnerId === r.match.candidateA?.id
                                        ? r.match.candidateA?.name
                                        : r.winnerId === r.match.candidateB?.id
                                            ? r.match.candidateB?.name
                                            : null

                                return (
                                    <article
                                        key={r.id}
                                        className="rounded-2xl border border-slate-100 bg-white p-5 shadow-xs transition-shadow hover:shadow-md"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-400">
                                                {stageLabels[r.match.stage] ?? r.match.stage}
                                            </span>
                                            <span className="rounded-full bg-[#FFF1F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#E63946]">
                                                Terminé
                                            </span>
                                        </div>

                                        <h3 className="mb-4 text-base font-bold text-[#0f172a]">{r.match.name}</h3>

                                        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                            <div
                                                className={`rounded-xl border px-3 py-2.5 transition-colors ${r.winnerId === r.match.candidateA?.id
                                                    ? 'border-[#E63946] bg-[#FFF1F2]/60'
                                                    : 'border-slate-100 bg-slate-50/50'
                                                    }`}
                                            >
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#E63946]">A</p>
                                                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                                                    {r.match.candidateA?.name ?? 'TBD'}
                                                </p>
                                                <p className="mt-1 text-lg font-black text-[#E63946]">{a.toFixed(1)}</p>
                                            </div>

                                            <span className="text-xs font-bold text-slate-300">vs</span>

                                            <div
                                                className={`rounded-xl border px-3 py-2.5 transition-colors ${r.winnerId === r.match.candidateB?.id
                                                    ? 'border-[#FF6B4A] bg-[#FFEDD5]/60'
                                                    : 'border-slate-100 bg-slate-50/50'
                                                    }`}
                                            >
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#FF6B4A]">B</p>
                                                <p className="mt-0.5 truncate text-sm font-semibold text-slate-800">
                                                    {r.match.candidateB?.name ?? 'TBD'}
                                                </p>
                                                <p className="mt-1 text-lg font-black text-[#FF6B4A]">{b.toFixed(1)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 rounded-xl border border-[#FECDD3] bg-gradient-to-r from-[#FFF1F2] via-[#FFEDD5]/40 to-[#FFF1F2] px-4 py-3">
                                            <div className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-white shadow-xs">
                                                <Trophy className="size-4" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#E63946]">
                                                    Vainqueur
                                                </p>
                                                <p className="text-sm font-extrabold text-[#0f172a]">{winnerName ?? '—'}</p>
                                            </div>
                                        </div>
                                    </article>
                                )
                            })}
                        </section>
                    )}
                </div>
            </main>
        </AdminLayout>
    )
}