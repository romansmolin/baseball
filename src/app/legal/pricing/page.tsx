import { LegalPageShell, List, P, Section } from '@/widgets/legal'

export const metadata = {
    title: 'Pricing and Payment Policy · BaseballFantasy',
    description:
        'One-off virtual Credit packages, payment methods and billing details for BaseballFantasy.',
}

export default function PricingPolicyPage() {
    return (
        <LegalPageShell
            title="Pricing and Payment Policy"
            intro="BaseballFantasy offers the following one-off virtual Credit packages."
            lastUpdated="October 12, 2026"
        >
            <Section id="packages" title="1. Credit packages">
                <List
                    items={[
                        '500 Credits – EUR 4;',
                        '1,200 Credits – EUR 8;',
                        '2,500 Credits – EUR 15.',
                    ]}
                />
                <P>
                    Payments are one-off payments. BaseballFantasy does not currently
                    offer automatically renewable subscriptions. Credits are delivered to
                    the user’s account after successful payment confirmation. Credits are
                    virtual, non-transferable, have no cash value and cannot be redeemed
                    or withdrawn.
                </P>
            </Section>

            <Section id="payments" title="2. Payment methods">
                <P>
                    Available payment methods are displayed at checkout. Payments are
                    processed by an authorized third-party payment service provider.
                    CODERUSH does not store complete payment card details on its own
                    servers.
                </P>
                <P>
                    The billing descriptor displayed on the customer’s payment statement
                    is: [INSERT ACTUAL BILLING DESCRIPTOR].
                </P>
            </Section>

            <Section id="refunds" title="3. Refunds">
                <P>
                    Refunds are governed by our{' '}
                    <a className="font-medium text-primary underline" href="/legal/refunds">
                        Refund & Return Policy
                    </a>
                    .
                </P>
            </Section>
        </LegalPageShell>
    )
}
