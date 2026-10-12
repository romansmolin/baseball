import type { Metadata } from 'next'
import { connection } from 'next/server'
import {
    Anton,
    Geist,
    Geist_Mono,
    Inter,
    JetBrains_Mono,
    DM_Sans,
    Space_Grotesk,
} from 'next/font/google'
import './globals.css'
import { cn } from '@/shared/utils'

const spaceGroteskHeading = Space_Grotesk({ subsets: ['latin'], variable: '--font-heading' })

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-sans' })

const geistSans = Geist({
    variable: '--font-geist-sans',
    subsets: ['latin'],
})

const geistMono = Geist_Mono({
    variable: '--font-geist-mono',
    subsets: ['latin'],
})

const inter = Inter({
    variable: '--font-inter',
    subsets: ['latin'],
    weight: ['400', '500', '700', '900'],
})

const jetbrainsMono = JetBrains_Mono({
    variable: '--font-jetbrains-mono',
    subsets: ['latin'],
    weight: ['400', '700'],
})

const anton = Anton({
    variable: '--font-anton',
    subsets: ['latin'],
    weight: '400',
})

export const metadata: Metadata = {
    title: 'BaseballFantasy — Daily fantasy baseball, every league',
    description:
        'Daily fantasy baseball across MLB, NPB, KBO, LVBP and more. Build lineups under the salary cap, captain your star, take down the field.',
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
            className={cn(
                'h-full',
                'antialiased',
                geistSans.variable,
                geistMono.variable,
                inter.variable,
                jetbrainsMono.variable,
                anton.variable,
                'font-sans',
                dmSans.variable,
                spaceGroteskHeading.variable,
            )}
        >
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    )
}
