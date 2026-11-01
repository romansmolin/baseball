import { randomUUID } from 'node:crypto'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../../../src/generated/prisma/client'
import { describe, expect, it } from 'vitest'
import { seedShowcaseUsers } from './demo-users.repository'

describe.skipIf(!process.env.TEST_DATABASE_URL)('demo import on PostgreSQL', () => {
    it('preserves existing IDs and relations while writing profiles in batches', async () => {
        const queries: string[] = []
        const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL }), log: [{ emit: 'event', level: 'query' }] })
        db.$on('query', event => queries.push(event.query))
        const suffix = randomUUID()
        const legacy = await db.user.create({ data: { email: `${suffix}@managers.local`, name: 'Legacy', provider: 'demo' } })
        const team = await db.fantasyTeam.create({ data: { userId: legacy.id, name: 'Preserved', leagueSlug: 'mlb' } })
        const identities = Array.from({ length: 3 }, (_, i) => ({ name: { first: 'Alex', last: `Manager${i}` }, nat: 'US' }))
        try {
            queries.length = 0
            const result = await seedShowcaseUsers(db, { identities, seed: suffix, dryRun: false })
            expect(result).toMatchObject({ update: 1, create: 2 })
            expect(queries.length).toBeLessThanOrEqual(10)
            expect((await db.fantasyTeam.findUniqueOrThrow({ where: { id: team.id } })).userId).toBe(legacy.id)
            const first = await db.demoProfile.findMany({ where: { datasetSeed: suffix }, select: { userId: true }, orderBy: { ordinal: 'asc' } })
            expect(first[0].userId).toBe(legacy.id)
            await seedShowcaseUsers(db, { identities, seed: suffix, dryRun: false })
            expect(await db.demoProfile.findMany({ where: { datasetSeed: suffix }, select: { userId: true }, orderBy: { ordinal: 'asc' } })).toEqual(first)
        } finally {
            const ids = (await db.demoProfile.findMany({ where: { datasetSeed: suffix }, select: { userId: true } })).map(row => row.userId)
            await db.fantasyTeam.deleteMany({ where: { id: team.id } })
            await db.demoProfile.deleteMany({ where: { userId: { in: ids } } })
            await db.user.deleteMany({ where: { id: { in: [...ids, legacy.id] } } })
            await db.$disconnect()
        }
    })
})
