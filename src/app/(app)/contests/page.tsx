import { ContestsView } from '@/views/contests/contests-view'
export default async function ContestsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
    const { view } = await searchParams
    return <ContestsView view={view === 'history' ? 'history' : 'current'} />
}
