'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { ResultsScreen } from '@/components/results/ResultsScreen'

export default function ResultsPage() {
    const { matchId } = useParams<{ matchId: string }>()
    const searchParams = useSearchParams()
    const tournamentId = searchParams.get('tournamentId') ?? undefined
    return <ResultsScreen matchId={matchId} tournamentId={tournamentId} />
}