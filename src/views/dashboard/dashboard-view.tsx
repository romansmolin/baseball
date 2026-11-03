import { ShowcaseOverview, TodayContestPanel } from '@/widgets/showcase'
import { NewUserDashboard, ReturningUserDashboard } from '@/widgets/dashboard'

interface DashboardViewProps {
    userName: string
    view: 'new' | 'returning'
    showcaseEnabled?: boolean
}

export const DashboardView = ({ userName, view, showcaseEnabled = false }: DashboardViewProps) => {
    const firstName = userName.split(' ')[0] || userName

    if (showcaseEnabled) {
        return (
            <div className="mx-auto w-full max-w-[1440px] px-5 py-6 sm:px-8 lg:px-12 lg:py-8">
                <NewUserDashboard firstName={firstName} compact />
                <ShowcaseOverview />
            </div>
        )
    }

    return (
        <div className="container mx-auto max-w-7xl space-y-6 px-6 py-6">
            {view === 'new' ? <NewUserDashboard firstName={firstName} /> : <ReturningUserDashboard />}
            <TodayContestPanel authenticated dailyEnabled={showcaseEnabled} />
        </div>
    )
}
