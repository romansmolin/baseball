import useSWRMutation from 'swr/mutation'

import type { ApiError } from '@/shared/api/api-error'
import type { AdminUserActivity } from '@/shared/admin'

import { fetchUserActivity } from '../api/fetch-admin'

// On-demand lookup: nothing is fetched until `trigger(email)` is called.
export function useUserActivityLookup() {
    return useSWRMutation<AdminUserActivity, ApiError, string[], string>(
        ['admin-user-activity'],
        (_key, { arg }) => fetchUserActivity(arg),
    )
}
