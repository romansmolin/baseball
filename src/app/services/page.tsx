import { AIFeaturesService } from '../../../server/services/ai/features/ai-features.service'
import { COMPANY } from '@/shared/company'
import { LegalPageShell, List, P, Section, Table } from '@/widgets/legal'

export const metadata = {
    title: 'Services and prices · BaseballFantasy',
    description: 'What BaseballFantasy offers, how credits work and what they cost.',
}

export default function ServicesPage() {
    const aiFeatures = new AIFeaturesService().listFeatures()

    return (
        <LegalPageShell
            title="Services and prices"
            intro="BaseballFantasy is a research assistant for fantasy baseball. It helps you read player statistics, compare players, check upcoming MLB games and get AI suggestions for the fantasy team you play on another platform. We do not run contests and we do not pay prizes."
            lastUpdated="November 19, 2026"
        >
            <Section id="what-you-get" title="1. What the service is">
                <P>
                    You look up real MLB players and games, and we show the numbers that matter for a fantasy decision. We
                    do not host a fantasy league: the team you save here is a draft for your own reference, and you set your
                    lineup on the platform where you play.
                </P>
                <List
                    items={[
                        'Player analytics: season statistics, recent form, splits against left- and right-handed pitching and expected statistics.',
                        'Player comparison: up to four players side by side.',
                        'Upcoming games: probable starting pitchers, weather, lineup status and a statistical estimate of the outcome.',
                        'Saved teams: a roster you build and keep for use on another fantasy platform.',
                        'AI features, paid with credits: game analysis, charts that explain a top performer and team autofill.',
                    ]}
                />
                <P>
                    Estimates and AI suggestions are statistical tools for fantasy decisions. They are not predictions,
                    guarantees or betting advice, and the service does not offer betting.
                </P>
            </Section>
            <Section id="credits" title="2. What credits are and how you use them">
                <P>
                    Credits are the virtual currency of the service. You use them only to pay for the AI features listed
                    below. Credits are not money: they cannot be transferred, redeemed or withdrawn. Player analytics, the
                    comparison tool, the games schedule and saved teams are free and need no credits.
                </P>
                <Table
                    headers={['AI feature', 'Credits per use']}
                    rows={aiFeatures.map((feature) => ({ cells: [feature.name, String(feature.costPerUse)] }))}
                />
                <P>
                    You are charged only when an AI feature returns a result. The cost is shown before you confirm.
                </P>
            </Section>
            <Section id="prices" title="3. Prices">
                <Table
                    headers={['Package', 'Price']}
                    rows={[
                        { cells: ['500 credits', 'EUR 4'] },
                        { cells: ['1,200 credits', 'EUR 8'] },
                        { cells: ['2,500 credits', 'EUR 15'] },
                        { cells: ['Your own amount', 'EUR 2 to EUR 500'] },
                    ]}
                />
                <P>
                    All payments are one-off. There are no subscriptions and nothing renews automatically. Prices are in euros
                    and the amount you pay is shown before you confirm. Credits are added to your account instantly after
                    your card payment is authorized, and you receive a receipt by email. See the{' '}
                    <a className="font-medium text-primary underline" href="/legal/refunds">Refund &amp; Return Policy</a>{' '}
                    and the{' '}
                    <a className="font-medium text-primary underline" href="/legal/pricing">Pricing and Payment Policy</a>.
                </P>
            </Section>
            <Section id="seller" title="4. Who sells it">
                <P>
                    {COMPANY.legalName}, {COMPANY.address}. KRS {COMPANY.krs}, NIP {COMPANY.nip}. Questions:{' '}
                    <a className="font-medium text-primary underline" href={`mailto:${COMPANY.supportEmail}`}>{COMPANY.supportEmail}</a>.
                </P>
            </Section>
        </LegalPageShell>
    )
}
