'use client'

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      // Enregistre le service worker en arrière-plan
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Vérifie les mises à jour
          reg.update().catch(() => {})
        })
        .catch((err) => {
          console.warn('[PWA] Service Worker non enregistré:', err)
        })
    }
  }, [])

  return null
}
