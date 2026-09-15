import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { BugReportService } from './bug-report.service.js'
import { GhCliIssueTracker } from './issue-tracker.client.js'
import type { CommandExecutor } from './issue-tracker.client.js'
import { MockIssueTracker } from '@services/mocks/MockIssueTracker.js'
import { MAX_DESCRIPTION_LENGTH } from '@models/bug-report.model.js'

describe('BugReportService', () => {
    let tracker: MockIssueTracker
    let service: BugReportService

    const validInput = {
        description: 'El botón de "Listo" en Cocina no marca el plato como servido',
        employeeId: 'emp-1',
        role: 'cocinero',
        restaurantId: 'rest-1'
    }

    beforeEach(() => {
        tracker = new MockIssueTracker()
        service = new BugReportService(tracker)
    })

    describe('create', () => {
        it('should call the issue tracker once and return the created issue', async () => {
            const result = await service.create(validInput)

            expect(tracker.callCount).toBe(1)
            expect(result).toEqual({
                number: 42,
                url: 'https://github.com/angelisco1/curso-claude-resttek-1/issues/42'
            })
        })

        it('should send the fixed labels bug, proyecto:web-empleados and por-revisar', async () => {
            await service.create(validInput)

            expect(tracker.lastCall?.labels).toEqual(['bug', 'proyecto:web-empleados', 'por-revisar'])
        })
    })

    describe('title', () => {
        it('should prefix the title with [web-empleados]', async () => {
            await service.create(validInput)

            expect(tracker.lastCall?.title)
                .toBe('[web-empleados] El botón de "Listo" en Cocina no marca el plato como servido')
        })

        it('should keep only the first line of the description', async () => {
            await service.create({ ...validInput, description: 'Primera línea\nSegunda línea\nTercera' })

            expect(tracker.lastCall?.title).toBe('[web-empleados] Primera línea')
        })

        it('should truncate long single-line descriptions to 80 characters with an ellipsis', async () => {
            const longLine = 'a'.repeat(200)

            await service.create({ ...validInput, description: longLine })

            const title = tracker.lastCall?.title as string
            expect(title.startsWith('[web-empleados] ')).toBe(true)
            expect(title.endsWith('…')).toBe(true)
            expect(title.length).toBeLessThanOrEqual(96)
            expect(title).toBe(`[web-empleados] ${'a'.repeat(79)}…`)
        })

        it('should not truncate a description of exactly 80 characters', async () => {
            const exactLine = 'b'.repeat(80)

            await service.create({ ...validInput, description: exactLine })

            expect(tracker.lastCall?.title).toBe(`[web-empleados] ${exactLine}`)
            expect(tracker.lastCall?.title).not.toContain('…')
        })
    })

    describe('body', () => {
        it('should contain the full description, the employee, the role, the restaurant and an ISO date', async () => {
            await service.create(validInput)

            const body = tracker.lastCall?.body as string
            expect(body).toContain(validInput.description)
            expect(body).toContain('---')
            expect(body).toContain('Reportado desde la app **web-empleados**.')
            expect(body).toContain('- Empleado: `emp-1` (rol: `cocinero`)')
            expect(body).toContain('- Restaurante: `rest-1`')
            expect(body).toMatch(/- Fecha: `\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z`/)
        })

        it('should keep the whole multi-line description in the body', async () => {
            const description = 'Primera línea\nSegunda línea con detalle\nTercera línea'

            await service.create({ ...validInput, description })

            expect(tracker.lastCall?.body.startsWith(description)).toBe(true)
        })

        it('should render "sin asignar" when the employee has no restaurant', async () => {
            await service.create({ ...validInput, restaurantId: null })

            expect(tracker.lastCall?.body).toContain('- Restaurante: sin asignar')
        })

        it('should not interpret shell metacharacters, keeping the text literal', async () => {
            const description = 'Falla al pulsar "; rm -rf / y también $(whoami) y `ls`'

            await service.create({ ...validInput, description })

            expect(tracker.lastCall?.body).toContain(description)
        })
    })

    describe('validation', () => {
        it('should throw BugReportDescriptionRequiredError for an empty description', async () => {
            await expect(service.create({ ...validInput, description: '' }))
                .rejects.toThrow('La descripción del reporte es requerida')
            expect(tracker.callCount).toBe(0)
        })

        it('should throw BugReportDescriptionRequiredError for a whitespace-only description', async () => {
            await expect(service.create({ ...validInput, description: '   \n\t  ' }))
                .rejects.toThrow('La descripción del reporte es requerida')
            expect(tracker.callCount).toBe(0)
        })

        it('should throw BugReportDescriptionRequiredError when description is not a string', async () => {
            await expect(service.create({ ...validInput, description: undefined as unknown as string }))
                .rejects.toThrow('La descripción del reporte es requerida')
            await expect(service.create({ ...validInput, description: 123 as unknown as string }))
                .rejects.toThrow('La descripción del reporte es requerida')
            expect(tracker.callCount).toBe(0)
        })

        it('should throw BugReportDescriptionTooShortError for 9 characters after trim', async () => {
            await expect(service.create({ ...validInput, description: '  123456789  ' }))
                .rejects.toThrow('La descripción debe tener al menos 10 caracteres')
            expect(tracker.callCount).toBe(0)
        })

        it('should accept exactly 10 characters', async () => {
            await service.create({ ...validInput, description: '1234567890' })

            expect(tracker.callCount).toBe(1)
        })

        it('should throw BugReportDescriptionTooLongError for 5001 characters after trim', async () => {
            await expect(service.create({ ...validInput, description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 1) }))
                .rejects.toThrow('La descripción no puede superar los 5000 caracteres')
            expect(tracker.callCount).toBe(0)
        })

        it('should accept exactly 5000 characters', async () => {
            await service.create({ ...validInput, description: 'x'.repeat(MAX_DESCRIPTION_LENGTH) })

            expect(tracker.callCount).toBe(1)
        })
    })

    describe('issue tracker failure', () => {
        it('should propagate GithubIssueCreationError', async () => {
            tracker.simulateFailure()

            await expect(service.create(validInput))
                .rejects.toThrow('No se pudo crear la issue en GitHub')
        })
    })
})

