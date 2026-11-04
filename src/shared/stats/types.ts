export interface StatStar {
    id: string
    rank: number
    name: string
    position: string
    team: string
    photoUrl: string | null
    fantasyPoints: number
    /** The official box-score line behind the points, e.g. "2 HR · 5 RBI · 3 H". */
    statLine: string
}

export interface StatsTrendPoint {
    /** Contest date, YYYY-MM-DD. */
    date: string
    /** Highest lineup score of the day. */
    best: number
    /** Average lineup score of the day. */
    average: number
}

export interface DailyStars {
    contest: { id: string; name: string; date: string } | null
    stars: StatStar[]
    trend: StatsTrendPoint[]
}
