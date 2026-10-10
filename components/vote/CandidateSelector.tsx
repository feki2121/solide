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
        <div className="flex items-center gap-3 rounded-2xl border border-rose-100 bg-white p-4 shadow-2xs">
            {/* Côté A */}
            <button
                type="button"
                onClick={onPickA}
                disabled={disabled}
                className="group flex flex-1 flex-col items-center gap-2 rounded-xl px-2 py-1 outline-none transition hover:bg-[#fff1f2]/60 focus-visible:ring-2 focus-visible:ring-[#ff6b4a]/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-400 to-indigo-500 text-white shadow-sm transition group-hover:scale-105 group-active:scale-95">
                    <span className="text-base font-black">
                        {nameA.charAt(0).toUpperCase()}
                    </span>
                </div>
                <span className="w-full truncate text-center text-sm font-extrabold text-[#0f172a]">
                    {nameA}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Gaucher
                </span>
            </button>

            {/* VS */}
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-rose-100 bg-gradient-to-br from-rose-50 to-white shadow-2xs">
                <span className="text-xs font-black tracking-wide text-[#e63946]">
                    VS
                </span>
            </div>

            {/* Côté B */}
            <button
                type="button"
                onClick={onPickB}
                disabled={disabled}
                className="group flex flex-1 flex-col items-center gap-2 rounded-xl px-2 py-1 outline-none transition hover:bg-[#fff1f2]/60 focus-visible:ring-2 focus-visible:ring-[#ff6b4a]/40 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
            >
                <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-fuchsia-400 to-rose-500 text-white shadow-sm transition group-hover:scale-105 group-active:scale-95">
                    <span className="text-base font-black">
                        {nameB.charAt(0).toUpperCase()}
                    </span>
                </div>
                <span className="w-full truncate text-center text-sm font-extrabold text-[#0f172a]">
                    {nameB}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#94a3b8]">
                    Droitier
                </span>
            </button>
        </div>
    )
}