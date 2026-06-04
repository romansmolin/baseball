import type { BuilderLeague } from '@/shared/team-builder'
import { SPORT_LEAGUES } from '../../shared/sport-leagues.const'
import type { ILeaguesService } from './leagues.service.interface'

export class LeaguesService implements ILeaguesService {
    listLeagues(): BuilderLeague[] {
        return SPORT_LEAGUES
    }
}
