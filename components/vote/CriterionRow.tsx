'use client'

import { useMemo } from 'react'

export function CriterionRow({
    icon,
    label,
    value,
    nameA,
    nameB,
    disabled,
    onChange,
}: {
    icon: string
    label: string
    value: number
    nameA: string
    nameB: string
    disabled: boolean
    onChange: (v: number) => void
}) {
    // Couleurs calquées sur l'écran de résultat
    const colorA = '#1939b1' // Bleu
    const colorB = '#f3a000' // Jaune/Or
    const colorNeutral = '#94a3b8' // Gris

    // La valeur < 50 donne l'avantage à A (Bleu). > 50 donne l'avantage à B (Jaune).
    const accent = value < 50 ? colorA : value > 50 ? colorB : colorNeutral

    /* Track : Dégradé Bleu -> Jaune */
    const trackBg = useMemo(() => {
        return `linear-gradient(to right, ${colorA} 0%, ${colorA} ${value}%, ${colorB} ${value}%, ${colorB} 100%)`
    }, [value])

    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition-shadow hover:shadow-sm">
            <div className="flex flex-col gap-3">
                {/* En-tête : Candidat A | Titre | Candidat B */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

                    {/* GAUCHE : Candidat A (Bleu) */}
                    <div className="flex flex-col items-start min-w-0">
                        <span className="truncate text-[10px] font-bold text-slate-500 w-full">
                            {nameA}
                        </span>
                        <span className={`text-xl font-black tabular-nums leading-none ${value < 50 ? 'text-[#1939b1]' : 'text-slate-800'}`}>
                            {Math.round(100 - value)}%
                        </span>
                    </div>

                    {/* CENTRE : Titre du critère */}
                    <div className="flex flex-col items-center justify-center px-2">
                        <div className="flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-base">
                            {icon}
                        </div>
                        <span className="mt-1 text-center text-xs font-extrabold text-slate-800 whitespace-nowrap">
                            {label}
                        </span>
                    </div>

                    {/* DROITE : Candidat B (Jaune) */}
                    <div className="flex flex-col items-end min-w-0">
                        <span className="truncate text-[10px] font-bold text-slate-500 w-full text-right">
                            {nameB}
                        </span>
                        <span className={`text-xl font-black tabular-nums leading-none ${value > 50 ? 'text-[#f3a000]' : 'text-slate-800'}`}>
                            {value}%
                        </span>
                    </div>
                </div>

                {/* Slider */}
                <div className="relative mt-1">
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={value}
                        onChange={(e) => onChange(Number(e.target.value))}
                        disabled={disabled}
                        className="criterion-slider w-full"
                        style={{ background: trackBg }}
                        aria-label={label}
                    />
                </div>

                {/* Repères sous le slider (Noms) */}
                <div className="flex items-center justify-between -mt-1">
                    <span className={`max-w-[40%] truncate text-[10px] transition-colors ${value < 50 ? 'font-extrabold text-[#1939b1]' : 'font-semibold text-slate-400'}`}>
                        {nameA}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">50</span>
                    <span className={`max-w-[40%] truncate text-right text-[10px] transition-colors ${value > 50 ? 'font-extrabold text-[#f3a000]' : 'font-semibold text-slate-400'}`}>
                        {nameB}
                    </span>
                </div>
            </div>
        </div>
    )
}