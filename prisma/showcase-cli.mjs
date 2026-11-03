import { createJiti } from 'jiti'
import { fileURLToPath } from 'node:url'
const scripts = new Set(['seed-showcase-users', 'seed-showcase-history', 'seed-showcase-season', 'promote-season-showcase-to-live', 'tick-showcase', 'prepare-showcase-archive', 'retire-open-replays', 'rename-generic-contests'])
const name = process.argv[2]
if (!scripts.has(name)) throw new Error('Unknown showcase command')
process.argv.splice(2, 1)
const jiti = createJiti(import.meta.url, { alias: { '@': fileURLToPath(new URL('../src', import.meta.url)) } })
await jiti.import(`./${name}.ts`)
