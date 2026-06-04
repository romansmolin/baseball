import useSWR from 'swr'

import type { OnboardingStep } from '@/shared/dashboard'
import { fetchOnboarding } from './fetch-onboarding'

export function useOnboardingData() {
    return useSWR<OnboardingStep[]>(['me', 'onboarding'], () => fetchOnboarding())
}
