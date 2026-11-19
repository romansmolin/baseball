import type { CategoryChip, CategoryKey } from './categories'
import type { ForecastPeriod, FantasyFormat, LineupChanges } from './format.type'
import type { ScoringRules } from './scoring-rules.const'
import type { SlotConfig, SlotId } from './slots'

export type PoolPosition = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'OF'
export type PoolPositionFilter = 'all' | PoolPosition
// A slot id like 'OF:2' (see slots.ts). The name stays for the many call sites.
export type SlotKey = SlotId

export interface FieldSlot {
    key: SlotKey
    label: string
    accept: PoolPosition
    x: number
    y: number
}

export interface PoolPlayer {
    id: number
    name: string
    pos: PoolPosition
    team: string
    leagueSlug: string
    leagueColor: string
    // null when no real value exists (no cap in Points; no forecast yet).
    salary: number | null
    proj: number | null
    // Categories formats: weighted category strength and the player's best categories.
    score?: number | null
    categoryChips?: CategoryChip[]
    photoUrl: string | null
    // false when the player has no plate appearances or innings this season (nothing to compare).
    hasSeasonStats?: boolean
}

export type Roster = Record<SlotKey, number | null>

export interface TeamSettings {
    format: FantasyFormat
    forecastPeriod: ForecastPeriod
    lineupChanges: LineupChanges
    scoringRules: ScoringRules
    slotConfig: SlotConfig
    // Categories formats only; always non-empty on a saved team.
    categories: CategoryKey[]
    salaryCap: number | null
}

export const SALARY_CAP_DEFAULT = 80000
export const ROSTER_SIZE = 9
export const CAPTAIN_MULTIPLIER = 1.5

// Diamond layout for the default 9-slot lineup. OF:0/1/2 read as LF/CF/RF.
export const FIELD_SLOTS: FieldSlot[] = [
    { key: 'OF:1', label: 'CF', accept: 'OF', x: 50, y: 13 },
    { key: 'OF:0', label: 'LF', accept: 'OF', x: 21, y: 24 },
    { key: 'OF:2', label: 'RF', accept: 'OF', x: 79, y: 24 },
    { key: 'SS:0', label: 'SS', accept: 'SS', x: 37, y: 46 },
    { key: '2B:0', label: '2B', accept: '2B', x: 63, y: 46 },
    { key: '3B:0', label: '3B', accept: '3B', x: 20, y: 61 },
    { key: '1B:0', label: '1B', accept: '1B', x: 80, y: 61 },
    { key: 'P:0', label: 'P', accept: 'P', x: 50, y: 65 },
    { key: 'C:0', label: 'C', accept: 'C', x: 50, y: 86 },
]

export interface BuilderLeague {
    slug: string
    name: string
    shortName: string
    region: 'north-america' | 'japan-korea' | 'latin-america'
    dotColor: string
    // Whether a real data provider stands behind this league. `false` leagues
    // still list in pickers but are shown as "coming soon" and can't be picked.
    providerBacked: boolean
}

export interface BuilderTeam {
    id: number
    name: string
    abbreviation: string
    locationName: string | null
    league: string | null
    division: string | null
}

export interface BuilderBudget {
    salaryCap: number | null
}

export interface BuilderRosterSlotPayload {
    externalPlayerId: number
    slotKey: SlotKey
    position: PoolPosition
    name: string
    teamName: string
    salaryAtLock: number | null
    photoUrl?: string | null
}

export interface CreateTeamPayload extends Partial<TeamSettings> {
    name: string
    leagueSlug: string
    platform?: FantasyPlatform
    captainExternalPlayerId?: number
    players: BuilderRosterSlotPayload[]
}

export interface CreateTeamResult {
    id: string
    name: string
    leagueSlug: string
}

export interface UpdateLineupPayload extends Partial<TeamSettings> {
    players: BuilderRosterSlotPayload[]
    platform?: FantasyPlatform
    captainExternalPlayerId?: number
}

// Where the user actually plays this team, and how that platform scores it.
export const FANTASY_PLATFORMS = ['YAHOO', 'ESPN', 'OTHER'] as const
export type FantasyPlatform = (typeof FANTASY_PLATFORMS)[number]

export const SCORING_PRESETS = ['POINTS', 'CATEGORIES_5X5'] as const
export type ScoringPreset = (typeof SCORING_PRESETS)[number]

export const FANTASY_PLATFORM_LABEL: Record<FantasyPlatform, string> = {
    YAHOO: 'Yahoo',
    ESPN: 'ESPN',
    OTHER: 'Other platform',
}

export const SCORING_PRESET_LABEL: Record<ScoringPreset, string> = {
    POINTS: 'Points',
    CATEGORIES_5X5: '5x5 categories',
}
