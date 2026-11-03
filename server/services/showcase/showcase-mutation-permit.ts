import type { MutationPermit } from '../recurring-tournaments/recurring.types'

/** Fence writes so a worker with an expired lease cannot mutate newer state. */
export function showcaseMutationPermit(key: string, token: string): MutationPermit {
    return {
        async assertInTransaction(tx) {
            const lease = await tx.showcaseJob.findUnique({
                where: { key },
                select: { leaseToken: true, leaseExpiresAt: true },
            })
            if (lease?.leaseToken !== token || !lease.leaseExpiresAt || lease.leaseExpiresAt.getTime() <= Date.now()) {
                throw new Error('Showcase lease lost')
            }
        },
    }
}
