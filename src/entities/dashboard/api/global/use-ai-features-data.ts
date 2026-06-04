import useSWR from 'swr'

import { fetchAIFeatures } from './fetch-ai-features'

export function useAIFeaturesData() {
    return useSWR(['ai', 'features'], () => fetchAIFeatures())
}
