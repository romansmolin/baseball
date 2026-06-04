// Static mirror of the seeded "standard" v1 ScoringRule.rules JSON. Kept
// in TypeScript so the Rules page renders without a network round-trip and
// stays consistent with what the scoring engine actually applies.
//
// Authoritative source: prisma/seed.ts (BaseballScoringRuleSchema fields).
// If the seeded ruleset ever diverges from this constant, the page goes
// stale — wire it to a `/api/scoring-rules/default` fetch instead.

export type ScoringRuleCategory = 'batting' | 'pitching'

export interface ScoringRuleEntry {
    key: string
    label: string
    points: number
    description: string
    category: ScoringRuleCategory
}

export const STANDARD_SCORING_RULE: ScoringRuleEntry[] = [
    {
        key: 'single',
        label: 'Single',
        points: 3,
        description: 'Hit that reaches first base.',
        category: 'batting',
    },
    {
        key: 'double',
        label: 'Double',
        points: 5,
        description: 'Hit that reaches second base.',
        category: 'batting',
    },
    {
        key: 'triple',
        label: 'Triple',
        points: 8,
        description: 'Hit that reaches third base.',
        category: 'batting',
    },
    {
        key: 'homeRun',
        label: 'Home run',
        points: 10,
        description: 'Out of the park (or inside-the-park).',
        category: 'batting',
    },
    {
        key: 'rbi',
        label: 'RBI',
        points: 2,
        description: 'Each run batted in.',
        category: 'batting',
    },
    {
        key: 'runScored',
        label: 'Run scored',
        points: 2,
        description: 'Each time the player crosses the plate.',
        category: 'batting',
    },
    {
        key: 'stolenBase',
        label: 'Stolen base',
        points: 5,
        description: 'Bases taken on a steal.',
        category: 'batting',
    },
    {
        key: 'walk',
        label: 'Walk',
        points: 2,
        description: 'Base on balls.',
        category: 'batting',
    },
    {
        key: 'strikeoutBatter',
        label: 'Strikeout (as batter)',
        points: -1,
        description: 'Penalty for striking out at the plate.',
        category: 'batting',
    },
    {
        key: 'inningPitched',
        label: 'Inning pitched',
        points: 2.25,
        description: 'Awarded per full inning (fractional for outs).',
        category: 'pitching',
    },
    {
        key: 'strikeoutPitcher',
        label: 'Strikeout (as pitcher)',
        points: 2,
        description: 'Each batter struck out.',
        category: 'pitching',
    },
    {
        key: 'win',
        label: 'Win',
        points: 4,
        description: 'Pitcher of record for the win.',
        category: 'pitching',
    },
    {
        key: 'earnedRunAllowed',
        label: 'Earned run allowed',
        points: -2,
        description: 'Penalty per earned run charged.',
        category: 'pitching',
    },
]
