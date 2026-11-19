export interface IAdminController {
    getUserActivity(adminId: string, body: unknown): Promise<Response>
    createUserReport(adminId: string, body: unknown): Promise<Response>
}
