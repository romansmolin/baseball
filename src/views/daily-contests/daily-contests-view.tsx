import { DailyContestsCatalog } from '@/widgets/showcase'
import type { DailyContestView } from '@/shared/daily-contests'
export const DailyContestsView = ({ view }: { view: DailyContestView }) => <div className="container mx-auto max-w-7xl px-6 py-8"><DailyContestsCatalog initialView={view} /></div>
