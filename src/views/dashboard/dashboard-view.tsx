import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card'

import type { Session } from '@/shared/lib/auth'

interface DashboardViewProps {
    session: Session
}

export const DashboardView = ({ session }: DashboardViewProps) => {
    const { user } = session

    return (
        <div className="container mx-auto max-w-5xl px-6 py-12">
            <Card>
                <CardHeader>
                    <CardTitle className="font-audiowide text-3xl">
                        Welcome back, {user.name} 👋
                    </CardTitle>
                    <CardDescription>
                        You are signed in as <strong>{user.email}</strong>.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">
                        This is your dashboard. Build your team, follow matches, and analyze stats.
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}
