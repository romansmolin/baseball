import { Callout, LegalPageShell, List, P, Section, Sub } from '@/widgets/legal'

export const metadata = {
    title: 'Privacy Policy · BaseballFantasy',
    description:
        'How BaseballFantasy collects, uses, shares, and protects your personal information.',
}

export default function PrivacyPolicyPage() {
    return (
        <LegalPageShell
            title="Privacy Policy"
            intro="This Privacy Policy explains how CODERUSH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ, trading as BaseballFantasy (“BaseballFantasy,” “we,” “us,” or “our”), collects, uses, shares and protects personal information when you use the website at https://www.mybaseballfantasy.com/ and its related services."
            lastUpdated="June 4, 2026"
        >
            <P>
                <strong className="text-foreground">Data Controller:</strong> CODERUSH
                SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ, ul. Zajęcza 15, 00-351 Warszawa,
                Poland, KRS 0001188826, NIP 5253057317, REGON 542464145.
            </P>

            <Callout>
                <strong>Plain-English summary:</strong> We collect the account, payment,
                gameplay, and device information needed to run the Service. We use it to
                provide and improve BaseballFantasy, comply with the law, and keep contests
                fair. We do not sell your personal information. You have rights — including
                the right to access, correct, export, and delete your data — and you can
                exercise them by emailing{' '}
                <a className="font-medium text-primary underline" href="mailto:privacy@mybaseballfantasy.com">
                    privacy@mybaseballfantasy.com
                </a>
                .
            </Callout>

            <Section id="scope" title="1. Scope of this Policy">
                <P>
                    This Policy applies to personal information processed by BaseballFantasy
                    in connection with your use of the Service, including the website at
                    https://www.mybaseballfantasy.com/ and any related BaseballFantasy
                    feature or service that links to this Privacy Policy.
                </P>
                <P>
                    This Policy does not cover information that you provide to, or that is
                    collected by, any third party (such as advertising partners, social
                    networks, payment processors, or data providers) that we link to or
                    integrate with. The use of any such third party's services is governed by
                    that third party's own terms and privacy policy.
                </P>
            </Section>

            <Section id="information-we-collect" title="2. Information We Collect">
                <P>We collect personal information in three ways: (i) information you give us, (ii) information we collect automatically as you use the Service, and (iii) information we receive from third parties.</P>

                <Sub title="2.1 Information you provide to us">
                    <List
                        items={[
                            <><strong className="text-foreground">Account information.</strong> When you create an account, we collect your username, email address, password in hashed form, date of birth and country of residence. Your date of birth and country of residence are used to verify age and geographical eligibility.</>,
                            <><strong className="text-foreground">Profile information.</strong> Display name, avatar, time zone, language preference, favorite leagues and teams, and any biographical information you choose to add.</>,
                            <><strong className="text-foreground">Payment information.</strong> When you purchase credits or paid features, our payment processor collects your billing name, billing address, payment method details (e.g., card brand, last four digits, expiration), and transaction history. We do not store full payment card numbers on our servers.</>,
                            <><strong className="text-foreground">Identity verification.</strong> If required by law (e.g., for jurisdictions that require age or location verification for fantasy contests), we may collect a government-issued ID, a selfie, or other documentation, and share it with a verification provider.</>,
                            <><strong className="text-foreground">Communications.</strong> When you contact support, post in community features, or respond to surveys, we collect the content of your messages and any attachments.</>,
                            <><strong className="text-foreground">Contest entries and lineups.</strong> Every team you build, every contest you enter, your scores, and your results.</>,
                        ]}
                    />
                </Sub>

                <Sub title="2.2 Information we collect automatically">
                    <List
                        items={[
                            <><strong className="text-foreground">Device and connection data.</strong> IP address, device type, operating system, browser type and version, screen size, language, mobile network information, and unique device identifiers.</>,
                            <><strong className="text-foreground">Usage data.</strong> Pages and screens viewed, features used, contests browsed, time spent, clickstream, referring/exit pages, and crash reports.</>,
                            <><strong className="text-foreground">Approximate location.</strong> Derived from your IP address; used for service eligibility, fraud prevention, and to honor jurisdictional restrictions. We do not collect precise GPS location unless you explicitly opt in.</>,
                            <><strong className="text-foreground">Cookies and similar technologies.</strong> See our separate <a className="font-medium text-primary underline" href="/legal/cookies">Cookies Policy</a> for full details.</>,
                            <><strong className="text-foreground">Authentication and security events.</strong> Login attempts, password changes, multi-factor challenges, suspicious-activity flags.</>,
                        ]}
                    />
                </Sub>

                <Sub title="2.3 Information we receive from third parties">
                    <List
                        items={[
                            <><strong className="text-foreground">Sports data providers</strong> (e.g., API-SPORTS). We receive player names, stats, schedules, injury reports, and similar publicly available sports data. We do not receive your personal information from these providers.</>,
                            <><strong className="text-foreground">Payment processors</strong> share back transaction-completion data, fraud-screening results, and refund status.</>,
                            <><strong className="text-foreground">Analytics, error tracking, and security partners</strong> share aggregated or pseudonymous data about how the Service is performing.</>,
                        ]}
                    />
                </Sub>
            </Section>

            <Section id="how-we-use" title="3. How We Use Information">
                <P>We use the information we collect to:</P>
                <List
                    items={[
                        'Provide, operate, and maintain the Service — including account creation, contest scoring, leaderboards, lineup saving, and credit balance management.',
                        'Authenticate you and protect your account against unauthorized access.',
                        'Process payments, refunds, and credit-balance adjustments.',
                        'Verify your age, identity, and jurisdictional eligibility where required.',
                        'Detect, investigate, and prevent fraud, multi-accounting, collusion, bot activity, and other behavior that violates our Terms.',
                        'Communicate with you about your account, transactions, contests you have entered, security alerts, and service-related notices.',
                        'Send you marketing and promotional messages, subject to your communication preferences and applicable law (you can opt out at any time).',
                        'Personalize your experience — recommended contests, leagues, players, and homepage layout.',
                        'Measure, analyze, and improve the Service — A/B testing, feature performance, error monitoring, and aggregate usage analytics.',
                        'Comply with legal obligations, respond to lawful requests from public authorities, and enforce our Terms of Service.',
                    ]}
                />
            </Section>

            <Section id="legal-bases" title="4. Legal Bases (EU/UK/EEA Users)">
                <P>
                    If you are located in the European Economic Area, the United Kingdom, or
                    Switzerland, we process your personal information on one or more of the
                    following legal bases under the General Data Protection Regulation
                    (GDPR) and equivalent local law:
                </P>
                <List
                    items={[
                        <><strong className="text-foreground">Contract.</strong> Processing necessary to perform our agreement with you — for example, running contests you have entered, processing your credit purchases, and providing your account.</>,
                        <><strong className="text-foreground">Legitimate interests.</strong> Processing necessary for our legitimate interests, balanced against your rights — for example, securing the Service against fraud, improving our product, and direct marketing to existing users.</>,
                        <><strong className="text-foreground">Consent.</strong> Where we ask for your consent (e.g., marketing email opt-in, optional cookies, precise location). You may withdraw consent at any time.</>,
                        <><strong className="text-foreground">Legal obligation.</strong> Processing necessary to comply with applicable law — for example, tax and accounting compliance, sanctions compliance, fraud prevention and responding to lawful requests from authorities.</>,
                        <><strong className="text-foreground">Vital interests / public interest.</strong> In rare cases where processing is necessary to protect someone's life or for reasons of substantial public interest.</>,
                    ]}
                />
            </Section>

            <Section id="how-we-share" title="5. How We Share Information">
                <P>
                    We do <strong className="text-foreground">not</strong> sell your personal
                    information for monetary consideration. We share personal information
                    only in the following circumstances:
                </P>
                <List
                    items={[
                        <><strong className="text-foreground">Service providers.</strong> We share information with third-party vendors that perform services on our behalf — cloud hosting, payment processing, fraud detection, customer support tooling, analytics, error monitoring, transactional email delivery, and similar functions. These providers act on our instructions and are bound by contract to confidentiality and security obligations.</>,
                        <><strong className="text-foreground">Other users.</strong> Your username, avatar, public display name, lineups in completed contests, leaderboard rank, and contest history may be visible to other users.</>,
                        <><strong className="text-foreground">Legal and safety.</strong> We may disclose information if required to comply with law, regulation, subpoena, or other legal process; to enforce our Terms; to protect our rights, property, or safety, or that of our users or third parties; or to investigate suspected fraud or wrongdoing.</>,
                        <><strong className="text-foreground">Business transfers.</strong> If we are involved in a merger, acquisition, reorganization, financing, or sale of assets, your information may be transferred as part of that transaction. We will notify you (e.g., by email and/or notice on the Service) before your information becomes subject to a different privacy policy.</>,
                        <><strong className="text-foreground">With your consent or at your direction.</strong> For any purpose disclosed to you at the time of collection, or with your specific consent.</>,
                        <><strong className="text-foreground">Aggregated or de-identified data.</strong> We may share aggregated, de-identified, or anonymized data — which cannot reasonably be used to identify you — for any purpose, including research, marketing, or analytics.</>,
                    ]}
                />
            </Section>

            <Section id="retention" title="6. Data Retention">
                <P>
                    We retain personal information for as long as needed to provide the
                    Service, comply with our legal and regulatory obligations, resolve
                    disputes, and enforce our agreements. Specific retention periods depend
                    on the type of information and the purpose for which it was collected.
                </P>
                <List
                    items={[
                        'Account information is retained for the lifetime of your account and for a limited period after deletion (typically 30–90 days) to allow for account recovery and fraud investigations.',
                        'Transaction records are retained for the period required by applicable accounting, tax, payment and fraud-prevention laws.',
                        'Contest history and lineups associated with closed contests are retained for at least 3 years to enable dispute resolution and integrity audits.',
                        'Marketing preferences are retained for as long as you have an account or until you opt out.',
                        'Server logs containing IP address and similar diagnostics are typically retained for up to 90 days.',
                    ]}
                />
                <P>
                    Where we are required to delete information sooner — for example,
                    pursuant to a valid request to exercise your rights — we will do so
                    promptly, subject to limited exceptions described below.
                </P>
            </Section>

            <Section id="security" title="7. Security">
                <P>
                    We implement administrative, technical, and physical safeguards designed
                    to protect personal information against accidental or unlawful
                    destruction, loss, alteration, unauthorized disclosure, or access. These
                    include encryption of data in transit, encryption of passwords at rest,
                    network firewalling, least-privilege access controls, regular security
                    reviews, and intrusion monitoring.
                </P>
                <P>
                    However, no method of transmission over the Internet or method of
                    electronic storage is 100% secure. We cannot guarantee absolute security.
                    You are responsible for keeping your account credentials confidential and
                    for notifying us promptly of any suspected unauthorized access.
                </P>
            </Section>

            <Section id="international-transfers" title="8. International Data Transfers">
                <P>
                    BaseballFantasy is operated by CODERUSH SPÓŁKA Z OGRANICZONĄ
                    ODPOWIEDZIALNOŚCIĄ from Poland. Some service providers may process
                    personal information in countries outside the European Economic Area,
                    including the United States. Where required, such transfers are
                    protected by an adequacy decision, the European Commission’s Standard
                    Contractual Clauses or another legally recognized transfer mechanism.
                </P>
                <P>
                    Where we transfer personal data from the European Economic Area, United
                    Kingdom, or Switzerland to a country that has not received an adequacy
                    decision, we rely on appropriate safeguards — typically the European
                    Commission's Standard Contractual Clauses, the UK International Data
                    Transfer Agreement, or equivalent mechanisms — to ensure your data
                    receives an essentially equivalent level of protection.
                </P>
            </Section>

            <Section id="your-rights" title="9. Your Rights and Choices">
                <P>
                    Depending on where you live, you may have one or more of the following
                    rights regarding your personal information:
                </P>
                <List
                    items={[
                        <><strong className="text-foreground">Access.</strong> You can request a copy of the personal information we hold about you.</>,
                        <><strong className="text-foreground">Correction.</strong> You can request that we correct inaccurate or incomplete information.</>,
                        <><strong className="text-foreground">Deletion.</strong> You can request that we delete your personal information, subject to certain legal exceptions (e.g., we may need to retain records for tax or anti-fraud purposes).</>,
                        <><strong className="text-foreground">Portability.</strong> You can request a machine-readable copy of certain information you provided to us.</>,
                        <><strong className="text-foreground">Restriction and objection.</strong> You can ask us to restrict or object to certain uses of your information, including direct marketing and processing based on legitimate interests.</>,
                        <><strong className="text-foreground">Withdraw consent.</strong> Where processing is based on consent, you can withdraw it at any time without affecting the lawfulness of prior processing.</>,
                        <><strong className="text-foreground">Opt out of sale or sharing.</strong> California, Colorado, Connecticut, Virginia, and other US state residents can opt out of any "sale" or "sharing" of personal information as defined by their law. We do not sell or share personal information for cross-context behavioral advertising.</>,
                        <><strong className="text-foreground">Non-discrimination.</strong> We will not discriminate against you for exercising your rights.</>,
                        <><strong className="text-foreground">Lodge a complaint.</strong> If you are in the EEA/UK and believe our processing is unlawful, you can complain to your local supervisory authority.</>,
                    ]}
                />
                <P>
                    To exercise any of these rights, please email{' '}
                    <a className="font-medium text-primary underline" href="mailto:privacy@mybaseballfantasy.com">
                        privacy@mybaseballfantasy.com
                    </a>{' '}
                    or use the in-product controls available in your Account Settings. We
                    will respond within the time frame required by applicable law (typically
                    30–45 days). We may need to verify your identity before fulfilling your
                    request.
                </P>
            </Section>

            <Section id="california-disclosures" title="10. California-Specific Disclosures">
                <P>
                    If you are a California resident, the California Consumer Privacy Act,
                    as amended by the California Privacy Rights Act ("CCPA"), provides
                    additional rights. In the preceding twelve (12) months, we have
                    collected the categories of personal information described in Section 2
                    above for the business and commercial purposes described in Section 3.
                </P>
                <List
                    items={[
                        <><strong className="text-foreground">Categories collected:</strong> identifiers, customer records, commercial information (transactions), internet/network activity, geolocation (approximate), inferences, professional/employment-related information (if you apply for a job), and protected classifications (date of birth for age verification).</>,
                        <><strong className="text-foreground">Sources:</strong> directly from you, automatically from your devices, and from third-party service providers as described above.</>,
                        <><strong className="text-foreground">Sale or sharing of personal information:</strong> We do not sell or share personal information as defined by the CCPA, including for the purposes of cross-context behavioral advertising. We do not knowingly sell or share personal information of minors under 16.</>,
                        <><strong className="text-foreground">Sensitive personal information:</strong> We use sensitive personal information (such as government ID for verification, and account credentials) only for the limited purposes described in Section 3 and as permitted by Cal. Civ. Code § 1798.121.</>,
                    ]}
                />
                <P>
                    To submit a verifiable consumer request, email{' '}
                    <a className="font-medium text-primary underline" href="mailto:privacy@mybaseballfantasy.com">
                        privacy@mybaseballfantasy.com
                    </a>
                    . You may designate an authorized agent to make requests on your behalf.
                </P>
            </Section>

            <Section id="children" title="11. Children's Privacy">
                <P>
                    The Service is intended for users who are at least 18 years old (or 21
                    in jurisdictions that require a higher age for paid fantasy contests).
                    We do not knowingly collect personal information from children under 13.
                    If we learn that we have collected personal information from a child
                    under 13 without verifiable parental consent, we will promptly delete
                    that information.
                </P>
                <P>
                    If you believe a child under 13 may have provided us with personal
                    information, please contact us at{' '}
                    <a className="font-medium text-primary underline" href="mailto:privacy@mybaseballfantasy.com">
                        privacy@mybaseballfantasy.com
                    </a>
                    .
                </P>
            </Section>

            <Section id="third-party" title="12. Third-Party Links and Integrations">
                <P>
                    The Service may contain links to or embeds from third-party websites,
                    products, or services that we do not own or control. This Policy does
                    not apply to information that you provide to, or that is collected by,
                    those third parties. We are not responsible for the privacy practices of
                    any third party, and we encourage you to read each third party's privacy
                    policy before using their services.
                </P>
            </Section>

            <Section id="do-not-track" title="13. Do Not Track and Global Privacy Control">
                <P>
                    The Service does not currently respond to "Do Not Track" browser
                    signals. We do, however, honor recognized Global Privacy Control (GPC)
                    signals in jurisdictions where required by law, treating them as an opt-
                    out of any "sale" or "sharing" of personal information.
                </P>
            </Section>

            <Section id="changes" title="14. Changes to this Policy">
                <P>
                    We may update this Policy from time to time. If we make material
                    changes, we will notify you by email (sent to the address associated
                    with your account) or by means of a prominent notice on the Service
                    prior to the change becoming effective, and we will update the "Last
                    updated" date at the top of this page. Your continued use of the
                    Service after the effective date constitutes your acceptance of the
                    updated Policy.
                </P>
            </Section>

            <Section id="contact" title="15. Contact Us">
                <P>
                    If you have questions, comments, or requests regarding this Privacy
                    Policy or our handling of your personal information, please contact:
                </P>
                <P>
                    <strong className="text-foreground">Data Controller:</strong>
                    <br />
                    CODERUSH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ
                    <br />
                    ul. Zajęcza 15, 00-351 Warszawa, Poland
                    <br />
                    KRS: 0001188826
                    <br />
                    NIP: 5253057317
                    <br />
                    REGON: 542464145
                </P>
                <P>
                    Privacy enquiries:{' '}
                    <a className="font-medium text-primary underline" href="mailto:privacy@mybaseballfantasy.com">
                        privacy@mybaseballfantasy.com
                    </a>
                    <br />
                    General legal enquiries:{' '}
                    <a className="font-medium text-primary underline" href="mailto:legal@mybaseballfantasy.com">
                        legal@mybaseballfantasy.com
                    </a>
                </P>
            </Section>
        </LegalPageShell>
    )
}
