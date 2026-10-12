import { Callout, LegalPageShell, List, P, Section, Sub, Table } from '@/widgets/legal'

export const metadata = {
    title: 'Cookies Policy · BaseballFantasy',
    description:
        'What cookies and similar technologies BaseballFantasy uses, what each one does, and how to manage your preferences.',
}

export default function CookiesPolicyPage() {
    return (
        <LegalPageShell
            title="Cookies Policy"
            intro="This Cookies Policy explains what cookies and similar technologies BaseballFantasy uses on our website and applications, why we use them, and how you can manage your preferences."
            lastUpdated="June 4, 2026"
        >
            <Callout>
                <strong>In short:</strong> We use a small number of cookies — mostly to
                keep you signed in, remember your preferences, secure your account, and
                understand how the Service is being used. You can manage non-essential
                cookies through our in-product preference center and through your browser
                settings.
            </Callout>

            <Section id="what-are-cookies" title="1. What are cookies?">
                <P>
                    Cookies are small text files placed on your device (computer,
                    smartphone, tablet) when you visit a website. They allow the website to
                    recognize your device on subsequent visits and to store information
                    about your preferences or actions.
                </P>
                <P>
                    "Similar technologies" include local storage, session storage, IndexedDB,
                    pixels, web beacons, software development kits (SDKs), device
                    fingerprinting techniques, and server-side identifiers — all of which
                    work alongside or instead of cookies for similar purposes. In this
                    Policy, the term "cookies" includes all such technologies unless
                    otherwise specified.
                </P>
            </Section>

            <Section id="who-sets-them" title="2. Who sets cookies?">
                <List
                    items={[
                        <><strong className="text-foreground">First-party cookies</strong> are set by BaseballFantasy directly.</>,
                        <><strong className="text-foreground">Third-party cookies</strong> are set by service providers we use — for example, our payment processor on its hosted checkout page. These third parties may use cookies to recognize your device across different websites where their service is embedded.</>,
                    ]}
                />
            </Section>

            <Section id="duration" title="3. How long do cookies last?">
                <List
                    items={[
                        <><strong className="text-foreground">Session cookies</strong> are temporary and are deleted when you close your browser.</>,
                        <><strong className="text-foreground">Persistent cookies</strong> remain on your device for a set period of time or until you delete them manually. We use persistent cookies for purposes such as remembering your login, language, and accessibility preferences.</>,
                    ]}
                />
            </Section>

            <Section id="categories" title="4. Categories of cookies we use">
                <Sub title="4.1 Strictly necessary cookies">
                    <P>
                        These cookies are essential for the Service to function and cannot
                        be switched off. They include cookies that authenticate you, keep
                        you signed in, maintain your shopping/credit basket, secure your
                        session against cross-site request forgery, balance traffic across
                        our servers, and honor your security and privacy preferences. The
                        Service will not work properly without them.
                    </P>
                </Sub>
                <Sub title="4.2 Functional cookies">
                    <P>
                        These cookies allow the Service to remember choices you make and
                        provide enhanced, more personal features — for example, your
                        language, time zone, region, theme (light/dark), and recently
                        viewed leagues, players, or contests.
                    </P>
                </Sub>
                <Sub title="4.3 Performance and analytics cookies">
                    <P>
                        These cookies help us count visits and traffic sources, understand
                        which pages are most and least popular, and see how visitors move
                        around the Service. The information collected is aggregated and
                        statistical. If you do not allow these cookies, we will not know
                        when you have visited and will be less able to monitor performance.
                    </P>
                </Sub>
                <Sub title="4.4 Security and fraud-prevention cookies">
                    <P>
                        These cookies help us detect malicious activity, prevent fraud,
                        protect contests against multi-accounting and collusion, and
                        protect your account against unauthorized access.
                    </P>
                </Sub>
                <Sub title="4.5 Advertising cookies">
                    <P>
                        We do <strong className="text-foreground">not</strong> currently
                        use advertising or cross-context behavioral advertising cookies on
                        the Service. If that changes in the future, we will update this
                        Policy and ask for your consent where required by law.
                    </P>
                </Sub>
            </Section>

            <Section id="cookies-list" title="5. Specific cookies we use">
                <P>
                    The exact set of cookies present on your device may vary depending on
                    which areas of the Service you visit and which features you use. A
                    representative list is below.
                </P>
                <Table
                    headers={['Name', 'Set by', 'Purpose', 'Duration', 'Category']}
                    rows={[
                        { cells: ['baseball-fantasy.session_token', 'BaseballFantasy', 'Maintains your signed-in session.', '7 days', 'Strictly necessary'] },
                    ]}
                />
                <P className="text-xs">
                    We do not currently set analytics, advertising or other
                    non-essential cookies. You can inspect the cookies actually set on
                    your device through your browser's developer tools.
                </P>
            </Section>

            <Section id="third-parties" title="6. Third parties that may set cookies">
                <P>
                    We may use the following service providers, which may process
                    technical data (such as your IP address) when you use the Service:
                </P>
                <List
                    items={[
                        'Vercel Inc. (hosting and content delivery);',
                        'An authorized third-party payment service provider (payment processing, on its hosted checkout page).',
                    ]}
                />
                <P>
                    Each of these providers has its own privacy and cookies practices,
                    which we encourage you to review.
                </P>
            </Section>

            <Section id="manage" title="7. How to manage cookies">
                <Sub title="7.1 Browser controls">
                    <P>
                        Most browsers allow you to view, delete, and block cookies. The
                        method varies by browser:
                    </P>
                    <List
                        items={[
                            <><strong className="text-foreground">Chrome:</strong> Settings → Privacy and security → Cookies and other site data.</>,
                            <><strong className="text-foreground">Safari:</strong> Preferences → Privacy → Manage Website Data.</>,
                            <><strong className="text-foreground">Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data.</>,
                            <><strong className="text-foreground">Edge:</strong> Settings → Cookies and site permissions → Manage and delete cookies and site data.</>,
                        ]}
                    />
                    <P>
                        Please note: if you block strictly necessary cookies, the Service
                        will not function correctly. You may not be able to sign in, build
                        lineups, or enter contests.
                    </P>
                </Sub>
                <Sub title="7.2 Mobile devices">
                    <P>
                        Mobile operating systems provide controls to limit ad tracking and
                        reset advertising identifiers. On iOS, see Settings → Privacy &
                        Security → Tracking and Settings → Privacy & Security → Apple
                        Advertising. On Android, see Settings → Privacy → Ads.
                    </P>
                </Sub>
                <Sub title="7.3 Opt-out lists">
                    <P>
                        For advertising-related cookies generally (we do not use these
                        today, but for completeness):{' '}
                        <a className="font-medium text-primary underline" href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer">
                            NAI opt-out
                        </a>
                        ,{' '}
                        <a className="font-medium text-primary underline" href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
                            DAA opt-out
                        </a>
                        , and{' '}
                        <a className="font-medium text-primary underline" href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer">
                            Your Online Choices (EU)
                        </a>
                        .
                    </P>
                </Sub>
            </Section>

            <Section id="gpc" title="8. Global Privacy Control and Do Not Track">
                <P>
                    We honor recognized Global Privacy Control (GPC) signals in
                    jurisdictions where required by law, treating them as an opt-out of
                    the "sale" or "sharing" of personal information. Because we do not
                    sell or share personal information for cross-context behavioral
                    advertising, GPC signals do not change our handling of cookies today.
                </P>
                <P>
                    We do not currently respond to the legacy "Do Not Track" browser
                    signal.
                </P>
            </Section>

            <Section id="changes" title="9. Changes to this Policy">
                <P>
                    We may update this Cookies Policy from time to time to reflect changes
                    in technology, applicable laws, or how we use cookies. When we make
                    material changes, we will update the "Last updated" date at the top of
                    this page and, where required by law, ask for your renewed consent.
                </P>
            </Section>

            <Section id="contact" title="10. Contact">
                <P>
                    Questions about this Cookies Policy? Email{' '}
                    <a className="font-medium text-primary underline" href="mailto:privacy@mybaseballfantasy.com">
                        privacy@mybaseballfantasy.com
                    </a>
                    . For general legal inquiries, write to{' '}
                    <a className="font-medium text-primary underline" href="mailto:legal@mybaseballfantasy.com">
                        legal@mybaseballfantasy.com
                    </a>
                    .
                </P>
            </Section>
        </LegalPageShell>
    )
}
