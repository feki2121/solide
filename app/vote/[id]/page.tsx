import { Suspense } from 'react'
import { VoteScreen } from '@/components/vote/VoteScreen'

export default async function Page({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params

    return (
        <Suspense
            fallback={
                <div className="flex min-h-screen items-center justify-center bg-[#fafafc]">
                    <div className="text-sm font-medium text-[#64748b]">
                        Chargement…
                    </div>
                </div>
            }
        >
            <VoteScreen matchId={id} />
        </Suspense>
    )
}