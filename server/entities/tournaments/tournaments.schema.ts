import { z } from 'zod'

// Status / visibility are stored as uppercase Prisma enums and surfaced as
// uppercase in the public contract — mirror the shape exactly.
const statusEnum = z.enum([
    'DRAFTING',
    'IN_SEASON',
    'PLAYOFFS',
    'COMPLETED',
    'ARCHIVED',
])

const visibilityEnum = z.enum(['PUBLIC', 'PRIVATE'])

const csvListTransform =
    <TItem extends string>(itemSchema: z.ZodType<TItem>, allowed: readonly string[]) =>
    (value: string | undefined, ctx: z.RefinementCtx): TItem[] | undefined => {
        if (value === undefined) return undefined

        const items = value
            .split(',')
            .map((item) => item.trim())
            .filter((item) => item.length > 0)

        if (items.length === 0) return undefined

        const parsed: TItem[] = []
        for (const item of items) {
            const result = itemSchema.safeParse(item)
            if (!result.success) {
                ctx.addIssue({
                    code: 'custom',
                    message: `must be a comma-separated list of: ${allowed.join(', ')}`,
                })
                return z.NEVER
            }
            parsed.push(result.data)
        }
        return parsed
    }

export const tournamentsListQuerySchema = z.object({
    leagueSlug: z.string().min(1).max(64).optional(),
    status: z
        .string()
        .min(1)
        .max(128)
        .optional()
        .transform(
            csvListTransform(statusEnum, [
                'DRAFTING',
                'IN_SEASON',
                'PLAYOFFS',
                'COMPLETED',
                'ARCHIVED',
            ]),
        ),
    visibility: z
        .string()
        .min(1)
        .max(64)
        .optional()
        .transform(csvListTransform(visibilityEnum, ['PUBLIC', 'PRIVATE'])),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
})

export type TournamentsListQuery = z.infer<typeof tournamentsListQuerySchema>
