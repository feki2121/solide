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
    candidateAId?: string | null
    candidateBId?: string | null
    nextMatchAId?: string | null
    nextMatchBId?: string | null
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
   CONSTANTES DE MISE EN PAGE DU BRACKET (5 ÉTAPES)
   ══════════════════════════════════════════════════════ */

const COL_WIDTH = 15.5 // Largeur % de chaque colonne (5 x 15.5 = 77.5%)
const Y_START = 21.0   // Début de la zone verticale des matchs sous les titres
const Y_END = 97.0     // Fin de la zone verticale
const TOTAL_H = Y_END - Y_START // 76% de hauteur disponible
const BOX_H = 3.5      // Hauteur de chaque case candidat
const GAP_HALF = 0.55  // Demi-espace pour le badge VS
const MATCH_OFFSET = BOX_H + GAP_HALF // Décalage de la case A par rapport au centre

export const STAGES_LAYOUT: { stage: MatchStage; title: string; x: number; capacity: number }[] = [
    { stage: 'QUALIFICATION', title: 'Qualifications', x: 2.0, capacity: 2 },
    { stage: 'ROUND_OF_16', title: '1/8 de finale', x: 22.125, capacity: 8 },
    { stage: 'QUARTER_FINAL', title: '1/4 de finale', x: 42.25, capacity: 4 },
    { stage: 'SEMI_FINAL', title: 'Demi-finales', x: 62.375, capacity: 2 },
    { stage: 'FINAL', title: 'Finale', x: 82.5, capacity: 1 },
]

/** Calcule les centres verticaux (Y) pour chaque étape sans aucun chevauchement */
function computeStageCenters(stage: MatchStage, matchCount: number) {
    // 8 huitièmes réguliers répartis sur la hauteur
    const r16Centers = Array.from({ length: 8 }, (_, i) => Y_START + (i + 0.5) * (TOTAL_H / 8))

    // 4 quarts centrés entre les paires de huitièmes correspondantes
    const qfCenters = Array.from({ length: 4 }, (_, j) => (r16Centers[2 * j] + r16Centers[2 * j + 1]) / 2)

    // 2 demies centrées entre les paires de quarts correspondantes
    const sfCenters = Array.from({ length: 2 }, (_, k) => (qfCenters[2 * k] + qfCenters[2 * k + 1]) / 2)

    // 1 finale au centre exact
    const finalCenter = [(sfCenters[0] + sfCenters[1]) / 2]

    if (stage === 'ROUND_OF_16') {
        const count = Math.max(matchCount, 8)
        return Array.from({ length: count }, (_, i) => Y_START + (i + 0.5) * (TOTAL_H / count))
    }
    if (stage === 'QUARTER_FINAL') {
        const count = Math.max(matchCount, 4)
        if (count === 4) return qfCenters
        return Array.from({ length: count }, (_, i) => Y_START + (i + 0.5) * (TOTAL_H / count))
    }
    if (stage === 'SEMI_FINAL') {
        const count = Math.max(matchCount, 2)
        if (count === 2) return sfCenters
        return Array.from({ length: count }, (_, i) => Y_START + (i + 0.5) * (TOTAL_H / count))
    }
    if (stage === 'FINAL') {
        return finalCenter
    }
    // QUALIFICATION
    const count = Math.max(matchCount, 2)
    if (count === 2) return sfCenters
    if (count === 4) return qfCenters
    return Array.from({ length: count }, (_, i) => Y_START + (i + 0.5) * (TOTAL_H / count))
}

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
        <div className="fixed inset-0 overflow-x-auto overflow-y-hidden bg-[#a92f20]">
            {error && (
                <div className="absolute left-0 right-0 top-0 z-30 border-b border-rose-200 bg-[#fff1f2] px-3 py-2 text-xs font-semibold text-[#dc2626]">
                    {error}
                </div>
            )}

            {loading ? (
                <div className="flex h-full w-full items-center justify-center bg-[#a92f20]">
                    <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-sm font-medium text-white/80">
                        Chargement du tableau…
                    </div>
                </div>
            ) : !hasAny ? (
                <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[#a92f20] p-8 text-center">
                    <Trophy className="size-10 text-[#fff500]" />
                    <p className="text-base font-bold text-white">Aucun match dans le tableau</p>
                    <p className="text-xs text-white/70">
                        Créez des matchs avec les étapes qualification, 1/8 de finale, quart, demi et finale.
                    </p>
                </div>
            ) : (
                <BracketBoard matches={matches} role={role} />
            )}
        </div>
    )
}

