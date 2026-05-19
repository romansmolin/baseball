import { ApiError } from '../../../../../server/errors/api.error'
import { UserController } from '../../../../../server/controllers/user/user.controller'
import { UserRepository } from '../../../../../server/repositories/user/user.repository'
import { UserService } from '../../../../../server/services/user/user.service'

const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return userController.findUserById(id)
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params

    let body: unknown

    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return userController.updateUserById(body, id)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    return userController.deleteUserById(id)
}
