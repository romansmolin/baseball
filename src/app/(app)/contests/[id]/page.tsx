import { notFound } from 'next/navigation'
import { DailyContestView } from '@/views/daily-contests/daily-contest-view'
import { showcaseEnabled } from '../../../../../server/shared/showcase-config'
export default async function DailyContestPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string; mode?: string }> }) { if (!showcaseEnabled()) notFound(); const { id } = await params; const query = await searchParams; return <DailyContestView contestId={id} view={query.view === 'history' || (!query.view && query.mode === 'REPLAY') ? 'history' : 'current'} /> }
