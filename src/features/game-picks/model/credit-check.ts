// Whether a balance covers a feature's cost. An unknown balance never allows a spend.
export function checkCredits(
    balance: number | undefined,
    cost: number,
): { canAfford: boolean; shortBy: number } {
    if (balance === undefined) return { canAfford: false, shortBy: cost }
    return { canAfford: balance >= cost, shortBy: Math.max(0, cost - balance) }
}
