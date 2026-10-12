import type { MetadataRoute } from 'next'

const SITE_URL = 'https://www.mybaseballfantasy.com'

const PUBLIC_PATHS = [
    '/',
    '/auth/sign-in',
    '/auth/sign-up',
    '/legal/terms',
    '/legal/privacy',
    '/legal/cookies',
    '/legal/refunds',
    '/legal/pricing',
]

export default function sitemap(): MetadataRoute.Sitemap {
    return PUBLIC_PATHS.map((path) => ({ url: `${SITE_URL}${path}` }))
}
