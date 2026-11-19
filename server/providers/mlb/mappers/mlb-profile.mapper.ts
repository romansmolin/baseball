import type {
    ProviderGameLogLine,
    ProviderPlayerProfile,
    ProviderPlayerStatus,
    ProviderStatGroup,
    ProviderStatSplit,
} from '../../dto/provider-player-profile.dto'
import type { ProviderTeam } from '../../dto/provider-team.dto'
import type { MlbRawPerson, MlbRawPersonStats } from '../types/mlb-person.raw'

import { mapMlbPersonToProviderPlayer } from './mlb-person.mapper'

const SPLIT_KEY_BY_CODE: Record<string, ProviderStatSplit['key']> = {
    vl: 'vsLeft',
    vr: 'vsRight',
    h: 'home',
    a: 'away',
}

function blocks(stats: MlbRawPersonStats[], group: string, type: string): MlbRawPersonStats[] {
    return stats.filter(
        (b) => b.group?.displayName === group && b.type?.displayName === type,
    )
}

function mapGroup(stats: MlbRawPersonStats[], group: 'hitting' | 'pitching'): ProviderStatGroup | null {
    const season = blocks(stats, group, 'season')[0]?.splits?.[0]?.stat ?? null
    const sabermetrics = blocks(stats, group, 'sabermetrics')[0]?.splits?.[0]?.stat ?? null

    const splits: ProviderStatSplit[] = []
    for (const split of blocks(stats, group, 'statSplits')[0]?.splits ?? []) {
        const key = SPLIT_KEY_BY_CODE[split.split?.code ?? '']
        if (key && split.stat) splits.push({ key, stats: split.stat })
    }

    const gameLog: ProviderGameLogLine[] = []
    for (const row of blocks(stats, group, 'gameLog')[0]?.splits ?? []) {
        if (row.date && row.opponent?.id !== undefined && row.stat) {
            gameLog.push({ date: row.date, opponentTeamId: row.opponent.id, stats: row.stat })
        }
    }

    if (!season && !sabermetrics && splits.length === 0 && gameLog.length === 0) return null
    return { season, sabermetrics, splits, gameLog }
}

// MLB lists every roster stint a player has had; the latest status date is the current state.
function mapStatus(raw: MlbRawPerson): ProviderPlayerStatus {
    const latest = [...(raw.rosterEntries ?? [])]
        .filter((entry) => entry.status?.code)
        .sort((a, b) => (b.statusDate ?? '').localeCompare(a.statusDate ?? ''))[0]

    if (!latest?.status?.code) {
        return { code: 'NA', description: 'No roster status', available: false }
    }
    return {
        code: latest.status.code,
        description: latest.status.description ?? latest.status.code,
        available: latest.status.code === 'A',
    }
}

export function mapMlbPersonToProfile(
    raw: MlbRawPerson,
    teamLookup?: Map<number, ProviderTeam>,
): ProviderPlayerProfile {
    const stats = raw.stats ?? []
    return {
        player: mapMlbPersonToProviderPlayer(raw, { teamLookup }),
        hitting: mapGroup(stats, 'hitting'),
        pitching: mapGroup(stats, 'pitching'),
        status: mapStatus(raw),
    }
}
