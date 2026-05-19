import type { UserModel } from '../../models/user/user.model'
import type { CreateUserInput, UpdateUserInput } from '../../models/user/user-input.model'

export interface IUserRepository {
    findById(id: string): Promise<UserModel | null>
    findByEmail(email: string): Promise<UserModel | null>
    create(input: CreateUserInput): Promise<UserModel>
    updateById(id: string, input: UpdateUserInput): Promise<UserModel>
    deleteById(id: string): Promise<void>
}
