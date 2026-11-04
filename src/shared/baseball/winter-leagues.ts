// The winter leagues the MLB Stats API groups under one "Winter Leagues" sport.
// Each becomes its own daily contest source, named by the league the API reports for a team.
export const WINTER_LEAGUE_SOURCES = [
    { slug: 'winter-lmp', apiName: 'Liga Mexicana del Pacifico', label: 'Mexican Pacific League' },
    { slug: 'winter-lvbp', apiName: 'Liga Venezuela Beisbol Profesional', label: 'Venezuelan League' },
    { slug: 'winter-lidom', apiName: 'Liga de Beisbol Dominicano', label: 'Dominican League' },
    { slug: 'winter-lbprc', apiName: 'Liga de Beisbol Profesional Roberto Clemente', label: 'Puerto Rican League' },
    { slug: 'winter-afl', apiName: 'Arizona Fall League', label: 'Arizona Fall League' },
    { slug: 'winter-abl', apiName: 'Australian Baseball League', label: 'Australian League' },
    { slug: 'winter-cs', apiName: 'Caribbean Series', label: 'Caribbean Series' },
] as const

export type WinterLeagueSourceSlug = (typeof WINTER_LEAGUE_SOURCES)[number]['slug']

export const WINTER_LEAGUE_LABELS: Record<string, string> = Object.fromEntries(
    WINTER_LEAGUE_SOURCES.map((league) => [league.slug, league.label]),
)
