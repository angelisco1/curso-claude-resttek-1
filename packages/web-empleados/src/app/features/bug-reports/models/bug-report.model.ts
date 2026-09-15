export interface CreateBugReportDto {
  description: string
}

export interface BugReportCreated {
  issueNumber: number
  issueUrl: string
}
