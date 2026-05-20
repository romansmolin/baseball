export const getEnv = (varName: string): string => {
    const value = process.env[varName]

    if (!value) throw new Error(`Environment variable ${varName} is required`)

    return value
}
