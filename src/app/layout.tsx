import type { Metadata } from 'next'
import { connection } from 'next/server'
import { Archivo, Big_Shoulders, JetBrains_Mono } from 'next/font/google'
import './globals.css'
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
    title: 'BaseballFantasy — Daily fantasy baseball, every league',
    description:
        'Fantasy baseball contests across MLB and affiliated North American leagues. Build lineups under the salary cap, captain your star, take down the field.',
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
            <body className="min-h-full flex flex-col">{children}</body>
        </html>
    )
}
