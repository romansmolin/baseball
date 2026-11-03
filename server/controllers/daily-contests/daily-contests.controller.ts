import { ApiError } from '../../errors/api.error';
import { dailyListSchema, dailyEntrySchema, managerListSchema } from '../../entities/daily-contests/daily-contests.schema';
import { DailyContestsRepository } from '../../repositories/daily-contests/daily-contests.repository';
import { showcaseEnabled } from '../../shared/showcase-config';
import { CommunityService } from '../../services/community/community.service';
export async function showcaseResponse(work: () => Promise<unknown>): Promise<Response> { if (!showcaseEnabled())
    return Response.json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, { status: 404 }); try {
    return Response.json(await work(), { headers: { 'Cache-Control': 'no-store' } });
}
catch (e) {
    if (e instanceof ApiError)
        return e.toResponse();
    console.error('[showcase]', e);
    return ApiError.internal().toResponse();
} }
function parse<T>(schema: {
    safeParse: (v: unknown) => {
        success: boolean;
        data?: T;
        error?: {
            issues: {
                message: string;
            }[];
        };
    };
}, v: unknown): T { const r = schema.safeParse(v); if (!r.success)
    throw ApiError.validationError(r.error?.issues[0]?.message ?? 'Invalid input'); return r.data as T; }
export class DailyContestsController {
    private readonly repo = new DailyContestsRepository();
    list(q: URLSearchParams) { return showcaseResponse(() => this.repo.list(parse(dailyListSchema, Object.fromEntries(q)))); }
    featured() { return showcaseResponse(() => this.repo.featured()); }
    detail(id: string) { return showcaseResponse(() => this.repo.detail(id)); }
    myEntry(id: string, userId: string | null) { return showcaseResponse(() => { if (!userId)
        throw ApiError.unauthorized(); return this.repo.myEntry(id, userId); }); }
    save(id: string, userId: string | null, body: unknown) { return showcaseResponse(() => { if (!userId)
        throw ApiError.unauthorized(); return this.repo.save(userId, id, parse(dailyEntrySchema, body)); }); }
    standings(id: string, q: URLSearchParams) { return showcaseResponse(() => { const p = parse(dailyListSchema, Object.fromEntries(q)); return this.repo.standings(id, p.limit, p.offset); }); }
    entry(id: string, entryId: string, userId: string | null) { return showcaseResponse(() => this.repo.entryForViewer(id, entryId, userId)); }
    managers(q: URLSearchParams) { return showcaseResponse(() => new CommunityService().listManagers(parse(managerListSchema, Object.fromEntries(q)))); }
}
