import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { isAtLeastAge } from './age'

beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 12, 15, 0, 0))
})
afterEach(() => vi.useRealTimers())

it('accepts exactly 18 on the birthday', () => {
    expect(isAtLeastAge('2008-10-12')).toBe(true)
})

it('rejects one day short of 18', () => {
    expect(isAtLeastAge('2008-10-13')).toBe(false)
})

it('rejects invalid and empty dates', () => {
    expect(isAtLeastAge('not-a-date')).toBe(false)
    expect(isAtLeastAge('')).toBe(false)
})
