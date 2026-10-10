'use client'

export function CandidateSelector({
    nameA,
    nameB,
    disabled,
    onPickA,
    onPickB,
}: {
    nameA: string
    nameB: string
    disabled: boolean
    onPickA: () => void
    onPickB: () => void
}) {
    return (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[#1A1D22] p-4">
            <button
                onClick={onPickA}
                disabled={disabled}
                className="flex flex-1 flex-col items-center gap-2 transition disabled:opacity-50"
            >
                <div className="flex size-10 items-center justify-center rounded-full bg-[#FF0000]/10">
                    <span className="text-base font-black text-[#FF0000]">
                        {nameA.charAt(0).toUpperCase()}
                    </span>
                </div>
                <span className="w-full truncate text-center text-sm font-extrabold text-white">
                    {nameA}
                </span>
                <span className="text-[10px] text-[#6B7280]">Gaucher</span>
            </button>

            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/10 bg-[#12161C]">
                <span className="text-xs font-black tracking-wide text-[#A8AEB8]">VS</span>
            </div>

            <button
                onClick={onPickB}
                disabled={disabled}
                className="flex flex-1 flex-col items-center gap-2 transition disabled:opacity-50"
            >
                <div className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#12161C]">
                    <span className="text-base font-black text-white">
                        {nameB.charAt(0).toUpperCase()}
                    </span>
                </div>
                <span className="w-full truncate text-center text-sm font-extrabold text-white">
                    {nameB}
                </span>
                <span className="text-[10px] text-[#6B7280]">Droitier</span>
            </button>
        </div>
    )
}