/* ══════════════════════════════════════════════════════
   BRACKET BOARD — 5 Colonnes dans l'ordre, 16/9 auto-scalé
   ══════════════════════════════════════════════════════ */

const BOARD_RATIO = 16 / 9

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

            // Assure une largeur minimale raisonnable sur mobile avec défilement horizontal
            const targetW = Math.max(cw, 1100)
            const targetH = targetW / BOARD_RATIO
            const scale = Math.min(1, ch / targetH)
            festival.style.transform = `scale(${scale})`
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

        return () => {
            if (frame) cancelAnimationFrame(frame)
            ro.disconnect()
            window.removeEventListener('orientationchange', schedule)
        }
    }, [])

    // Regroupe les matchs par étape
    const matchesByStage: Record<MatchStage, Match[]> = {
        QUALIFICATION: matches.filter((m) => m.stage === 'QUALIFICATION').sort((a, b) => a.id.localeCompare(b.id)),
        ROUND_OF_16: matches.filter((m) => m.stage === 'ROUND_OF_16').sort((a, b) => a.id.localeCompare(b.id)),
        QUARTER_FINAL: matches.filter((m) => m.stage === 'QUARTER_FINAL').sort((a, b) => a.id.localeCompare(b.id)),
        SEMI_FINAL: matches.filter((m) => m.stage === 'SEMI_FINAL').sort((a, b) => a.id.localeCompare(b.id)),
        FINAL: matches.filter((m) => m.stage === 'FINAL').sort((a, b) => a.id.localeCompare(b.id)),
    }

    // Calcule les coordonnées de chaque colonne
    const columnsData = STAGES_LAYOUT.map((col) => {
        const stageMatches = matchesByStage[col.stage]
        const count = Math.max(stageMatches.length, col.capacity)
        const centers = computeStageCenters(col.stage, count)
        return {
            ...col,
            matches: stageMatches,
            centers,
        }
    })

    return (
        <div
            ref={containerRef}
            className="relative flex h-full w-full items-center justify-center overflow-x-auto overflow-y-hidden bg-[#a92f20]"
        >
            <main
                ref={festivalRef}
                className="festival"
                style={{
                    transformOrigin: 'center center',
                    minWidth: '1100px',
                    width: '100%',
                }}
            >
                <div className="board">
                    {/* Header festival */}
                    <header className="festival-title">
                        <div>PHILOSO</div>
                        <div>FLOOR</div>
                        <span>FESTIVAL</span>
                    </header>

                    <div className="logo">
                        <svg viewBox="0 0 280 300" role="img" aria-label="Logo du festival">
                            <path
                                d="M40 15
                                   C10 15 4 45 28 68
                                   L100 125
                                   C116 138 113 150 95 164
                                   L29 218
                                   C2 241 14 274 46 274
                                   L234 274
                                   C266 274 278 241 251 218
                                   L185 164
                                   C167 150 164 138 180 125
                                   L252 68
                                   C276 45 270 15 240 15
                                   Z
                                   M140 34
                                   C170 34 185 60 172 91
                                   L156 130
                                   C150 146 151 160 164 179
                                   L180 204
                                   C195 229 176 255 140 255
                                   C104 255 85 229 100 204
                                   L116 179
                                   C129 160 130 146 124 130
                                   L108 91
                                   C95 60 110 34 140 34
                                   Z"
                                fill="white"
                                fillRule="evenodd"
                            />
                        </svg>
                    </div>

                    <header className="battle-title">
                        <div>BREAKING</div>
                        <div>BATTLE</div>
                        <span>CHAMPIONSHIP</span>
                    </header>

                    {/* Titres des 5 étapes */}
                    {columnsData.map((col) => (
                        <div
                            key={col.stage}
                            className="stage-column-title"
                            style={{
                                left: `${col.x}%`,
                                width: `${COL_WIDTH}%`,
                                top: '15.6%',
                            }}
                        >
                            <span>{col.title}</span>
                            <span className="text-[0.8cqw] opacity-60">({col.matches.length})</span>
                        </div>
                    ))}

                    {/* Lignes de liaison (SVG) entre étapes */}
                    <ConnectorSvg columns={columnsData} />

                    {/* Matchs des 5 étapes */}
                    {columnsData.map((col) => (
                        <div key={col.stage}>
                            {col.centers.map((yCenter, i) => {
                                const match = col.matches[i] ?? null
                                return (
                                    <MatchPair
                                        key={match ? match.id : `empty-${col.stage}-${i}`}
                                        match={match}
                                        stage={col.stage}
                                        colX={col.x}
                                        yCenter={yCenter}
                                        index={i}
                                        role={role}
                                    />
                                )
                            })}
                        </div>
                    ))}
                </div>
            </main>
        </div>
    )
}

