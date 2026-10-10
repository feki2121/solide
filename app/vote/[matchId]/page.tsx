'use client'

import { useParams } from 'next/navigation'
import { VoteScreen } from '@/components/vote/VoteScreen'

export default function VotePage() {
    const { matchId } = useParams<{ matchId: string }>()
    return <VoteScreen matchId={matchId} />
}