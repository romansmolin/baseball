import { DailyContestsController } from '../../../../../../../server/controllers/daily-contests/daily-contests.controller';
import { getAuthenticatedUser } from '../../../../../../../server/shared/auth.utils';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, c: {
    params: Promise<{
        id: string;
        entryId: string;
    }>;
}) { const p = await c.params; const user = await getAuthenticatedUser(); return new DailyContestsController().entry(p.id, p.entryId, user?.id ?? null); }
