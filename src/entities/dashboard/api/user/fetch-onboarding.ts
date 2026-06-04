import { httpClient } from '@/shared/api/http-client'
import type { OnboardingStep } from '@/shared/dashboard'

export const fetchOnboarding = async (): Promise<OnboardingStep[]> => {
    return httpClient.get<OnboardingStep[]>('/api/me/onboarding')
}
