import { SqliteTableRepository } from './table.repository.js'
import { Database } from '@config/database.js'
import type { Table } from '@models/table.model.js'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'

describe('SqliteTableRepository (Integration)', () => {
    let db: Database
    let repo: SqliteTableRepository

    const buildTable = (overrides: Partial<Table> = {}): Table => ({
        id: 't1',
        number: 1,
        description: 'Junto a la ventana',
        capacity: 4,
        status: 'libre',
        restaurantId: 'r1',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides
    })

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        db = new Database()
        await db.initialize()
        repo = new SqliteTableRepository(db)

        await db.run(
            `INSERT INTO restaurants (id, name, address, email, phone, owner_first_name, owner_last_name, logo_url, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['r1', 'El Gourmet', 'Calle Mayor 10', 'info@gourmet.com', '912345678', 'Carlos', 'García', null, new Date().toISOString(), new Date().toISOString()]
        )
    })

    afterAll(async () => {
        await db.close()
    })

    it('should save and find a table by id', async () => {
        await repo.save(buildTable())

        const found = await repo.findById('t1')
        expect(found).not.toBeNull()
        expect(found?.number).toBe(1)
        expect(found?.capacity).toBe(4)
        expect(found?.status).toBe('libre')
        expect(found?.description).toBe('Junto a la ventana')
        expect(found?.restaurantId).toBe('r1')
    })

    it('should return null for an unknown id', async () => {
        expect(await repo.findById('nope')).toBeNull()
    })

    it('should update an existing table', async () => {
        await repo.save(buildTable({ capacity: 6, status: 'ocupada', description: null }))

        const found = await repo.findById('t1')
        expect(found?.capacity).toBe(6)
        expect(found?.status).toBe('ocupada')
        expect(found?.description).toBeNull()
    })

    it('should find a table by restaurant and number', async () => {
        const found = await repo.findByRestaurantIdAndNumber('r1', 1)
        expect(found?.id).toBe('t1')

        expect(await repo.findByRestaurantIdAndNumber('r1', 99)).toBeNull()
    })

    it('should list the tables of a restaurant ordered by number', async () => {
        await repo.save(buildTable({ id: 't3', number: 3, capacity: 2, status: 'libre' }))
        await repo.save(buildTable({ id: 't2', number: 2, capacity: 8, status: 'libre' }))

        const tables = await repo.findByRestaurantId('r1')
        expect(tables.map(t => t.number)).toEqual([1, 2, 3])
    })

    it('should only return free tables with enough capacity, smallest first', async () => {
        // t1 is ocupada (capacity 6), t2 is libre (8), t3 is libre (2)
        const available = await repo.findAvailableByPartySize('r1', 2)
        expect(available.map(t => t.id)).toEqual(['t3', 't2'])

        const forFour = await repo.findAvailableByPartySize('r1', 4)
        expect(forFour.map(t => t.id)).toEqual(['t2'])

        expect(await repo.findAvailableByPartySize('r1', 20)).toEqual([])
    })

    it('should delete a table', async () => {
        await repo.delete('t3')
        expect(await repo.findById('t3')).toBeNull()
    })
})
