// app/bracket/page.tsx
import { Suspense } from 'react'
import BracketContent from './BracketContent'

export default function Page() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#fafafc]">
                    <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-200 border-t-[#e63946]" />
                        <p className="text-sm font-medium text-[#64748b]">
                            Chargement du tableau…
                        </p>
                    </div>
                </div>
            }
        >
            <BracketContent />
        </Suspense>
    )
}