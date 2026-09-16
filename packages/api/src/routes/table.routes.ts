import { Router } from 'express'
import { TableController } from '@controllers/table.controller.js'
import { dbConfig } from '@config/database.js'
import { SqliteTableRepository } from '@repositories/table.repository.js'
import { TableService } from '@services/table.service.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const tableRepository = new SqliteTableRepository(dbConfig)
const tableService = new TableService(tableRepository)
const tableController = new TableController(tableService)

const router = Router({ mergeParams: true })

router.post('/', authenticate, authorize(['admin', 'manager']), tableController.create)
router.get('/', authenticate, authorize(['admin', 'manager', 'camarero', 'cocinero']), tableController.getAll)
router.get('/:id', authenticate, authorize(['admin', 'manager', 'camarero', 'cocinero']), tableController.getById)
router.put('/:id', authenticate, authorize(['admin', 'manager']), tableController.update)
router.patch('/:id/status', authenticate, authorize(['admin', 'manager', 'camarero']), tableController.updateStatus)
router.delete('/:id', authenticate, authorize(['admin', 'manager']), tableController.delete)

export default router
