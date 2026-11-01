import 'dotenv/config'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { tickShowcase } from '../server/services/showcase/showcase-runner'
const prisma = createShowcaseCliDb()
tickShowcase(prisma).then(result => console.log(JSON.stringify(result))).catch(error => { console.error(error instanceof Error ? error.message : 'Showcase tick failed'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
