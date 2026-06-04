import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react'

interface TabEmptyStateProps {
    icon: IconSvgElement
    title: string
    description: string
}

export const TabEmptyState = ({ icon, title, description }: TabEmptyStateProps) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
        <span className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <HugeiconsIcon icon={icon} className="size-5" />
        </span>
        <div className="font-medium">{title}</div>
        <p className="mt-1 max-w-xs text-sm text-muted-foreground">{description}</p>
    </div>
)
