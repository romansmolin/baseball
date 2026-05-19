export function omit<T extends object, K extends keyof T>(obj: T, ...keys: K[]): Omit<T, K> {
    const entries = Object.entries(obj).filter(([k]) => !keys.includes(k as K))
    return Object.fromEntries(entries) as Omit<T, K>
}
