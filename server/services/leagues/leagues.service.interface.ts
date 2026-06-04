import type { BuilderLeague } from '@/shared/team-builder'

export interface ILeaguesService {
    listLeagues(): BuilderLeague[]
}
