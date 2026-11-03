import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { seedSeasonHistory } from '../server/services/showcase/seed-season-history.service'

const prisma = createShowcaseCliDb()
const args = process.argv.slice(2)
const value = (key: string, fallback: string) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback

const apply = args.includes('--apply') && !args.includes('--dry-run')
const season = Number(value('--season', String(new Date().getUTCFullYear())))
const days = Number(value('--days', '30'))
const participantsPerDay = Number(value('--participants', '1500'))
const seed = value('--seed', 'baseball-showcase-v1')

seedSeasonHistory(prisma, { season, days, participantsPerDay, seed, dryRun: !apply })
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => {
        console.error(error instanceof Error ? error.message : 'Season history seed failed')
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
