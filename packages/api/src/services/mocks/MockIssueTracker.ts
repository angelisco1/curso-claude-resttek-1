import type { CreatedIssue, CreateIssueInput, IssueTracker } from '@services/issue-tracker.client.js'
import { GithubIssueCreationError } from '@errors/DomainErrors.js'

export class MockIssueTracker implements IssueTracker {
    public readonly calls: CreateIssueInput[] = []

    private shouldFail = false
    private nextIssue: CreatedIssue = {
        number: 42,
        url: 'https://github.com/angelisco1/curso-claude-resttek-1/issues/42'
    }

    simulateFailure(): void {
        this.shouldFail = true
    }

    setNextIssue(issue: CreatedIssue): void {
        this.nextIssue = issue
    }

    get callCount(): number {
        return this.calls.length
    }

    get lastCall(): CreateIssueInput | undefined {
        return this.calls[this.calls.length - 1]
    }

    async createIssue(input: CreateIssueInput): Promise<CreatedIssue> {
        this.calls.push(input)
        if (this.shouldFail) {
            throw new GithubIssueCreationError()
        }
        return this.nextIssue
    }
}
