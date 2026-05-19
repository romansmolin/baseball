'use client'

import type { MotionValue } from 'framer-motion'

import { useScrollFrames } from '../model/use-scroll-frames'

type Props = {
    progress: MotionValue<number>
}

export function ScrollFrameBackground({ progress }: Props) {
    const { frameSrc } = useScrollFrames(progress)

    return (
        <div className="fixed inset-0 z-0 h-screen w-full overflow-hidden">
            <div className="relative w-full h-full flex items-center justify-center bg-black">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={frameSrc}
                    alt=""
                    aria-hidden="true"
                    className="w-full h-full object-cover"
                    draggable={false}
                    decoding="sync"
                    fetchPriority="high"
                />
            </div>
        </div>
    )
}
