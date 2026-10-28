// app/bracket/BracketContent.tsx
'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy } from 'lucide-react'

type UserRole = 'ADMIN' | 'JUDGE' | null
type Candidate = { id: string; name: string; country: string | null; seed: number | null }
type Round = {
    id: string
    number: number
    status: 'PENDING' | 'OPEN' | 'CLOSED'
    result: { candidateAScore: string; candidateBScore: string; winnerId: string | null } | null
}

export type MatchStage = 'QUALIFICATION' | 'ROUND_OF_16' | 'QUARTER_FINAL' | 'SEMI_FINAL' | 'FINAL'

type Match = {
    id: string
    name: string
    stage: MatchStage
    winnerId: string | null
    candidateA: Candidate | null
    candidateB: Candidate | null
    rounds: Round[]
    tournament: { id: string; name: string }
}

async function readJson<T>(res: Response): Promise<T> {
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(body.error || 'Erreur.')
    return body
}

function currentRound(m: Match): Round | null {
    return m.rounds[m.rounds.length - 1] ?? null
}

function matchStatus(m: Match): 'PENDING' | 'OPEN' | 'CLOSED' {
    if (m.winnerId) return 'CLOSED'
    const r = currentRound(m)
    return r?.status ?? 'PENDING'
}

/* ══════════════════════════════════════════════════════
   COORDONNÉES EXACTES (GÉOMÉTRIE FIABLE)
   ══════════════════════════════════════════════════════ */

type MatchBoxProps = {
    x: number
    y: number
    color: 'yellow' | 'blue'
}

// Centres Y parfaits pour un entonnoir équilibré (remplissage vertical complet)
const COL1_Y = [12, 32, 68, 88]
const COL2_Y = [22, 78]
const COL3_Y = [50]
const COL4_Y = [22, 78]
const COL5_Y = [12, 32, 68, 88]

const BOX_W = 12
const BOX_H = 7
const CENTER_BOX_W = 10
const HALF = (BOX_H + 1.2) / 2 // 4.1 → espacement symétrique entre les 2 box d'un match

const MATCH_BOXES: MatchBoxProps[] = [
    // COLONNE 1 (1/8 gauche) : x = 12%
    { x: 12, y: COL1_Y[0] - HALF, color: 'yellow' },
    { x: 12, y: COL1_Y[0] + HALF, color: 'blue' },
    { x: 12, y: COL1_Y[1] - HALF, color: 'yellow' },
    { x: 12, y: COL1_Y[1] + HALF, color: 'blue' },
    { x: 12, y: COL1_Y[2] - HALF, color: 'yellow' },
    { x: 12, y: COL1_Y[2] + HALF, color: 'blue' },
    { x: 12, y: COL1_Y[3] - HALF, color: 'yellow' },
    { x: 12, y: COL1_Y[3] + HALF, color: 'blue' },

    // COLONNE 2 (1/4 gauche) : x = 26%
    { x: 26, y: COL2_Y[0] - HALF, color: 'yellow' },
    { x: 26, y: COL2_Y[0] + HALF, color: 'blue' },
    { x: 26, y: COL2_Y[1] - HALF, color: 'yellow' },
    { x: 26, y: COL2_Y[1] + HALF, color: 'blue' },

    // COLONNE 3 (Demi-finale gauche) : x = 34%
    { x: 34, y: COL3_Y[0] - HALF, color: 'yellow' },
    { x: 34, y: COL3_Y[0] + HALF, color: 'blue' },

    // COLONNE 4 (Demi-finale droite) : x = 66%
    { x: 66, y: COL3_Y[0] - HALF, color: 'yellow' },
    { x: 66, y: COL3_Y[0] + HALF, color: 'blue' },

    // COLONNE 5 (1/4 droite) : x = 74%
    { x: 74, y: COL4_Y[0] - HALF, color: 'yellow' },
    { x: 74, y: COL4_Y[0] + HALF, color: 'blue' },
    { x: 74, y: COL4_Y[1] - HALF, color: 'yellow' },
    { x: 74, y: COL4_Y[1] + HALF, color: 'blue' },

    // COLONNE 6 (1/8 droite) : x = 88%
    { x: 88, y: COL5_Y[0] - HALF, color: 'yellow' },
    { x: 88, y: COL5_Y[0] + HALF, color: 'blue' },
    { x: 88, y: COL5_Y[1] - HALF, color: 'yellow' },
    { x: 88, y: COL5_Y[1] + HALF, color: 'blue' },
    { x: 88, y: COL5_Y[2] - HALF, color: 'yellow' },
    { x: 88, y: COL5_Y[2] + HALF, color: 'blue' },
    { x: 88, y: COL5_Y[3] - HALF, color: 'yellow' },
    { x: 88, y: COL5_Y[3] + HALF, color: 'blue' },

    // COLONNE 7 (FINALE) : x = 50%, centre abaissé à 56%
    { x: 50, y: 56 - HALF, color: 'yellow' },
    { x: 50, y: 56 + HALF, color: 'blue' },
]

