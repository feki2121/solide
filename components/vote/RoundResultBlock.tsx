'use client'

import { ArrowRightCircle, Trophy } from 'lucide-react'

export function RoundResultBlock({
    result,
    nameA,
    nameB,
}: {
    result: { candidateAScore: string; candidateBScore: string; winnerId: string | null }
    nameA: string
    nameB: string
}) {
    const scoreA = Number(result.candidateAScore)
    const scoreB = Number(result.candidateBScore)
    const winnerIsA = scoreA > scoreB
    const winnerIsB = scoreB > scoreA
    const qualified = winnerIsA ? nameA : winnerIsB ? nameB : 'Égalité'

    return (
        <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-2xs">
            <div className="flex flex-col gap-4">
                {/* Titre */}
                <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-amber-500" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#64748b]">
                        Résultat officiel
                    </span>
                </div>

                {/* Scores A vs B */}
                <div className="flex gap-2.5">
                    <ScoreBlock name={nameA} score={scoreA} isWinner={winnerIsA} side="A" />
                    <ScoreBlock name={nameB} score={scoreB} isWinner={winnerIsB} side="B" />
                </div>

                {/* Bandeau qualifié */}
                <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <ArrowRightCircle className="size-5 shrink-0 text-emerald-600" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
                            Qualifié pour le tour suivant
                        </p>
                        <p className="truncate text-base font-extrabold text-[#0f172a]">
                            {qualified}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ScoreBlock({
    name,
    score,
    isWinner,
    side,
}: {
    name: string
    score: number
    isWinner: boolean
    side: 'A' | 'B'
}) {
    /* Couleur de l'avatar en fonction du côté */
    const avatarBg = side === 'A'
        ? 'from-sky-400 to-indigo-500'
        : 'from-fuchsia-400 to-rose-500'

    return (
        <div
            className={`flex flex-1 flex-col gap-1 rounded-xl border p-3.5 transition-all ${isWinner
                ? 'border-emerald-400 bg-gradient-to-br from-emerald-50 to-white shadow-[0_0_0_1px_rgba(16,185,129,0.15)]'
                : 'border-slate-100 bg-[#fafafc]'
                }`}
        >
            <div className="flex items-center gap-2">
                <div
                    className={`flex size-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-[10px] font-black text-white shadow-sm ${isWinner ? 'from-emerald-400 to-emerald-600' : avatarBg
                        }`}
                >
                    {name.charAt(0).toUpperCase()}
                </div>
                <span
                    className={`truncate text-[11px] font-bold ${isWinner ? 'text-emerald-700' : 'text-[#64748b]'
                        }`}
                    title={name}
                >
                    {name}
                </span>
            </div>
            <span
                className={`text-2xl font-black tabular-nums ${isWinner ? 'text-emerald-600' : 'text-[#0f172a]'
                    }`}
            >
                {score.toFixed(1)}
            </span>
        </div>
    )
}