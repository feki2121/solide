'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
    Award,
    Bell,
    ChevronDown,
    CircleHelp,
    ClipboardList,
    LayoutDashboard,
    List,
    ListChecks,
    Menu,
    Settings,
    ShieldCheck,
    Trophy,
    Users,
    X,
} from 'lucide-react'

const navItems = [
    { label: 'Dashboard', href: '/', icon: LayoutDashboard },
    { label: 'Tableau', href: '/bracket', icon: Award },
    { label: 'Candidats', href: '/candidates', icon: Users },
    { label: 'Jurys', href: '/judges', icon: ShieldCheck },
    { label: 'Tournoi', href: '/tournaments', icon: Trophy },
    { label: 'Matchs', href: '/matches', icon: ClipboardList },
    { label: 'Rounds', href: '/rounds', icon: List },
    { label: 'Résultats', href: '/results', icon: ListChecks },
]

export function Sidebar() {
    const router = useRouter()
    const pathname = usePathname()
    const [open, setOpen] = useState(false)

    async function handleLogout() {
        await fetch('/api/auth/logout', { method: 'POST' })
        router.push('/login')
    }

    return (
        <>
            {/* Barre mobile */}
            <div className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[#fee2e2] bg-white px-5 lg:hidden shadow-sm">
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir le menu"
                    className="grid size-10 place-items-center rounded-xl text-[#0f172a] hover:bg-[#fff1f2] hover:text-[#e63946] transition-colors"
                >
                    <Menu />
                </button>
                <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-xs font-bold text-white shadow-md shadow-red-500/20">
                        J
                    </div>
                    <span className="text-sm font-black tracking-tight text-[#0f172a]">JUDGEMENT</span>
                </div>
                <Bell className="size-[19px] text-[#64748b] hover:text-[#e63946] transition-colors" />
            </div>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[248px] border-r border-[#fee2e2] bg-white transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col px-5 py-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-sm font-extrabold text-white shadow-md shadow-red-500/20">
                                J
                            </div>
                            <div>
                                <div className="text-[15px] font-black tracking-tight text-[#0f172a]">JUDGEMENT</div>
                                <div className="text-[10px] font-bold uppercase tracking-[.2em] text-[#ff6b4a]">
                                    Dance battle
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-[#94a3b8] hover:text-[#e63946] lg:hidden transition-colors"
                            aria-label="Fermer le menu"
                        >
                            <X />
                        </button>
                    </div>

                    <nav className="mt-10 flex flex-col gap-1.5">
                        {navItems.map((item) => {
                            const Icon = item.icon
                            const isActive =
                                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                            return (
                                <button
                                    key={item.label}
                                    onClick={() => {
                                        router.push(item.href)
                                        setOpen(false)
                                    }}
                                    className={`flex items-center gap-3 rounded-xl px-3.5 py-3 text-left text-[13px] font-semibold transition-all duration-150 ${isActive
                                        ? 'bg-gradient-to-r from-[#FFF1F2] to-[#FFEDD5] text-[#E63946] font-bold shadow-xs border-l-4 border-[#E63946]'
                                        : 'text-[#64748b] hover:bg-[#fff1f2]/60 hover:text-[#e63946]'
                                        }`}
                                >
                                    <Icon className={`size-[17px] ${isActive ? 'text-[#e63946]' : 'text-[#64748b]'}`} />
                                    {item.label}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-auto border-t border-[#fee2e2] pt-4">
                        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-[#64748b] hover:bg-[#fff1f2]/50 hover:text-[#e63946] transition-colors">
                            <Settings className="size-[17px]" />
                            Paramètres
                        </button>
                        <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-[13px] font-semibold text-[#64748b] hover:bg-[#fff1f2]/50 hover:text-[#e63946] transition-colors">
                            <CircleHelp className="size-[17px]" />
                            Aide & support
                        </button>
                        <button
                            onClick={handleLogout}
                            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#dc2626] hover:bg-[#fff1f2] transition-colors"
                        >
                            <X className="size-[17px]" />
                            Déconnexion
                        </button>
                        <div className="mt-3 flex items-center gap-3 rounded-xl border border-[#fee2e2] bg-[#fff1f2]/30 p-2.5">
                            <div className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#FF6B4A] to-[#E63946] text-xs font-bold text-white shadow-xs">
                                J
                            </div>
                            <div className="truncate text-xs font-bold text-[#0f172a]">Juge connecté</div>
                            <ChevronDown className="ml-auto size-4 text-[#94a3b8]" />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}