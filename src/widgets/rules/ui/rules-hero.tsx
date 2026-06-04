import { BookOpenCheckIcon, SparklesIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

export const RulesHero = () => (
    <section className="relative overflow-hidden rounded-3xl border border-amber-400/40 bg-linear-to-br from-amber-200 via-yellow-100 to-orange-200 p-8 text-amber-950 shadow-[0_30px_80px_-40px_rgba(251,191,36,0.6)] dark:from-amber-300 dark:via-yellow-200 dark:to-orange-300 dark:text-amber-950 sm:p-10">
        <div
            aria-hidden
            className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-yellow-300/60 blur-3xl"
        />
        <div
            aria-hidden
            className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-orange-300/50 blur-3xl"
        />

        <div className="relative flex flex-col gap-5">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-950/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-900 backdrop-blur">
                <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
                Standard ruleset · v1
            </span>

            <div className="flex items-start gap-4">
                <span className="flex size-14 items-center justify-center rounded-2xl bg-amber-950/10 text-amber-900 ring-1 ring-amber-950/10 backdrop-blur">
                    <HugeiconsIcon icon={BookOpenCheckIcon} className="size-7" />
                </span>
                <div>
                    <h1 className="font-anton text-4xl leading-tight tracking-wide sm:text-5xl">
                        Rules of the game
                    </h1>
                    <p className="mt-2 max-w-xl text-base text-amber-900/80">
                        Every tournament uses the same scoring engine. Pick smart, lock
                        your lineup before kickoff, and let real MLB box scores do the
                        rest.
                    </p>
                </div>
            </div>
        </div>
    </section>
)
