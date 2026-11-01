import { ShowcaseOverview } from '@/widgets/showcase'
import { NewUserDashboard, ReturningUserDashboard } from '@/widgets/dashboard'

interface DashboardViewProps {
    userName: string
    view: 'new' | 'returning'
    showcaseEnabled?: boolean
}

export const DashboardView = ({ userName, view, showcaseEnabled = false }: DashboardViewProps) => {
    const firstName = userName.split(' ')[0] || userName

    return (
        <div className="container mx-auto max-w-6xl space-y-6 px-6 py-6">
            {showcaseEnabled && <ShowcaseOverview />}
            {view === 'new' ? (
                <NewUserDashboard firstName={firstName} compact={showcaseEnabled} />
            ) : (
                <ReturningUserDashboard compact={showcaseEnabled} />
            )}
        </div>
    )
}
