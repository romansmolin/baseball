import { notFound } from 'next/navigation'
import { DailyContestView } from '@/views/daily-contests/daily-contest-view'
import { showcaseEnabled } from '../../../../../server/shared/showcase-config'
export default async function DailyContestPage({ params }: { params: Promise<{ id: string }> }) { if (!showcaseEnabled()) notFound(); const { id } = await params; return <DailyContestView contestId={id} /> }
