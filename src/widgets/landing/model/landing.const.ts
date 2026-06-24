import type { FeatureCard, HeroStat, LeagueShowcase, SequenceStage, TickerItem } from './landing.type'

export const SCROLL_FRAMES_BASE = '/assets/landing/baseball-scroll-frames'
export const SCROLL_FRAMES_COUNT = 192
// Frame file extension. Frames are stored as WebP (re-encoded from the
// original JPEGs at q80 — ~5.9MB → ~3.1MB) for faster download over the network.
export const SCROLL_FRAMES_EXT = 'webp'

export const TICKER_ITEMS: TickerItem[] = [
    { label: 'LIVE: 412 OPEN CONTESTS ACROSS 6 LEAGUES' },
    { label: 'FREE-ENTRY CONTESTS EVERY DAY · CREDITS-ONLY ECONOMY' },
    { label: 'AUTOFILL · CAPTAIN ×1.5 · SAVE A LINEUP IN 30 SECONDS' },
]

export const SEQUENCE_STAGES: SequenceStage[] = [
    {
        eyebrow: 'Step One',
        headline: 'Scout',
        body: 'Live stats, injuries, transfers and recent form across every active league.',
    },
    {
        eyebrow: 'Step Two',
        headline: 'Build',
        body: 'Slot 9 players on the diamond. Captain your star for a 1.5× bonus. Stay under the $50K cap.',
    },
    {
        eyebrow: 'Step Three',
        headline: 'Compete',
        body: 'Daily, weekly, head-to-head or tournament — credits-only, free to play, real bragging rights.',
    },
]

export const HERO_STATS: HeroStat[] = [
    { label: 'Leagues', value: '6' },
    { label: 'Daily Contests', value: '412' },
    { label: 'Total Prize Pool', value: '$500K' },
]

export const FEATURE_CARDS: FeatureCard[] = [
    { index: 1, label: 'Players', sub: 'Scout the pool', href: '/players' },
    { index: 2, label: 'Builder', sub: 'Slot the diamond', href: '/teams/new' },
    { index: 3, label: 'Contests', sub: 'Daily · H2H · Weekly', href: '/tournaments' },
    { index: 4, label: 'Leagues', sub: 'MLB · NPB · KBO · LVBP', href: '/leagues' },
]

export const LEAGUES_SHOWCASE: LeagueShowcase[] = [
    {
        code: 'MLB',
        name: 'Major League Baseball',
        region: 'USA / Canada',
        openContests: '128 open',
        prizePool: '$240K pool',
    },
    {
        code: 'NPB',
        name: 'Nippon Professional Baseball',
        region: 'Japan',
        openContests: '74 open',
        prizePool: '$118K pool',
    },
    {
        code: 'KBO',
        name: 'Korea Baseball Organization',
        region: 'South Korea',
        openContests: '56 open',
        prizePool: '$82K pool',
    },
]
