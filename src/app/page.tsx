import { showcaseEnabled } from '../../server/shared/showcase-config'
import { LandingPage } from '@/views/landing-page/landing-page'
import { SmoothScrollProvider } from './smooth-scroll-provider'

export default function HomePage() {
    return (
        <SmoothScrollProvider>
            <LandingPage showcaseEnabled={showcaseEnabled()} />
        </SmoothScrollProvider>
    )
}
