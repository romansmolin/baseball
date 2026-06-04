// Verifies the Authorization: Bearer ${CRON_SECRET} header that Vercel's cron
// runner attaches automatically when CRON_SECRET is configured in project env.
// Returning false → route should reply 401. The same routes can also be hit
// from `curl` locally with the same header.

export function isAuthorizedCron(request: Request): boolean {
    const expected = process.env.CRON_SECRET
    if (!expected) return false

    const auth = request.headers.get('authorization') ?? ''
    if (!auth.startsWith('Bearer ')) return false
    const token = auth.slice('Bearer '.length).trim()
    return token === expected
}
