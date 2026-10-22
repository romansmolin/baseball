import Image from 'next/image'
import { Toaster } from 'sonner'

import type { Metadata } from 'next'

export const metadata: Metadata = {
    title: 'BaseballFantasy - Authentication',
}

export default function AuthLayout({
    children,
}: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <>
            <main className="flex min-h-svh items-center justify-center p-4">
                <section className="flex w-full max-w-5xl flex-col rounded-2xl border border-primary p-2 md:max-h-125 md:min-h-[70vh] md:flex-row md:overflow-hidden">
                    <div className="flex-1 p-6 sm:p-8 md:min-h-0 md:overflow-y-auto md:p-10">
                        {children}
                    </div>
                    <div className="relative hidden min-h-48 flex-1 overflow-hidden rounded-xl bg-primary md:block">
                        <Image
                            src="/image.png"
                            alt="BaseballFantasy"
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
