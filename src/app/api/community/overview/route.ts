import { showcaseResponse } from '../../../../../server/controllers/daily-contests/daily-contests.controller';
import { CommunityService } from '../../../../../server/services/community/community.service';
export const dynamic = 'force-dynamic';
export async function GET() { return showcaseResponse(() => new CommunityService().getCommunityOverview()); }
