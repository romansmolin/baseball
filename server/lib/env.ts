export const env = {
    sportsProvider: (): string => (process.env.SPORTS_PROVIDER ?? 'mlb').toLowerCase(),
    mlbBaseUrl: (): string => process.env.MLB_API_BASE_URL ?? 'https://statsapi.mlb.com/api/v1',
    defaultSeason: (): number =>
        Number(process.env.SPORTS_DEFAULT_SEASON ?? new Date().getUTCFullYear()),
}
