import { COMPANY } from '@/shared/company'
import { LegalPageShell, List, P, Section, Table } from '@/widgets/legal'

export const metadata = {
    title: 'Services and prices · BaseballFantasy',
    description: 'What BaseballFantasy offers, how credits work and what they cost.',
}

export default function ServicesPage() {
    return (
        <LegalPageShell
            title="Services and prices"
            intro="BaseballFantasy is an online game where you build fantasy baseball lineups from real players and score points from real games."
            lastUpdated="November 4, 2026"
        >
            <Section id="what-you-get" title="1. What the service is">
                <P>
                    Each contest has a list of real baseball games. You pick nine players under a salary cap, name a captain
                    who earns bonus points, and your lineup scores points from the official box scores of those games. The
                    higher your score, the higher you rank among the other managers.
                </P>
                <List
                    items={[
                        'Daily Lineup and Weekend Series: contests for one day or one weekend of real games, with many of them free to enter.',
                        'Series and league tournaments: longer contests that run over several weeks of a season.',
                        'Rankings, player statistics, team standings and live scores for MLB, the minor leagues and the winter leagues.',
                        'Lineup autofill, an optional feature that fills the empty slots of your lineup for a small number of credits.',
                    ]}
                />
            </Section>
            <Section id="credits" title="2. What credits are and how you use them">
                <P>
                    Credits are the virtual currency of the service. You use them to pay the entry fee of contests that have
                    one and to use optional features such as lineup autofill. Credits are not money: they cannot be
                    transferred, redeemed or withdrawn. Many contests are free to enter and need no credits at all.
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
