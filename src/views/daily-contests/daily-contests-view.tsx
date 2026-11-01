import { DailyContestsCatalog } from '@/widgets/showcase'
import type { DailyContestMode } from '@/shared/daily-contests'
export const DailyContestsView = ({ mode }: { mode: DailyContestMode }) => <div className="container mx-auto max-w-6xl px-6 py-8"><DailyContestsCatalog initialMode={mode} /></div>
