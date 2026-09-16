import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BugReportCreated, CreateBugReportDto } from '../models/bug-report.model';
import { environment } from '../../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BugReportService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/bug-reports`;

  create(dto: CreateBugReportDto): Observable<BugReportCreated> {
    return this.http.post<BugReportCreated>(this.baseUrl, dto);
  }
}
