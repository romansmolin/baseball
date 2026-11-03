import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { retireOpenReplays } from '../server/services/showcase/retire-open-replays'

const prisma = createShowcaseCliDb()
const dryRun = process.argv.includes('--dry-run')
retireOpenReplays(prisma, { dryRun, now: new Date() })
    .then(result => console.log(JSON.stringify(result)))
    .catch(error => { console.error(error instanceof Error ? error.message : 'Replay retirement failed'); process.exitCode = 1 })
    .finally(() => prisma.$disconnect())
