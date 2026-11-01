import { DailyContestsController } from '../../../../../../server/controllers/daily-contests/daily-contests.controller';
export const dynamic = 'force-dynamic';
export async function GET(r: Request, c: {
    params: Promise<{
        id: string;
    }>;
}) { return new DailyContestsController().standings((await c.params).id, new URL(r.url).searchParams); }
