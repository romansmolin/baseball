export interface UserModel {
    id: string
    email: string
    username: string
    passwordHash: string | null
    provider: string | null
    createdAt: Date
}
