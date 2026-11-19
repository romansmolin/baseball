'use client'

import { useRef } from 'react'

// A horizontal scroll track with prev/next paging. The track also scrolls by touch and wheel.
export function useTeamSlider() {
    const trackRef = useRef<HTMLDivElement>(null)

    const page = (direction: 1 | -1) =>
        trackRef.current?.scrollBy({ left: direction * trackRef.current.clientWidth * 0.8, behavior: 'smooth' })

    return { trackRef, prev: () => page(-1), next: () => page(1) }
}
