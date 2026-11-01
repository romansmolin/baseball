import { expect, it } from 'vitest'
import { withWorkDeadline, remainingWorkMs, assertWorkTime, canStartShowcaseBatch, WorkDeadlineError } from './work-deadline'

it('isolates simultaneous job deadlines and fails expired work before another side effect', async () => {
    const deadline = Date.now() + 20000
    await withWorkDeadline(deadline, async () => {
        expect(remainingWorkMs()).toBeGreaterThan(19000)
        await withWorkDeadline(Date.now() - 1, async () => {
            expect(() => assertWorkTime()).toThrow(WorkDeadlineError)
        })
        expect(remainingWorkMs()).toBeGreaterThan(19000)
    })
    expect(remainingWorkMs()).toBe(Infinity)
})

it('does not start another database batch when the remaining budget is too small', async () => {
    await withWorkDeadline(Date.now() + 4000, async () => expect(canStartShowcaseBatch()).toBe(false))
    await withWorkDeadline(Date.now() + 8000, async () => expect(canStartShowcaseBatch()).toBe(true))
})
