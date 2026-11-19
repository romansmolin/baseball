import useSWR from 'swr'

import { fetchCompare } from '../api/fetch-compare'

import { compareKey } from './analytics-keys'

export function useCompareData(playerIds: number[]) {
    return useSWR(compareKey(playerIds), () => fetchCompare(playerIds))
}
