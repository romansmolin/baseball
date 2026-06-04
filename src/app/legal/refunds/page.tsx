import { Callout, LegalPageShell, List, P, Section, Sub } from '@/widgets/legal'

export const metadata = {
    title: 'Refund & Return Policy · BaseballFantasy',
    description:
        'When and how refunds and returns are available for BaseballFantasy credit purchases, paid features, and contest entries.',
}

export default function RefundPolicyPage() {
    return (
        <LegalPageShell
            title="Refund & Return Policy"
            intro="This Refund & Return Policy explains when and how refunds and returns are available for credit purchases, paid features, and contest entries on BaseballFantasy. It supplements, and should be read together with, our Terms of Service."
            lastUpdated="June 4, 2026"
        >
            <Callout>
                <strong>Quick summary:</strong> Because BaseballFantasy sells virtual
                credits that are usable immediately upon purchase, most credit purchases
                are <strong>non-refundable</strong> once credits have been used. We do
                provide refunds for duplicate or erroneous charges, technical errors
                preventing use, qualifying cancelled contests, and where required by your
                statutory consumer rights. Refund requests are reviewed individually and
                processed back to the original payment method.
            </Callout>

            <Section id="scope" title="1. Scope of this Policy">
                <P>This Policy applies to:</P>
                <List
                    items={[
                        'Purchases of virtual credits ("Credits") through the Service;',
                        'Optional paid features and subscriptions, where offered;',
                        'Contest entry fees paid with Credits;',
                        'Any other paid transaction processed through BaseballFantasy.',
                    ]}
                />
                <P>
                    It does not apply to (a) credits awarded as promotions or gifts, which
                    are governed by the specific terms of the promotion, or (b) goods or
                    services purchased from third parties through links or integrations on
                    the Service.
                </P>
            </Section>

            <Section id="nature" title="2. Nature of the Product You Are Buying">
                <P>
                    Credits are virtual, non-monetary units that exist only within the
                    Service. They have no cash value, are not redeemable for cash, gift
                    cards, or other monetary instruments, and are made available to you
                    immediately upon completion of your purchase. By purchasing Credits,
                    you acknowledge that you are receiving access to digital content that
                    begins performance immediately, and you may lose certain statutory
                    rights of withdrawal once you have used any portion of those Credits
                    (see Section 6 below).
                </P>
            </Section>

            <Section id="eligible" title="3. When Refunds Are Available">
                <P>
                    We will issue a refund in the following circumstances, subject to the
                    other terms of this Policy:
                </P>
                <Sub title="3.1 Duplicate or erroneous charges">
                    <P>
                        If you are charged more than once for the same purchase, or if you
                        were charged for a purchase you did not authorize and we confirm
                        this through our investigation, we will refund the duplicate or
                        unauthorized amount in full.
                    </P>
                </Sub>
                <Sub title="3.2 Technical errors on our side">
                    <P>
                        If a confirmed technical issue caused by us prevented you from
                        receiving the Credits you purchased, or prevented you from using
                        them as intended within a reasonable period, we will either
                        re-deliver the Credits or refund the affected amount.
                    </P>
                </Sub>
                <Sub title="3.3 Cancelled contests with no replacement scoring window">
                    <P>
                        If you entered a paid contest that we then cancel without offering
                        an equivalent replacement (for example, because all underlying
                        real-world games are cancelled), we will refund the entry fee in
                        Credits to your account balance, in line with the specific contest
                        rules. We may, in our discretion, offer a cash refund instead of
                        Credits where the cancellation is attributable solely to us.
                    </P>
                </Sub>
                <Sub title="3.4 Statutory rights">
                    <P>
                        Nothing in this Policy is intended to limit any non-waivable
                        consumer-protection rights that apply to you. Where mandatory law
                        provides you with statutory rights of withdrawal, refund, or
                        cancellation that exceed those provided in this Policy, those
                        statutory rights prevail.
                    </P>
                </Sub>
            </Section>

            <Section id="ineligible" title="4. When Refunds Are NOT Available">
                <P>Except as required by applicable law, we do not offer refunds for:</P>
                <List
                    items={[
                        'Credits that have been used, in whole or in part, to enter a contest or unlock a paid feature;',
                        'Contest losses or unfavorable contest outcomes, regardless of cause (including injury to a player on your lineup, real-world game cancellation that is handled per the contest’s published rules, or weather);',
                        'Failure to set or lock your lineup before the contest lock time;',
                        'Voluntary closure of your account after Credits have been purchased;',
                        'Accounts suspended or terminated for violation of our Terms of Service (including multi-accounting, collusion, bot use, fraud, or other prohibited conduct), in which case all Credit balances are forfeited;',
                        'Promotional, bonus, or referral Credits, which have no cash value and expire per the specific promotion terms;',
                        'Credits transferred or sold in violation of these Terms;',
                        'Purchases more than thirty (30) days old where no other ground for refund under this Policy applies;',
                        'Currency conversion differences or fees imposed by your payment provider.',
                    ]}
                />
            </Section>

            <Section id="cooling-off" title="5. EU/UK 14-Day Cooling-Off Period">
                <P>
                    If you are a consumer in the European Union or United Kingdom, you have
                    a statutory right to withdraw from your purchase within fourteen (14)
                    days of the transaction without giving any reason. However, because
                    Credits are digital content delivered immediately upon purchase, you
                    expressly consent to immediate performance and acknowledge that you
                    lose your right of withdrawal once you begin using the Credits (e.g.,
                    by entering a paid contest).
                </P>
                <P>
                    If you wish to exercise your withdrawal right within the 14-day window
                    and you have <em>not</em> used any of the purchased Credits, please
                    contact{' '}
                    <a className="font-medium text-primary underline" href="mailto:billing@baseballfantasy.com">
                        billing@baseballfantasy.com
                    </a>{' '}
                    with your order details. We will refund the full amount paid using the
                    same payment method, generally within fourteen (14) days of receiving
                    your withdrawal notice.
                </P>
            </Section>

            <Section id="how-to-request" title="6. How to Request a Refund">
                <P>To request a refund, please:</P>
                <List
                    ordered
                    items={[
                        <>Email <a className="font-medium text-primary underline" href="mailto:billing@baseballfantasy.com">billing@baseballfantasy.com</a> from the address associated with your account, or open a support ticket from your Account Settings.</>,
                        'Include the username on your account, the order or transaction ID, the date of the purchase, the amount, the payment method, and a clear explanation of why you are requesting a refund.',
                        'Provide any supporting information (e.g., screenshots of the error you experienced, or correspondence with your bank).',
                    ]}
                />
                <P>
                    We will acknowledge receipt of your request within two (2) business
                    days and will aim to provide a final decision within ten (10) business
                    days. Complex cases may take longer.
                </P>
            </Section>

            <Section id="method" title="7. Method and Timing of Refunds">
                <P>
                    Approved refunds are processed back to the original payment method used
                    for the purchase. Where the original payment method is no longer
                    available (e.g., expired card), we may credit your account balance
                    instead. We do not issue refunds by cash, check, wire transfer, or
                    cryptocurrency.
                </P>
                <P>
                    Once approved, refunds are typically issued by our payment processor
                    within five (5) business days. The time required for the refund to
                    appear on your statement depends on your bank or payment provider and
                    is outside our control — usually between three (3) and ten (10)
                    additional business days.
                </P>
            </Section>

            <Section id="taxes" title="8. Taxes, Fees, and Currency">
                <P>
                    Refunds include any applicable taxes that you paid. Currency conversion
                    fees and other charges levied by your bank or card issuer are not
                    refundable by us. Refunds will be issued in the original transaction
                    currency; exchange-rate differences between the date of purchase and
                    the date of refund are not compensated by us.
                </P>
            </Section>

            <Section id="chargebacks" title="9. Chargebacks and Payment Disputes">
                <P>
                    If you have a concern about a charge, please contact us first — we will
                    do our best to resolve it quickly and fairly. Filing a chargeback or
                    payment dispute with your bank without first contacting us may result
                    in:
                </P>
                <List
                    items={[
                        'Immediate suspension or termination of your account while the dispute is investigated;',
                        'Forfeiture of any unused Credit balance and any active contest entries;',
                        'Permanent block from creating new accounts on the Service;',
                        'Recovery of associated chargeback fees and administrative costs.',
                    ]}
                />
                <P>
                    If a chargeback is found in our favor, we may reinstate your account
                    and balance at our discretion, subject to any administrative fees and
                    additional identity verification.
                </P>
            </Section>

            <Section id="discretion" title="10. Goodwill Refunds">
                <P>
                    Outside the categories listed above, we may, at our sole discretion,
                    issue goodwill refunds — for example, in cases of clear hardship or
                    customer-experience failures that fall outside the strict categories
                    above. Goodwill refunds do not create any precedent or obligation to
                    do so in future cases.
                </P>
            </Section>

            <Section id="account-closure" title="11. Closing Your Account">
                <P>
                    You may close your account at any time from your Account Settings or
                    by contacting{' '}
                    <a className="font-medium text-primary underline" href="mailto:support@baseballfantasy.com">
                        support@baseballfantasy.com
                    </a>
                    . Closing your account does not, by itself, entitle you to a refund of
                    any unused Credit balance. Where applicable law requires us to refund
                    an unused, paid balance upon account closure, we will do so in
                    accordance with that law.
                </P>
            </Section>

            <Section id="fraud" title="12. Suspected Fraud or Abuse">
                <P>
                    We monitor refund and chargeback activity for signs of abuse —
                    including pattern refund requests, abuse of promotional offers, and
                    use of fraudulent payment methods. We reserve the right to refuse any
                    refund request that we reasonably believe is abusive, and to take any
                    action permitted under our Terms of Service.
                </P>
            </Section>

            <Section id="changes" title="13. Changes to this Policy">
                <P>
                    We may update this Refund & Return Policy from time to time. When we
                    make material changes, we will notify you by email or by a prominent
                    notice on the Service and update the "Last updated" date above. The
                    Policy in effect at the time of your purchase governs that purchase.
                </P>
            </Section>

            <Section id="contact" title="14. Contact">
                <P>
                    <strong className="text-foreground">Refund and billing inquiries:</strong>{' '}
                    <a className="font-medium text-primary underline" href="mailto:billing@baseballfantasy.com">
                        billing@baseballfantasy.com
                    </a>
                    <br />
                    <strong className="text-foreground">Support:</strong>{' '}
                    <a className="font-medium text-primary underline" href="mailto:support@baseballfantasy.com">
                        support@baseballfantasy.com
                    </a>
                    <br />
                    <strong className="text-foreground">General legal:</strong>{' '}
                    <a className="font-medium text-primary underline" href="mailto:legal@baseballfantasy.com">
                        legal@baseballfantasy.com
                    </a>
                </P>
            </Section>
        </LegalPageShell>
    )
}
