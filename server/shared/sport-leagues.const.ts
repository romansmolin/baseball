import type { League } from '@/shared/teams'

export const SPORT_LEAGUES: League[] = [
    { slug: 'mlb', name: 'MLB', region: 'north-america', dotColor: '#3b82f6' },
    { slug: 'milb', name: 'MiLB', region: 'north-america', dotColor: '#22c55e' },
    { slug: 'npb', name: 'NPB', region: 'japan-korea', dotColor: '#ef4444' },
    { slug: 'kbo', name: 'KBO', region: 'japan-korea', dotColor: '#ec4899' },
    { slug: 'lvbp', name: 'LVBP', region: 'latin-america', dotColor: '#f59e0b' },
    { slug: 'lmb', name: 'LMB', region: 'latin-america', dotColor: '#14b8a6' },
]
