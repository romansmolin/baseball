import { expect, it } from 'vitest'
import { withWorkDeadline, remainingWorkMs, assertWorkTime, WorkDeadlineError } from './work-deadline'

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
