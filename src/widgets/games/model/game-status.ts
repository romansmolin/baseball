import type { UpcomingGameStatus } from '@/shared/games'

export const STATUS_LABEL: Record<UpcomingGameStatus, string> = {
    SCHEDULED: 'Upcoming',
    LIVE: 'Live',
    FINAL: 'Final',
    POSTPONED: 'Postponed',
    CANCELLED: 'Cancelled',
}

export const formatKickoff = (iso: string): string =>
    new Date(iso).toLocaleString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    })
