'use client'

import { motion } from 'framer-motion'

import { TICKER_ITEMS } from '../model/landing.const'
import { useTickerScroll } from '../model/use-ticker-scroll'

const REPEATS = [1, 2, 3, 4, 5]

export function LiveTicker() {
    const { tickerY } = useTickerScroll()

    return (
        <motion.div
            style={{ y: tickerY }}
            className="fixed top-0 left-0 w-full z-50 bg-red-600 text-white py-1.5 px-4 overflow-hidden border-b border-red-700 font-mono text-[10px] font-bold tracking-widest uppercase flex items-center gap-8 whitespace-nowrap"
        >
            <div className="flex animate-marquee gap-8 items-center">
                {REPEATS.map((i) => (
                    <div key={i} className="flex gap-8 items-center shrink-0">
                        {TICKER_ITEMS.map((item, idx) => (
                            <span key={`${i}-${idx}`} className="flex gap-8 items-center shrink-0">
                                {idx === 0 ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                        {item.label}
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-2">{item.label}</span>
                                )}
                                <span className="text-red-300">|</span>
                            </span>
                        ))}
                    </div>
                ))}
            </div>
        </motion.div>
    )
}
