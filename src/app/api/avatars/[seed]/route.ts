import { renderDemoAvatar } from '../../../../../server/services/demo-users/demo-avatar'

export async function GET(_request: Request, { params }: { params: Promise<{ seed: string }> }) {
    const { seed } = await params
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(seed)) return new Response('Invalid seed', { status: 400 })
    return new Response(renderDemoAvatar(seed), { headers: { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'", 'X-Content-Type-Options': 'nosniff' } })
}
