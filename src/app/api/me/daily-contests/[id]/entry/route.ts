import { DailyContestsController } from '../../../../../../../server/controllers/daily-contests/daily-contests.controller';
import { getAuthenticatedUser } from '../../../../../../../server/shared/auth.utils';
import { ApiError } from '../../../../../../../server/errors/api.error';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, c: {
    params: Promise<{
        id: string;
    }>;
}) { return new DailyContestsController().myEntry((await c.params).id, (await getAuthenticatedUser())?.id ?? null); }
export async function PUT(r: Request, c: {
    params: Promise<{
        id: string;
    }>;
}) { let body: unknown; try {
    body = await r.json();
}
catch {
    return ApiError.validationError('Invalid JSON body').toResponse();
} return new DailyContestsController().save((await c.params).id, (await getAuthenticatedUser())?.id ?? null, body); }
