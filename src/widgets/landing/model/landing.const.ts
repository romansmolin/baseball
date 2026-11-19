import type { DataPillar, FeatureCard, HeroStat, SequenceStage, TickerItem } from './landing.type'

export const SCROLL_FRAMES_BASE = '/assets/landing/baseball-scroll-frames'
export const SCROLL_FRAMES_COUNT = 192
// Frame file extension. Frames are stored as WebP (re-encoded from the
// original JPEGs at q80 — ~5.9MB → ~3.1MB) for faster download over the network.
export const SCROLL_FRAMES_EXT = 'webp'

export const TICKER_ITEMS: TickerItem[] = [
    { label: 'MLB PLAYER ANALYTICS · COMPARE · GAME OUTLOOKS' },
    { label: 'FREE STATS AND ESTIMATES · AI PICKS USE CREDITS' },
    { label: 'SAVE YOUR TEAM · USE IT ON YOUR FANTASY PLATFORM' },
]

export const SEQUENCE_STAGES: SequenceStage[] = [
    {
        eyebrow: 'Step One',
        headline: 'Scout',
        body: 'Season stats, recent form, splits and Statcast expected stats for every MLB player.',
    },
    {
        eyebrow: 'Step Two',
        headline: 'Compare',
        body: 'Put up to four players side by side and see who is hot, who is due and who is hurt.',
    },
    {
        eyebrow: 'Step Three',
        headline: 'Decide',
        body: 'Check the next games, read the estimates and get AI picks for the team you play on another platform.',
    },
]

export const HERO_STATS: HeroStat[] = [
    { label: 'MLB players', value: '1,600+' },
]

export const FEATURE_CARDS: FeatureCard[] = [
    { index: 1, label: 'Players', sub: 'Scout the pool', href: '/players' },
    { index: 2, label: 'Compare', sub: 'Side by side', href: '/compare' },
    { index: 3, label: 'Games', sub: 'Starters and estimates', href: '/games' },
    { index: 4, label: 'My teams', sub: 'Save your roster', href: '/teams' },
]

export const DATA_PILLARS: DataPillar[] = [
    {
        code: 'Stats',
        name: 'Season stats, form and splits',
        source: 'MLB Stats API',
    },
    {
        code: 'Statcast',
        name: 'Expected stats and quality of contact',
        source: 'Baseball Savant',
    },
    {
        code: 'Games',
        name: 'Probable starters, weather and estimates',
        source: 'Updated through the day',
    },
]
