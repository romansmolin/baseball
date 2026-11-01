import 'dotenv/config'
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join } from 'node:path'
import { createShowcaseCliDb } from '../server/services/showcase/showcase-cli-db'
import { fetchRandomUsers, type GeneratedDemoIdentity } from '../server/services/demo-users/demo-users.service'
import { seedShowcaseUsers } from '../server/services/demo-users/demo-users.repository'
const prisma = createShowcaseCliDb()

async function main() {
    const args = process.argv.slice(2)
    const value = (key: string, fallback: string) => args.includes(key) ? args[args.indexOf(key) + 1] : fallback
    const target = Number(value('--profiles', args.find(a => /^\d+$/.test(a)) ?? '30000'))
    const seed = value('--seed', 'baseball-showcase-v1')
    if (!Number.isInteger(target) || target < 1 || target > 100000) throw new Error('--profiles must be 1..100000')
    const apply = args.includes('--apply') && !args.includes('--dry-run')
    const dir = join(process.cwd(), '.showcase-data')
    await mkdir(dir, { recursive: true })
    const path = join(dir, `profiles-${createHash('sha256').update(`${seed}:${target}`).digest('hex').slice(0, 16)}.json`)
    let identities: GeneratedDemoIdentity[]
    try {
        const manifest = JSON.parse(await readFile(path, 'utf8'))
        if (manifest.seed !== seed || manifest.count !== target || manifest.version !== '1.4' || manifest.identities.length !== target) throw new Error('Invalid saved profile manifest')
        identities = manifest.identities
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        identities = []
        const batchPrefix = createHash('sha256').update(seed).digest('hex').slice(0, 16)
        for (let page = 1; identities.length < target; page++) {
            const batchPath = join(dir, `randomuser-1.4-${batchPrefix}-5000-${page}.json`)
            let batch: GeneratedDemoIdentity[]
            try {
                batch = JSON.parse(await readFile(batchPath, 'utf8'))
                if (!Array.isArray(batch) || batch.length !== 5000 || batch.some(r => !r?.name?.first || !r?.name?.last || !/^[A-Z]{2}$/.test(r.nat))) throw new Error('Invalid cached RandomUser page')
            } catch (error) {
                if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
                if (page > 1) await new Promise(resolve => setTimeout(resolve, 16000))
                batch = await fetchRandomUsers({ seed, page, results: 5000 })
                await writeFile(`${batchPath}.tmp`, JSON.stringify(batch), { mode: 0o600 })
                await rename(`${batchPath}.tmp`, batchPath)
            }
            identities.push(...batch.slice(0, target - identities.length))
        }
        await writeFile(`${path}.tmp`, JSON.stringify({ seed, count: target, version: '1.4', identities }), { mode: 0o600 })
        await rename(`${path}.tmp`, path)
    }
    console.log(JSON.stringify(await seedShowcaseUsers(prisma, { identities, seed, dryRun: !apply })))
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Import failed'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
