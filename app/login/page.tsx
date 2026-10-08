'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
    const router = useRouter()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            })
            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Erreur de connexion')
            router.push('/')          // redirige vers la page principale
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#f7f8fa] text-[#202532]">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-sm rounded-2xl border border-[#e5e8ee] bg-white p-8 shadow-sm"
            >
                <h1 className="text-xl font-bold mb-1">JUDGEMENT</h1>
                <p className="text-xs text-[#9aa2b1] mb-6">Espace administrateur</p>

                <label className="block mb-4">
                    <span className="text-xs font-semibold text-[#7e8798]">Email</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm"
                        placeholder="admin@dancebattle.fr"
                    />
                </label>

                <label className="block mb-6">
                    <span className="text-xs font-semibold text-[#7e8798]">Mot de passe</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="mt-1 w-full rounded-lg border border-[#e2e6ed] px-3 py-2 text-sm"
                        placeholder="••••••••"
                    />
                </label>

                {error && (
                    <p className="mb-4 text-xs font-semibold text-[#f25555]">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-[#1b66f9] px-4 py-2.5 text-sm font-bold text-white disabled:bg-[#aebbd4]"
                >
                    {loading ? 'Connexion…' : 'Se connecter'}
                </button>
            </form>
        </main>
    )
}