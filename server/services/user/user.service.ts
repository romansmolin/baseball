import type { IUserRepository } from '../../repositories/user/user.repository.interface'
import type { CreateUserInput, UpdateUserInput } from '../../models/user/user-input.model'
import type { UserModel } from '../../models/user/user.model'
import type { IUserService } from './user.service.interface'

export class UserService implements IUserService {
    private readonly userRepository: IUserRepository

    constructor(userRepository: IUserRepository) {
        this.userRepository = userRepository
    }

    findUserById(userId: string): Promise<UserModel | null> {
        return this.userRepository.findById(userId)
    }

    findUserByEmail(userEmail: string): Promise<UserModel | null> {
        return this.userRepository.findByEmail(userEmail)
    }

    createUser(input: CreateUserInput): Promise<UserModel> {
        return this.userRepository.create(input)
    }

    updateUserById(userId: string, input: UpdateUserInput): Promise<UserModel> {
        return this.userRepository.updateById(userId, input)
    }

    deleteUserById(userId: string): Promise<void> {
        return this.userRepository.deleteById(userId)
    }
}
