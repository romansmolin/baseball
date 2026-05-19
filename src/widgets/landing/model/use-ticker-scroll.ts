'use client'

import { useScroll, useTransform, type MotionValue } from 'framer-motion'

export type TickerScrollValues = {
    tickerY: MotionValue<number>
}

export function useTickerScroll(): TickerScrollValues {
    const { scrollY } = useScroll()
    const tickerY = useTransform(scrollY, [0, 95], [0, -100])
    return { tickerY }
}
