import { DailyContestsController } from '../../../../../server/controllers/daily-contests/daily-contests.controller'

export const dynamic = 'force-dynamic'

export async function GET() {
    return new DailyContestsController().featured()
}
