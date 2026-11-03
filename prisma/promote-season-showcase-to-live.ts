import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { promoteSeasonShowcaseToLive } from '../server/services/showcase/promote-season-showcase-to-live.service'

const prisma = createShowcaseCliDb()
const args = process.argv.slice(2)
const value = (key: string, fallback: string) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
const season = Number(value('--season', String(new Date().getUTCFullYear())))
const apply = args.includes('--apply') && !args.includes('--dry-run')

promoteSeasonShowcaseToLive(prisma, { season, dryRun: !apply })
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => {
        console.error(error instanceof Error ? error.message : 'Season promotion failed')
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
