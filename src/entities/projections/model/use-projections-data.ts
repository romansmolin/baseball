import useSWR from 'swr'

import { fetchProjections, type FetchProjectionsArgs } from '../api/fetch-projections'

// `null` disables the request (no team picked yet).
export function useProjectionsData(args: FetchProjectionsArgs | null) {
    const key = args
        ? (['projections', args.leagueSlug, args.teamIds.join(','), (args.playerIds ?? []).join(','), args.period, JSON.stringify(args.rules)] as const)
        : null

    return useSWR(key, () => fetchProjections(args!), { revalidateOnFocus: false })
}
