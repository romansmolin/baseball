import type { UpcomingGameRecord } from '@/shared/games'

// Within this band of 50% a game is a toss-up.
const TOSS_UP_BAND = 0.05

export interface Favourite {
    side: 'home' | 'away'
    abbreviation: string
    teamName: string
    // 0.5 to 1.
    probability: number
}

export function favouriteOf(game: UpcomingGameRecord): Favourite | null {
    if (!game.estimate) return null
    const home = game.estimate.homeWinProbability
    const side = home >= 0.5 ? 'home' : 'away'
    const team = side === 'home' ? game.homeTeam : game.awayTeam
    return {
        side,
        abbreviation: team.abbreviation,
        teamName: team.teamName ?? team.name,
        probability: side === 'home' ? home : 1 - home,
    }
}

export interface SlateStats {
    games: number
    strongest: Favourite | null
    strongestOpponent: string | null
    tossUps: number
    startersNamed: number
}

export function slateStats(games: UpcomingGameRecord[]): SlateStats {
    let strongest: Favourite | null = null
    let strongestGame: UpcomingGameRecord | null = null
    for (const game of games) {
        const favourite = favouriteOf(game)
        if (favourite && (!strongest || favourite.probability > strongest.probability)) {
            strongest = favourite
            strongestGame = game
        }
    }
    const opponent =
        strongest && strongestGame
            ? (strongest.side === 'home' ? strongestGame.awayTeam : strongestGame.homeTeam).abbreviation
            : null

    return {
        games: games.length,
        strongest,
        strongestOpponent: opponent,
        tossUps: games.filter((g) => g.estimate && Math.abs(g.estimate.homeWinProbability - 0.5) <= TOSS_UP_BAND)
            .length,
        startersNamed: games.filter((g) => g.homeProbablePitcher && g.awayProbablePitcher).length,
    }
}

// The game the model is surest about; the first game when none has an estimate.
export function pickSpotlight(games: UpcomingGameRecord[]): UpcomingGameRecord | null {
    let best: UpcomingGameRecord | null = null
    let bestEdge = -1
    for (const game of games) {
        if (!game.estimate) continue
        const edge = Math.abs(game.estimate.homeWinProbability - 0.5)
        if (edge > bestEdge) {
            best = game
            bestEdge = edge
        }
    }
    return best ?? games[0] ?? null
}

// The factor that moves the estimate the most, and the favourite's gain or loss from it.
export function topFactors(game: UpcomingGameRecord, count: number) {
    return [...(game.estimate?.factors ?? [])].sort((a, b) => Math.abs(b.effect) - Math.abs(a.effect)).slice(0, count)
}

export function matchesQuery(game: UpcomingGameRecord, query: string): boolean {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return [
        game.homeTeam.name,
        game.homeTeam.teamName,
        game.homeTeam.abbreviation,
        game.awayTeam.name,
        game.awayTeam.teamName,
        game.awayTeam.abbreviation,
        game.homeProbablePitcher,
        game.awayProbablePitcher,
        game.venueName,
    ].some((text) => text?.toLowerCase().includes(needle))
}
