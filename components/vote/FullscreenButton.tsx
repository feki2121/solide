'use client'

import { RotateCw } from 'lucide-react'

export function FullscreenButton() {
    const handleRefresh = () => {
        window.location.reload()
    }

    return (
        <button
            type="button"
            onClick={handleRefresh}
            aria-label="Afficher round 3"
            className="flex items-center justify-center gap-2 rounded-full border border-rose-100 bg-white px-4 py-2 text-xs font-extrabold uppercase tracking-wider text-[#64748b] shadow-2xs outline-none transition hover:border-rose-200 hover:bg-[#fff1f2] hover:text-[#e63946] focus-visible:ring-2 focus-visible:ring-[#ff6b4a]/40 active:scale-95"
        >
            <RotateCw className="size-4" />
             Round 3
        </button>
    )
}