'use client'
import Link from 'next/link'
import { useCommunityOverviewData, useDailyContestsData } from '@/entities/showcase'
import { buttonVariants } from '@/shared/ui/button'
import { number } from './showcase-primitives'
export function LandingShowcase() {
    const overview = useCommunityOverviewData()
    const contests = useDailyContestsData('REPLAY', 3)
    return <section className="mx-auto max-w-6xl px-6 py-16"><div className="rounded-2xl border border-white/15 bg-white/5 p-6 md:p-9"><p className="text-xs tracking-widest text-primary uppercase">Daily baseball · Free to play</p><div className="mt-4 flex flex-wrap items-start justify-between gap-6"><div><h2 className="font-anton text-3xl md:text-4xl">A new lineup. A new game day.</h2><p className="mt-3 max-w-xl text-sm text-white/65">Explore real baseball statistics, historical Replay contests and a community of demo managers built to showcase the full fantasy experience.</p>{overview.data && <p className="mt-5 text-sm text-white/75">{number(overview.data.demoProfiles)} demo profiles · {number(overview.data.activeDemo30Days)} active demo managers over 30 days</p>}</div><Link href="/contests" className={buttonVariants({ size: 'lg' })}>Explore daily contests →</Link></div>{!!contests.data?.items.length && <div className="mt-7 grid gap-3 md:grid-cols-3">{contests.data.items.map(contest => <Link key={contest.id} href={`/contests/${encodeURIComponent(contest.id)}`} className="rounded-xl border border-white/10 p-4 hover:border-primary/50"><span className="text-xs text-white/50">Replay · Free entry</span><div className="mt-2 font-medium">{contest.name}</div><div className="mt-2 text-xs text-white/60">{number(contest.memberCount)} entries</div></Link>)}</div>}</div></section>
}
