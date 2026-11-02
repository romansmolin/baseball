import { afterAll, describe, expect, it } from 'vitest'
import { GameSnapshotsRepository } from '../../../repositories/game-snapshots/game-snapshots.repository'
import { createTestDb } from './test-db'
import { box } from './fixtures'

describe.skipIf(!process.env.TEST_DATABASE_URL)('shared game snapshots', () => {
    const db = process.env.TEST_DATABASE_URL ? createTestDb() : null!
    const gamePk = 1905000501
    const permit = { assertInTransaction: async () => {} }
    afterAll(async () => { await db.dailyGameSnapshot.deleteMany({ where: { gamePk } }); await db.$disconnect() })

    it('keeps one snapshot per game and refuses older or incomplete overwrites', async () => {
        const repository = new GameSnapshotsRepository(db)
        const observedAt = new Date('2026-11-01T20:00:00Z')
        const complete = { gamePk, leagueSlug: 'winter-leagues', status: 'FINAL', boxScore: { ...box, gamePk }, complete: true, observedAt }
        await repository.save(complete, permit)
        await repository.save({ ...complete, status: 'LIVE', complete: false, boxScore: null, observedAt: new Date('2026-11-01T19:00:00Z') }, permit)
        await repository.save({ ...complete, status: 'FINAL', complete: false, boxScore: null, observedAt: new Date('2026-11-01T21:00:00Z') }, permit)
        const rows = await repository.findMany([gamePk])
        expect(rows).toHaveLength(1)
        expect(rows[0]).toMatchObject({ gamePk, status: 'FINAL', complete: true, observedAt, boxScore: complete.boxScore })
    })

    it('does not write when the worker permit is lost', async () => {
        const repository = new GameSnapshotsRepository(db)
        await repository.save({ gamePk, leagueSlug: 'winter-leagues', status: 'FINAL', complete: true, boxScore: { ...box, gamePk }, observedAt: new Date('2026-11-01T20:00:00Z') }, permit)
        await expect(repository.save({ gamePk, leagueSlug: 'winter-leagues', status: 'FINAL', complete: true, boxScore: box, observedAt: new Date('2026-11-02') }, { assertInTransaction: async () => { throw new Error('Lease lost') } })).rejects.toThrow('Lease lost')
        const [row] = await repository.findMany([gamePk])
        expect(row.observedAt.toISOString()).toBe('2026-11-01T20:00:00.000Z')
    })

    it('retains earlier partial statistics when the next fetch has no box score', async () => {
        const repository = new GameSnapshotsRepository(db)
        const otherGame = gamePk + 1
        try {
            const partial = { ...box, gamePk: otherGame, status: 'LIVE' as const }
            await repository.save({ gamePk: otherGame, leagueSlug: 'winter-leagues', status: 'LIVE', complete: false, boxScore: partial, observedAt: new Date('2026-11-01T20:00:00Z') }, permit)
            await repository.save({ gamePk: otherGame, leagueSlug: 'winter-leagues', status: 'FINAL', complete: false, boxScore: null, observedAt: new Date('2026-11-01T21:00:00Z') }, permit)
            const [saved] = await repository.findMany([otherGame])
            expect(saved).toMatchObject({ status: 'FINAL', complete: false, boxScore: partial })
        } finally { await db.dailyGameSnapshot.deleteMany({ where: { gamePk: otherGame } }) }
    })
})
