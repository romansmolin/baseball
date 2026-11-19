import { SPORT_LEAGUES } from '../../../../server/shared/sport-leagues.const'

// The baseball leagues the team builder and the players page can browse.
export async function GET() {
    return Response.json(SPORT_LEAGUES)
}
