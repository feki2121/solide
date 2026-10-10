'use client'

import { Sidebar } from '../Sidebar'

export function AdminLayout({ children }: { children: React.ReactNode }) {
    return (
        <main className="min-h-screen bg-[#fafafc] text-[#0f172a]">
            <Sidebar />
            <div className="lg:pl-[248px]">{children}</div>
        </main>
    )
}