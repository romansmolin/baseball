export interface IUserController {
    findUserById(id: string): Promise<Response>
    findUserByEmail(email: string): Promise<Response>
    createUser(body: unknown): Promise<Response>
    updateUserById(body: unknown, id: string): Promise<Response>
    deleteUserById(id: string): Promise<Response>
}
