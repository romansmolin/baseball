'use client'

import { motion } from 'framer-motion'
import { Users } from 'lucide-react'

import { Button } from '@/shared/ui'

export function TicketsCta() {
    return (
        <section className="relative z-10 min-h-screen flex items-center justify-center p-6 stadium-gradient">
            <div className="max-w-5xl w-full text-center">
                <motion.div
                    whileInView={{ opacity: 1, y: 0 }}
                    initial={{ opacity: 0, y: 100 }}
                    viewport={{ once: true }}
                    className="py-24 border-y border-white/20 relative"
                >
                    <Users className="w-12 h-12 text-red-500 mx-auto mb-10 opacity-50" />
                    <h2 className="font-anton text-7xl md:text-[150px] leading-[0.8] uppercase tracking-tighter mb-12">
                        OWN THE <br />
                        <span className="text-outline">DIAMOND</span>
                    </h2>
                    <p className="text-xs md:text-sm text-gray-500 uppercase tracking-[0.4em] mb-16 max-w-xl mx-auto leading-relaxed font-bold">
                        Join 3 million fans. The 2026 Grand Series is moving at terminal velocity.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                        <Button
                            size="lg"
                            className="bg-red-600 hover:bg-white hover:text-black text-white text-xs px-16 h-20 font-black uppercase tracking-[0.3em] rounded-none transition-all duration-500 shadow-2xl shadow-red-600/20"
                        >
                            Buy Final Tickets
                        </Button>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/30 hidden sm:block">
                            OR
                        </span>
                        <Button
                            size="lg"
                            variant="outline"
                            className="border-white/20 hover:bg-white/10 text-white text-xs px-16 h-20 font-black uppercase tracking-[0.3em] rounded-none backdrop-blur-sm transition-all duration-500"
                        >
                            Season Schedule
                        </Button>
                    </div>

                    <div className="mt-16 flex items-center justify-center gap-8 border-t border-white/10 pt-16 opacity-30">
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                            Official Timing: OMEGA
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-[0.2em]">
                            Ball Tech: RAWLINGS
                        </span>
                    </div>
                </motion.div>
            </div>
        </section>
    )
}