/* ══════════════════════════════════════════════════════
   LIGNES DE CONNEXION SVG ENTRE LES 5 ÉTAPES
   ══════════════════════════════════════════════════════ */

function ConnectorSvg({
    columns,
}: {
    columns: Array<{
        stage: MatchStage
        x: number
        matches: Match[]
        centers: number[]
    }>
}) {
    // Relie chaque étape à l'étape suivante
    const links: {
        x1: number
        y1: number
        x2: number
        y2: number
        isWinnerAdvancing: boolean
        key: string
    }[] = []

    for (let c = 0; c < columns.length - 1; c++) {
        const sourceCol = columns[c]
        const targetCol = columns[c + 1]

        const x1 = sourceCol.x + COL_WIDTH
        const x2 = targetCol.x
        const xMid = (x1 + x2) / 2

        // Pour chaque match source, relie vers le match cible
        sourceCol.centers.forEach((y1, sIdx) => {
            const sourceMatch = sourceCol.matches[sIdx]
            let targetIdx = Math.floor(sIdx / 2)

            // Si le match a explicitement un nextMatchId, vérifie l'index cible
            if (sourceMatch?.nextMatchAId || sourceMatch?.nextMatchBId) {
                const targetId = sourceMatch.nextMatchAId || sourceMatch.nextMatchBId
                const foundIdx = targetCol.matches.findIndex((m) => m.id === targetId)
                if (foundIdx !== -1) targetIdx = foundIdx
            }

            const y2 = targetCol.centers[targetIdx]
            if (y2 != null) {
                const isWinnerAdvancing = Boolean(sourceMatch?.winnerId)
                links.push({
                    x1,
                    y1,
                    x2,
                    y2,
                    isWinnerAdvancing,
                    key: `link-${sourceCol.stage}-${sIdx}-${targetCol.stage}-${targetIdx}`,
                })
            }
        })
    }

    return (
        <svg
            className="pointer-events-none absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{ zIndex: 1 }}
        >
            {links.map(({ x1, y1, x2, y2, isWinnerAdvancing, key }) => {
                const xMid = (x1 + x2) / 2
                const d = `M ${x1} ${y1} H ${xMid} V ${y2} H ${x2}`
                return (
                    <path
                        key={key}
                        d={d}
                        fill="none"
                        stroke={isWinnerAdvancing ? 'rgba(255, 245, 0, 0.75)' : 'rgba(255, 255, 255, 0.2)'}
                        strokeWidth={isWinnerAdvancing ? '0.22' : '0.14'}
                        strokeDasharray={isWinnerAdvancing ? undefined : '0.5 0.5'}
                        vectorEffect="non-scaling-stroke"
                    />
                )
            })}
        </svg>
    )
}

/* ══════════════════════════════════════════════════════
   UN MATCH = Case A (Jaune) + VS + Case B (Bleue)
   ══════════════════════════════════════════════════════ */

