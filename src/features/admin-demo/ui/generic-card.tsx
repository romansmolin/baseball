import type { ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

export function GenericCard({ cardTitle, cardDescripiton, cardContent }: { cardTitle: ReactNode; cardDescripiton?: ReactNode; cardContent: ReactNode }) {
    return <Card><CardHeader><CardTitle>{cardTitle}</CardTitle>{cardDescripiton && <CardDescription>{cardDescripiton}</CardDescription>}</CardHeader><CardContent>{cardContent}</CardContent></Card>
}
