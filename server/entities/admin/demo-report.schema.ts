import { z } from 'zod'
import { MAX_DEMO_PAYMENT_ROWS } from '@/features/admin-demo/model/demo-data'

const short = z.string().max(80)

const demoActivityRowSchema = z.object({
    index: z.number().int().positive(),
    date: short,
    time: short,
    type: short,
    tokens: z.number().finite().positive(),
    amountCents: z.number().int().positive(),
    currency: z.string().length(3),
    status: z.literal('Successful'),
    totalSpent: z.number().int().positive(),
})

const demoPaymentRowSchema = z.object({
    id: short,
    date: short,
    tokens: z.number().finite().positive(),
    amountCents: z.number().int().positive(),
    currency: z.string().length(3),
    status: z.string().trim().min(1).max(80),
})

/** The server renders the submitted activity and payment rows. */
export const createDemoReportSchema = z
    .object({
        email: z.string().trim().email().max(254),
        period: short,
        activity: z.array(demoActivityRowSchema).nullable(),
        payments: z.array(demoPaymentRowSchema).max(MAX_DEMO_PAYMENT_ROWS).nullable(),
    })
    .refine((report) => report.activity?.length || report.payments?.length, {
        message: 'Generate activity or payments first',
    })