function MatchPair({
    match,
    stage,
    colX,
    yCenter,
    index,
    role,
}: {
    match: Match | null
    stage: MatchStage
    colX: number
    yCenter: number
    index: number
    role: UserRole
}) {
    const yA = yCenter - MATCH_OFFSET
    const yB = yCenter + GAP_HALF

    if (!match) {
        // Case vide (emplacement structurel)
        return (
            <>
                <div
                    className="match-box empty"
                    style={{
                        left: `${colX}%`,
                        top: `${yA}%`,
                        width: `${COL_WIDTH}%`,
                        height: `${BOX_H}%`,
                    }}
                >
                    <span className="px-2 text-[8px] font-bold text-white/40 tracking-wider">
                        EN ATTENTE
                    </span>
                </div>

                <span
                    className="versus-badge opacity-50"
                    style={{
                        left: `${colX + COL_WIDTH / 2}%`,
                        top: `${yCenter}%`,
                    }}
                >
                    VS
                </span>

                <div
                    className="match-box empty"
                    style={{
                        left: `${colX}%`,
                        top: `${yB}%`,
                        width: `${COL_WIDTH}%`,
                        height: `${BOX_H}%`,
                    }}
                >
                    <span className="px-2 text-[8px] font-bold text-white/40 tracking-wider">
                        EN ATTENTE
                    </span>
                </div>
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

    const href =
        role === 'ADMIN'
            ? `/results/${match.id}?tournamentId=${encodeURIComponent(match.tournament.id)}`
            : `/vote/${match.id}?tournamentId=${encodeURIComponent(match.tournament.id)}`

    const outline =
        status === 'OPEN'
            ? '2px solid #fb923c'
            : status === 'CLOSED'
            ? '2px solid #10b981'
            : isFinal && isFinished
            ? '2px solid #fbbf24'
            : undefined

    return (
        <>
            {/* Case A (Jaune) */}
            <Link
                href={href}
                className="match-box yellow"
                style={{
                    left: `${colX}%`,
                    top: `${yA}%`,
                    width: `${COL_WIDTH}%`,
                    height: `${BOX_H}%`,
                    outline,
                    outlineOffset: outline ? '2px' : undefined,
                    textDecoration: 'none',
                }}
                title={`${match.name} - Candidat A`}
            >
                <PlayerRow candidate={match.candidateA} score={scoreA} isWinner={isWinnerA} color="yellow" />
            </Link>

            {/* Badge VS centré entre A et B */}
            <span
                className="versus-badge"
                style={{
                    left: `${colX + COL_WIDTH / 2}%`,
                    top: `${yCenter}%`,
                }}
            >
                VS
            </span>

            {/* Case B (Bleue) */}
            <Link
                href={href}
                className="match-box blue"
                style={{
                    left: `${colX}%`,
                    top: `${yB}%`,
                    width: `${COL_WIDTH}%`,
                    height: `${BOX_H}%`,
                    outline,
                    outlineOffset: outline ? '2px' : undefined,
                    textDecoration: 'none',
                }}
                title={`${match.name} - Candidat B`}
            >
                <PlayerRow candidate={match.candidateB} score={scoreB} isWinner={isWinnerB} color="blue" />
            </Link>
        </>
    )
}

/* ══════════════════════════════════════════════════════
   LIGNE CANDIDAT DANS LA CASE (AVATAR + NOM + SCORE)
   ══════════════════════════════════════════════════════ */

function PlayerRow({
    candidate,
    score,
    isWinner,
    color,
}: {
    candidate: Candidate | null
    score: number | null
    isWinner: boolean
    color: 'yellow' | 'blue'
}) {
    const rawName = candidate?.name ?? null
    const display =
        !rawName || /^(tbd|to be determined|à définir|en attente|pending)$/i.test(rawName)
            ? 'TBD'
            : rawName

    const initials =
        display === 'TBD'
            ? '?'
            : display
                  .split(' ')
                  .map((w) => w[0])
                  .filter(Boolean)
                  .slice(0, 2)
                  .join('')
                  .toUpperCase()

    const isYellow = color === 'yellow'

    return (
        <div
            className={`flex h-full w-full items-center gap-1.5 px-2 ${
                isWinner ? (isYellow ? 'bg-amber-300/40' : 'bg-white/20') : ''
            }`}
        >
            {/* Avatar / Initiales */}
            <div
                className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[7px] font-black ${
                    isYellow ? 'bg-[#0f172a] text-white' : 'bg-white text-[#2b11e0]'
                } ${isWinner ? 'ring-2 ring-amber-300' : ''}`}
            >
                {initials}
            </div>

            {/* Nom */}
            <span
                className={`min-w-0 flex-1 truncate text-[9.5px] font-black tracking-tight ${
                    isYellow ? 'text-[#0f172a]' : 'text-white'
                }`}
                title={display}
            >
                {display}
            </span>

            {/* Trophée pour le gagnant */}
            {isWinner && (
                <Trophy
                    className={`size-3 shrink-0 ${isYellow ? 'text-[#0f172a]' : 'text-[#fff500]'}`}
                />
            )}

            {/* Score */}
            {score != null && (
                <span
                    className={`shrink-0 rounded px-1 text-[8.5px] font-black tabular-nums ${
                        isYellow ? 'bg-[#0f172a] text-white' : 'bg-white/20 text-white'
                    } ${isWinner ? 'ring-1 ring-amber-300' : ''}`}
                >
                    {score.toFixed(0)}
                </span>
            )}
        </div>
    )
}