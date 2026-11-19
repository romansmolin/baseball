import type { UpcomingGameRecord } from '@/shared/games'

export const gameHref = (game: UpcomingGameRecord): string =>
    game.leagueSlug && game.leagueSlug !== 'mlb'
        ? `/games/${game.gamePk}?league=${game.leagueSlug}`
        : `/games/${game.gamePk}`

export const gameClock = (iso: string): string =>
    new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

export const LEAGUE_LABEL: Record<string, string> = { mlb: 'MLB', 'winter-leagues': 'Winter league' }
