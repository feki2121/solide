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
        <div className="rounded-2xl border border-white/10 bg-[#1A1D22] p-4">
            <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                    <Trophy className="size-4 text-[#F59E0B]" />
                    <span className="text-xs font-extrabold uppercase tracking-wider text-[#A8AEB8]">
                        Résultat officiel
                    </span>
                </div>

                <div className="flex gap-2.5">
                    <ScoreBlock name={nameA} score={scoreA} isWinner={winnerIsA} />
                    <ScoreBlock name={nameB} score={scoreB} isWinner={winnerIsB} />
                </div>

                <div className="flex items-center gap-3 rounded-xl border border-[#FF0000]/25 bg-[#FF0000]/10 px-4 py-3">
                    <ArrowRightCircle className="size-5 shrink-0 text-[#FF0000]" />
                    <div className="min-w-0 flex-1">
                        <p className="text-[10px] font-extrabold uppercase tracking-wider text-[#FF0000]">
                            Qualifié pour le tour suivant
                        </p>
                        <p className="truncate text-base font-extrabold text-white">{qualified}</p>
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
}: {
    name: string
    score: number
    isWinner: boolean
}) {
    return (
        <div
            className={`flex flex-1 flex-col gap-1 rounded-xl border p-3.5 ${isWinner ? 'border-[#FF0000] bg-[#FF0000]/8' : 'border-white/10 bg-[#12161C]'
                }`}
        >
            <span
                className={`truncate text-[11px] font-bold ${isWinner ? 'text-[#FF0000]' : 'text-[#A8AEB8]'
                    }`}
            >
                {name}
            </span>
            <span
                className={`text-2xl font-black ${isWinner ? 'text-[#FF0000]' : 'text-white'
                    }`}
            >
                {score.toFixed(1)}
            </span>
        </div>
    )
}