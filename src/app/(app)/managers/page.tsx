import { notFound } from 'next/navigation'
import { ManagersView } from '@/views/managers/managers-view'
import { showcaseEnabled } from '../../../../server/shared/showcase-config'
export default async function ManagersPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) { if (!showcaseEnabled()) notFound(); const { mode } = await searchParams; return <ManagersView mode={mode === 'REPLAY' ? 'REPLAY' : 'LIVE'} /> }
