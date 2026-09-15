import type { Request, Response, NextFunction } from 'express'
import { AppError } from '@errors/AppError.js'

export const errorHandler = (err: any, _req: Request, res: Response, _next: NextFunction): void => {
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            error: err.name,
            message: err.message
        })
        return
    }

    res.status(500).json({ error: 'InternalServerError', message: 'Something went wrong' })
}
