import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { renameDemoTeams } from '../server/services/showcase/rename-demo-teams'

const prisma = createShowcaseCliDb()
const dryRun = !process.argv.includes('--apply')
renameDemoTeams(prisma, { dryRun })
    .then(result => console.log(JSON.stringify({ ...result, dryRun })))
    .catch(error => { console.error(error instanceof Error ? error.message : 'Team renaming failed'); process.exitCode = 1 })
    .finally(() => prisma.$disconnect())
