import type { CreateUserInput, UpdateUserInput } from '../../models/user/user-input.model'
import type { UserModel } from '../../models/user/user.model'

export interface IUserService {
    findUserById(userId: string): Promise<UserModel | null>
    findUserByEmail(userEmail: string): Promise<UserModel | null>
    createUser(input: CreateUserInput): Promise<UserModel>
    updateUserById(userId: string, input: UpdateUserInput): Promise<UserModel>
    deleteUserById(userId: string): Promise<void>
}
