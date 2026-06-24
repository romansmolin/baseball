'use client'

import type { MotionValue } from 'framer-motion'
import { useEffect, useMemo, useRef, useState, type RefObject } from 'react'

import { SCROLL_FRAMES_BASE, SCROLL_FRAMES_COUNT, SCROLL_FRAMES_EXT } from './landing.const'

// Cap the canvas backing-store DPR — 2x is enough for a full-screen background
// and keeps fill-rate (and decode size) bounded on high-DPI screens.
const MAX_DPR = 2
// How many frames to fetch+decode in parallel. Enough to saturate an HTTP/2
// connection without starving the rest of the page.
const LOAD_CONCURRENCY = 5

function pad(num: number, size: number) {
    return num.toString().padStart(size, '0')
}

function buildFrameUrls(): string[] {
    return Array.from(
        { length: SCROLL_FRAMES_COUNT },
        (_, i) => `${SCROLL_FRAMES_BASE}/frame-${pad(i + 1, 4)}.${SCROLL_FRAMES_EXT}`,
    )
}

export type ScrollFramesState = {
    canvasRef: RefObject<HTMLCanvasElement | null>
    ready: boolean
    progressLoaded: number
    totalFrames: number
}

/**
 * Drives a <canvas> from a framer-motion MotionValue with no React re-renders
 * in the scroll hot path.
 *
 * Each frame is decoded exactly once into a browser-managed HTMLImageElement
 * (NOT an ImageBitmap — 192 bitmaps at 1280x720 would pin ~700MB of RAM). A
 * single requestAnimationFrame loop samples `progress.get()` and blits the
 * nearest decoded frame to the canvas only when the index actually changes —
 * so idle scroll costs nothing and no JPEG/WebP is ever decoded mid-scroll.
 */
export function useScrollFrames(progress: MotionValue<number>): ScrollFramesState {
    const urls = useMemo(buildFrameUrls, [])
    const canvasRef = useRef<HTMLCanvasElement | null>(null)

    // Decoded frames + per-frame decoded flags live in refs so the rAF loop can
    // read them without involving React.
    const imagesRef = useRef<(HTMLImageElement | null)[]>(new Array(urls.length).fill(null))
    const decodedRef = useRef<boolean[]>(new Array(urls.length).fill(false))

    const [ready, setReady] = useState(false)
    const [progressLoaded, setProgressLoaded] = useState(0)

    // --- Load + decode every frame once (frame 0 first, then the rest) ---
    useEffect(() => {
        let cancelled = false
        let decodedCount = 0

        const markDecoded = (i: number, img: HTMLImageElement) => {
            if (cancelled) return
            imagesRef.current[i] = img
            decodedRef.current[i] = true
            decodedCount += 1
            setProgressLoaded(decodedCount / urls.length)
            if (i === 0) setReady(true)
        }

        const loadOne = (i: number) =>
            new Promise<void>((resolve) => {
                const img = new Image()
                img.decoding = 'async'
                img.src = urls[i]
                img
                    .decode()
                    .then(() => markDecoded(i, img))
                    .catch(() => {
                        // Some browsers reject decode() for edge cases — fall
                        // back to the load event so the frame still registers.
                        img.onload = () => markDecoded(i, img)
                    })
                    .finally(resolve)
            })

        // Frame 0 first so the hero paints ASAP, then drain the rest in index
        // order with bounded concurrency (early scroll positions ready first).
        const queue = Array.from({ length: urls.length }, (_, i) => i).slice(1)
        const runWorker = async () => {
            while (!cancelled) {
                const next = queue.shift()
                if (next === undefined) return
                await loadOne(next)
            }
        }

        void loadOne(0).then(() => {
            for (let w = 0; w < LOAD_CONCURRENCY; w += 1) void runWorker()
        })

        return () => {
            cancelled = true
        }
    }, [urls])

    // --- Keep the canvas backing store sized to its box (DPR-aware) ---
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return

        const resize = () => {
            const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
            const bw = Math.round(canvas.clientWidth * dpr)
            const bh = Math.round(canvas.clientHeight * dpr)
            if (bw > 0 && bh > 0 && (canvas.width !== bw || canvas.height !== bh)) {
                canvas.width = bw
                canvas.height = bh
            }
        }

        resize()
        const ro = new ResizeObserver(resize)
        ro.observe(canvas)
        window.addEventListener('orientationchange', resize)
        return () => {
            ro.disconnect()
            window.removeEventListener('orientationchange', resize)
        }
    }, [])

    // --- Single rAF draw loop: sample progress, blit on change only ---
    useEffect(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const ctx = canvas.getContext('2d', { alpha: false })
        if (!ctx) return

        const count = urls.length
        let rafId = 0
        let lastIndex = -1
        let lastW = -1
        let lastH = -1

        // Nearest already-decoded frame to `target` — lets scrubbing degrade
        // gracefully before every frame has loaded instead of stalling/flashing.
        const nearestDecoded = (target: number): number => {
            if (decodedRef.current[target]) return target
            for (let d = 1; d < count; d += 1) {
                const lo = target - d
                if (lo >= 0 && decodedRef.current[lo]) return lo
                const hi = target + d
                if (hi < count && decodedRef.current[hi]) return hi
            }
            return -1
        }

        // object-cover equivalent: scale to fill, center, overflow clipped.
        const drawCover = (img: HTMLImageElement) => {
            const cw = canvas.width
            const ch = canvas.height
            const sw = img.naturalWidth
            const sh = img.naturalHeight
            if (!sw || !sh) return
            const scale = Math.max(cw / sw, ch / sh)
            const dw = sw * scale
            const dh = sh * scale
            ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh)
        }

        const tick = () => {
            const p = Math.min(Math.max(progress.get(), 0), 1)
            const target = Math.round(p * (count - 1))
            const sizeChanged = canvas.width !== lastW || canvas.height !== lastH

            if (target !== lastIndex || sizeChanged) {
                const idx = nearestDecoded(target)
                const img = idx >= 0 ? imagesRef.current[idx] : null
                if (img) {
                    drawCover(img)
                    lastIndex = target
                    lastW = canvas.width
                    lastH = canvas.height
                }
                // No decoded frame yet → draw nothing, retry next tick (cheap).
            }

            rafId = requestAnimationFrame(tick)
        }

        rafId = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafId)
    }, [progress, urls.length])

    return { canvasRef, ready, progressLoaded, totalFrames: urls.length }
}
