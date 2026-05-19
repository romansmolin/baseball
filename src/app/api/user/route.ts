import { ApiError } from '../../../../server/errors/api.error'
import { UserController } from '../../../../server/controllers/user/user.controller'
import { UserRepository } from '../../../../server/repositories/user/user.repository'
import { UserService } from '../../../../server/services/user/user.service'

const userRepository = new UserRepository()
const userService = new UserService(userRepository)
const userController = new UserController(userService)

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get('email')

    if (!email) {
        return ApiError.validationError('email query parameter is required').toResponse()
    }

    return userController.findUserByEmail(email)
}

export async function POST(request: Request) {
    let body: unknown

    try {
        body = await request.json()
    } catch {
        return ApiError.validationError('Invalid JSON body').toResponse()
    }

    return userController.createUser(body)
}
