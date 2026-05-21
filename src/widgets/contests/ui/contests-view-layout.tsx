import { cn } from '@/shared/utils'

interface ContestsViewLayoutProps {
    sidebar: React.ReactNode
    toolbar: React.ReactNode
    list: React.ReactNode
    detail: React.ReactNode | null
}

// Mobile (under lg): leagues sidebar hides; pick a league via the mobile select in the toolbar.
// The detail panel becomes a full-screen overlay (see contest-detail-panel.tsx).
export const ContestsViewLayout = ({ sidebar, toolbar, list, detail }: ContestsViewLayoutProps) => (
    <div className="flex h-[calc(100svh-4rem)] w-full">
        <div className="hidden lg:flex">{sidebar}</div>

        <section className={cn('flex min-w-0 flex-1 flex-col')}>
            {toolbar}
            <div className="flex flex-1 flex-col overflow-y-auto">{list}</div>
        </section>

        {detail}
    </div>
)
