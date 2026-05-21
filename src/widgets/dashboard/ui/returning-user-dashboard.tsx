import { ActiveContests } from './active-contests'
import { MetricCards } from './metric-cards'
import { RecentActivity } from './recent-activity'
import { TopPerformers } from './top-performers'

export const ReturningUserDashboard = () => (
    <div className="space-y-6">
        <MetricCards />
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <ActiveContests />
            </div>
            <div>
                <TopPerformers />
            </div>
        </div>
        <RecentActivity />
    </div>
)
