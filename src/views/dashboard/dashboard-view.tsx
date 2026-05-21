import { NewUserDashboard, PreviewToggle, ReturningUserDashboard } from '@/widgets/dashboard'

interface DashboardViewProps {
    userName: string
    view: 'new' | 'returning'
}

export const DashboardView = ({ userName, view }: DashboardViewProps) => {
    const firstName = userName.split(' ')[0] || userName

    return (
        <div className="container mx-auto max-w-6xl space-y-6 px-6 py-6">
            <PreviewToggle current={view} />
            {view === 'new' ? (
                <NewUserDashboard firstName={firstName} />
            ) : (
                <ReturningUserDashboard />
            )}
        </div>
    )
}
