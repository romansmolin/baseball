import { describe, expect, it } from 'vitest'

import {
    CONFIDENCE_LABEL,
    NO_VALUE,
    formatCount,
    formatDecimal,
    formatInnings,
    formatPercentEstimate,
    formatRate,
    formatScore,
} from './analytics-format'

describe('formatRate', () => {
    it('drops the leading zero like a baseball scoreboard', () => {
        expect(formatRate(0.3)).toBe('.300')
        expect(formatRate(0)).toBe('.000')
        expect(formatRate(0.0456)).toBe('.046')
    })

    it('keeps the leading digit at or above 1', () => {
        expect(formatRate(1.014)).toBe('1.014')
    })

    it('shows a dash for a missing value', () => {
        expect(formatRate(null)).toBe(NO_VALUE)
    })
})

describe('formatDecimal', () => {
    it('uses two decimals by default and a dash for null', () => {
        expect(formatDecimal(2.8711)).toBe('2.87')
        expect(formatDecimal(null)).toBe(NO_VALUE)
        expect(formatDecimal(21.46, 1)).toBe('21.5')
    })
})

describe('formatCount', () => {
    it('shows a real zero as 0 and a missing value as a dash', () => {
        expect(formatCount(0)).toBe('0')
        expect(formatCount(55)).toBe('55')
        expect(formatCount(null)).toBe(NO_VALUE)
    })
})

describe('formatInnings', () => {
    it('writes thirds the way MLB does', () => {
        expect(formatInnings(47)).toBe('47.0')
        expect(formatInnings(150 + 1 / 3)).toBe('150.1')
        expect(formatInnings(150 + 2 / 3)).toBe('150.2')
        expect(formatInnings(null)).toBe(NO_VALUE)
    })
})

describe('formatScore', () => {
    it('rounds to a whole number and dashes a missing score', () => {
        expect(formatScore(87.5)).toBe('88')
        expect(formatScore(null)).toBe(NO_VALUE)
    })
})

describe('formatPercentEstimate', () => {
    it('rounds a probability to whole percent, never more precise', () => {
        expect(formatPercentEstimate(0.564)).toBe('56%')
        expect(formatPercentEstimate(0.5)).toBe('50%')
    })
})

describe('CONFIDENCE_LABEL', () => {
    it('labels every confidence level', () => {
        expect(CONFIDENCE_LABEL).toEqual({ low: 'Low confidence', medium: 'Medium confidence', high: 'High confidence' })
    })
})
