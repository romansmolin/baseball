import { AdminView } from '@/views/admin/admin-view'

// Open to any signed-in user as a page shell; every /api/admin call enforces the ADMIN role.
export default function AdminPage() {
    return <AdminView />
}
