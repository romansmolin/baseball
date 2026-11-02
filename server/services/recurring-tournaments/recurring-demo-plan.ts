import { createHash } from 'node:crypto'
import { chooseDemoLineup } from '../showcase/demo-simulation'
import type { RecurringLineupInput, RecurringTournamentContext } from './recurring.types'

export interface DemoIdentity { userId: string; demoKey: string; strategy: string }
export interface ScheduledDemoEntry { userId: string; sourceKey: string; scheduledAt: Date; lineup: RecurringLineupInput; teamName: string }

const places = ['Harbor', 'Golden', 'Northside', 'Brookside', 'Cedar', 'Riverside', 'Silver', 'Westside', 'Eastside', 'Oakland', 'Mountain', 'Pinewood', 'Maple', 'Lakeside', 'Summit', 'Broadway', 'Bridgeport', 'Eastwood', 'Canyon', 'Hilltop', 'Sunset', 'Prairie', 'Bayview', 'Copper', 'Blue Ridge', 'Grandview', 'Fairview', 'Seaside', 'Woodland', 'Highland', 'Kingsway', 'Redwood', 'Northstar', 'Stonebridge', 'Riverbend', 'Southside', 'Parkview', 'Elmwood', 'Meadow', 'Clearwater']
const mascots = ['Hawks', 'Rockets', 'Pilots', 'Falcons', 'Bears', 'Wolves', 'Foxes', 'Comets', 'Mustangs', 'Tigers', 'Knights', 'Eagles', 'Ravens', 'Royals', 'Owls', 'Bulls', 'Sparks', 'Sailors', 'Titans', 'Stars', 'Pioneers', 'Storm', 'Giants', 'Sharks', 'Hurricanes', 'Lions', 'Wildcats', 'Rangers', 'Badgers', 'Dragons', 'Panthers', 'Firebirds', 'Coyotes', 'Mariners', 'Vipers', 'Meteors', 'Thunder', 'Rhinos', 'Hornets', 'Chargers']
const hash32 = (value: string) => createHash('sha256').update(value).digest().readUInt32BE(0)

export function planRecurringDemoEntries(context: RecurringTournamentContext, profiles: DemoIdentity[], seed: string, registrationStart: Date): ScheduledDemoEntry[] {
    if (!Number.isInteger(context.demoTarget) || context.demoTarget < 400 || context.demoTarget > 900) throw new Error('Invalid demo target')
    const start = registrationStart.getTime(), end = context.window.startsAt.getTime()
    if (!Number.isFinite(start) || !Number.isFinite(end) || start >= end) throw new Error('Invalid demo registration period')
    if (!profiles.length) return []
    const count = Math.min(context.demoTarget, profiles.length)
    const first = hash32(`${seed}:${context.leagueId}:rotation`) % profiles.length
    const usedNames = new Set<number>()
    const totalNames = places.length * mascots.length
    const firstWave = Math.max(1, Math.ceil(count * 0.2))
    const firstWaveDuration = Math.min(30 * 60000, (end - start) * 0.2)
    return Array.from({ length: count }, (_, index) => {
        const profile = profiles[(first + index) % profiles.length]
        let nameIndex = hash32(`${seed}:${context.leagueId}:${profile.demoKey}:name`) % totalNames
        while (usedNames.has(nameIndex)) nameIndex = (nameIndex + 1) % totalNames
        usedNames.add(nameIndex)
        const teamName = `${places[Math.floor(nameIndex / mascots.length)]} ${mascots[nameIndex % mascots.length]}`
        const selection = chooseDemoLineup(context.snapshot.playerPool, `${seed}:${profile.demoKey}:${context.leagueId}`, profile.strategy)
        const fraction = index < firstWave
            ? firstWaveDuration * index / firstWave
            : firstWaveDuration + (end - start - firstWaveDuration) * (index - firstWave) / Math.max(1, count - firstWave)
        return { userId: profile.userId, sourceKey: `recurring:${context.leagueId}:${profile.userId}`, scheduledAt: new Date(start + Math.floor(fraction)), teamName, lineup: { players: selection.players, captainExternalPlayerId: selection.captainExternalPlayerId } }
    })
}
