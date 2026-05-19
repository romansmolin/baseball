import type { HeroStat, QualifierStage, SequenceStage, Team, TickerItem } from './landing.type'

export const SCROLL_FRAMES_BASE = '/assets/landing/baseball-scroll-frames'
export const SCROLL_FRAMES_COUNT = 192

export const TICKER_ITEMS: TickerItem[] = [
    { label: 'LIVE: TOKYO 5 - 2 SEOUL (9TH INN)' },
    { label: 'UP NEXT: NY METS VS LONDON LIONS - 19:00 GMT' },
    { label: 'SERIES MVP VOTE OPEN NOW' },
]

export const SEQUENCE_STAGES: SequenceStage[] = [
    {
        eyebrow: 'Opening Velocity',
        headline: '32 Nations',
        body: 'Qualifiers enter the global bracket under one night signal.',
    },
    {
        eyebrow: 'Impact Window',
        headline: 'Tokyo Dome',
        body: 'The final bracket compresses into a single elimination night.',
    },
    {
        eyebrow: 'Championship Split',
        headline: 'Miami Finale',
        body: 'One champion breaks from the field after twelve host cities.',
    },
]

export const HERO_STATS: HeroStat[] = [
    { label: 'Host Cities', value: '12' },
    { label: 'Final Capacity', value: '120K' },
    { label: 'Series Window', value: '76D' },
]

export const QUALIFIER_STAGES: QualifierStage[] = [
    { index: 1, label: 'Stage 01 Qualifier' },
    { index: 2, label: 'Stage 02 Qualifier' },
    { index: 3, label: 'Stage 03 Qualifier' },
    { index: 4, label: 'Stage 04 Qualifier' },
]

export const TEAMS: Team[] = [
    { name: 'Tokyo Samurai', score: '12-2', code: 'JPN', stat: '98.2 MPH AVG' },
    { name: 'NY Ironclads', score: '11-3', code: 'USA', stat: '.342 B-AVG' },
    { name: 'Havana Hurricanes', score: '10-4', code: 'CUB', stat: '42 HR TOTAL' },
]
