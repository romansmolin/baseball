// Tiny structured logger for the AI subsystem.
//
// Off by default in tests (NODE_ENV === 'test') to keep test output clean.
// Otherwise on, unless AI_DEBUG=0 explicitly silences it. Prints one line per
// event, prefixed with "[ai]" so grepping the dev server log is trivial.
//
// SECURITY: never call this with full prompts, full instructions, full input,
// or full model responses — those may contain user data. Pass lengths and
// structural facts instead. The redactor below is a safety net, not a license
// to log prompts.

const SENSITIVE_KEYS = new Set([
    'apiKey',
    'authorization',
    'prompt',
    'instructions',
    'input',
    'output',
    'output_text',
    'rawText',
    'body',
])

function redact(value: unknown): unknown {
    if (value === null || typeof value !== 'object') return value
    if (Array.isArray(value)) return value.map(redact)
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        if (SENSITIVE_KEYS.has(k)) {
            const len = typeof v === 'string' ? v.length : undefined
            out[k] = len !== undefined ? `[redacted:${len}c]` : '[redacted]'
        } else {
            out[k] = redact(v)
        }
    }
    return out
}

function enabled(): boolean {
    if (process.env.NODE_ENV === 'test') return false
    return process.env.AI_DEBUG !== '0'
}

export function aiLog(event: string, data?: Record<string, unknown>): void {
    if (!enabled()) return
    const payload = data ? JSON.stringify(redact(data)) : ''
    // eslint-disable-next-line no-console
    console.log(`[ai] ${event}${payload ? ' ' + payload : ''}`)
}

export function aiLogError(event: string, error: unknown, extra?: Record<string, unknown>): void {
    if (!enabled()) return
    const errInfo =
        error instanceof Error
            ? { name: error.name, message: error.message }
            : { value: String(error) }
    const redactedExtra = extra
        ? (redact(extra) as Record<string, unknown>)
        : {}
    // eslint-disable-next-line no-console
    console.error(
        `[ai] ${event} ${JSON.stringify({ ...errInfo, ...redactedExtra })}`,
    )
}
