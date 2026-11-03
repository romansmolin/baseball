import { z } from 'zod';
export const dailyListSchema = z.object({ view: z.enum(['current', 'history']).optional(), mode: z.enum(['LIVE', 'REPLAY']).optional(), leagueSlug: z.string().max(64).optional(), status: z.enum(['OPEN', 'LOCKED', 'COMPLETED', 'CANCELLED']).optional(), limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) }).superRefine((value, context) => {
    const view = value.view ?? (value.mode === 'REPLAY' ? 'history' : 'current')
    const allowedStatuses = view === 'history' ? ['COMPLETED'] : ['OPEN', 'LOCKED']
    if (value.status && !allowedStatuses.includes(value.status)) context.addIssue({ code: 'custom', path: ['status'], message: `Status ${value.status} is not available in ${view}` })
    if (view === 'current' && value.mode === 'REPLAY') context.addIssue({ code: 'custom', path: ['mode'], message: 'Replay is only available in history' })
}).transform(value => ({ ...value, view: value.view ?? (value.mode === 'REPLAY' ? 'history' as const : 'current' as const) }))
export const dailyEntrySchema = z.object({ teamName: z.string().trim().min(1).max(80), players: z.array(z.object({ slotKey: z.enum(['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF']), externalPlayerId: z.number().int().positive() }).strict()).length(9), captainExternalPlayerId: z.number().int().positive().nullable().optional() }).strict();
export const managerListSchema = z.object({ mode: z.enum(['LIVE', 'REPLAY']).default('LIVE'), period: z.enum(['day', 'week', 'season']).default('week'), limit: z.coerce.number().int().min(1).max(100).default(20), offset: z.coerce.number().int().min(0).default(0) });
