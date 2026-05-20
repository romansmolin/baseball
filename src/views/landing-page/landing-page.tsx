import {
    LiveTicker,
    HeroSection,
    TournamentInfo,
    EliteContenders,
    TicketsCta,
    LandingFooter,
} from '@/widgets/landing'

export const LandingPage = () => {
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
