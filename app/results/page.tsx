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
            <main className="min-h-screen bg-[#f7f8fa] text-[#202532]">
                <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
                    <div className="mb-7">
                        <p className="text-[11px] font-semibold uppercase tracking-[.18em] text-[#a0a8b6]">Compétition</p>
                        <h1 className="mt-1 text-[28px] font-bold tracking-tight sm:text-[32px]">Résultats</h1>
                        <p className="mt-1 text-sm text-[#7e8798]">
                            {results.length} match{results.length > 1 ? 's' : ''} terminé{results.length > 1 ? 's' : ''}
                        </p>
                    </div>

                    {loading ? (
                        <section className="rounded-2xl border border-[#e5e8ee] bg-white p-10 text-center text-sm text-[#7e8798]">
                            Chargement…
                        </section>
                    ) : results.length === 0 ? (
                        <section className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[#e5e8ee] bg-white p-12 text-center">
                            <Trophy className="size-8 text-[#a0a8b6]" />
                            <p className="text-sm font-semibold">Aucun résultat disponible</p>
                            <p className="text-xs text-[#7e8798]">
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
                                        className="rounded-2xl border border-[#e5e8ee] bg-white p-5 shadow-[0_8px_30px_rgba(31,45,75,0.04)]"
                                    >
                                        <div className="mb-3 flex items-center justify-between">
                                            <span className="text-[10px] font-bold uppercase tracking-[.16em] text-[#a0a8b6]">
                                                {stageLabels[r.match.stage] ?? r.match.stage}
                                            </span>
                                            <span className="rounded-full bg-[#eefbf4] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#24a363]">
                                                Terminé
                                            </span>
                                        </div>

                                        <h3 className="mb-4 text-base font-bold">{r.match.name}</h3>

                                        <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                                            <div
                                                className={`rounded-xl border px-3 py-2.5 ${r.winnerId === r.match.candidateA?.id
                                                    ? 'border-[#1b66f9] bg-[#edf4ff]'
                                                    : 'border-[#e5e8ee]'
                                                    }`}
                                            >
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#1b66f9]">A</p>
                                                <p className="mt-0.5 truncate text-sm font-semibold">
                                                    {r.match.candidateA?.name ?? 'TBD'}
                                                </p>
                                                <p className="mt-1 text-lg font-black text-[#1b66f9]">{a.toFixed(1)}</p>
                                            </div>

                                            <span className="text-xs font-bold text-[#a0a8b6]">vs</span>

                                            <div
                                                className={`rounded-xl border px-3 py-2.5 ${r.winnerId === r.match.candidateB?.id
                                                    ? 'border-[#f25555] bg-[#fff3f1]'
                                                    : 'border-[#e5e8ee]'
                                                    }`}
                                            >
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#f25555]">B</p>
                                                <p className="mt-0.5 truncate text-sm font-semibold">
                                                    {r.match.candidateB?.name ?? 'TBD'}
                                                </p>
                                                <p className="mt-1 text-lg font-black text-[#f25555]">{b.toFixed(1)}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2 rounded-xl bg-[#f7f8fa] px-4 py-3">
                                            <Trophy className="size-4 text-[#d08500]" />
                                            <div>
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-[#a0a8b6]">
                                                    Vainqueur
                                                </p>
                                                <p className="text-sm font-bold">{winnerName ?? '—'}</p>
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