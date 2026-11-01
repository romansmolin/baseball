import { showcaseResponse } from '../../../../../server/controllers/daily-contests/daily-contests.controller';
import { CommunityService } from '../../../../../server/services/community/community.service';
import { ApiError } from '../../../../../server/errors/api.error';
import { dailyListSchema } from '../../../../../server/entities/daily-contests/daily-contests.schema';
export const dynamic = 'force-dynamic';
export async function GET(r: Request) { return showcaseResponse(() => { const q = new URL(r.url).searchParams; const p = dailyListSchema.safeParse(Object.fromEntries(q)); if (!p.success)
    throw ApiError.validationError('Invalid pagination'); return new CommunityService().activity(p.data.limit, q.get('cursor') ?? undefined); }); }
