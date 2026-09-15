import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { GithubIssueCreationError } from '@errors/DomainErrors.js'

const DEFAULT_GITHUB_REPO = 'angelisco1/curso-claude-resttek-1'
const GH_TIMEOUT_MS = 15000
const GH_MAX_BUFFER = 1024 * 1024
const ISSUE_URL_PATTERN = /\/issues\/(\d+)\s*$/

export interface CreatedIssue {
    number: number
    url: string
}

export interface CreateIssueInput {
    title: string
    body: string
    labels: readonly string[]
}

export interface IssueTracker {
    createIssue(input: CreateIssueInput): Promise<CreatedIssue>
}

export interface CommandOptions {
    timeout: number
    maxBuffer: number
    env: NodeJS.ProcessEnv
}

export interface CommandResult {
    stdout: string
    stderr: string
}

/**
 * Ejecutor de comandos inyectable: permite testear `GhCliIssueTracker`
 * sin lanzar el binario `gh` de verdad.
 */
export type CommandExecutor = (
    file: string,
    args: string[],
    options: CommandOptions
) => Promise<CommandResult>

const execFileAsync = promisify(execFile)

/**
 * Nunca se usa `exec` ni `shell: true`: los argumentos viajan en un array,
 * de modo que el texto escrito por el empleado jamás lo interpreta un shell.
 */
const defaultExecutor: CommandExecutor = async (file, args, options) => {
    const { stdout, stderr } = await execFileAsync(file, args, options)
    return { stdout, stderr }
}

export class GhCliIssueTracker implements IssueTracker {
    constructor(
        private readonly execute: CommandExecutor = defaultExecutor,
        private readonly repo: string = process.env.GITHUB_REPO || DEFAULT_GITHUB_REPO
    ) {}

    async createIssue(input: CreateIssueInput): Promise<CreatedIssue> {
        const args = [
            'issue',
            'create',
            '--repo',
            this.repo,
            '--title',
            input.title,
            '--body',
            input.body
        ]

        for (const label of input.labels) {
            args.push('--label', label)
        }

        let stdout: string
        try {
            const result = await this.execute('gh', args, {
                timeout: GH_TIMEOUT_MS,
                maxBuffer: GH_MAX_BUFFER,
                env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN }
            })
            stdout = result.stdout
        } catch (error) {
            // El stderr de `gh` puede contener el token: solo va a los logs, nunca a la respuesta HTTP.
            console.error('[GhCliIssueTracker] `gh issue create` falló:', this.describeFailure(error))
            throw new GithubIssueCreationError()
        }

        const url = stdout.trim()
        const match = ISSUE_URL_PATTERN.exec(url)
        const issueNumber = match?.[1]
        if (!issueNumber) {
            console.error('[GhCliIssueTracker] salida inesperada de `gh issue create`:', stdout)
            throw new GithubIssueCreationError()
        }

        return { number: Number(issueNumber), url }
    }

    private describeFailure(error: unknown): unknown {
        if (error && typeof error === 'object' && 'stderr' in error && error.stderr) {
            return error.stderr
        }
        return error
    }
}
