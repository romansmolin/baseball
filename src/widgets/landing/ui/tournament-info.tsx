'use client'

import { motion } from 'framer-motion'
import { CircleUser, Crown, Gamepad2, Users } from 'lucide-react'
import Link from 'next/link'

import { FEATURE_CARDS } from '../model/landing.const'

const CARD_ICONS = [CircleUser, Users, Gamepad2, Crown]

const MotionLink = motion(Link)

export function TournamentInfo() {
    return (
        <section className="relative z-10 min-h-screen pt-40 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-20 items-start">
                <div className="md:col-span-7">
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-red-500 mb-6 block">
                        01 / HOW IT WORKS
                    </span>
                    <h2 className="font-anton text-6xl md:text-9xl uppercase leading-[0.9] tracking-tighter mb-12">
                        EVERY LEAGUE. <br />{' '}
                        <span className="text-outline">ONE PLATFORM.</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                        <div className="border-t border-white/20 pt-8">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-white">
                                Real-Time Data
                            </h4>
                            <p className="text-sm text-gray-500 uppercase tracking-widest leading-loose">
                                Live stats, projections, injuries and form pulled from every
                                active league. Tweak your lineup until first pitch.
                            </p>
                        </div>
                        <div className="border-t border-white/20 pt-8">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-white">
                                Skill, Not Stakes
                            </h4>
                            <p className="text-sm text-gray-500 uppercase tracking-widest leading-loose">
                                Free-entry contests every day. Credits-only economy. No
                                real-money wagering — pure roster strategy.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-5 grid grid-cols-2 gap-2">
                    {FEATURE_CARDS.map((card) => {
                        const Icon = CARD_ICONS[card.index - 1] ?? CircleUser
                        return (
                            <MotionLink
                                key={card.index}
                                href={card.href}
                                aria-label={`${card.label} — ${card.sub}`}
                                whileInView={{ opacity: 1, y: 0 }}
                                initial={{ opacity: 0, y: 20 }}
                                viewport={{ once: true }}
                                transition={{ delay: card.index * 0.1 }}
                                className="aspect-square bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center group hover:bg-red-600 transition-all duration-500 cursor-pointer p-8 text-center relative overflow-hidden"
                            >
                                <span className="font-anton text-8xl text-white/5 group-hover:text-white/20 absolute transition-colors">
                                    0{card.index}
                                </span>
                                <Icon className="w-8 h-8 mb-4 text-red-500 group-hover:text-white relative z-10 transition-colors" />
                                <span className="text-xs font-black uppercase tracking-[0.2em] text-white group-hover:text-white relative z-10 transition-colors">
                                    {card.label}
                                </span>
                                <span className="mt-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 group-hover:text-white/80 relative z-10 transition-colors">
                                    {card.sub}
                                </span>
                            </MotionLink>
                        )
                    })}
                </div>
            </div>
        </section>
    )
}
