import { Callout, LegalPageShell, List, P, Section, Sub } from '@/widgets/legal'

export const metadata = {
    title: 'Terms of Service · BaseballFantasy',
    description:
        'The legally binding agreement between you and BaseballFantasy that governs your use of the Service.',
}

export default function TermsOfServicePage() {
    return (
        <LegalPageShell
            title="Terms of Service"
            intro="These Terms of Service (“Terms”) form a legally binding agreement between you and BaseballFantasy (“we,” “us,” or “our”) and govern your access to and use of our website, mobile applications, APIs, contests, credit economy, and all related services (collectively, the “Service”)."
            lastUpdated="June 4, 2026"
        >
            <Callout>
                <strong>Read this carefully.</strong> By creating an account, accessing,
                or using the Service, you agree to be bound by these Terms and by our{' '}
                <a className="font-medium text-primary underline" href="/legal/privacy">
                    Privacy Policy
                </a>
                ,{' '}
                <a className="font-medium text-primary underline" href="/legal/cookies">
                    Cookies Policy
                </a>
                , and{' '}
                <a className="font-medium text-primary underline" href="/legal/refunds">
                    Refund & Return Policy
                </a>
                . If you do not agree, do not use the Service. These Terms contain an{' '}
                <strong>arbitration agreement and a class-action waiver</strong> in
                Section 16.
            </Callout>

            <Section id="acceptance" title="1. Acceptance of these Terms">
                <P>
                    By accessing or using the Service in any way — including registering an
                    account, browsing as a guest, entering a contest, building a lineup,
                    purchasing credits, or interacting with any feature — you confirm that
                    you have read, understood, and agree to be bound by these Terms and all
                    policies referenced in them.
                </P>
                <P>
                    If you are accepting these Terms on behalf of a company or other legal
                    entity, you represent that you have authority to bind that entity to
                    these Terms, in which case "you" refers to that entity.
                </P>
            </Section>

            <Section id="eligibility" title="2. Eligibility">
                <P>To use the Service, you must:</P>
                <List
                    items={[
                        'Be at least 18 years of age, or the age of majority in your jurisdiction, whichever is greater. In some jurisdictions, the minimum age for paid fantasy contests is 19 or 21 — you must meet that higher age to participate in paid contests there.',
                        'Reside in a jurisdiction where participation in fantasy sports contests is legal. The Service is not offered in jurisdictions where it is prohibited, and we reserve the right to restrict access based on geographic location, IP address, or regulatory requirements.',
                        'Have the legal capacity to enter into a binding contract.',
                        'Not be barred from receiving the Service under the laws of the United States or any other applicable jurisdiction, including any sanctions list maintained by the U.S. Treasury Department’s Office of Foreign Assets Control.',
                        'Not be an employee, officer, director, contractor, or agent of BaseballFantasy or any of its affiliates, or an immediate family member of such a person, with respect to any paid contest.',
                    ]}
                />
                <P>
                    We may, at our discretion, refuse to offer the Service to any person and
                    may change our eligibility criteria at any time.
                </P>
            </Section>

            <Section id="account" title="3. Your Account">
                <Sub title="3.1 Registration">
                    <P>
                        To access most features of the Service, you must create an account.
                        You agree to provide accurate, current, and complete information
                        during registration and to keep that information up to date.
                    </P>
                </Sub>
                <Sub title="3.2 One account per person">
                    <P>
                        You may register and maintain only one account. Multi-accounting,
                        creating accounts on behalf of others, sharing accounts, or
                        transferring accounts is strictly prohibited and grounds for
                        immediate termination and forfeiture of any credit balance, entries,
                        or winnings.
                    </P>
                </Sub>
                <Sub title="3.3 Security">
                    <P>
                        You are responsible for safeguarding your account credentials and
                        for any activity that occurs through your account. You agree to
                        notify us immediately of any unauthorized access. We are not liable
                        for any loss or damage arising from your failure to maintain the
                        security of your account.
                    </P>
                </Sub>
                <Sub title="3.4 Identity verification">
                    <P>
                        We may, at any time, require you to verify your identity, age, or
                        location, including by submitting government-issued identification.
                        Failure to complete verification may result in suspension or
                        termination.
                    </P>
                </Sub>
            </Section>

            <Section id="service" title="4. Description of the Service">
                <P>
                    BaseballFantasy is a skill-based daily fantasy sports platform that
                    allows users to assemble virtual lineups of real-world baseball players
                    from supported professional leagues, enter those lineups into contests,
                    and earn points and platform credits based on the real-world statistical
                    performance of those players. Features include the Player Pool, Team
                    Builder, Contests, Leagues, and the My Teams dashboard.
                </P>
                <P>
                    The Service does <strong className="text-foreground">not</strong>{' '}
                    involve wagering on the outcome of a sporting event. The outcome of
                    each contest is determined predominantly by your skill in roster
                    selection, lineup construction, salary-cap management, and captain
                    selection.
                </P>
            </Section>

            <Section id="credits" title="5. The Credits Economy">
                <Sub title="5.1 Nature of credits">
                    <P>
                        "Credits" are virtual, non-redeemable units used within the Service
                        to enter paid contests, unlock optional features, and receive
                        promotional rewards. Credits are <strong className="text-foreground">not</strong>{' '}
                        money, do not represent a deposit, do not earn interest, are not
                        redeemable for cash, gift cards, or other monetary value, and may
                        not be sold, traded, gifted, or transferred outside the Service.
                    </P>
                </Sub>
                <Sub title="5.2 Acquisition of credits">
                    <P>You may acquire credits by:</P>
                    <List
                        items={[
                            'Purchasing them through the Service using a supported payment method;',
                            'Receiving them as promotional or referral rewards;',
                            'Winning them in contests;',
                            'Other means we may make available from time to time.',
                        ]}
                    />
                </Sub>
                <Sub title="5.3 Use and expiration">
                    <P>
                        Credits may be used only within the Service for the purposes we
                        designate. We may modify, suspend, or eliminate any credit feature,
                        type, or balance at any time, in our discretion, with or without
                        notice. Promotional credits may expire and may carry use
                        restrictions.
                    </P>
                </Sub>
                <Sub title="5.4 No ownership">
                    <P>
                        Credits are licensed to you for use within the Service. You have no
                        property right, title, or ownership interest in or to any credits.
                        Credits remain our property at all times.
                    </P>
                </Sub>
                <Sub title="5.5 Refunds">
                    <P>
                        Refunds for credit purchases are governed by our{' '}
                        <a className="font-medium text-primary underline" href="/legal/refunds">
                            Refund & Return Policy
                        </a>
                        .
                    </P>
                </Sub>
            </Section>

            <Section id="contests" title="6. Contests and Lineups">
                <Sub title="6.1 Entry">
                    <P>
                        Each contest has its own rules — entry fee (if any), maximum
                        entries, scoring rules, roster format, lock time, and prize
                        structure. By entering, you agree to those contest-specific rules in
                        addition to these Terms. Some contests are free to enter; others
                        require credits.
                    </P>
                </Sub>
                <Sub title="6.2 Lock time">
                    <P>
                        Lineups lock at the contest's designated lock time. After lock, no
                        changes may be made and no entries accepted. You are solely
                        responsible for ensuring your lineup is complete and submitted prior
                        to lock.
                    </P>
                </Sub>
                <Sub title="6.3 Scoring and results">
                    <P>
                        Scores are calculated based on real-world statistical performance
                        from our third-party data providers. We endeavor to use accurate
                        data, but we are not responsible for stat-provider errors. We may,
                        in our discretion, adjust scores to correct material errors within
                        a reasonable period after the contest closes.
                    </P>
                </Sub>
                <Sub title="6.4 Cancellation, postponement, and rain-outs">
                    <P>
                        If a real-world game underlying a contest is cancelled, postponed,
                        suspended, or otherwise materially affected, we may, in our
                        discretion: (a) leave the contest as scheduled, (b) adjust the
                        scoring window, (c) refund entry fees in credits, or (d) cancel the
                        contest and refund all entries. Contest-specific rules will explain
                        the treatment.
                    </P>
                </Sub>
                <Sub title="6.5 Captain multiplier">
                    <P>
                        Where a contest format supports a "Captain" designation, the points
                        scored by your captain are multiplied by 1.5×. Captain designation
                        rules are described on each contest page.
                    </P>
                </Sub>
            </Section>

            <Section id="acceptable-use" title="7. Acceptable Use">
                <P>You agree not to:</P>
                <List
                    items={[
                        'Use the Service for any illegal, fraudulent, or unauthorized purpose;',
                        'Create more than one account, use someone else’s account, or share your account credentials;',
                        'Collude with other users, share lineups for the purpose of gaining unfair advantage, or coordinate entries across multiple accounts;',
                        'Use any bot, scraper, crawler, automated process, headless browser, or any other automated means to access, interact with, or extract data from the Service except for permitted public API access;',
                        'Reverse engineer, decompile, disassemble, or otherwise attempt to derive source code from the Service or any portion of it;',
                        'Interfere with or disrupt the Service or any servers or networks connected to it, including by submitting malicious code, denial-of-service attacks, or excessive request volume;',
                        'Use the Service to harass, threaten, defame, or otherwise harm any other user or third party;',
                        'Upload, post, or transmit content that is unlawful, infringing, defamatory, obscene, hateful, or otherwise objectionable;',
                        'Impersonate any person or entity or misrepresent your affiliation with a person or entity;',
                        'Attempt to exploit bugs, glitches, or unintended features for unfair advantage. You agree to promptly report such issues to us;',
                        'Use any means to manipulate contest outcomes, scoring, leaderboards, or user-facing balances;',
                        'Resell, sublicense, lease, or otherwise commercially exploit the Service or any part of it without our prior written consent.',
                    ]}
                />
                <P>
                    Violations may result in immediate suspension or termination,
                    forfeiture of any credit balance, entries, and winnings, and may be
                    reported to law enforcement.
                </P>
            </Section>

            <Section id="ip" title="8. Intellectual Property">
                <Sub title="8.1 Our IP">
                    <P>
                        The Service and all content, software, designs, trademarks, logos,
                        text, images, audio, video, data compilations, and other materials
                        provided through it (collectively, "Our Content") are the
                        intellectual property of BaseballFantasy or our licensors and are
                        protected by United States and international intellectual property
                        laws. Except for the limited license granted below, all rights are
                        reserved.
                    </P>
                </Sub>
                <Sub title="8.2 Limited license">
                    <P>
                        Subject to your compliance with these Terms, we grant you a
                        limited, personal, non-exclusive, non-transferable, non-
                        sublicensable, revocable license to access and use the Service for
                        your own personal, non-commercial use.
                    </P>
                </Sub>
                <Sub title="8.3 User content">
                    <P>
                        "User Content" means any content you submit, post, upload, or
                        otherwise make available through the Service — including
                        usernames, display names, lineup names, comments, and avatars. You
                        retain all rights you have in your User Content.
                    </P>
                    <P>
                        By submitting User Content, you grant us a worldwide, royalty-free,
                        non-exclusive, sublicensable, transferable license to use, copy,
                        host, store, reproduce, modify, create derivative works of,
                        publicly display, publicly perform, and distribute your User
                        Content for the purposes of operating, providing, improving, and
                        promoting the Service.
                    </P>
                    <P>
                        You represent and warrant that (a) you own or have all necessary
                        rights to your User Content and to grant the license above, and (b)
                        your User Content does not violate the rights of any third party or
                        any applicable law.
                    </P>
                </Sub>
                <Sub title="8.4 Feedback">
                    <P>
                        If you submit ideas, suggestions, or feedback about the Service, we
                        may use them without obligation, compensation, or attribution to
                        you.
                    </P>
                </Sub>
                <Sub title="8.5 Player names, statistics, and league marks">
                    <P>
                        Real-world player names, team names, league names, statistics,
                        schedules, and similar publicly available sports information are
                        used under license from third-party data providers or under
                        applicable law. Their use on the Service does not imply
                        sponsorship, endorsement, or affiliation by any player, team,
                        league, or governing body unless expressly stated.
                    </P>
                </Sub>
            </Section>

            <Section id="copyright" title="9. Copyright and DMCA">
                <P>
                    We respect intellectual property rights. If you believe that material on
                    the Service infringes your copyright, please send a notice that
                    complies with the Digital Millennium Copyright Act (17 U.S.C. § 512) to
                    our designated agent at{' '}
                    <a className="font-medium text-primary underline" href="mailto:dmca@baseballfantasy.com">
                        dmca@baseballfantasy.com
                    </a>{' '}
                    with: (1) your physical or electronic signature; (2) identification of
                    the copyrighted work claimed to be infringed; (3) identification of the
                    allegedly infringing material; (4) your contact information; (5) a
                    statement that you have a good-faith belief that the use is not
                    authorized; and (6) a statement, under penalty of perjury, that the
                    information is accurate and that you are the owner or authorized to act
                    on behalf of the owner.
                </P>
                <P>
                    We may terminate the accounts of users who are determined to be repeat
                    infringers.
                </P>
            </Section>

            <Section id="payment" title="10. Payments, Taxes, and Promotions">
                <P>
                    Prices for credits and paid features are displayed in the Service. All
                    purchases are processed by our third-party payment processor and are
                    subject to that processor's own terms. You authorize us (and our
                    processor) to charge your selected payment method for all amounts due,
                    including any applicable taxes.
                </P>
                <P>
                    You are responsible for any taxes (including sales, use, value-added,
                    or similar) that may apply to your purchases, except for taxes based on
                    our income.
                </P>
                <P>
                    Promotions, bonus credits, and similar offers are subject to additional
                    terms disclosed at the time of the promotion. We may modify or
                    discontinue any promotion at any time. Promotional credits typically
                    cannot be combined with other offers and may carry expiration dates and
                    use restrictions.
                </P>
            </Section>

            <Section id="termination" title="11. Suspension and Termination">
                <P>
                    We may suspend, restrict, or terminate your account, withhold
                    winnings, freeze credit balances, or refuse service at any time if we
                    determine, in our reasonable discretion, that you have violated these
                    Terms, applicable law, or that your conduct poses a risk to the
                    integrity of contests, the Service, or other users.
                </P>
                <P>
                    You may terminate your account at any time by using the in-product
                    deletion flow or by contacting{' '}
                    <a className="font-medium text-primary underline" href="mailto:support@baseballfantasy.com">
                        support@baseballfantasy.com
                    </a>
                    . Upon termination: (a) your right to access the Service ends
                    immediately; (b) any remaining credit balance is forfeited, except as
                    required by law or our Refund & Return Policy; and (c) provisions of
                    these Terms that by their nature should survive termination (including
                    Sections 7, 8, 12, 13, 14, 15, 16, and 17) will survive.
                </P>
            </Section>

            <Section id="disclaimer" title="12. Disclaimer of Warranties">
                <P className="uppercase">
                    The Service is provided on an "as is" and "as available" basis. To the
                    maximum extent permitted by applicable law, BaseballFantasy and its
                    affiliates, licensors, and service providers disclaim all warranties of
                    any kind, whether express, implied, statutory, or otherwise, including
                    any warranties of merchantability, fitness for a particular purpose,
                    title, and non-infringement.
                </P>
                <P>
                    Without limiting the foregoing, we do not warrant that the Service will
                    be uninterrupted, secure, error-free, or free of harmful components; that
                    defects will be corrected; that any data or content will be accurate or
                    complete; or that the Service will meet your requirements or
                    expectations.
                </P>
            </Section>

            <Section id="liability" title="13. Limitation of Liability">
                <P className="uppercase">
                    To the maximum extent permitted by applicable law, in no event will
                    BaseballFantasy or its affiliates, officers, directors, employees,
                    licensors, or service providers be liable for any indirect, incidental,
                    consequential, special, exemplary, or punitive damages, or any loss of
                    profits, revenue, data, or use, arising out of or in connection with
                    these Terms or the Service, even if advised of the possibility of such
                    damages.
                </P>
                <P className="uppercase">
                    Our aggregate liability for any claim arising out of or relating to
                    these Terms or the Service will not exceed the greater of (a) the total
                    amount you paid to us in the twelve (12) months preceding the event
                    giving rise to the claim, or (b) one hundred U.S. dollars ($100).
                </P>
                <P>
                    Some jurisdictions do not allow the exclusion of certain warranties or
                    the limitation or exclusion of liability for certain types of damages,
                    so some of the above limitations may not apply to you.
                </P>
            </Section>

            <Section id="indemnification" title="14. Indemnification">
                <P>
                    To the maximum extent permitted by law, you agree to indemnify, defend,
                    and hold harmless BaseballFantasy and its affiliates, officers,
                    directors, employees, licensors, and service providers from and against
                    any claims, liabilities, damages, losses, costs, and expenses
                    (including reasonable attorneys' fees) arising from (a) your use of the
                    Service; (b) your violation of these Terms or any law; (c) your User
                    Content; or (d) your violation of any third-party right.
                </P>
            </Section>

            <Section id="governing-law" title="15. Governing Law">
                <P>
                    These Terms and any dispute arising out of or relating to them or the
                    Service are governed by the laws of the State of Delaware, USA, without
                    regard to its conflict of laws rules. The United Nations Convention on
                    Contracts for the International Sale of Goods does not apply.
                </P>
            </Section>

            <Section id="arbitration" title="16. Binding Arbitration and Class-Action Waiver">
                <Callout>
                    <strong>Please read this section carefully.</strong> It requires you and
                    BaseballFantasy to resolve disputes through binding individual
                    arbitration and waives your right to participate in class actions or
                    jury trials, except as provided below.
                </Callout>
                <Sub title="16.1 Informal resolution">
                    <P>
                        Before filing a claim, you and BaseballFantasy agree to attempt to
                        resolve any dispute by contacting us at{' '}
                        <a className="font-medium text-primary underline" href="mailto:legal@baseballfantasy.com">
                            legal@baseballfantasy.com
                        </a>{' '}
                        with a written description of the dispute and to negotiate in good
                        faith for at least sixty (60) days.
                    </P>
                </Sub>
                <Sub title="16.2 Arbitration">
                    <P>
                        Any dispute not resolved informally will be resolved by final and
                        binding arbitration administered by the American Arbitration
                        Association ("AAA") in accordance with its Consumer Arbitration
                        Rules. The arbitration will be conducted in the English language in
                        a location reasonably convenient to you, or by videoconference. The
                        arbitrator's decision will be binding and may be entered as a
                        judgment in any court of competent jurisdiction.
                    </P>
                </Sub>
                <Sub title="16.3 Class-action waiver">
                    <P>
                        You and BaseballFantasy agree that disputes will be brought only in
                        an individual capacity, and not as a plaintiff or class member in
                        any purported class, collective, consolidated, or representative
                        proceeding. The arbitrator may not consolidate more than one
                        person's claims and may not preside over any class or representative
                        proceeding.
                    </P>
                </Sub>
                <Sub title="16.4 Exceptions">
                    <P>
                        You and BaseballFantasy retain the right to (a) bring an individual
                        action in small claims court for disputes within that court's
                        jurisdiction, and (b) seek injunctive or other equitable relief in a
                        court of competent jurisdiction to prevent the actual or threatened
                        infringement, misappropriation, or violation of intellectual
                        property rights.
                    </P>
                </Sub>
                <Sub title="16.5 Opt-out">
                    <P>
                        You may opt out of this arbitration agreement by sending a written
                        opt-out notice to{' '}
                        <a className="font-medium text-primary underline" href="mailto:legal@baseballfantasy.com">
                            legal@baseballfantasy.com
                        </a>{' '}
                        within thirty (30) days of first accepting these Terms. Your notice
                        must include your name, the email associated with your account, and
                        a clear statement that you wish to opt out.
                    </P>
                </Sub>
            </Section>

            <Section id="changes" title="17. Changes to these Terms">
                <P>
                    We may modify these Terms from time to time. If we make material
                    changes, we will notify you by email or by a prominent notice on the
                    Service before the changes take effect. Your continued use of the
                    Service after the effective date constitutes your acceptance of the
                    updated Terms. If you do not agree, you must stop using the Service.
                </P>
            </Section>

            <Section id="general" title="18. General Provisions">
                <List
                    items={[
                        <><strong className="text-foreground">Entire agreement.</strong> These Terms, together with the Privacy Policy, Cookies Policy, Refund & Return Policy, and any contest-specific rules, constitute the entire agreement between you and BaseballFantasy regarding the Service and supersede all prior agreements.</>,
                        <><strong className="text-foreground">Severability.</strong> If any provision of these Terms is found unenforceable, that provision will be enforced to the maximum extent permitted and the remaining provisions will remain in full force and effect.</>,
                        <><strong className="text-foreground">No waiver.</strong> Our failure to enforce any right or provision is not a waiver of that right or provision.</>,
                        <><strong className="text-foreground">Assignment.</strong> You may not assign or transfer these Terms or any rights under them without our prior written consent. We may assign these Terms freely.</>,
                        <><strong className="text-foreground">Force majeure.</strong> We are not liable for any delay or failure to perform caused by events outside our reasonable control.</>,
                        <><strong className="text-foreground">Notices.</strong> We may give notices to you by email, in-product notification, or posting on the Service. Notices to us must be sent to legal@baseballfantasy.com.</>,
                        <><strong className="text-foreground">Headings.</strong> Section headings are for reference only and do not affect interpretation.</>,
                    ]}
                />
            </Section>

            <Section id="contact" title="19. Contact">
                <P>
                    <strong className="text-foreground">BaseballFantasy — Legal Team</strong>
                    <br />
                    General legal:{' '}
                    <a className="font-medium text-primary underline" href="mailto:legal@baseballfantasy.com">
                        legal@baseballfantasy.com
                    </a>
                    <br />
                    Support:{' '}
                    <a className="font-medium text-primary underline" href="mailto:support@baseballfantasy.com">
                        support@baseballfantasy.com
                    </a>
                </P>
            </Section>
        </LegalPageShell>
    )
}
