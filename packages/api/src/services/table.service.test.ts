import { describe, it, expect, beforeEach } from 'vitest'
import { TableService } from './table.service.js'
import { normalizeTableStatus } from '@models/table.model.js'
import { MockTableRepository } from '@repositories/mocks/MockTableRepository.js'

describe('normalizeTableStatus', () => {
    it('should accept a valid status', () => {
        expect(normalizeTableStatus('libre')).toBe('libre')
    })

    it('should normalize to lowercase and trim', () => {
        expect(normalizeTableStatus('  OCUPADA ')).toBe('ocupada')
    })

    it('should accept all valid statuses', () => {
        for (const s of ['libre', 'ocupada', 'reservada']) {
            expect(normalizeTableStatus(s)).toBe(s)
        }
    })

    it('should throw InvalidTableStatusError for an unknown status', () => {
        expect(() => normalizeTableStatus('sucia')).toThrow('Invalid status')
    })

    it('should throw InvalidTableStatusError for an empty status', () => {
        expect(() => normalizeTableStatus('')).toThrow('Status must be provided')
    })
})

describe('TableService', () => {
    let repo: MockTableRepository
    let service: TableService

    const validInput = {
        number: 1,
        description: 'Junto a la ventana',
        capacity: 4,
        restaurantId: 'r1'
    }

    beforeEach(() => {
        repo = new MockTableRepository()
        service = new TableService(repo)
    })

    describe('create', () => {
        it('should create and save a table defaulting to libre', async () => {
            const result = await service.create(validInput)

            expect(result.id).toBeDefined()
            expect(result.number).toBe(1)
            expect(result.description).toBe('Junto a la ventana')
            expect(result.capacity).toBe(4)
            expect(result.status).toBe('libre')
            expect(result.restaurantId).toBe('r1')
        })

        it('should honour an explicit status', async () => {
            const result = await service.create({ ...validInput, status: 'reservada' })
            expect(result.status).toBe('reservada')
        })

        it('should store a blank description as null', async () => {
            const result = await service.create({ ...validInput, description: '   ' })
            expect(result.description).toBeNull()
        })

        it('should throw InvalidTableNumberError for a non-positive number', async () => {
            await expect(service.create({ ...validInput, number: 0 }))
                .rejects.toThrow('Table number must be a positive integer')
        })

        it('should throw InvalidTableNumberError for a decimal number', async () => {
            await expect(service.create({ ...validInput, number: 1.5 }))
                .rejects.toThrow('Table number must be a positive integer')
        })

        it('should throw InvalidTableCapacityError for a non-positive capacity', async () => {
            await expect(service.create({ ...validInput, capacity: 0 }))
                .rejects.toThrow('Table capacity must be a positive integer')
        })

        it('should throw RestaurantIdRequiredError when the restaurant is missing', async () => {
            await expect(service.create({ ...validInput, restaurantId: '' }))
                .rejects.toThrow('Restaurant ID is required')
        })

        it('should throw DuplicatedTableNumberError for a repeated number in the same restaurant', async () => {
            await service.create(validInput)
            await expect(service.create(validInput))
                .rejects.toThrow('There is already a table with this number in the restaurant')
        })

        it('should allow the same number in a different restaurant', async () => {
            await service.create(validInput)
            const other = await service.create({ ...validInput, restaurantId: 'r2' })
            expect(other.number).toBe(1)
        })
    })

    describe('update', () => {
        it('should update an existing table', async () => {
            const created = await service.create(validInput)

            const updated = await service.update(created.id, {
                number: 7,
                description: 'Terraza',
                capacity: 6,
                status: 'reservada'
            })

            expect(updated.id).toBe(created.id)
            expect(updated.number).toBe(7)
            expect(updated.description).toBe('Terraza')
            expect(updated.capacity).toBe(6)
            expect(updated.status).toBe('reservada')
            expect(updated.createdAt).toBe(created.createdAt)
        })

        it('should keep its own number without reporting a duplicate', async () => {
            const created = await service.create(validInput)
            const updated = await service.update(created.id, {
                number: created.number,
                description: null,
                capacity: 2,
                status: 'libre'
            })
            expect(updated.capacity).toBe(2)
        })

        it('should throw DuplicatedTableNumberError when taking another table number', async () => {
            await service.create(validInput)
            const second = await service.create({ ...validInput, number: 2 })

            await expect(service.update(second.id, {
                number: 1,
                description: null,
                capacity: 4,
                status: 'libre'
            })).rejects.toThrow('There is already a table with this number in the restaurant')
        })

        it('should throw TableNotFoundError for an unknown table', async () => {
            await expect(service.update('missing', {
                number: 1,
                description: null,
                capacity: 4,
                status: 'libre'
            })).rejects.toThrow('Table not found')
        })
    })

    describe('delete', () => {
        it('should delete an existing table', async () => {
            const created = await service.create(validInput)
            await service.delete(created.id)
            expect(await service.findById(created.id)).toBeNull()
        })

        it('should throw TableNotFoundError for an unknown table', async () => {
            await expect(service.delete('missing')).rejects.toThrow('Table not found')
        })
    })

    describe('findAvailableForParty', () => {
        beforeEach(async () => {
            await service.create({ number: 1, description: null, capacity: 2, restaurantId: 'r1' })
            await service.create({ number: 2, description: null, capacity: 4, restaurantId: 'r1' })
            await service.create({ number: 3, description: null, capacity: 6, restaurantId: 'r1' })
            await service.create({ number: 4, description: null, capacity: 4, restaurantId: 'r1', status: 'ocupada' })
            await service.create({ number: 5, description: null, capacity: 4, restaurantId: 'r1', status: 'reservada' })
            await service.create({ number: 6, description: null, capacity: 8, restaurantId: 'r2' })
        })

        it('should only return free tables of the restaurant that fit the party', async () => {
            const result = await service.findAvailableForParty('r1', 4)
            expect(result.map(t => t.number)).toEqual([2, 3])
        })

        it('should order by capacity so the party takes the smallest table that fits', async () => {
            const result = await service.findAvailableForParty('r1', 2)
            expect(result.map(t => t.capacity)).toEqual([2, 4, 6])
        })

        it('should return an empty list when no table is big enough', async () => {
            expect(await service.findAvailableForParty('r1', 10)).toEqual([])
        })

        it('should throw InvalidPartySizeError for a non-positive party size', async () => {
            await expect(service.findAvailableForParty('r1', 0))
                .rejects.toThrow('Party size must be a positive integer')
        })

        it('should throw RestaurantIdRequiredError when the restaurant is missing', async () => {
            await expect(service.findAvailableForParty('', 2))
                .rejects.toThrow('Restaurant ID is required')
        })
    })

    describe('changeStatus', () => {
        it('should change the status of a table', async () => {
            const created = await service.create(validInput)
            const updated = await service.changeStatus(created.id, 'ocupada')
            expect(updated.status).toBe('ocupada')
        })

        it('should throw InvalidTableStatusError for an unknown status', async () => {
            const created = await service.create(validInput)
            await expect(service.changeStatus(created.id, 'sucia')).rejects.toThrow('Invalid status')
        })

        it('should throw TableNotFoundError for an unknown table', async () => {
            await expect(service.changeStatus('missing', 'libre')).rejects.toThrow('Table not found')
        })
    })

    describe('occupy', () => {
        it('should mark a free table as occupied', async () => {
            const created = await service.create(validInput)
            const occupied = await service.occupy(created.id, 4)
            expect(occupied.status).toBe('ocupada')
        })

        it('should throw TableNotAvailableError when the table is already occupied', async () => {
            const created = await service.create(validInput)
            await service.occupy(created.id, 2)
            await expect(service.occupy(created.id, 2)).rejects.toThrow('The table is not available')
        })

        it('should throw TableNotAvailableError when the table is reserved', async () => {
            const created = await service.create({ ...validInput, status: 'reservada' })
            await expect(service.occupy(created.id, 2)).rejects.toThrow('The table is not available')
        })

        it('should throw TableCapacityExceededError when the party does not fit', async () => {
            const created = await service.create(validInput)
            await expect(service.occupy(created.id, 5))
                .rejects.toThrow('The table does not have enough capacity for the party size')
        })

        it('should throw InvalidPartySizeError for a non-positive party size', async () => {
            const created = await service.create(validInput)
            await expect(service.occupy(created.id, 0)).rejects.toThrow('Party size must be a positive integer')
        })

        it('should throw TableNotFoundError for an unknown table', async () => {
            await expect(service.occupy('missing', 2)).rejects.toThrow('Table not found')
        })
    })
})
