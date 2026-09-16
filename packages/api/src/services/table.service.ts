import { randomUUID } from 'crypto'
import type { Table, TableStatusType } from '@models/table.model.js'
import { normalizeTableStatus } from '@models/table.model.js'
import type { TableRepository } from '@repositories/table.repository.js'
import {
    RestaurantIdRequiredError,
    TableNumberRequiredError,
    InvalidTableNumberError,
    InvalidTableCapacityError,
    TableNotFoundError,
    DuplicatedTableNumberError,
    TableNotAvailableError,
    TableCapacityExceededError,
    InvalidPartySizeError
} from '@errors/DomainErrors.js'

export interface CreateTableDTO {
    number: number
    description: string | null
    capacity: number
    status?: string
    restaurantId: string
}

export interface UpdateTableDTO {
    number: number
    description: string | null
    capacity: number
    status: string
}

export class TableService {
    constructor(private readonly tableRepository: TableRepository) {}

    async create(dto: CreateTableDTO): Promise<Table> {
        const now = new Date().toISOString()
        const table = this.buildTable({
            id: randomUUID(),
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status ?? 'libre',
            restaurantId: dto.restaurantId,
            createdAt: now,
            updatedAt: now
        })

        await this.assertNumberIsFree(table.restaurantId, table.number, null)

        await this.tableRepository.save(table)
        return table
    }

    async update(id: string, dto: UpdateTableDTO): Promise<Table> {
        const existing = await this.requireTable(id)

        const updated = this.buildTable({
            id: existing.id,
            number: dto.number,
            description: dto.description,
            capacity: dto.capacity,
            status: dto.status,
            restaurantId: existing.restaurantId,
            createdAt: existing.createdAt,
            updatedAt: new Date().toISOString()
        })

        await this.assertNumberIsFree(updated.restaurantId, updated.number, existing.id)

        await this.tableRepository.save(updated)
        return updated
    }

    async delete(id: string): Promise<void> {
        await this.requireTable(id)
        await this.tableRepository.delete(id)
    }

    async findById(id: string): Promise<Table | null> {
        return this.tableRepository.findById(id)
    }

    async findByRestaurantId(restaurantId: string): Promise<Table[]> {
        return this.tableRepository.findByRestaurantId(restaurantId)
    }

    async findAvailableForParty(restaurantId: string, partySize: number): Promise<Table[]> {
        if (!restaurantId || restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }
        if (!Number.isInteger(partySize) || partySize <= 0) {
            throw new InvalidPartySizeError()
        }
        return this.tableRepository.findAvailableByPartySize(restaurantId, partySize)
    }

    async changeStatus(id: string, status: string): Promise<Table> {
        const existing = await this.requireTable(id)

        const updated: Table = {
            ...existing,
            status: normalizeTableStatus(status),
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    /**
     * Seats a party at a free table and marks it as occupied. Used when a customer
     * picks a table before ordering.
     */
    async occupy(id: string, partySize: number): Promise<Table> {
        if (!Number.isInteger(partySize) || partySize <= 0) {
            throw new InvalidPartySizeError()
        }

        const existing = await this.requireTable(id)

        if (existing.status !== 'libre') {
            throw new TableNotAvailableError()
        }
        if (existing.capacity < partySize) {
            throw new TableCapacityExceededError()
        }

        const updated: Table = {
            ...existing,
            status: 'ocupada',
            updatedAt: new Date().toISOString()
        }

        await this.tableRepository.save(updated)
        return updated
    }

    private async requireTable(id: string): Promise<Table> {
        const existing = await this.tableRepository.findById(id)
        if (!existing) {
            throw new TableNotFoundError()
        }
        return existing
    }

    private async assertNumberIsFree(restaurantId: string, number: number, exceptId: string | null): Promise<void> {
        const sameNumber = await this.tableRepository.findByRestaurantIdAndNumber(restaurantId, number)
        if (sameNumber && sameNumber.id !== exceptId) {
            throw new DuplicatedTableNumberError()
        }
    }

    private buildTable(props: {
        id: string
        number: number
        description: string | null
        capacity: number
        status: string
        restaurantId: string
        createdAt: string
        updatedAt: string
    }): Table {
        if (props.number === null || props.number === undefined) {
            throw new TableNumberRequiredError()
        }
        if (!Number.isInteger(props.number) || props.number <= 0) {
            throw new InvalidTableNumberError()
        }
        if (!Number.isInteger(props.capacity) || props.capacity <= 0) {
            throw new InvalidTableCapacityError()
        }
        if (!props.restaurantId || props.restaurantId.trim() === '') {
            throw new RestaurantIdRequiredError()
        }

        const description = props.description === null || props.description === undefined
            ? null
            : props.description.trim()

        const status: TableStatusType = normalizeTableStatus(props.status)

        return {
            id: props.id,
            number: props.number,
            description: description === '' ? null : description,
            capacity: props.capacity,
            status,
            restaurantId: props.restaurantId,
            createdAt: props.createdAt,
            updatedAt: props.updatedAt
        }
    }
}
