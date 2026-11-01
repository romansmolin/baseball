import { LandingShowcase } from '@/widgets/showcase'
import {
    LiveTicker,
    HeroSection,
    TournamentInfo,
    EliteContenders,
    TicketsCta,
    LandingFooter,
} from '@/widgets/landing'

export const LandingPage = ({ showcaseEnabled = false }: { showcaseEnabled?: boolean }) => {
    return (
        <div
            className="dark relative bg-black text-white font-sans selection:bg-red-500 selection:text-white"
            style={{ overflowX: 'clip' }}
        >
            <LiveTicker />
            <HeroSection />
            {showcaseEnabled && <LandingShowcase />}
            <TournamentInfo />
            <EliteContenders />
            <TicketsCta />
            <LandingFooter />
        </div>
    )
}
