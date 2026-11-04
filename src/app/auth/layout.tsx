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
            <main className="flex min-h-svh items-center justify-center bg-board/[0.07] p-4">
                <section className="flex w-full max-w-5xl flex-col rounded-md bg-board p-1.5 shadow-[0_24px_60px_-30px_rgba(18,53,36,0.9)] md:max-h-125 md:flex-row md:overflow-hidden">
                    <div className="flex-1 rounded-[4px] bg-background p-6 sm:p-8 md:min-h-0 md:overflow-y-auto md:p-10">
                        {children}
                    </div>
                    <div className="relative hidden min-h-48 flex-1 overflow-hidden rounded-[4px] bg-board md:block">
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