const MATCH_SLOT_PAIRS: MatchBoxProps[][] = [
    // Gauche 1/8
    [MATCH_BOXES[0], MATCH_BOXES[1]],
    [MATCH_BOXES[2], MATCH_BOXES[3]],
    [MATCH_BOXES[4], MATCH_BOXES[5]],
    [MATCH_BOXES[6], MATCH_BOXES[7]],
    // Gauche 1/4
    [MATCH_BOXES[8], MATCH_BOXES[9]],
    [MATCH_BOXES[10], MATCH_BOXES[11]],
    // Gauche 1/2
    [MATCH_BOXES[12], MATCH_BOXES[13]],
    // Droite 1/2
    [MATCH_BOXES[14], MATCH_BOXES[15]],
    // Droite 1/4
    [MATCH_BOXES[16], MATCH_BOXES[17]],
    [MATCH_BOXES[18], MATCH_BOXES[19]],
    // Droite 1/8
    [MATCH_BOXES[20], MATCH_BOXES[21]],
    [MATCH_BOXES[22], MATCH_BOXES[23]],
    [MATCH_BOXES[24], MATCH_BOXES[25]],
    [MATCH_BOXES[26], MATCH_BOXES[27]],
    // FINALE
    [MATCH_BOXES[28], MATCH_BOXES[29]],
]

const STAGE_SEQUENCE: MatchStage[] = [
    'ROUND_OF_16', 'ROUND_OF_16', 'ROUND_OF_16', 'ROUND_OF_16',
    'QUARTER_FINAL', 'QUARTER_FINAL',
    'SEMI_FINAL', 'SEMI_FINAL',
    'QUARTER_FINAL', 'QUARTER_FINAL',
    'ROUND_OF_16', 'ROUND_OF_16', 'ROUND_OF_16', 'ROUND_OF_16',
    'FINAL'
]

export default function BracketContent() {
    const searchParams = useSearchParams()
    const tournamentId = searchParams.get('tournamentId')

    const [matches, setMatches] = useState<Match[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [role, setRole] = useState<UserRole>(null)

    const lastPayloadRef = useRef<string | null>(null)

    useEffect(() => {
        fetch('/api/auth/me', { cache: 'no-store' })
            .then((res) => (res.ok ? res.json() : null))
            .then((user) => setRole(user?.role ?? null))
            .catch(() => setRole(null))
    }, [])

    const load = useCallback(async () => {
        if (lastPayloadRef.current === null) setLoading(true)
        setError(null)
        try {
            const url = tournamentId
                ? `/api/matches?tournamentId=${encodeURIComponent(tournamentId)}`
                : '/api/matches'
            const data = await readJson<Match[]>(await fetch(url, { cache: 'no-store' }))

            const payload = JSON.stringify(data)
            if (payload === lastPayloadRef.current) {
                setLoading(false)
                return
            }
            lastPayloadRef.current = payload
            setMatches(data)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Erreur.')
        } finally {
            setLoading(false)
        }
    }, [tournamentId])

    useEffect(() => {
        void load()
        const interval = setInterval(() => void load(), 5000)
        return () => clearInterval(interval)
    }, [load])

    const hasAny = matches.length > 0

    return (
        <div className="fixed inset-0 overflow-hidden bg-[#fe0000]">
            {error && (
                <div className="absolute left-0 right-0 top-0 z-30 border-b border-rose-200 bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#dc2626]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex h-full w-full items-center justify-center bg-[#fe0000]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-medium text-white/80">
                        Chargement du tableau…
                    </div>
                </div>
            ) : !hasAny ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#a92f20] p-8 text-center">
                    <Trophy className="size-10 text-[#fff500]" />
                    <p className="text-base font-bold text-white">Aucun match dans le tableau</p>
                </div>
            ) : (
                <BracketBoard matches={matches} role={role} />
            )}
        </div>
    )
}

