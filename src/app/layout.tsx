import type { Metadata } from 'next'
import { Anton, Geist, Geist_Mono, Inter, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { SmoothScrollProvider } from './smooth-scroll-provider'

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
    title: 'Global Diamond Series 2026',
    description: 'The pinnacle of international baseball returns. 32 Nations. One champion.',
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <html
            lang="en"
            className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} ${jetbrainsMono.variable} ${anton.variable} h-full antialiased`}
        >
            <body className="min-h-full flex flex-col">
                <SmoothScrollProvider>{children}</SmoothScrollProvider>
            </body>
        </html>
    )
}
