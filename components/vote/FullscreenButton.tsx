'use client'

import { useEffect, useState } from 'react'
import { Maximize2, Minimize2 } from 'lucide-react'

export function FullscreenButton() {
    const [isFullscreen, setIsFullscreen] = useState(false)

    useEffect(() => {
        const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
        document.addEventListener('fullscreenchange', onChange)
        return () => document.removeEventListener('fullscreenchange', onChange)
    }, [])

    const toggle = async () => {
        try {
            if (document.fullscreenElement) {
                await document.exitFullscreen()
            } else {
                await document.documentElement.requestFullscreen()
            }
        } catch {
            // Fullscreen refusé (permissions navigateur)
        }
    }

    return (
        <button
            type="button"
            onClick={() => void toggle()}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            className="flex size-10 items-center justify-center rounded-full border border-rose-100 bg-white text-[#64748b] shadow-2xs outline-none transition hover:border-rose-200 hover:bg-[#fff1f2] hover:text-[#e63946] focus-visible:ring-2 focus-visible:ring-[#ff6b4a]/40 active:scale-95"
        >
            {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>
    )
}