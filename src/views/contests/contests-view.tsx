'use client'

import { ContestsCatalog } from '@/widgets/tournaments'
import type { ContestCatalogView } from '@/shared/tournaments'

export function ContestsView({ view }: { view: ContestCatalogView }) {
    return <ContestsCatalog initialView={view} />
}
