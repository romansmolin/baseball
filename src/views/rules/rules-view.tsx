import { ConceptsGrid, RulesHero, ScoringGrid } from '@/widgets/rules'

export const RulesView = () => (
    <main className="container mx-auto max-w-6xl space-y-8 px-6 py-8">
        <RulesHero />
        <ConceptsGrid />
        <ScoringGrid />
    </main>
)
