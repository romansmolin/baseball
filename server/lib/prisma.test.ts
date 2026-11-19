import { afterEach, expect, it, vi } from 'vitest'

vi.mock('@prisma/adapter-pg', () => ({ PrismaPg: class {} }))
vi.mock('../../src/generated/prisma/client', () => ({ PrismaClient: class { demoReportJob = {} } }))

afterEach(() => {
    delete (globalThis as { prisma?: unknown }).prisma
    vi.resetModules()
})

it('replaces a cached Prisma client generated before demo reports were added', async () => {
    const outdatedClient = { user: {} }
    ;(globalThis as { prisma?: unknown }).prisma = outdatedClient
    const { prisma } = await import('./prisma')
    expect(prisma).not.toBe(outdatedClient)
    expect(prisma.demoReportJob).toBeDefined()
})
