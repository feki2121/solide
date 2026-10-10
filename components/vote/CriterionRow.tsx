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
                {/* En-tête */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-100 bg-[#fff1f2] text-base">
                            {icon}
                        </div>
                        <span className="truncate text-sm font-extrabold text-[#0f172a]">
                            {label}
                        </span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span
                            className="text-xl font-black leading-none tabular-nums"
                            style={{ color: accent }}
                        >
                            {Math.round(value)}%
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: accent }}>
                            {value === 50 ? 'Neutre' : `${whoPicks} +${intensity}`}
                        </span>
                    </div>
                </div>

                {/* Slider */}
                <div className="relative">
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

                {/* Repères sous le slider */}
                <div className="flex items-center justify-between">
                    <span
                        className={`max-w-[40%] truncate text-[10px] transition-colors ${value < 50
                            ? 'font-extrabold text-[#e63946]'
                            : 'font-semibold text-[#94a3b8]'
                            }`}
                    >
                        {nameA}
                    </span>
                    <span className="text-[10px] font-semibold text-[#94a3b8]">50</span>
                    <span
                        className={`max-w-[40%] truncate text-right text-[10px] transition-colors ${value > 50
                            ? 'font-extrabold text-[#059669]'
                            : 'font-semibold text-[#94a3b8]'
                            }`}
                    >
                        {nameB}
                    </span>
                </div>
            </div>
        </div>
    )
}