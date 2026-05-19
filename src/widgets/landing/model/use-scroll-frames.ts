'use client'

import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import { useEffect, useMemo, useState } from 'react'

import { SCROLL_FRAMES_BASE, SCROLL_FRAMES_COUNT } from './landing.const'

function pad(num: number, size: number) {
    return num.toString().padStart(size, '0')
}

function buildFrameUrls(): string[] {
    return Array.from(
        { length: SCROLL_FRAMES_COUNT },
        (_, i) => `${SCROLL_FRAMES_BASE}/frame-${pad(i + 1, 4)}.jpg`
    )
}

export type ScrollFramesState = {
    frameSrc: string
    totalFrames: number
}

export function useScrollFrames(progress: MotionValue<number>): ScrollFramesState {
    const frames = useMemo(buildFrameUrls, [])
    const [frameIndex, setFrameIndex] = useState(0)

    useEffect(() => {
        frames.forEach((src) => {
            const image = new Image()
            image.decoding = 'async'
            image.src = src
        })
    }, [frames])

    useMotionValueEvent(progress, 'change', (latest) => {
        if (frames.length === 0) return
        const clamped = Math.min(Math.max(latest, 0), 1)
        setFrameIndex(Math.round(clamped * (frames.length - 1)))
    })

    return {
        frameSrc: frames[frameIndex] ?? frames[0],
        totalFrames: frames.length,
    }
}