function BracketBoard({ matches, role }: { matches: Match[]; role: UserRole }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const festivalRef = useRef<HTMLElement>(null)

    useEffect(() => {
        const container = containerRef.current
        const festival = festivalRef.current
        if (!container || !festival) return

        let frame = 0

        const apply = () => {
            const cw = container.clientWidth
            const ch = container.clientHeight
            if (cw <= 0 || ch <= 0) return

            const isPortrait = cw / ch < 4 / 5
            const boardRatio = isPortrait ? 9 / 16 : 16 / 9

            let boardW: number
            let boardH: number

            if (isPortrait) {
                boardH = ch
                boardW = boardH * boardRatio
            } else {
                boardW = cw
                boardH = boardW / boardRatio
            }

            const scale = Math.min(cw / boardW, ch / boardH) * 0.98

            festival.style.transform = `scale(${scale})`
            festival.style.width = `${boardW}px`
            festival.style.height = `${boardH}px`
        }

        const schedule = () => {
            if (frame) return
            frame = requestAnimationFrame(() => {
                frame = 0
                apply()
            })
        }

        apply()
        const ro = new ResizeObserver(schedule)
        ro.observe(container)
        window.addEventListener('orientationchange', schedule)
        window.addEventListener('resize', schedule)

        return () => {
            if (frame) cancelAnimationFrame(frame)
            ro.disconnect()
            window.removeEventListener('orientationchange', schedule)
            window.removeEventListener('resize', schedule)
        }
    }, [])

    const matchesByStage: Record<MatchStage, Match[]> = {
        QUALIFICATION: [],
        ROUND_OF_16: matches.filter((m) => m.stage === 'ROUND_OF_16').sort((a, b) => a.id.localeCompare(b.id)),
        QUARTER_FINAL: matches.filter((m) => m.stage === 'QUARTER_FINAL').sort((a, b) => a.id.localeCompare(b.id)),
        SEMI_FINAL: matches.filter((m) => m.stage === 'SEMI_FINAL').sort((a, b) => a.id.localeCompare(b.id)),
        FINAL: matches.filter((m) => m.stage === 'FINAL').sort((a, b) => a.id.localeCompare(b.id)),
    }

    const stageCursor: Record<MatchStage, number> = {
        QUALIFICATION: 0, ROUND_OF_16: 0, QUARTER_FINAL: 0, SEMI_FINAL: 0, FINAL: 0,
    }

    const pairs = MATCH_SLOT_PAIRS.map((pair, idx) => {
        const stage = STAGE_SEQUENCE[idx]
        const list = matchesByStage[stage]
        const cursor = stageCursor[stage]
        const match = list[cursor] ?? null
        stageCursor[stage] = cursor + 1
        return { slotA: pair[0], slotB: pair[1], stage, match }
    })

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full items-center justify-center overflow-hidden bg-[#fe0000]"        >
            <main
                ref={festivalRef}
                className="festival"
                style={{
                    transformOrigin: 'center center',
                    willChange: 'transform',
                }}
            >
                <div className="board">
                    {/* Ajout du bloc de fond central */}
                    <div className="header-block" />

                    {/* Lien retour bracket */}
                    <div className="absolute left-[2%] bottom-[2%] z-20">
                        <Link
                            href={`/tournaments`}
                            className="text-[11px] font-extrabold uppercase tracking-wide text-white/70 hover:text-white"
                        >
                            ← Tournois
                        </Link>
                    </div>

                    {/* <header className="festival-title">
                        <div>PHILOSO</div>
                        <div>FLOOR</div>
                        <span>FESTIVAL</span>
                    </header>

                    <header className="battle-title">
                        <div>BREAKING</div>
                        <div>BATTLE</div>
                        <span>CHAMPIONSHIP</span>
                    </header> */}

                    {/* Logo */}
                    <div
                        className="logo"
                        style={{
                            perspective: '1200px',
                        }}
                    >
                        <svg
                            viewBox="0 0 300 300"
                            role="img"
                            aria-label="Logo du festival"
                            style={{
                                width: '100%',
                                height: '100%',
                                animation: 'logo-spin-y 8s linear infinite',
                                transformStyle: 'preserve-3d',
                                backfaceVisibility: 'visible',
                                willChange: 'transform',
                                filter: 'drop-shadow(0 12px 8px rgba(60,0,0,0.2))',
                            }}
                        >
                            <path
                                d="
                M 65 24
                C 35 24, 20 42, 30 66
                C 39 86, 67 101, 98 116
                C 117 125, 117 132, 98 141
                C 64 157, 28 177, 27 204
                C 26 231, 48 249, 78 249
                L 222 249
                C 252 249, 274 231, 273 204
                C 272 177, 236 157, 202 141
                C 183 132, 183 125, 202 116
                C 233 101, 261 86, 270 66
                C 280 42, 265 24, 235 24
                Z

                M 150 39
                C 178 39, 192 59, 185 83
                C 180 101, 165 119, 166 139
                C 167 162, 184 187, 181 207
                C 178 225, 166 233, 150 233
                C 134 233, 122 225, 119 207
                C 116 187, 133 162, 134 139
                C 135 119, 120 101, 115 83
                C 108 59, 122 39, 150 39
                Z
            "
                                fill="white"
                                fillRule="evenodd"
                            />
                        </svg>
                    </div>

                    <div className="finale">FINALE</div>

                    {pairs.map(({ slotA, slotB, stage, match }, idx) => (
                        <MatchSlotPair
                            key={`pair-${idx}-${slotA.x}-${slotA.y}`}
                            slotA={slotA}
                            slotB={slotB}
                            stage={stage}
                            match={match}
                            role={role}
                        />
                    ))}
                </div>
            </main>
        </div>
    )
}

