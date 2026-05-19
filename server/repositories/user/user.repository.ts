import { UserAlreadyExistsError, UserNotFoundError } from '../../errors/repository.error'
import type { CreateUserInput, UpdateUserInput } from '../../models/user/user-input.model'
import type { UserModel } from '../../models/user/user.model'
import { prisma } from '../../lib/prisma'

import type { IUserRepository } from './user.repository.interface'
import {
    handleRepositoryError,
    isPrismaError,
    extractUniqueField,
} from '../../shared/db/prisma-error.utils'

export class UserRepository implements IUserRepository {
    async findById(id: string): Promise<UserModel | null> {
        try {
            return await prisma.user.findUnique({ where: { id } })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async findByEmail(email: string): Promise<UserModel | null> {
        try {
            return await prisma.user.findUnique({ where: { email } })
        } catch (error) {
            throw handleRepositoryError(error)
        }
    }

    async create(input: CreateUserInput): Promise<UserModel> {
        try {
            return await prisma.user.create({ data: input })
        } catch (error) {
            if (isPrismaError(error, 'P2002')) {
                const field = extractUniqueField(error)
                const value = field === 'email' ? input.email : input.username
                throw new UserAlreadyExistsError(field, value)
            }
            throw handleRepositoryError(error)
        }
    }

    async updateById(id: string, input: UpdateUserInput): Promise<UserModel> {
        try {
            return await prisma.user.update({ where: { id }, data: input })
        } catch (error) {
            if (isPrismaError(error, 'P2025')) throw new UserNotFoundError(id)
            if (isPrismaError(error, 'P2002')) {
                const field = extractUniqueField(error)
                throw new UserAlreadyExistsError(
                    field,
                    String((input as Record<string, unknown>)[field] ?? ''),
                )
            }
            throw handleRepositoryError(error)
        }
    }

    async deleteById(id: string): Promise<void> {
        try {
            await prisma.user.delete({ where: { id } })
        } catch (error) {
            if (isPrismaError(error, 'P2025')) throw new UserNotFoundError(id)
            throw handleRepositoryError(error)
        }
    }
}
