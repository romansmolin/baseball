// Full names for the stat abbreviations on a performer card, so the card teaches as it shows.
const STAT_LABEL: Record<string, string> = {
    'H-AB': 'Hits per at-bats',
    AVG: 'Batting average',
    OPS: 'On-base plus slugging',
    HR: 'Home runs',
    RBI: 'Runs batted in',
    SB: 'Stolen bases',
    IP: 'Innings pitched',
    K: 'Strikeouts',
    ERA: 'Earned run average',
    WHIP: 'Walks + hits per inning',
    W: 'Wins',
    SV: 'Saves',
}

export const statLabel = (abbreviation: string): string => STAT_LABEL[abbreviation] ?? abbreviation
