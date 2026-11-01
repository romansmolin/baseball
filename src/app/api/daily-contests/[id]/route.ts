import { DailyContestsController } from '../../../../../server/controllers/daily-contests/daily-contests.controller';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, c: {
    params: Promise<{
        id: string;
    }>;
}) { return new DailyContestsController().detail((await c.params).id); }
