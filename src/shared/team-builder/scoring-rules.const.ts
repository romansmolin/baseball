// Points per event. Pitching `inningPitched` is per full inning.
export interface ScoringRules {
    hitting: {
        single: number
        double: number
        triple: number
        homeRun: number
        run: number
        rbi: number
        walk: number
        hitByPitch: number
        stolenBase: number
        strikeOut: number
    }
    pitching: {
        inningPitched: number
        strikeOut: number
        earnedRun: number
        hitAllowed: number
        walkAllowed: number
        win: number
        save: number
    }
}

// Our own general-purpose preset, not a copy of any platform's defaults.
export const DEFAULT_SCORING_RULES: ScoringRules = {
    hitting: {
        single: 1,
        double: 2,
        triple: 3,
        homeRun: 4,
        run: 1,
        rbi: 1,
        walk: 1,
        hitByPitch: 1,
        stolenBase: 2,
        strikeOut: -0.5,
    },
    pitching: {
        inningPitched: 3,
        strikeOut: 1,
        earnedRun: -2,
        hitAllowed: -0.5,
        walkAllowed: -0.5,
        win: 5,
        save: 5,
    },
}

export const HITTING_RULE_LABEL: Record<keyof ScoringRules['hitting'], string> = {
    single: 'Single',
    double: 'Double',
    triple: 'Triple',
    homeRun: 'Home run',
    run: 'Run',
    rbi: 'RBI',
    walk: 'Walk',
    hitByPitch: 'Hit by pitch',
    stolenBase: 'Stolen base',
    strikeOut: 'Strikeout',
}

export const PITCHING_RULE_LABEL: Record<keyof ScoringRules['pitching'], string> = {
    inningPitched: 'Inning pitched',
    strikeOut: 'Strikeout',
    earnedRun: 'Earned run',
    hitAllowed: 'Hit allowed',
    walkAllowed: 'Walk allowed',
    win: 'Win',
    save: 'Save',
}
