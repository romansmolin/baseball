import { AIFeaturesGrid } from './ai-features-grid'
import { CreditsSummary } from './credits-summary'
import { NextGames } from './next-games'
import { TopPerformers } from './top-performers'

export const DashboardOverview = () => (
    <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <AIFeaturesGrid />
            </div>
            <div>
                <CreditsSummary />
            </div>
        </div>
        <TopPerformers />
        <NextGames />
    </div>
)
