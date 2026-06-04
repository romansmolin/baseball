import { BaseballIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import Link from 'next/link'

interface LegalPageShellProps {
    title: string
    intro: string
    lastUpdated: string
    children: React.ReactNode
}

const RELATED_LINKS: { href: string; label: string }[] = [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/cookies', label: 'Cookies Policy' },
    { href: '/legal/refunds', label: 'Refund & Return Policy' },
]

export const LegalPageShell = ({
    title,
    intro,
    lastUpdated,
    children,
}: LegalPageShellProps) => (
    <div className="min-h-svh bg-background text-foreground">
        <header className="sticky top-0 z-30 border-b border-foreground/10 bg-background/80 backdrop-blur">
            <div className="container mx-auto flex h-16 max-w-4xl items-center justify-between gap-6 px-6">
                <Link href="/" className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-primary/15 text-primary">
                        <HugeiconsIcon icon={BaseballIcon} className="size-4" />
                    </span>
                    <span className="font-anton text-lg tracking-wide">
                        Baseball<span className="text-primary">Fantasy</span>
                    </span>
                </Link>
                <Link
                    href="/"
                    className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    Back to site
                </Link>
            </div>
        </header>

        <main className="container mx-auto max-w-3xl px-6 py-12 md:py-16">
            <div className="mb-10 border-b border-foreground/10 pb-8">
                <p className="mb-3 text-xs font-semibold tracking-wider text-primary uppercase">
                    Legal
                </p>
                <h1 className="font-anton text-4xl tracking-wide md:text-5xl">{title}</h1>
                <p className="mt-4 text-base text-muted-foreground">{intro}</p>
                <p className="mt-4 text-xs tracking-wider text-muted-foreground uppercase">
                    Last updated: {lastUpdated}
                </p>
            </div>

            <article className="space-y-2">{children}</article>

            <div className="mt-16 border-t border-foreground/10 pt-8">
                <p className="mb-4 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Other legal documents
                </p>
                <div className="flex flex-wrap gap-2">
                    {RELATED_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="rounded-full border border-foreground/15 px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-muted"
                        >
                            {link.label}
                        </Link>
                    ))}
                </div>
            </div>

            <div className="mt-10 text-xs text-muted-foreground">
                <p>
                    Questions? Contact us at{' '}
                    <a
                        href="mailto:legal@baseballfantasy.com"
                        className="font-medium text-primary hover:underline"
                    >
                        legal@baseballfantasy.com
                    </a>
                    .
                </p>
            </div>
        </main>

        <footer className="border-t border-foreground/10 py-8">
            <div className="container mx-auto max-w-4xl px-6 text-center text-xs text-muted-foreground">
                © 2026 BaseballFantasy · Daily fantasy baseball, every league
            </div>
        </footer>
    </div>
)
