import { z } from 'zod'
import { getAuthenticatedUser } from '../../../../../server/shared/auth.utils'
import { prisma } from '../../../../../server/lib/prisma'
import { ApiError } from '../../../../../server/errors/api.error'
import { ErrorCode } from '../../../../../server/errors/error-code.enum'
import { buildReceipt, renderReceipt } from '../../../../../server/services/admin/receipt'

const schema = z.object({ paymentTokenId: z.string().min(1), format: z.enum(['api', 'pdf']).default('api') })

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()
    const admin = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, status: true } })
    if (!admin || admin.role !== 'ADMIN' || admin.status !== 'ACTIVE') return ApiError.forbidden().toResponse()
    const parsed = schema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return ApiError.validationError('paymentTokenId is required').toResponse()
    const payment = await prisma.payment.findUnique({ where: { id: parsed.data.paymentTokenId }, include: { user: { select: { email: true } } } })
    if (!payment) return ApiError.notFound(ErrorCode.PAYMENT_NOT_FOUND, 'Purchase not found').toResponse()
    const transaction = await prisma.creditTransaction.findFirst({ where: { userId: payment.userId, referenceType: 'payment', referenceId: payment.id, type: 'PURCHASE' }, select: { status: true, amount: true } })
    try {
        const receipt = buildReceipt(payment, transaction)
        return Response.json({ receiptId: receipt.receiptId, file: { contentType: 'application/pdf', base64: await renderReceipt(receipt) } })
    } catch (error) {
        if (error instanceof ApiError) return error.toResponse()
        return ApiError.internal().toResponse()
    }
}