describe('GhCliIssueTracker', () => {
    const input = {
        title: '[web-empleados] Algo falla',
        body: 'Algo falla de verdad',
        labels: ['bug', 'proyecto:web-empleados', 'por-revisar'] as const
    }

    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    const executorReturning = (stdout: string): CommandExecutor =>
        vi.fn(async () => ({ stdout, stderr: '' }))

    it('should parse the issue number and url from stdout', async () => {
        const execute = executorReturning('https://github.com/angelisco1/curso-claude-resttek-1/issues/42\n')
        const tracker = new GhCliIssueTracker(execute, 'angelisco1/curso-claude-resttek-1')

        const result = await tracker.createIssue(input)

        expect(result).toEqual({
            number: 42,
            url: 'https://github.com/angelisco1/curso-claude-resttek-1/issues/42'
        })
    })

    it('should invoke gh with the arguments in an array and never through a shell', async () => {
        const execute = executorReturning('https://github.com/angelisco1/curso-claude-resttek-1/issues/7')
        const tracker = new GhCliIssueTracker(execute, 'owner/repo')

        await tracker.createIssue(input)

        expect(execute).toHaveBeenCalledTimes(1)
        const [file, args, options] = vi.mocked(execute).mock.calls[0]!
        expect(file).toBe('gh')
        expect(args).toEqual([
            'issue', 'create',
            '--repo', 'owner/repo',
            '--title', input.title,
            '--body', input.body,
            '--label', 'bug',
            '--label', 'proyecto:web-empleados',
            '--label', 'por-revisar'
        ])
        expect(options).toMatchObject({ timeout: 15000, maxBuffer: 1024 * 1024 })
        expect(options).not.toHaveProperty('shell')
    })

    it('should pass the employee text as a single argument, without shell interpolation', async () => {
        const execute = executorReturning('https://github.com/owner/repo/issues/9')
        const tracker = new GhCliIssueTracker(execute, 'owner/repo')
        const dangerousBody = '"; rm -rf / $(whoami) `id`'

        await tracker.createIssue({ ...input, body: dangerousBody })

        const [, args] = vi.mocked(execute).mock.calls[0] as [string, string[], unknown]
        expect(args).toContain(dangerousBody)
        expect(args.filter(a => a === dangerousBody)).toHaveLength(1)
    })

    it('should throw GithubIssueCreationError when stdout has no /issues/<n>', async () => {
        const tracker = new GhCliIssueTracker(executorReturning('creating issue...\n'), 'owner/repo')

        await expect(tracker.createIssue(input)).rejects.toThrow('No se pudo crear la issue en GitHub')
    })

    it('should throw GithubIssueCreationError when the command fails', async () => {
        const failure = Object.assign(new Error('Command failed'), { stderr: 'could not add label: por-revisar not found' })
        const execute: CommandExecutor = vi.fn(async () => { throw failure })
        const tracker = new GhCliIssueTracker(execute, 'owner/repo')

        await expect(tracker.createIssue(input)).rejects.toThrow('No se pudo crear la issue en GitHub')
    })

    it('should log the stderr but never expose it in the thrown error', async () => {
        const failure = Object.assign(new Error('Command failed'), { stderr: 'HTTP 401: Bad credentials (token ghp_secret)' })
        const execute: CommandExecutor = vi.fn(async () => { throw failure })
        const tracker = new GhCliIssueTracker(execute, 'owner/repo')

        const thrown = await tracker.createIssue(input).catch((e: Error) => e) as Error

        expect(console.error).toHaveBeenCalledWith(
            expect.stringContaining('gh issue create'),
            'HTTP 401: Bad credentials (token ghp_secret)'
        )
        expect(thrown.message).toBe('No se pudo crear la issue en GitHub')
        expect(thrown.message).not.toContain('ghp_secret')
    })

    it('should default to the angelisco1/curso-claude-resttek-1 repository', async () => {
        const execute = executorReturning('https://github.com/angelisco1/curso-claude-resttek-1/issues/1')
        const tracker = new GhCliIssueTracker(execute)

        await tracker.createIssue(input)

        const [, args] = vi.mocked(execute).mock.calls[0] as [string, string[], unknown]
        expect(args[args.indexOf('--repo') + 1]).toBe(
            process.env.GITHUB_REPO || 'angelisco1/curso-claude-resttek-1'
        )
    })
})
