import { after } from 'next/server'
import { getAuthenticatedUser } from '../../../../../server/shared/auth.utils'
import { prisma } from '../../../../../server/lib/prisma'
import { ApiError } from '../../../../../server/errors/api.error'
import { createDemoReportSchema } from '../../../../../server/entities/admin/demo-report.schema'
import { renderDemoReportPdf } from '../../../../../server/services/admin/render-demo-pdf'

export async function POST(request: Request) {
    const user = await getAuthenticatedUser()
    if (!user) return ApiError.unauthorized().toResponse()
    const parsed = createDemoReportSchema.safeParse(await request.json().catch(() => null))
    if (!parsed.success) return ApiError.validationError('Invalid report data').toResponse()
    const job = await prisma.demoReportJob.create({ data: { userId: user.id, status: 'processing' } })
    after(async () => {
        try {
            const fileBase64 = await renderDemoReportPdf(parsed.data)
            await prisma.demoReportJob.update({ where: { id: job.id }, data: { status: 'completed', fileBase64 } })
        } catch (error) {
            console.error('[DemoReport] render failed', error)
            await prisma.demoReportJob.update({ where: { id: job.id }, data: { status: 'failed', errorMessage: 'Could not generate the report' } })
        }
    })
    return Response.json({ id: job.id }, { status: 202 })
}
