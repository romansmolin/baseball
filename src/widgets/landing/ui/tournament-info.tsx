'use client'

import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

import { QUALIFIER_STAGES } from '../model/landing.const'

export function TournamentInfo() {
    return (
        <section className="relative z-10 min-h-screen pt-40 px-6 max-w-7xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-20 items-start">
                <div className="md:col-span-7">
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-red-500 mb-6 block">
                        01 / OVERVIEW
                    </span>
                    <h2 className="font-anton text-6xl md:text-9xl uppercase leading-[0.9] tracking-tighter mb-12">
                        THE TOURNAMENT <br />{' '}
                        <span className="text-outline">OF A CENTURY</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-12">
                        <div className="border-t border-white/20 pt-8">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-white">
                                Peak Season
                            </h4>
                            <p className="text-sm text-gray-500 uppercase tracking-widest leading-loose">
                                April 15th — June 30th, 2026. Global bracket elimination starts
                                Tokyo, ends Miami.
                            </p>
                        </div>
                        <div className="border-t border-white/20 pt-8">
                            <h4 className="text-xs font-black uppercase tracking-[0.2em] mb-4 text-white">
                                Arena Tech
                            </h4>
                            <p className="text-sm text-gray-500 uppercase tracking-widest leading-loose">
                                Holographic replay engines and 120,000 capacity smart stadiums
                                across 12 cities.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="md:col-span-5 grid grid-cols-2 gap-2">
                    {QUALIFIER_STAGES.map((stage) => (
                        <motion.div
                            key={stage.index}
                            whileInView={{ opacity: 1, y: 0 }}
                            initial={{ opacity: 0, y: 20 }}
                            viewport={{ once: true }}
                            transition={{ delay: stage.index * 0.1 }}
                            className="aspect-square bg-white/[0.03] border border-white/10 flex flex-col items-center justify-center group hover:bg-red-600 transition-all duration-500 cursor-pointer p-8 text-center relative overflow-hidden"
                        >
                            <span className="font-anton text-8xl text-white/5 group-hover:text-white/20 absolute transition-colors">
                                0{stage.index}
                            </span>
                            <Trophy className="w-8 h-8 mb-4 text-red-500 group-hover:text-white relative z-10 transition-colors" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 group-hover:text-white relative z-10 transition-colors">
                                {stage.label}
                            </span>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    )
}
