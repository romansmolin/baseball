import { AdminController } from '../../controllers/admin/admin.controller'
import { AdminRepository } from '../../repositories/admin/admin.repository'

import { AdminService } from './admin.service'

export function buildAdminController(): AdminController {
    return new AdminController(new AdminService(new AdminRepository()))
}
