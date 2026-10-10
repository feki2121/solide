'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Trophy,
  Users,
} from 'lucide-react'

import { AdminLayout } from '@/components/ui/admin/Layout'

type Counts = {
  candidates: number
  judges: number
  tournaments: number
  matches: number
  matchesLive: number
  matchesFinished: number
  roundsOpen: number
}

const EMPTY: Counts = {
  candidates: 0,
  judges: 0,
  tournaments: 0,
  matches: 0,
  matchesLive: 0,
  matchesFinished: 0,
  roundsOpen: 0,
}

async function readJson<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.error || 'Erreur.')
  return body
}

export default function DashboardPage() {
  const [counts, setCounts] = useState<Counts>(EMPTY)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [candidates, judges, tournaments, matches] = await Promise.all([
        readJson<any[]>(await fetch('/api/candidates', { cache: 'no-store' })),
        readJson<any[]>(await fetch('/api/judges', { cache: 'no-store' })),
        readJson<any[]>(await fetch('/api/tournaments', { cache: 'no-store' })),
        readJson<any[]>(await fetch('/api/matches', { cache: 'no-store' })),
      ])

      let matchesLive = 0
      let matchesFinished = 0
      let roundsOpen = 0

      for (const m of matches) {
        if (m.winnerId) matchesFinished++
        const rounds: any[] = m.rounds ?? []
        if (rounds.some((r) => r.status === 'OPEN')) matchesLive++
        roundsOpen += rounds.filter((r) => r.status === 'OPEN').length
      }

      setCounts({
        candidates: candidates.length,
        judges: judges.length,
        tournaments: tournaments.length,
        matches: matches.length,
        matchesLive,
        matchesFinished,
        roundsOpen,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <AdminLayout>
      <header className="flex h-[76px] items-center justify-between border-b border-[#fee2e2] bg-white px-5 sm:px-8 shadow-2xs">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
            Compétition en cours
          </p>
          <h1 className="mt-0.5 text-[20px] font-black tracking-tight text-[#0f172a]">
            Tableau de bord
          </h1>
        </div>
        <div className="hidden items-center gap-2 rounded-full border border-rose-200 bg-[#fff1f2] px-3.5 py-1.5 text-[11px] font-bold text-[#e63946] sm:flex shadow-2xs">
          <span className="size-2 rounded-full bg-[#e63946] animate-pulse" />
          Live
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-7 sm:px-8">
        {error && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-[#fff1f2] px-4 py-3 text-sm font-semibold text-[#dc2626] shadow-2xs">
            {error}
          </div>
        )}

        <div className="mb-7">
          <h2 className="text-[28px] font-extrabold tracking-tight text-[#0f172a] sm:text-[32px]">
            Vue d'ensemble
          </h2>
          <p className="mt-1 text-sm font-medium text-[#64748b]">
            Toutes les données en temps réel de la compétition.
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-rose-100 bg-white" />
            ))}
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard
                label="Candidats"
                value={counts.candidates}
                icon={Users}
                color="#FF6B4A"
                href="/candidates"
              />
              <StatCard
                label="Jurys"
                value={counts.judges}
                icon={ShieldCheck}
                color="#E63946"
                href="/judges"
              />
              <StatCard
                label="Tournois"
                value={counts.tournaments}
                icon={Trophy}
                color="#F97316"
                href="/tournaments"
              />
              <StatCard
                label="Matchs"
                value={counts.matches}
                icon={ClipboardList}
                color="#DC2626"
                href="/matches"
              />
            </div>

            {/* Statut */}
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
              <StatusCard
                label="Matchs en cours"
                value={counts.matchesLive}
                tone="live"
              />
              <StatusCard
                label="Rounds ouverts"
                value={counts.roundsOpen}
                tone="pending"
              />
              <StatusCard
                label="Matchs terminés"
                value={counts.matchesFinished}
                tone="done"
              />
            </div>

            {/* Actions rapides */}
            <div className="mt-9">
              <h3 className="mb-3 text-xs font-extrabold uppercase tracking-[.18em] text-[#ff6b4a]">
                Actions rapides
              </h3>
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                <QuickLink
                  href="/matches"
                  title="Gérer les matchs"
                  description="Créer, ouvrir et clôturer les matchs."
                />
                <QuickLink
                  href="/candidates"
                  title="Ajouter un candidat"
                  description="Enregistrer un nouveau danseur."
                />
                <QuickLink
                  href="/results"
                  title="Voir les résultats"
                  description="Consulter les matchs terminés."
                />
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  )
}

/* ─── Sous-composants ─── */

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  href,
}: {
  label: string
  value: number
  icon: any
  color: string
  href: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-rose-100 bg-white p-5 transition-all duration-200 hover:border-[#FF6B4A] hover:shadow-md hover:shadow-rose-950/5 hover:-translate-y-0.5"
    >
      <div className="mb-3 flex items-center justify-between">
        <div
          className="grid size-10 place-items-center rounded-xl transition-transform duration-200 group-hover:scale-105"
          style={{ backgroundColor: `${color}15`, color }}
        >
          <Icon className="size-5" />
        </div>
        <ArrowRight className="size-4 text-[#94a3b8] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E63946]" />
      </div>
      <p className="text-2xl font-black tracking-tight text-[#0f172a]">{value}</p>
      <p className="mt-0.5 text-xs font-bold text-[#64748b]">{label}</p>
    </Link>
  )
}

function StatusCard({
  label,
  value,
  tone,
}: {
  label: string
  value: number
  tone: 'live' | 'pending' | 'done'
}) {
  const colors = {
    live: { bg: '#fff1f2', fg: '#e63946', dot: '#ff6b4a' },
    pending: { bg: '#fff7ed', fg: '#ea580c', dot: '#f97316' },
    done: { bg: '#ecfdf5', fg: '#059669', dot: '#10b981' },
  }[tone]

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-rose-100 bg-white p-5 shadow-2xs">
      <div
        className="grid size-11 place-items-center rounded-xl"
        style={{ backgroundColor: colors.bg, color: colors.fg }}
      >
        <span className="size-2.5 rounded-full" style={{ backgroundColor: colors.dot }} />
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-[#0f172a]">{value}</p>
        <p className="text-xs font-bold text-[#64748b]">{label}</p>
      </div>
    </div>
  )
}

function QuickLink({
  href,
  title,
  description,
}: {
  href: string
  title: string
  description: string
}) {
  return (
    <Link
      href={href}
      className="group flex items-center justify-between gap-3 rounded-2xl border border-rose-100 bg-white p-4.5 transition-all duration-200 hover:border-[#FF6B4A] hover:bg-[#fff1f2]/30 hover:shadow-xs hover:-translate-y-0.5"
    >
      <div>
        <p className="text-sm font-bold text-[#0f172a] group-hover:text-[#e63946] transition-colors">{title}</p>
        <p className="mt-0.5 text-xs text-[#64748b]">{description}</p>
      </div>
      <ArrowRight className="size-4 text-[#94a3b8] transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#e63946]" />
    </Link>
  )
}