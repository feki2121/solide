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
            onClick={() => void toggle()}
            aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
            className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-[#1A1D22] text-[#A8AEB8] transition hover:bg-[#22262E] hover:text-white"
        >
            {isFullscreen ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>
    )
}