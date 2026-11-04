import { WINTER_LEAGUE_LABELS } from '@/shared/baseball'
import type { DailyContestSummary } from '@/shared/daily-contests'

const sourceLabels: Record<string, string> = {
    ...WINTER_LEAGUE_LABELS,
    mlb: 'MLB',
    'triple-a': 'Triple-A',
    'double-a': 'Double-A',
    'high-a': 'High-A',
    'single-a': 'Single-A',
    rookie: 'Rookie',
    'winter-leagues': 'Winter Leagues',
    'north-america': 'North American Leagues',
    'minor-leagues': 'Minor Leagues',
}

export function sourceLeagueLabel(leagueSlug: string): string {
    return sourceLabels[leagueSlug] ?? leagueSlug.toUpperCase()
}

export function dailyContestSourceLabel(contest: DailyContestSummary): string {
    return sourceLeagueLabel(contest.leagueSlug)
}

export function dailyContestViewLabel(contest: DailyContestSummary): string {
    if (contest.status === 'COMPLETED') return 'Completed contest'
    return contest.mode === 'REPLAY' ? 'History' : 'Current games'
}

export function dailyContestSeriesLabel(contest: DailyContestSummary): string {
    return contest.slateKey === 'weekend' ? 'Weekend Series' : 'Daily Lineup'
}
