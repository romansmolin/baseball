import { DashboardHome, TodayContestPanel } from '@/widgets/showcase'
import { NewUserDashboard, OnboardingChecklist, ReturningUserDashboard } from '@/widgets/dashboard'

interface DashboardViewProps {
    userId: string
    userName: string
    view: 'new' | 'returning'
    showcaseEnabled?: boolean
}

export const DashboardView = ({ userId, userName, view, showcaseEnabled = false }: DashboardViewProps) => {
    const firstName = userName.split(' ')[0] || userName

    if (showcaseEnabled) {
        return <DashboardHome userId={userId} firstName={firstName} sidebarTop={<OnboardingChecklist firstName={firstName} compact />} />
    }

    return (
        <div className="container mx-auto max-w-7xl space-y-6 px-6 py-6">
            {view === 'new' ? <NewUserDashboard firstName={firstName} /> : <ReturningUserDashboard />}
            <TodayContestPanel userId={userId} />
        </div>
    )
}
