// Bulk demo-user generator. Separate from `prisma/seed.ts` so a routine
// `db:seed` never wipes or recreates these 20k rows.
//
//   npx jiti prisma/seed-users.ts            # 20000 (default)
//   npx jiti prisma/seed-users.ts 5000       # custom count
//   npm run db:seed-users -- 20000
//
// Creates bare, login-able accounts (email `demo-<n>@managers.local`, shared
// password `demo1234`, username `demo<n>`) plus one starting-credit ledger
// row each. They are NOT enrolled in any tournament, so scoring / standings
// cost is unaffected — this is padding for headline counts and activity feeds.

import 'dotenv/config'

import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import {
    CreditTransactionStatus,
    CreditTransactionType,
} from '../src/generated/prisma/enums'
import { hashPassword } from '../server/shared/crypto.utils'

const DOMAIN = '@managers.local'
const PROVIDER = 'demo'
const CHUNK = 5000
const STARTING_BALANCE = 1000
const DEFAULT_COUNT = 20_000
const SHARED_PASSWORD = 'demo1234'

const FIRST_NAMES = [
    'James', 'Marcus', 'David', 'Daniel', 'Carlos', 'Tyler', 'Brandon', 'Jordan',
    'Ethan', 'Lucas', 'Mason', 'Logan', 'Diego', 'Victor', 'Isaac', 'Noah',
    'Owen', 'Caleb', 'Hunter', 'Cole', 'Trevor', 'Aaron', 'Kevin', 'Sean',
    'Patrick', 'Ryan', 'Andre', 'Nathan', 'Miguel', 'Tobias', 'Julian', 'Elias',
    'Gabriel', 'Adrian', 'Xavier', 'Dominic', 'Emmett', 'Bennett', 'Wesley', 'Roman',
]

const LAST_NAMES = [
    'Mitchell', 'Carter', 'Bennett', 'Sullivan', 'Brooks', 'Reyes', 'Foster',
    'Hayes', 'Coleman', 'Parker', 'Morgan', 'Russell', 'Griffin', 'Hudson',
    'Porter', 'Spencer', 'Wallace', 'Bryant', 'Fleming', 'Hoffman', 'Ramsey',
    'Delgado', 'Knight', 'Vaughn', 'Maddox', 'Sutton', 'Barrett', 'Crawford',
    'Donovan', 'Mercer', 'Callahan', 'Whitaker', 'Osborne', 'Pearson', 'Lambert',
    'Rhodes', 'Cross', 'Nash', 'Hale', 'Bishop',
]

function displayName(n: number): string {
    const first = FIRST_NAMES[n % FIRST_NAMES.length]
    const last = LAST_NAMES[Math.floor(n / FIRST_NAMES.length) % LAST_NAMES.length]
    return `${first} ${last}`
}

async function main(): Promise<void> {
    const count = Math.max(1, Math.trunc(Number(process.argv[2] ?? DEFAULT_COUNT)))
    if (!Number.isFinite(count)) {
        console.error('Usage: jiti prisma/seed-users.ts <count>')
        process.exit(1)
    }

    const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
    const prisma = new PrismaClient({ adapter, log: ['error'] })

    const startedAt = Date.now()
    console.log(`Seeding ${count} demo users (${DOMAIN})…`)

    // Wipe any previous demo users first (relation filters — no id list to
    // blow past the parameter limit). Ledger rows go first: CreditTransaction
    // has no cascade from User.
    const wipedCredits = await prisma.creditTransaction.deleteMany({
        where: { user: { email: { endsWith: DOMAIN } } },
    })
    const wipedUsers = await prisma.user.deleteMany({
        where: { email: { endsWith: DOMAIN } },
    })
    if (wipedUsers.count > 0) {
        console.log(
            `  - Wiped ${wipedUsers.count} prior demo user(s), ${wipedCredits.count} ledger row(s)`,
        )
    }

    // One hash for everyone — hashing 20k distinct passwords would be ~25 min
    // of scrypt. Every demo account shares the password `demo1234`.
    const passwordHash = await hashPassword(SHARED_PASSWORD)

    let usersCreated = 0
    let creditsCreated = 0

    for (let start = 0; start < count; start += CHUNK) {
        const end = Math.min(start + CHUNK, count)

        const userRows = []
        for (let n = start; n < end; n += 1) {
            userRows.push({
                email: `demo-${n}${DOMAIN}`,
                name: displayName(n),
                username: `demo${n}`,
                emailVerified: true,
                passwordHash,
                provider: PROVIDER,
            })
        }

        const created = await prisma.user.createManyAndReturn({
            data: userRows,
            select: { id: true },
        })
        usersCreated += created.length

        if (STARTING_BALANCE > 0) {
            const grant = await prisma.creditTransaction.createMany({
                data: created.map((u) => ({
                    userId: u.id,
                    amount: STARTING_BALANCE,
                    balanceAfter: STARTING_BALANCE,
                    type: CreditTransactionType.ADMIN_GRANT,
                    status: CreditTransactionStatus.COMPLETED,
                    referenceType: 'seed:demo_user',
                })),
            })
            creditsCreated += grant.count
        }

        console.log(`  + ${end}/${count} users`)
    }

    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1)
    console.log(
        `Done — ${usersCreated} users, ${creditsCreated} credit grant(s) in ${seconds}s.`,
    )
    console.log(`  login: demo-<n>${DOMAIN} / ${SHARED_PASSWORD}`)

    await prisma.$disconnect()
}

main().catch((error) => {
    console.error('seed-users failed:', error)
    process.exit(1)
})
