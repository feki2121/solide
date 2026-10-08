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
            <div className="sticky top-0 z-30 flex h-[64px] items-center justify-between border-b border-[#e7e9ee] bg-white px-5 lg:hidden">
                <button
                    onClick={() => setOpen(true)}
                    aria-label="Ouvrir le menu"
                    className="grid size-10 place-items-center rounded-lg text-[#202532] hover:bg-[#f7f8fa]"
                >
                    <Menu />
                </button>
                <div className="flex items-center gap-2">
                    <div className="grid size-8 place-items-center rounded-xl bg-[#1b66f9] text-xs font-bold text-white">
                        J
                    </div>
                    <span className="text-sm font-bold tracking-tight">JUDGEMENT</span>
                </div>
                <Bell className="size-[19px] text-[#7e8798]" />
            </div>

            {/* Overlay */}
            {open && (
                <div
                    className="fixed inset-0 z-40 bg-black/40 lg:hidden"
                    onClick={() => setOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-50 w-[248px] border-r border-[#e7e9ee] bg-white transition-transform duration-200 lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'
                    }`}
            >
                <div className="flex h-full flex-col px-5 py-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-xl bg-[#1b66f9] text-sm font-bold text-white">
                                J
                            </div>
                            <div>
                                <div className="text-[15px] font-bold tracking-tight">JUDGEMENT</div>
                                <div className="text-[10px] font-medium uppercase tracking-[.18em] text-[#9aa2b1]">
                                    Dance battle
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-[#a0a8b6] lg:hidden"
                            aria-label="Fermer le menu"
                        >
                            <X />
                        </button>
                    </div>

                    <nav className="mt-12 flex flex-col gap-2">
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
                                    className={`flex items-center gap-3 rounded-xl px-3 py-3 text-left text-[13px] font-semibold transition ${isActive
                                        ? 'bg-[#edf4ff] text-[#1b66f9]'
                                        : 'text-[#7e8798] hover:bg-[#f7f8fa] hover:text-[#202532]'
                                        }`}
                                >
                                    <Icon className="size-[17px]" />
                                    {item.label}
                                </button>
                            )
                        })}
                    </nav>

                    <div className="mt-auto border-t border-[#edf0f4] pt-5">
                        <button className="flex items-center gap-3 px-3 py-2.5 text-left text-[13px] font-semibold text-[#7e8798] hover:text-[#202532]">
                            <Settings className="size-[17px]" />
                            Paramètres
                        </button>
                        <button className="flex items-center gap-3 px-3 py-2.5 text-left text-[13px] font-semibold text-[#7e8798] hover:text-[#202532]">
                            <CircleHelp className="size-[17px]" />
                            Aide & support
                        </button>
                        <button
                            onClick={handleLogout}
                            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-[13px] font-semibold text-[#f25555] hover:bg-[#fff3f1]"
                        >
                            <X className="size-[17px]" />
                            Déconnexion
                        </button>
                        <div className="mt-3 flex items-center gap-3 rounded-xl bg-[#f7f8fa] p-3">
                            <div className="grid size-8 place-items-center rounded-full bg-[#dbe7ff] text-xs font-bold text-[#1b66f9]">
                                J
                            </div>
                            <div className="truncate text-xs font-bold">Juge connecté</div>
                            <ChevronDown className="ml-auto size-4 text-[#9aa2b1]" />
                        </div>
                    </div>
                </div>
            </aside>
        </>
    )
}