function MatchSlotPair({
    slotA,
    slotB,
    stage,
    match,
    role,
}: {
    slotA: MatchBoxProps
    slotB: MatchBoxProps
    stage: MatchStage
    match: Match | null
    role: UserRole
}) {
    const isCenter = stage === 'SEMI_FINAL' || stage === 'FINAL'
    const width = isCenter ? CENTER_BOX_W : BOX_W

    const boxStyle = {
        width: `${width}%`,
        height: `${BOX_H}%`,
        transform: 'translate(-50%, -50%)',
        transformOrigin: 'center center',
    }

    const vsX = slotA.x
    const vsY = (slotA.y + slotB.y) / 2

    if (!match) {
        return (
            <>
                <div
                    className="match-box empty"
                    style={{ ...boxStyle, left: `${slotA.x}%`, top: `${slotA.y}%` }}
                />
                <span
                    className="versus-badge opacity-40"
                    style={{ left: `${vsX}%`, top: `${vsY}%` }}
                >
                    VS
                </span>
                <div
                    className="match-box empty"
                    style={{ ...boxStyle, left: `${slotB.x}%`, top: `${slotB.y}%` }}
                />
            </>
        )
    }

    const status = matchStatus(match)
    const round = currentRound(match)
    const scoreA = round?.result ? Number(round.result.candidateAScore) : null
    const scoreB = round?.result ? Number(round.result.candidateBScore) : null
    const isWinnerA = Boolean(match.winnerId && match.winnerId === match.candidateA?.id)
    const isWinnerB = Boolean(match.winnerId && match.winnerId === match.candidateB?.id)
    const isFinished = Boolean(match.winnerId)
    const isFinal = stage === 'FINAL'
    const isLoserA = isFinished && !isWinnerA
    const isLoserB = isFinished && !isWinnerB

    const href =
        role === 'ADMIN'
            ? `/results/${match.id}?tournamentId=${encodeURIComponent(match.tournament.id)}`
            : `/vote/${match.id}?tournamentId=${encodeURIComponent(match.tournament.id)}`

    const statusClass =
        status === 'OPEN'
            ? 'status-open'
            : status === 'CLOSED'
                ? 'status-closed'
                : isFinal && isFinished
                    ? 'status-final-finished'
                    : ''

    return (
        <>
            <Link
                href={href}
                className={`match-box ${slotA.color} ${isWinnerA ? `winner-${slotA.color}` : ''} ${isLoserA ? `loser-${slotA.color}` : ''} ${statusClass}`}
                style={{ ...boxStyle, left: `${slotA.x}%`, top: `${slotA.y}%` }}
                title={`${match.name} — ${match.candidateA?.name ?? 'Candidat A'}`}
            >
                <PlayerRow candidate={match.candidateA} score={scoreA} isWinner={isWinnerA} isLoser={isLoserA} color={slotA.color} />
            </Link>

            <span className="versus-badge" style={{ left: `${vsX}%`, top: `${vsY}%` }}>
                VS
            </span>

            <Link
                href={href}
                className={`match-box ${slotB.color} ${isWinnerB ? `winner-${slotB.color}` : ''} ${isLoserB ? `loser-${slotB.color}` : ''} ${statusClass}`}
                style={{ ...boxStyle, left: `${slotB.x}%`, top: `${slotB.y}%` }}
                title={`${match.name} — ${match.candidateB?.name ?? 'Candidat B'}`}
            >
                <PlayerRow candidate={match.candidateB} score={scoreB} isWinner={isWinnerB} isLoser={isLoserB} color={slotB.color} />
            </Link>
        </>
    )
}

function PlayerRow({
    candidate,
    score,
    isWinner,
    isLoser,          // ⬅️ AJOUT 1 : nouvelle prop
    color,
}: {
    candidate: Candidate | null
    score: number | null
    isWinner: boolean
    isLoser: boolean  // ⬅️ AJOUT 2 : nouveau type
    color: 'yellow' | 'blue'
}) {
    const rawName = candidate?.name ?? null
    const isTbd =
        !rawName || /^(tbd|to be determined|à définir|en attente|pending)$/i.test(rawName)
    const display = isTbd ? '??' : rawName!

    const isYellow = color === 'yellow'

    return (
        <div className={`player-row ${isTbd ? 'player-tbd' : ''} ${isLoser ? 'player-loser' : ''}`}>  {/* ⬅️ AJOUT 3 */}
            <span className="player-name-text" title={display}>
                {display}
            </span>

            {!isTbd && score != null && (
                <span className={`player-score ${isYellow ? 'score-dark' : 'score-light'}`}>
                    {score.toFixed(0)}
                </span>
            )}
        </div>
    )
}