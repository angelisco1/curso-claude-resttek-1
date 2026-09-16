export const BUG_REPORT_LABELS = ['bug', 'proyecto:web-empleados', 'por-revisar'] as const

export const MIN_DESCRIPTION_LENGTH = 10

export const MAX_DESCRIPTION_LENGTH = 5000

export interface BugReport {
    description: string
    employeeId: string
    role: string
    restaurantId: string | null
    reportedAt: string
}
