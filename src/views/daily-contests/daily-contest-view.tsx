import { DailyContestDetailPanel } from '@/widgets/showcase'
import type { DailyContestView as ContestView } from '@/shared/daily-contests'
export const DailyContestView = ({ contestId, view }: { contestId: string; view: ContestView }) => <div className="container mx-auto max-w-7xl px-6 py-8"><DailyContestDetailPanel contestId={contestId} view={view} /></div>
