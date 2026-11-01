import { DailyContestsController } from '../../../../server/controllers/daily-contests/daily-contests.controller';
export const dynamic = 'force-dynamic';
export async function GET(r: Request) { return new DailyContestsController().list(new URL(r.url).searchParams); }
