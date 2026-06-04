import { TeamBuilderView } from '@/views/team-builder/team-builder-view'

export default async function EditTeamLineupPage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params
    return <TeamBuilderView existingTeamId={id} />
}
