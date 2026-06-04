import Link from 'next/link'

const LEGAL_LINKS = [
    { href: '/legal/terms', label: 'Terms of Service' },
    { href: '/legal/privacy', label: 'Privacy Policy' },
    { href: '/legal/cookies', label: 'Cookies Policy' },
    { href: '/legal/refunds', label: 'Refund & Return Policy' },
]

export function LandingFooter() {
    return (
        <footer className="relative z-10 border-t border-white/5 py-10 px-6 text-gray-500">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center md:flex-row md:justify-between md:text-left">
                <div className="text-xs uppercase tracking-widest font-medium">
                    © 2026 BaseballFantasy • Daily fantasy baseball, every league
                </div>
                <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[10px] font-bold uppercase tracking-[0.2em]">
                    {LEGAL_LINKS.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="text-gray-500 transition-colors hover:text-white"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
            </div>
        </footer>
    )
}
