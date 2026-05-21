import { Add01Icon, GiftIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

import { Button } from '@/shared/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card'
import { Separator } from '@/shared/ui/separator'

export const CreditsSummary = () => (
    <Card className="h-full">
        <CardHeader>
            <CardTitle className="text-base">Your credits</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col items-center gap-1 py-2">
                <span className="font-anton text-5xl text-primary">250</span>
                <span className="text-xs text-muted-foreground">bonus credits from sign-up</span>
            </div>
            <Separator />
            <div className="flex items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <HugeiconsIcon icon={GiftIcon} className="size-4" />
                </span>
                <div className="flex-1">
                    <div className="text-sm font-medium">Signup bonus</div>
                    <div className="text-xs text-muted-foreground">+250 credits awarded</div>
                </div>
                <span className="text-xs text-muted-foreground">Just now</span>
            </div>
            <Button variant="outline" className="gap-2">
                <HugeiconsIcon icon={Add01Icon} className="size-4" />
                Buy credits
            </Button>
        </CardContent>
    </Card>
)
