export type {
    Region,
    League,
    Team,
    TeamRosterSlot,
    MyTeamsPayload,
} from '@/shared/teams'
export { REGION_LABEL, REGION_ORDER } from '@/shared/teams'

export type SortKey = 'recent' | 'proj' | 'name'
export type StatusFilter = 'all' | 'captain' | 'favorite'
export type ViewMode = 'grid' | 'list'
