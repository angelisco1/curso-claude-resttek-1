import type { BugReport } from '@models/bug-report.model.js'
import {
    BUG_REPORT_LABELS,
    MAX_DESCRIPTION_LENGTH,
    MIN_DESCRIPTION_LENGTH
} from '@models/bug-report.model.js'
import type { CreatedIssue, IssueTracker } from '@services/issue-tracker.client.js'
import {
    BugReportDescriptionRequiredError,
    BugReportDescriptionTooLongError,
    BugReportDescriptionTooShortError
} from '@errors/DomainErrors.js'

const SOURCE_APP = 'web-empleados'
const MAX_TITLE_LENGTH = 80
const ELLIPSIS = '…'

export interface CreateBugReportDTO {
    description: string
    employeeId: string
    role: string
    restaurantId: string | null
}

export class BugReportService {
    constructor(private readonly issueTracker: IssueTracker) {}

    async create(dto: CreateBugReportDTO): Promise<CreatedIssue> {
        const report = this.buildBugReport(dto)

        return this.issueTracker.createIssue({
            title: this.buildTitle(report.description),
            body: this.buildBody(report),
            labels: BUG_REPORT_LABELS
        })
    }

    private buildBugReport(dto: CreateBugReportDTO): BugReport {
        if (typeof dto.description !== 'string') {
            throw new BugReportDescriptionRequiredError()
        }

        const description = dto.description.trim()
        if (description === '') {
            throw new BugReportDescriptionRequiredError()
        }
        if (description.length < MIN_DESCRIPTION_LENGTH) {
            throw new BugReportDescriptionTooShortError()
        }
        if (description.length > MAX_DESCRIPTION_LENGTH) {
            throw new BugReportDescriptionTooLongError()
        }

        return {
            description,
            employeeId: dto.employeeId,
            role: dto.role,
            restaurantId: dto.restaurantId,
            reportedAt: new Date().toISOString()
        }
    }

    private buildTitle(description: string): string {
        const firstLine = (description.split('\n')[0] ?? '').trim()
        const summary = firstLine.length > MAX_TITLE_LENGTH
            ? `${firstLine.slice(0, MAX_TITLE_LENGTH - ELLIPSIS.length)}${ELLIPSIS}`
            : firstLine

        return `[${SOURCE_APP}] ${summary}`
    }

    private buildBody(report: BugReport): string {
        const restaurant = report.restaurantId ? `\`${report.restaurantId}\`` : 'sin asignar'

        return [
            report.description,
            '',
            '---',
            `Reportado desde la app **${SOURCE_APP}**.`,
            '',
            `- Empleado: \`${report.employeeId}\` (rol: \`${report.role}\`)`,
            `- Restaurante: ${restaurant}`,
            `- Fecha: \`${report.reportedAt}\``
        ].join('\n')
    }
}
