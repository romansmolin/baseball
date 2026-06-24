'use client'

import type { MotionValue } from 'framer-motion'

import { useScrollFrames } from '../model/use-scroll-frames'

type Props = {
    progress: MotionValue<number>
}

export function ScrollFrameBackground({ progress }: Props) {
    const { canvasRef } = useScrollFrames(progress)

    return (
        <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden bg-black">
            {/* Frames are drawn cover-cropped onto the canvas in the hook; the
                black wrapper shows until the first frame decodes. */}
            <canvas ref={canvasRef} aria-hidden="true" className="block h-full w-full" />
        </div>
    )
}
