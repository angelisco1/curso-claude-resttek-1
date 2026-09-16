import type { Request, Response, NextFunction } from 'express'
import type { AuthRequest } from '@shared/infrastructure/http/middlewares.js'
import type { BugReportService } from '@services/bug-report.service.js'

export class BugReportController {
    constructor(private readonly bugReportService: BugReportService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const user = (req as AuthRequest).user
            const issue = await this.bugReportService.create({
                description: req.body?.description,
                employeeId: user?.id,
                role: user?.role,
                restaurantId: user?.restaurantId ?? null
            })
            res.status(201).json({ issueNumber: issue.number, issueUrl: issue.url })
        } catch (error) {
            next(error)
        }
    }
}
