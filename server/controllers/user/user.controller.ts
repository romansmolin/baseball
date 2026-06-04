import { ApiError } from '../../errors/api.error'
import { ErrorCode } from '../../errors/error-code.enum'
import { UserAlreadyExistsError, UserNotFoundError } from '../../errors/repository.error'
import { createUserSchema, updateUserSchema } from '../../entities/user/user.schema'
import type { CreateUserInput, UpdateUserInput } from '../../models/user/user-input.model'
import { hashPassword } from '../../shared/crypto.utils'
import { omit } from '../../shared/omit'
import type { IUserService } from '../../services/user/user.service.interface'
import type { IUserController } from './user.controller.interface'

export class UserController implements IUserController {
    private readonly userService: IUserService

    constructor(userService: IUserService) {
        this.userService = userService
    }

    async findUserById(id: string): Promise<Response> {
        try {
            const user = await this.userService.findUserById(id)

            if (!user) {
                return ApiError.notFound(
                    ErrorCode.USER_NOT_FOUND,
                    `User not found: ${id}`,
                ).toResponse()
            }

            return Response.json(omit(user, 'passwordHash'))
        } catch (error) {
            return this.handleError(error)
        }
    }

    async findUserByEmail(email: string): Promise<Response> {
        try {
            const user = await this.userService.findUserByEmail(email)

            if (!user) {
                return ApiError.notFound(
                    ErrorCode.USER_NOT_FOUND,
                    `User not found: ${email}`,
                ).toResponse()
            }

            return Response.json(omit(user, 'passwordHash'))
        } catch (error) {
            return this.handleError(error)
        }
    }

    async createUser(body: unknown): Promise<Response> {
        try {
            const result = createUserSchema.safeParse(body)

            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const { email, username, password, provider } = result.data

            const input: CreateUserInput = {
                email,
                // Prisma `User.name` is required; fall back to username for
                // this legacy direct-create flow.
                name: username,
                username,
                passwordHash: await hashPassword(password),
                provider: provider ?? null,
            }

            const user = await this.userService.createUser(input)

            return Response.json(omit(user, 'passwordHash'), { status: 201 })
        } catch (error) {
            return this.handleError(error)
        }
    }

    async updateUserById(body: unknown, id: string): Promise<Response> {
        try {
            const result = updateUserSchema.safeParse(body)

            if (!result.success) {
                return ApiError.validationError(result.error.issues[0].message).toResponse()
            }

            const { username, password, provider } = result.data

            const input: UpdateUserInput = {}

            if (username !== undefined) input.username = username
            if (password !== undefined) input.passwordHash = await hashPassword(password)
            if (provider !== undefined) input.provider = provider

            const user = await this.userService.updateUserById(id, input)

            return Response.json(omit(user, 'passwordHash'))
        } catch (error) {
            return this.handleError(error)
        }
    }

    async deleteUserById(id: string): Promise<Response> {
        try {
            await this.userService.deleteUserById(id)
            return new Response(null, { status: 204 })
        } catch (error) {
            return this.handleError(error)
        }
    }

    private handleError(error: unknown): Response {
        if (error instanceof UserNotFoundError) {
            return ApiError.notFound(ErrorCode.USER_NOT_FOUND, error.message).toResponse()
        }

        if (error instanceof UserAlreadyExistsError) {
            return ApiError.conflict(ErrorCode.USER_ALREADY_EXISTS, error.message).toResponse()
        }

        if (error instanceof ApiError) {
            return error.toResponse()
        }

        console.error('[UserController]', error)
        return ApiError.internal().toResponse()
    }
}
