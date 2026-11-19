import { useCallback, useEffect, useRef, useState } from 'react'

const EDGE_PX = 4

// A horizontal scroll-snap slider: prev/next paging and whether either end has been reached.
// `itemCount` re-checks the ends when the content changes.
export function useSlider(itemCount: number) {
    const trackRef = useRef<HTMLDivElement>(null)
    const [atStart, setAtStart] = useState(true)
    const [atEnd, setAtEnd] = useState(true)

    const update = useCallback(() => {
        const track = trackRef.current
        if (!track) return
        setAtStart(track.scrollLeft <= EDGE_PX)
        setAtEnd(track.scrollLeft + track.clientWidth >= track.scrollWidth - EDGE_PX)
    }, [])

    useEffect(() => {
        const track = trackRef.current
        if (!track) return
        update()
        track.addEventListener('scroll', update, { passive: true })
        const observer = new ResizeObserver(update)
        observer.observe(track)
        return () => {
            track.removeEventListener('scroll', update)
            observer.disconnect()
        }
    }, [update, itemCount])

    const page = (direction: 1 | -1) => {
        const track = trackRef.current
        track?.scrollBy({ left: direction * track.clientWidth * 0.85, behavior: 'smooth' })
    }

    return { trackRef, atStart, atEnd, prev: () => page(-1), next: () => page(1) }
}
