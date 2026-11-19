import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Archivo, Big_Shoulders, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { CookieBanner } from '@/features/cookie-consent'
import { cn } from '@/shared/utils'

const archivo = Archivo({ subsets: ['latin'], variable: '--font-sans' })

const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains-mono',
    subsets: ['latin'],
    weight: ['400', '700'],
})

// Scoreboard lettering: condensed, industrial, built for big numerals.
const bigShoulders = Big_Shoulders({
    variable: '--font-anton',
    subsets: ['latin'],
    weight: ['700', '800', '900'],
})

export const metadata: Metadata = {
    title: 'BaseballFantasy — Fantasy baseball research assistant',
    description:
        'Player analytics, comparisons, upcoming game outlooks and AI picks to help you manage your fantasy baseball team on any platform.',
}

// Nonce-based CSP needs per-request rendering; static HTML can't carry a nonce.
export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    await connection()

    return (
        <html
            lang="en"
            className={cn('h-full', 'antialiased', 'font-sans', archivo.variable, jetbrainsMono.variable, bigShoulders.variable)}
        >
            <body className="min-h-full flex flex-col">
                {children}
                <CookieBanner />
            </body>
        </html>
    )
}
