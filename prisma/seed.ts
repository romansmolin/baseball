import 'dotenv/config'

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { resolveDatabaseUrl } from '../server/lib/database-url'

const adapter = new PrismaPg({ connectionString: resolveDatabaseUrl() })
const prisma = new PrismaClient({ adapter, log: ['error'] })

const STARTING_BALANCE = 1420

async function main() {
    await wipeLegacyDemoUsers()
    await seedAIFeatures()
    await grantRealUserStartingCredits()
}

// Contest-era demo accounts (@seed.local competitors and bulk 'demo' users) are
// removed. Their ledger rows go with them — CreditTransaction and AIUsageLog
// have no cascade from User, so they must be deleted first or the FK blocks it.
async function wipeLegacyDemoUsers(): Promise<void> {
    console.log('--- Legacy demo users ---')
    const demoUsers = { OR: [{ email: { endsWith: '@seed.local' } }, { provider: 'demo' }] }
    await prisma.creditTransaction.deleteMany({ where: { user: demoUsers } })
    await prisma.aIUsageLog.deleteMany({ where: { user: demoUsers } })
    const removed = await prisma.user.deleteMany({ where: demoUsers })
    console.log(`  - Removed ${removed.count} legacy demo user(s)`)
}

async function seedAIFeatures(): Promise<void> {
    console.log('--- AI features ---')
    const features = [
        {
            key: 'player_analysis',
            name: 'Player Analysis',
            costCredits: 10,
            modelName: process.env.OPENAI_API_MODEL_DEFAULT ?? 'gpt-5.3',
            description:
                'Deep dive on form, matchup, and fantasy outlook',
        },
        {
            key: 'trade_advisor',
            name: 'Trade Advisor',
            costCredits: 15,
            modelName:
                process.env.OPENAI_API_MODEL_COMPLEX_REASONING ?? 'gpt-5.4',
            description:
                'Evaluates proposed trades in season-long leagues',
        },
        {
            key: 'game_picks',
            name: 'Game Picks',
            costCredits: 20,
            modelName:
                process.env.OPENAI_API_MODEL_COMPLEX_REASONING ?? 'gpt-5.4',
            description:
                'Which players to start, sit or watch for one upcoming game',
        },
        {
            key: 'team_builder_autofill',
            name: 'Team Builder Autofill',
            costCredits: 3,
            modelName: process.env.OPENAI_API_MODEL_CHEAP ?? 'gpt-5.2',
            description:
                'AI-suggested picks to fill the team-builder lineup',
        },
    ]
    for (const f of features) {
        // The AIFeature schema has no `name` or `description` field, so we
        // upsert only the columns it actually has — the extras stay in this
        // seed for documentation purposes.
        await prisma.aIFeature.upsert({
            where: { key: f.key },
            update: { costCredits: f.costCredits, modelName: f.modelName },
            create: {
                key: f.key,
                costCredits: f.costCredits,
                modelName: f.modelName,
            },
        })
    }
    console.log(`  + Upserted ${features.length} AIFeature rows`)

    // Retired features: usage logs reference the rows, so they are deactivated, not deleted.
    await prisma.aIFeature.updateMany({
        where: { key: { in: ['lineup_optimizer', 'matchup_predictor'] } },
        data: { isActive: false },
    })
}

async function grantRealUserStartingCredits(): Promise<void> {
    console.log('--- Starting credits ---')
    const realUsers = await prisma.user.findMany({
        where: {
        },
        select: { id: true, email: true },
    })
    let granted = 0
    for (const user of realUsers) {
        const existing = await prisma.creditTransaction.findFirst({
            where: { userId: user.id },
            select: { id: true },
        })
        if (existing) continue
        await prisma.creditTransaction.create({
            data: {
                userId: user.id,
                amount: STARTING_BALANCE,
                balanceAfter: STARTING_BALANCE,
                type: 'ADMIN_GRANT',
                status: 'COMPLETED',
                referenceType: 'seed:starting_balance',
            },
        })
        granted++
    }
    console.log(
        `  + Granted ${STARTING_BALANCE} credits to ${granted}/${realUsers.length} real user(s) (skipped any with existing ledger rows)`,
    )
}


main()
    .catch((error) => {
        console.error('Seed failed:', error)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
