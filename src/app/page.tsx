import {
    EliteContenders,
    HeroSection,
    LandingFooter,
    LiveTicker,
    TicketsCta,
    TournamentInfo,
} from '@/widgets/landing'

export default function HomePage() {
    return (
        <div
            className="dark relative bg-black text-white font-sans selection:bg-red-500 selection:text-white"
            style={{ overflowX: 'clip' }}
        >
            <LiveTicker />
            <HeroSection />
            <TournamentInfo />
            <EliteContenders />
            <TicketsCta />
            <LandingFooter />
        </div>
    )
}
