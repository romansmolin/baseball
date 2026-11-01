'use client'
import { useState } from 'react'
export function useContestDetailState() {
    const [offset, setOffset] = useState(0)
    const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
    return { offset, setOffset, selectedEntryId, setSelectedEntryId }
}
