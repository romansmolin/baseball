export type {
    Region,
    League,
    TeamStatus,
    TeamFormat,
    Team,
    TeamRosterSlot,
    MyTeamsPayload,
} from '@/shared/teams'
export { REGION_LABEL, REGION_ORDER } from '@/shared/teams'

export type SortKey = 'recent' | 'proj' | 'best' | 'name'
export type StatusFilter = 'all' | 'active' | 'draft' | 'captain' | 'favorite'
export type ViewMode = 'grid' | 'list'
