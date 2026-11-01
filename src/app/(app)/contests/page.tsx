import { notFound } from 'next/navigation'
import { DailyContestsView } from '@/views/daily-contests/daily-contests-view'
import { showcaseEnabled } from '../../../../server/shared/showcase-config'
export default async function DailyContestsPage({ searchParams }: { searchParams: Promise<{ mode?: string }> }) { if (!showcaseEnabled()) notFound(); const { mode } = await searchParams; return <DailyContestsView mode={mode === 'REPLAY' ? 'REPLAY' : 'LIVE'} /> }
