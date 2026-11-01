import { Prisma, type PrismaClient } from '../../../src/generated/prisma/client'
import { planDemoProfiles, type GeneratedDemoIdentity } from './demo-users.service'

export async function seedShowcaseUsers(db: PrismaClient, input: { identities: GeneratedDemoIdentity[]; seed: string; dryRun: boolean }) {
    const existing = await db.user.findMany({ where: { provider: 'demo' }, include: { demoProfile: true, _count: { select: { payments: true, leaguesOwned: true } } }, orderBy: { id: 'asc' } })
    const plan = planDemoProfiles(input.identities, existing.map(u => ({ id: u.id, email: u.email, provider: u.provider, role: u._count.leaguesOwned > 0 ? 'COMMISSIONER' : u.role, paymentCount: u._count.payments, demoKey: u.demoProfile?.demoKey ?? null })), input.seed)
    const summary = { target: plan.rows.length, update: plan.rows.filter(r => r.existingUserId).length, create: plan.rows.filter(r => !r.existingUserId).length, protected: plan.skippedIds.length, dryRun: input.dryRun }
    if (input.dryRun) return summary
    for (let start = 0; start < plan.rows.length; start += 500) {
        await db.$transaction(async tx => {
            const batch = plan.rows.slice(start, start + 500)
            const oldRows = batch.filter(row => row.existingUserId !== null)
            const oldIds = oldRows.map(row => row.existingUserId!)
            if (oldIds.length) {
                const locked = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
                    SELECT u.id FROM "User" u WHERE u.id IN (${Prisma.join(oldIds)}) AND u.provider = 'demo' AND u.role = 'USER'
                    AND (u.email LIKE '%@managers.local' OR u.email LIKE '%@managers.invalid')
                    AND NOT EXISTS (SELECT 1 FROM "Payment" p WHERE p."userId" = u.id)
                    AND NOT EXISTS (SELECT 1 FROM "League" l WHERE l."commissionerId" = u.id) FOR UPDATE`)
                if (locked.length !== oldIds.length) throw new Error('A demo account is no longer eligible; no changes in this batch were applied')
                await tx.$executeRaw`UPDATE "User" u SET name=r.name, username=r.username, image=r.image, "passwordHash"=NULL, "updatedAt"=now()
                    FROM jsonb_to_recordset(${JSON.stringify(oldRows.map(row => ({ id: row.existingUserId, name: row.name, username: row.username, image: row.image })))}::jsonb)
                    AS r(id text, name text, username text, image text) WHERE u.id=r.id`
            }
            const newRows = batch.filter(row => row.existingUserId === null)
            const created = newRows.length ? await tx.user.createManyAndReturn({ data: newRows.map(row => ({ name: row.name, username: row.username, image: row.image, email: row.email, provider: 'demo', emailVerified: true, passwordHash: null })), select: { id: true, email: true } }) : []
            const createdByEmail = new Map(created.map(user => [user.email, user.id]))
            const profiles = batch.map(row => ({ userId: row.existingUserId ?? createdByEmail.get(row.email), demoKey: row.demoKey, countryCode: row.countryCode, favoriteTeamId: row.favoriteTeamId, strategy: row.strategy, datasetSeed: input.seed, ordinal: row.ordinal }))
            if (profiles.some(profile => !profile.userId)) throw new Error('Unable to resolve a generated demo account')
            await tx.$executeRaw`INSERT INTO "DemoProfile" ("userId", "demoKey", "countryCode", "favoriteTeamId", strategy, "datasetSeed", ordinal)
                SELECT r."userId", r."demoKey", r."countryCode", r."favoriteTeamId", r.strategy, r."datasetSeed", r.ordinal
                FROM jsonb_to_recordset(${JSON.stringify(profiles)}::jsonb) AS r("userId" text, "demoKey" text, "countryCode" text, "favoriteTeamId" integer, strategy text, "datasetSeed" text, ordinal integer)
                ON CONFLICT ("userId") DO UPDATE SET "countryCode"=EXCLUDED."countryCode", "favoriteTeamId"=EXCLUDED."favoriteTeamId", strategy=EXCLUDED.strategy`
            if (oldIds.length) {
                await tx.account.deleteMany({ where: { userId: { in: oldIds } } })
                await tx.session.deleteMany({ where: { userId: { in: oldIds } } })
            }
        }, { timeout: 30000 })
    }
    return summary
}
