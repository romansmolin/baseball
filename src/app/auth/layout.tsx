import Image from 'next/image'
import { Toaster } from 'sonner'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'Basebal Fantasy - Authentication',
}

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <>
            <main className="h-svh flex items-center justify-center">
                <section className="flex p-2 border border-primary rounded-2xl min-h-[70vh] max-h-125 w-full max-w-5xl">
                    <div className="flex-1 p-10">{children}</div>
                    <div className="relative flex-1 overflow-hidden rounded-xl bg-primary">
                        <Image
                            src="/image.png"
                            alt="Basebal Fantasy"
                            fill
                            priority
                            sizes="(max-width: 768px) 0px, 50vw"
                            className="object-cover"
                        />
                    </div>
                </section>
            </main>
            <Toaster richColors position="top-right" />
        </>
    )
}
