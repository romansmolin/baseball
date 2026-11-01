import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { seedShowcaseHistory } from '../server/services/showcase/showcase-history.service'
const prisma = createShowcaseCliDb()
const args = process.argv.slice(2)
const value = (key: string, fallback: string) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
seedShowcaseHistory(prisma, { days: Number(value('--days', '30')), participantsPerDay: Number(value('--participants', '1500')), seed: value('--seed', 'baseball-showcase-v1'), dryRun: !args.includes('--apply') || args.includes('--dry-run') })
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error instanceof Error ? error.message : 'History import failed'); process.exitCode = 1 })
    .finally(() => prisma.$disconnect())
