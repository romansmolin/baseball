import { createHash } from 'node:crypto'
import { z } from 'zod'

const identitySchema = z.object({ name: z.object({ first: z.string().min(1), last: z.string().min(1) }), nat: z.string().regex(/^[A-Z]{2}$/) })
export type GeneratedDemoIdentity = z.infer<typeof identitySchema>
export interface ExistingDemoUser { id: string; provider: string | null; role: string; email: string; paymentCount: number; demoKey: string | null }
export interface DemoProfilePlanRow { existingUserId: string | null; demoKey: string; ordinal: number; name: string; username: string; email: string; image: string; countryCode: string; strategy: string; favoriteTeamId: number }
const TEAM_IDS = [147, 111, 119, 121, 143, 110, 112, 138, 135, 137, 141, 140]

export async function fetchRandomUsers(input: { seed: string; page: number; results: number }, fetcher: (url: string) => Promise<Response> = url => fetch(url, { signal: AbortSignal.timeout(30000) }), sleep: (ms: number) => Promise<void> = ms => new Promise(resolve => setTimeout(resolve, ms))): Promise<GeneratedDemoIdentity[]> {
    if (!Number.isInteger(input.results) || input.results < 1 || input.results > 5000 || !Number.isInteger(input.page) || input.page < 1) throw new Error('Invalid RandomUser batch')
    const query = new URLSearchParams({ seed: input.seed, page: String(input.page), results: String(input.results), inc: 'name,nat', nat: 'us,ca,gb,de,fr,nl,es,fi,dk,no,ie,ch' })
    let response: Response | undefined
    for (let attempt = 0; attempt < 4; attempt++) {
        response = await fetcher(`https://randomuser.me/api/1.4/?${query}`)
        if (response.status !== 429 && response.status < 500) break
        if (attempt === 3) break
        const retryAfter = response.headers.get('retry-after')
        const seconds = retryAfter && /^\d+$/.test(retryAfter) ? Number(retryAfter) * 1000 : retryAfter ? Date.parse(retryAfter) - Date.now() : NaN
        const wait = Number.isFinite(seconds) ? Math.max(0, seconds) : response.status === 429 ? 60000 : 1000 * 2 ** attempt
        if (wait > 60000) throw new Error(`RandomUser rate limited; retry after ${retryAfter}`)
        await sleep(wait)
    }
    if (!response) throw new Error('RandomUser returned no response')
    if (!response.ok) throw new Error(`RandomUser HTTP ${response.status}`)
    const result = z.object({ results: z.array(identitySchema) }).parse(await response.json())
    if (result.results.length !== input.results) throw new Error('RandomUser batch count mismatch')
    return result.results
}

export function planDemoProfiles(identities: GeneratedDemoIdentity[], existing: ExistingDemoUser[], seed: string): { rows: DemoProfilePlanRow[]; skippedIds: string[] } {
    const safe = existing.filter(u => u.provider === 'demo' && u.role === 'USER' && u.paymentCount === 0 && /@(managers\.local|managers\.invalid)$/.test(u.email))
    const safeIds = new Set(safe.map(user => user.id))
    const keyed = new Map(safe.filter(u => u.demoKey).map(u => [u.demoKey, u]))
    const legacy = safe.filter(u => !u.demoKey)
    let legacyIndex = 0
    const prefix = createHash('sha256').update(seed).digest('hex').slice(0, 12)
    return {
        rows: identities.map((identity, ordinal) => {
            const demoKey = `${prefix}-${ordinal}`
            const user = keyed.get(demoKey) ?? legacy[legacyIndex++]
            const name = `${identity.name.first} ${identity.name.last}`
            const slug = name.normalize('NFKD').replace(/[^a-zA-Z0-9]/g, '').slice(0, 20).toLowerCase() || 'manager'
            return { existingUserId: user?.id ?? null, demoKey, ordinal, name, username: `${slug}_${prefix.slice(0, 6)}_${ordinal}`, email: `demo-${demoKey}@managers.invalid`, image: `/api/avatars/${demoKey}`, countryCode: identity.nat, strategy: ['BALANCED', 'PITCHING', 'RISKY'][ordinal % 3], favoriteTeamId: TEAM_IDS[ordinal % TEAM_IDS.length] }
        }),
        skippedIds: existing.filter(u => !safeIds.has(u.id)).map(u => u.id),
    }
}
