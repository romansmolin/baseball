export const MIN_AGE = 18

// dateOfBirth is an ISO date (YYYY-MM-DD). Compared by calendar date so the
// birthday itself counts; invalid input is never "old enough".
export function isAtLeastAge(dateOfBirth: string, years: number = MIN_AGE): boolean {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOfBirth)
    if (!match) return false

    // Local-midnight date: `new Date('YYYY-MM-DD')` is UTC and would shift by timezone.
    const dob = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    if (Number.isNaN(dob.getTime())) return false

    const cutoff = new Date()
    cutoff.setHours(0, 0, 0, 0)
    cutoff.setFullYear(cutoff.getFullYear() - years)

    return dob <= cutoff
}
