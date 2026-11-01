import type { PrismaClient } from '../../../src/generated/prisma/client'
import { planDemoProfiles, type GeneratedDemoIdentity } from './demo-users.service'

export async function seedShowcaseUsers(db: PrismaClient, input: { identities: GeneratedDemoIdentity[]; seed: string; dryRun: boolean }) {
    const existing = await db.user.findMany({ where: { provider: 'demo' }, include: { demoProfile: true, _count: { select: { payments: true, leaguesOwned: true } } }, orderBy: { id: 'asc' } })
    const plan = planDemoProfiles(input.identities, existing.map(u => ({ id: u.id, email: u.email, provider: u.provider, role: u._count.leaguesOwned > 0 ? 'COMMISSIONER' : u.role, paymentCount: u._count.payments, demoKey: u.demoProfile?.demoKey ?? null })), input.seed)
    const summary = { target: plan.rows.length, update: plan.rows.filter(r => r.existingUserId).length, create: plan.rows.filter(r => !r.existingUserId).length, protected: plan.skippedIds.length, dryRun: input.dryRun }
    if (input.dryRun) return summary
    for (let start = 0; start < plan.rows.length; start += 100) {
        await db.$transaction(async tx => {
            for (const row of plan.rows.slice(start, start + 100)) {
                const data = { name: row.name, username: row.username, image: row.image, passwordHash: null }
                const user = row.existingUserId
                    ? await tx.user.update({ where: { id: row.existingUserId }, data })
                    : await tx.user.create({ data: { ...data, email: row.email, provider: 'demo', emailVerified: true } })
                await tx.demoProfile.upsert({ where: { userId: user.id }, create: { userId: user.id, demoKey: row.demoKey, countryCode: row.countryCode, favoriteTeamId: row.favoriteTeamId, strategy: row.strategy, datasetSeed: input.seed, ordinal: row.ordinal }, update: { countryCode: row.countryCode, favoriteTeamId: row.favoriteTeamId, strategy: row.strategy } })
                await tx.account.deleteMany({ where: { userId: user.id } })
                await tx.session.deleteMany({ where: { userId: user.id } })
            }
        }, { timeout: 30000 })
    }
    return summary
}
