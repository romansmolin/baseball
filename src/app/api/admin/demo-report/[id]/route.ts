import { getAuthenticatedUser } from '../../../../../../server/shared/auth.utils'
import { prisma } from '../../../../../../server/lib/prisma'
import { ApiError } from '../../../../../../server/errors/api.error'
import { ErrorCode } from '../../../../../../server/errors/error-code.enum'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()
    const { id } = await params
    const job = await prisma.demoReportJob.findFirst({ where: { id, userId: user.id } })
    if (!job) return ApiError.notFound(ErrorCode.USER_NOT_FOUND, 'Report not found').toResponse()
    return Response.json({ status: job.status, error: job.errorMessage, file: job.status === 'completed' && job.fileBase64 ? { contentType: 'application/pdf', base64: job.fileBase64 } : null })
}
