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
    /* Couleur dynamique selon le score :
       < 50 → joueur A (corail/rouge)
       = 50 → neutre (gris)
       > 50 → joueur B (émeraude) */
    const accent = value < 50 ? '#e63946' : value > 50 ? '#059669' : '#94a3b8'
    const whoPicks = value === 50 ? 'Neutre' : value < 50 ? nameA : nameB
    const intensity = Math.round(Math.abs(50 - value) * 2)

    /* Track : dégradé horizontal qui montre visuellement
       la part allouée à chaque candidat */
    const trackBg = useMemo(() => {
        return `linear-gradient(to right, #e63946 0%, #e63946 ${value}%, #10b981 ${value}%, #10b981 100%)`
    }, [value])

    return (
        <div className="rounded-2xl border border-rose-100 bg-white p-4 shadow-2xs transition-shadow hover:shadow-sm">
            <div className="flex flex-col gap-3">
                {/* En-tête : Candidat A | Titre | Candidat B */}
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">

                    {/* GAUCHE : Candidat A */}
                    <div className="flex flex-col items-start min-w-0">
                        <span className="truncate text-[10px] font-bold text-[#94a3b8] w-full">
                            {nameA}
                        </span>
                        <span className={`text-xl font-black tabular-nums leading-none ${value < 50 ? 'text-[#e63946]' : 'text-[#0f172a]'}`}>
                            {Math.round(100 - value)}%
                        </span>
                    </div>

                    {/* CENTRE : Titre du critère */}
                    <div className="flex flex-col items-center justify-center px-2">
                        <div className="flex size-8 items-center justify-center rounded-lg border border-rose-100 bg-[#fff1f2] text-base">
                            {icon}
                        </div>
                        <span className="mt-1 text-center text-xs font-extrabold text-[#0f172a] whitespace-nowrap">
                            {label}
                        </span>
                    </div>

                    {/* DROITE : Candidat B */}
                    <div className="flex flex-col items-end min-w-0">
                        <span className="truncate text-[10px] font-bold text-[#94a3b8] w-full text-right">
                            {nameB}
                        </span>
                        <span className={`text-xl font-black tabular-nums leading-none ${value > 50 ? 'text-[#059669]' : 'text-[#0f172a]'}`}>
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
                    <span className={`max-w-[40%] truncate text-[10px] transition-colors ${value < 50 ? 'font-extrabold text-[#e63946]' : 'font-semibold text-[#94a3b8]'}`}>
                        {nameA}
                    </span>
                    <span className="text-[10px] font-semibold text-[#94a3b8]">50</span>
                    <span className={`max-w-[40%] truncate text-right text-[10px] transition-colors ${value > 50 ? 'font-extrabold text-[#059669]' : 'font-semibold text-[#94a3b8]'}`}>
                        {nameB}
                    </span>
                </div>
            </div>
        </div>
    )
}