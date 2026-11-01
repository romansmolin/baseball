import { showcaseResponse } from '../../../../../server/controllers/daily-contests/daily-contests.controller';
import { CommunityService } from '../../../../../server/services/community/community.service';
export const dynamic = 'force-dynamic';
export async function GET(_r: Request, c: {
    params: Promise<{
        id: string;
    }>;
}) { const { id } = await c.params; return showcaseResponse(() => new CommunityService().getManagerProfile(id)); }
