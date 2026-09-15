import { Router } from 'express'
import { BugReportController } from '@controllers/bug-report.controller.js'
import { BugReportService } from '@services/bug-report.service.js'
import { GhCliIssueTracker } from '@services/issue-tracker.client.js'
import { authenticate, authorize } from '@shared/infrastructure/http/middlewares.js'

const issueTracker = new GhCliIssueTracker()
const bugReportService = new BugReportService(issueTracker)
const bugReportController = new BugReportController(bugReportService)

const router = Router()

router.post(
    '/',
    authenticate,
    authorize(['cocinero', 'camarero', 'manager', 'admin']),
    bugReportController.create
)

export default router
