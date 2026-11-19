/**
 * Sample data for product demos. Everything here is generated in the browser from the
 * real price lists.
 */


export type Rng = () => number

export type DemoActivityInput = { firstDate: string; lastDate: string; tokens: number }

export type DemoActivityRow = {
    index: number
    date: string
    time: string
    type: string
    tokens: number
    amountCents: number
    currency: string
    status: 'Successful'
    totalSpent: number
}

export type DemoPaymentRow = {
    id: string
    /** DD.MM.YYYY, as in the payment history. */
    date: string
    tokens: number
    amountCents: number
    currency: string
    status: string
}

type GenerationKind = { label: string; cost: number }

const KINDS: GenerationKind[] = [
    { label: 'Game analysis', cost: 300 },
    { label: 'Performer analytics', cost: 100 },
    { label: 'Team autofill', cost: 500 },
]
const CENTS_PER_CREDIT = 1
const CREDIT_CURRENCY = 'EUR'
const PRESET_CREDITS = [1200, 2500, 5000]

const COSTS = [...new Set(KINDS.map((kind) => kind.cost))]
const MIN_COST = Math.min(...COSTS)

const DAY_MS = 24 * 60 * 60 * 1000
const pad = (value: number) => String(value).padStart(2, '0')
const formatDate = (date: Date) => date.toISOString().slice(0, 10)
const formatTime = (date: Date) => `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`

/** Last allowed `YYYY-MM-DD` for a report that starts on `firstDate`: six calendar months later. */
export function maxDemoLastDate(firstDate: string): string | undefined {
    const first = new Date(`${firstDate}T00:00:00Z`)
    if (Number.isNaN(first.getTime())) return undefined
    const month = first.getUTCMonth() + 6
    const lastDayOfMonth = new Date(Date.UTC(first.getUTCFullYear(), month + 1, 0)).getUTCDate()
    const max = new Date(Date.UTC(first.getUTCFullYear(), month, Math.min(first.getUTCDate(), lastDayOfMonth)))
    return formatDate(max)
}

/** Inclusive UTC day range of two `YYYY-MM-DD` strings; throws a readable error when invalid. */
function parseRange(firstDate: string, lastDate: string) {
    const start = Date.parse(`${firstDate}T00:00:00Z`)
    const end = Date.parse(`${lastDate}T00:00:00Z`) + DAY_MS - 1
    if (Number.isNaN(start) || Number.isNaN(end) || end < start) {
        throw new Error('Last date must be on or after first date')
    }
    if (lastDate > maxDemoLastDate(firstDate)!) throw new Error('The period cannot be longer than 6 months')
    return { start, end }
}

/** `count` timestamps spread evenly over the range with jitter inside each slot, oldest first. */
function spreadTimestamps(count: number, start: number, end: number, rng: Rng): Date[] {
    const slot = (end - start) / count
    return Array.from({ length: count }, (_, i) => new Date(start + (i + rng()) * slot))
}

/** Throws an Error with a readable message on invalid input. */
export function generateDemoActivity(
    { firstDate, lastDate, tokens }: DemoActivityInput,
    rng: Rng = Math.random,
): DemoActivityRow[] {
    const range = parseRange(firstDate, lastDate)
    if (!Number.isSafeInteger(tokens)) {
        throw new Error('Tokens spend must be a whole number')
    }
    if (tokens < MIN_COST || tokens % MIN_COST !== 0) {
        throw new Error(`Tokens spend cannot be made up from generation prices (${COSTS.join(', ')})`)
    }

    const kinds: GenerationKind[] = []
    for (let left = tokens; left > 0; ) {
        const options = KINDS.filter((kind) => kind.cost <= left)
        const kind = options[Math.floor(rng() * options.length)]
        kinds.push(kind)
        left -= kind.cost
    }

    let totalSpent = 0
    return spreadTimestamps(kinds.length, range.start, range.end, rng).map((at, i) => {
        totalSpent += kinds[i].cost
        return {
            index: i + 1,
            date: formatDate(at),
            time: formatTime(at),
            type: kinds[i].label,
            tokens: kinds[i].cost,
            amountCents: kinds[i].cost * CENTS_PER_CREDIT,
            currency: CREDIT_CURRENCY,
            status: 'Successful' as const,
            totalSpent,
        }
    }).reverse()
}

export const MAX_DEMO_PAYMENT_ROWS = 100

const ID_CHARS = '0123456789abcdefghijklmnopqrstuvwxyz'

/** Generated payment ids use a distinct prefix. */
const demoPaymentId = (rng: Rng) =>
    `gen_c${Array.from({ length: 24 }, () => ID_CHARS[Math.floor(rng() * ID_CHARS.length)]).join('')}`

export function generateDemoPayments(
    rows: number,
    firstDate: string,
    lastDate: string,
    rng: Rng = Math.random,
): DemoPaymentRow[] {
    if (!Number.isInteger(rows) || rows < 1 || rows > MAX_DEMO_PAYMENT_ROWS) {
        throw new Error(`Rows count must be between 1 and ${MAX_DEMO_PAYMENT_ROWS}`)
    }
    const range = parseRange(firstDate, lastDate)

    return spreadTimestamps(rows, range.start, range.end, rng).map((at) => {
        const tokens = PRESET_CREDITS[Math.floor(rng() * PRESET_CREDITS.length)]
        const [year, month, day] = formatDate(at).split('-')
        return {
            id: demoPaymentId(rng),
            date: `${day}.${month}.${year}`,
            tokens,
            amountCents: tokens * CENTS_PER_CREDIT,
            currency: CREDIT_CURRENCY,
            status: 'Successful' as const,
        }
    })
}
