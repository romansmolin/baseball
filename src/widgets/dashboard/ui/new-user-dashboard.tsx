import { AIFeaturesGrid } from './ai-features-grid'
import { CreditsSummary } from './credits-summary'
import { FeaturedContests } from './featured-contests'
import { OnboardingChecklist } from './onboarding-checklist'

interface NewUserDashboardProps {
    firstName: string
}

export const NewUserDashboard = ({ firstName }: NewUserDashboardProps) => (
    <div className="space-y-6">
        <OnboardingChecklist firstName={firstName} />
        <FeaturedContests />
        <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2">
                <AIFeaturesGrid />
            </div>
            <div>
                <CreditsSummary />
            </div>
        </div>
    </div>
)
