import type { TopPerformer } from '@/shared/dashboard'
import type { ProviderPlayer } from '../../../providers/dto/provider-player.dto'
import type { ISportsProvider } from '../../../providers/sports-provider.interface'
import type { TopPerformersQuery } from '../../../entities/performers/top.schema'
import type { ITopPerformersService } from './top-performers.service.interface'

const DEFAULT_LIMIT = 5
const REPRESENTATIVE_TEAM_ID = 119 // LAD — used as a source roster for stub fantasy scoring

function fauxFantasyPoints(player: ProviderPlayer, rank: number): number {
    const jitter = (player.id % 10) * 0.1
    return Number((40 - rank * 1.3 + jitter).toFixed(1))
}

export class TopPerformersService implements ITopPerformersService {
    private readonly provider: ISportsProvider

    constructor(provider: ISportsProvider) {
        this.provider = provider
    }

    async listTop(query: TopPerformersQuery): Promise<TopPerformer[]> {
        const limit = query.limit ?? DEFAULT_LIMIT
        const players = await this.provider.getPlayersByTeam(REPRESENTATIVE_TEAM_ID)

        const performers: TopPerformer[] = players.slice(0, limit).map((player, i) => ({
            id: String(player.id),
            rank: i + 1,
            name: player.fullName,
            position: player.primaryPosition,
            team: player.teamAbbreviation ?? '—',
            fantasyPoints: fauxFantasyPoints(player, i + 1),
        }))

        performers.sort((a, b) => b.fantasyPoints - a.fantasyPoints)

        return performers.map((performer, i) => ({ ...performer, rank: i + 1 }))
    }
}
