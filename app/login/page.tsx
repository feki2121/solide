'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Flame } from 'lucide-react'

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
            router.push('/tournaments')          // redirige vers la page principale
            router.refresh()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur inconnue')
        } finally {
            setLoading(false)
        }
    }

    return (
        <main className="min-h-screen flex items-center justify-center bg-[#fafafc] text-[#0f172a] px-4">
            <form
                onSubmit={handleSubmit}
                className="relative w-full max-w-sm rounded-2xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/50 overflow-hidden"
            >
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#FF6B4A] to-[#E63946]" />

                <div className="mb-6 flex flex-col items-center text-center">
                    <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-white shadow-md shadow-[#E63946]/20">
                        <Flame className="size-6" />
                    </div>
                    <h1 className="text-2xl font-black tracking-tight text-[#0f172a]">JUDGEMENT</h1>
                    <p className="text-xs font-medium text-slate-400 mt-1">Espace d’administration Danse</p>
                </div>

                <label className="block mb-4">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Email</span>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm transition-all focus:border-[#E63946] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/20"
                        placeholder="admin@dancebattle.fr"
                    />
                </label>

                <label className="block mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Mot de passe</span>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm transition-all focus:border-[#E63946] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/20"
                        placeholder="••••••••"
                    />
                </label>

                {error && (
                    <div className="mb-5 rounded-xl border border-[#FECDD3] bg-[#FFF1F2] p-3 text-xs font-semibold text-[#E63946]">
                        {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-gradient-to-r from-[#FF6B4A] to-[#E63946] px-4 py-3 text-sm font-bold text-white shadow-md shadow-[#E63946]/25 transition-all hover:brightness-105 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Connexion…' : 'Se connecter'}
                </button>
            </form>
        </main>
    )
}