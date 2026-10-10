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
    const accent = value < 50 ? '#FF0000' : value > 50 ? '#22C55E' : '#A8AEB8'
    const whoPicks = value === 50 ? 'Neutre' : value < 50 ? nameA : nameB
    const intensity = Math.round(Math.abs(50 - value) * 2)

    const trackBg = useMemo(() => {
        const redPct = value
        const greenPct = 100 - value
        return `linear-gradient(to right, #FF0000 0%, #FF0000 ${redPct}%, #22C55E ${redPct}%, #22C55E 100%)`
    }, [value])

    return (
        <div className="rounded-2xl border border-white/10 bg-[#1A1D22] p-4">
            <div className="flex flex-col gap-3">
                {/* En-tête */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-[#12161C] text-base">
                            {icon}
                        </div>
                        <span className="truncate text-sm font-extrabold text-white">{label}</span>
                    </div>

                    <div className="flex flex-col items-end">
                        <span className="text-xl font-black leading-none" style={{ color: accent }}>
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

                {/* Repères */}
                <div className="flex items-center justify-between">
                    <span
                        className={`max-w-[40%] truncate text-[10px] ${value < 50 ? 'font-extrabold text-[#FF0000]' : 'font-semibold text-[#6B7280]'
                            }`}
                    >
                        {nameA}
                    </span>
                    <span className="text-[10px] text-[#6B7280]">50</span>
                    <span
                        className={`max-w-[40%] truncate text-right text-[10px] ${value > 50 ? 'font-extrabold text-[#22C55E]' : 'font-semibold text-[#6B7280]'
                            }`}
                    >
                        {nameB}
                    </span>
                </div>
            </div>
        </div>
    )
}