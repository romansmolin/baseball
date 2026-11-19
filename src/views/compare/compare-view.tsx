import { Suspense } from 'react'

import { CompareWorkbench } from '@/widgets/compare'

export const CompareView = () => (
    <div className="container mx-auto max-w-7xl space-y-5 px-6 py-6">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">Compare players</h1>
            <p className="text-sm text-muted-foreground">Up to four MLB players side by side.</p>
        </div>
        <Suspense fallback={null}>
            <CompareWorkbench />
        </Suspense>
    </div>
)
