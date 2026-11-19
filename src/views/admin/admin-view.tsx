import { DemoGenerator } from '@/features/admin-demo/ui/demo-generator'

import { AdminUserLookup } from '@/features/admin-user-lookup'

export const AdminView = () => (
    <main className="container mx-auto max-w-7xl space-y-6 px-6 py-8">
        <div>
            <h1 className="font-anton text-3xl tracking-wide">Admin</h1>
            <p className="mt-1 text-sm text-muted-foreground">
                Look up a user by email: balance, payments, credit history and teams.
            </p>
        </div>
        <DemoGenerator />
        <section className="space-y-4"><h2 className="text-xl font-semibold">User lookup</h2><AdminUserLookup /></section>
    </main>
)
