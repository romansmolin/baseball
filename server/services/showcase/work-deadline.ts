import { AsyncLocalStorage } from 'node:async_hooks'
const context = new AsyncLocalStorage<number>()
export class WorkDeadlineError extends Error {
    constructor() { super('Showcase work deadline reached'); this.name = 'WorkDeadlineError' }
}
export function withWorkDeadline<T>(deadline: number, work: () => Promise<T>): Promise<T> { return context.run(deadline, work) }
export function remainingWorkMs(): number { const deadline = context.getStore(); return deadline === undefined ? Infinity : Math.max(0, deadline - Date.now()) }
export function canStartShowcaseBatch(): boolean { return remainingWorkMs() > 5000 }
export function assertWorkTime(reserveMs = 0): void { if (remainingWorkMs() <= reserveMs) throw new WorkDeadlineError() }
