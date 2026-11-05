import type { PrismaClient } from '../../../src/generated/prisma/client'
import { demoTeamName } from './demo-simulation'

const GENERATED_NAME = '^(Ace|Wild|Diamond) [^ ]+$'
const CHUNK = 1000

/** Replaces machine-looking names of earlier demo entries ("Ace 26-10-28") with each manager's club name. */
export async function renameDemoTeams(db: PrismaClient, input: { dryRun: boolean }) {
    const [{ count }] = await db.$queryRaw<{ count: bigint }[]>`SELECT COUNT(*) AS count FROM "DailyEntry" e JOIN "DemoProfile" d ON d."userId" = e."userId" WHERE e."teamName" ~ ${GENERATED_NAME}`
    if (input.dryRun) return { candidates: Number(count), renamed: 0 }

    const profiles = await db.demoProfile.findMany({ select: { userId: true, demoKey: true }, orderBy: { userId: 'asc' } })
    let renamed = 0
    for (let start = 0; start < profiles.length; start += CHUNK) {
        const chunk = profiles.slice(start, start + CHUNK)
        renamed += await db.$executeRaw`
            UPDATE "DailyEntry" e SET "teamName" = n.name
            FROM unnest(${chunk.map(row => row.userId)}::text[], ${chunk.map(row => demoTeamName(row.demoKey))}::text[]) AS n("userId", name)
            WHERE e."userId" = n."userId" AND e."teamName" ~ ${GENERATED_NAME}`
    }
    return { candidates: Number(count), renamed }
}
