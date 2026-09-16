import type { Request, Response, NextFunction } from 'express'
import type { TableService } from '@services/table.service.js'
import type { Table } from '@models/table.model.js'
import { TableNotFoundError, InvalidPartySizeError } from '@errors/DomainErrors.js'

export class TableController {
    constructor(private readonly tableService: TableService) {}

    create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.create({
                number: req.body.number,
                description: req.body.description ?? null,
                capacity: req.body.capacity,
                status: req.body.status ?? 'libre',
                restaurantId: req.params.restaurantId as string
            })
            res.status(201).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const tables = await this.tableService.findByRestaurantId(req.params.restaurantId as string)
            res.status(200).json(tables.map(t => this.toJSON(t)))
        } catch (error) {
            next(error)
        }
    }

    getAvailable = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const partySize = Number(req.query.partySize)
            if (!Number.isInteger(partySize) || partySize <= 0) {
                throw new InvalidPartySizeError()
            }
            const tables = await this.tableService.findAvailableForParty(
                req.params.restaurantId as string,
                partySize
            )
            res.status(200).json(tables.map(t => this.toJSON(t)))
        } catch (error) {
            next(error)
        }
    }

    getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.findById(req.params.id as string)
            if (!table) {
                throw new TableNotFoundError()
            }
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.update(req.params.id as string, {
                number: req.body.number,
                description: req.body.description ?? null,
                capacity: req.body.capacity,
                status: req.body.status
            })
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    updateStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.changeStatus(req.params.id as string, req.body.status)
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    occupy = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            const table = await this.tableService.occupy(req.params.id as string, Number(req.body.partySize))
            res.status(200).json(this.toJSON(table))
        } catch (error) {
            next(error)
        }
    }

    delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            await this.tableService.delete(req.params.id as string)
            res.status(204).send()
        } catch (error) {
            next(error)
        }
    }

    private toJSON(table: Table) {
        return {
            id: table.id,
            number: table.number,
            description: table.description,
            capacity: table.capacity,
            status: table.status,
            restaurantId: table.restaurantId,
            createdAt: table.createdAt,
            updatedAt: table.updatedAt
        }
    }
}
