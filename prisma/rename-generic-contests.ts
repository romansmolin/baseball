import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { renameGenericContests } from '../server/services/showcase/rename-generic-contests'

const prisma = createShowcaseCliDb()
const dryRun = !process.argv.includes('--apply')
renameGenericContests(prisma, { dryRun, now: new Date() })
    .then(result => console.log(JSON.stringify({ ...result, dryRun })))
    .catch(error => { console.error(error instanceof Error ? error.message : 'Contest renaming failed'); process.exitCode = 1 })
    .finally(() => prisma.$disconnect())
