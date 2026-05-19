'use client'

import { useScroll, useTransform, type MotionValue } from 'framer-motion'
import type { RefObject } from 'react'

export type HeroScrollValues = {
    rawProgress: MotionValue<number>
    headerOpacity: MotionValue<number>
    tickerY: MotionValue<number>
    contentY: MotionValue<number>
    scrollIndicatorOpacity: MotionValue<number>
    sequenceHudOpacity: MotionValue<number>
    sequenceHudY: MotionValue<number>
    stageOpacities: [MotionValue<number>, MotionValue<number>, MotionValue<number>]
    progressWidth: MotionValue<string>
}

export function useHeroScroll(targetRef: RefObject<HTMLElement | null>): HeroScrollValues {
    const { scrollYProgress: rawProgress } = useScroll({
        target: targetRef,
        offset: ['start start', 'end end'],
    })

    // Lenis handles scroll smoothing globally — no useSpring needed here
    const headerOpacity = useTransform(rawProgress, [0, 0.15], [1, 0])
    const tickerY = useTransform(rawProgress, [0, 0.05], [0, -100])
    const contentY = useTransform(rawProgress, [0, 0.2], [0, -100])
    const scrollIndicatorOpacity = useTransform(rawProgress, [0, 0.12], [1, 0])
    const sequenceHudOpacity = useTransform(rawProgress, [0.14, 0.24, 0.9, 1], [0, 1, 1, 0])
    const sequenceHudY = useTransform(rawProgress, [0.14, 0.24], [24, 0])
    const fallOpacity = useTransform(rawProgress, [0.16, 0.24, 0.48, 0.56], [0, 1, 1, 0])
    const impactOpacity = useTransform(rawProgress, [0.46, 0.56, 0.76, 0.84], [0, 1, 1, 0])
    const splitOpacity = useTransform(rawProgress, [0.76, 0.86, 1], [0, 1, 1])
    const progressWidth = useTransform(rawProgress, [0, 1], ['0%', '100%'])

    return {
        rawProgress,
        headerOpacity,
        tickerY,
        contentY,
        scrollIndicatorOpacity,
        sequenceHudOpacity,
        sequenceHudY,
        stageOpacities: [fallOpacity, impactOpacity, splitOpacity],
        progressWidth,
    }
}
