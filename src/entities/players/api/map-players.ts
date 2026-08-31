import type { SupportedBaseballLeague } from '@/shared/baseball'

import type { PlayerModel } from '../model/types'
import type { ProviderPlayerDto } from './types'

export function mapPlayerDtoToModel(
    dto: ProviderPlayerDto,
    league: SupportedBaseballLeague,
): PlayerModel {
    return {
        id: dto.id,
        fullName: dto.fullName,
        firstName: dto.firstName,
        lastName: dto.lastName,
        position: dto.primaryPosition,
        teamId: dto.teamId,
        teamName: dto.teamName,
        teamAbbreviation: dto.teamAbbreviation,
        leagueSlug: league,
        age: dto.age,
        bats: dto.bats,
        throws: dto.throws,
        jerseyNumber: dto.jerseyNumber,
        photoUrl: dto.photoUrl,
        active: dto.active,
    }
}
