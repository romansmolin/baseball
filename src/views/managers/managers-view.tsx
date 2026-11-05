import { ManagersDirectory } from '@/widgets/showcase'
import type { DailyContestMode } from '@/shared/daily-contests'
export const ManagersView = ({ mode }: { mode: DailyContestMode }) => <div className="mx-auto w-full max-w-[1280px] px-5 py-6 sm:px-8 lg:py-10"><ManagersDirectory initialMode={mode} /></div>
