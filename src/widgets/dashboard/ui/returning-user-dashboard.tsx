import { MetricCards } from './metric-cards'
import { NextGames } from './next-games'
import { RecentActivity } from './recent-activity'
import { TopPerformers } from './top-performers'

export const ReturningUserDashboard = () => (
    <div className="space-y-6">
        <MetricCards />
        <div className="grid gap-6 lg:grid-cols-2">
            <NextGames />
            <TopPerformers />
        </div>
        <RecentActivity />
    </div>
)
