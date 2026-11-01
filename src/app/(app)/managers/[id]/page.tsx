import { notFound } from 'next/navigation'
import { ManagerProfileView } from '@/views/managers/manager-profile-view'
import { showcaseEnabled } from '../../../../../server/shared/showcase-config'
export default async function ManagerPage({ params }: { params: Promise<{ id: string }> }) { if (!showcaseEnabled()) notFound(); const { id } = await params; return <ManagerProfileView userId={id} /> }
