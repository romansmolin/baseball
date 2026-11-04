import { COMPANY } from '@/shared/company'
import { DefList, LegalPageShell, P, Section } from '@/widgets/legal'

export const metadata = {
    title: 'Contact · BaseballFantasy',
    description: 'Who runs BaseballFantasy and how to reach us about your account, payments and privacy.',
}

const mail = (address: string) => (
    <a className="font-medium text-primary underline" href={`mailto:${address}`}>{address}</a>
)

export default function ContactPage() {
    return (
        <LegalPageShell
            title="Contact"
            intro="BaseballFantasy is operated by CODERUSH SPÓŁKA Z OGRANICZONĄ ODPOWIEDZIALNOŚCIĄ. Write to us about your account, a payment or your data."
            lastUpdated="November 4, 2026"
        >
            <Section id="company" title="1. Company">
                <P>
                    <strong className="text-foreground">{COMPANY.legalName}</strong>
                    <br />
                    {COMPANY.address}
                    <br />
                    KRS: {COMPANY.krs} · NIP: {COMPANY.nip} · REGON: {COMPANY.regon}
                    <br />
                    Website: {COMPANY.siteUrl}
                </P>
            </Section>
            <Section id="email" title="2. Who to write to">
                <DefList
                    items={[
                        { term: 'Help with the service or your account', definition: mail(COMPANY.supportEmail) },
                        { term: 'Payments, receipts and refunds', definition: mail(COMPANY.billingEmail) },
                        { term: 'Your personal data and cookies', definition: mail(COMPANY.privacyEmail) },
                        { term: 'Legal matters', definition: mail(COMPANY.legalEmail) },
                    ]}
                />
                <P>For a payment question, include the transaction ID from your receipt email.</P>
            </Section>
        </LegalPageShell>
    )
}
