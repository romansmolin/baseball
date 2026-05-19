'use client'

import { motion } from 'framer-motion'
import { Ticket } from 'lucide-react'
import { useRef } from 'react'

import { Button } from '@/shared/ui'

import { HERO_STATS, SEQUENCE_STAGES } from '../model/landing.const'
import { useHeroScroll } from '../model/use-hero-scroll'
import { ScrollFrameBackground } from './scroll-frame-background'

export function HeroSection() {
    const introRef = useRef<HTMLElement>(null)
    const {
        rawProgress,
        headerOpacity,
        contentY,
        scrollIndicatorOpacity,
        sequenceHudOpacity,
        sequenceHudY,
        stageOpacities,
        progressWidth,
    } = useHeroScroll(introRef)

    return (
        <>
            <ScrollFrameBackground progress={rawProgress} />
            <section ref={introRef} className="relative z-10 h-[190vh]">
                <div className="sticky top-0 h-screen flex flex-col items-center justify-center px-4 text-center">
                    <motion.div
                        style={{ opacity: headerOpacity, y: contentY }}
                        initial={{ opacity: 0, y: 50 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, ease: 'easeOut' }}
                        className="flex flex-col items-center"
                    >
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse" />
                            <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-white/60">
                                Global Baseball Series 2026
                            </span>
                        </div>

                        <h1 className="font-anton text-[72px] md:text-[180px] leading-[0.8] tracking-tighter mb-8 uppercase text-white">
                            GLOBAL <span className="text-outline">DIAMOND</span>
                            <br />
                            SERIES
                        </h1>

                        <div className="flex flex-col md:flex-row items-center gap-8 max-w-4xl">
                            <p className="text-xs md:text-sm text-gray-500 uppercase tracking-[0.2em] leading-relaxed max-w-sm text-center md:text-left">
                                The pinnacle of international baseball returns. 32 Nations. One
                                champion. Tokyo Dome Finale.
                            </p>
                            <div className="hidden md:block h-[1px] flex-1 bg-white/20" />
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    size="lg"
                                    className="bg-white text-black hover:bg-red-600 hover:text-white px-10 h-16 text-xs font-black uppercase tracking-[0.2em] rounded-none transition-all duration-300"
                                >
                                    <Ticket className="mr-2 h-4 w-4" /> Secure Seats
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="border-white/40 hover:bg-white/10 px-10 h-16 text-xs font-black uppercase tracking-[0.2em] rounded-none backdrop-blur-sm transition-all duration-300"
                                >
                                    Watch Trailer
                                </Button>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        style={{ opacity: sequenceHudOpacity, y: sequenceHudY }}
                        className="pointer-events-none absolute inset-x-0 bottom-8 md:bottom-12 px-5 md:px-10"
                    >
                        <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 md:flex-row md:items-end md:justify-between">
                            <div className="relative min-h-28 text-left">
                                {SEQUENCE_STAGES.map((stage, idx) => (
                                    <motion.div
                                        key={stage.eyebrow}
                                        style={{ opacity: stageOpacities[idx] }}
                                        className="absolute bottom-0 left-0 max-w-sm border-l border-red-600 pl-5"
                                    >
                                        <span className="mb-3 block text-[10px] font-black uppercase tracking-[0.4em] text-red-500">
                                            {stage.eyebrow}
                                        </span>
                                        <p className="font-anton text-4xl uppercase leading-none md:text-6xl">
                                            {stage.headline}
                                        </p>
                                        <p className="mt-3 max-w-xs text-[10px] font-bold uppercase tracking-[0.22em] text-white/45">
                                            {stage.body}
                                        </p>
                                    </motion.div>
                                ))}
                            </div>

                            <div className="grid grid-cols-3 border border-white/10 bg-black/35 text-left backdrop-blur-sm md:w-[420px]">
                                {HERO_STATS.map((stat) => (
                                    <div
                                        key={stat.label}
                                        className="border-r border-white/10 p-4 last:border-r-0"
                                    >
                                        <span className="block text-[9px] font-black uppercase tracking-[0.22em] text-white/35">
                                            {stat.label}
                                        </span>
                                        <span className="mt-2 block font-anton text-3xl leading-none text-white">
                                            {stat.value}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mx-auto mt-6 h-px w-full max-w-7xl bg-white/10">
                            <motion.div
                                style={{ width: progressWidth }}
                                className="h-px bg-red-600"
                            />
                        </div>
                    </motion.div>

                    <motion.div
                        style={{ opacity: scrollIndicatorOpacity }}
                        animate={{ y: [0, 10, 0] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                        className="absolute bottom-12 flex flex-col items-center gap-4 text-white/20"
                    >
                        <span className="text-[10px] uppercase tracking-[0.5em] font-bold rotate-90 origin-center mb-12">
                            Scroll
                        </span>
                        <div className="w-px h-24 bg-gradient-to-b from-white/20 to-transparent" />
                    </motion.div>
                </div>
            </section>
        </>
    )
}
