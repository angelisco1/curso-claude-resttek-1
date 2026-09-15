import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { BugReportCreated, CreateBugReportDto } from '../models/bug-report.model';
import { BugReportService } from '../services/bug-report.service';

const SUBMIT_ERROR_MESSAGE = 'No se pudo enviar el reporte. Inténtalo de nuevo en unos minutos.';

@Injectable({ providedIn: 'root' })
export class BugReportStore {
  private readonly bugReportService = inject(BugReportService);

  private readonly _loading = signal(false);
  private readonly _error = signal<string | null>(null);
  private readonly _created = signal<BugReportCreated | null>(null);

  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();
  readonly created = this._created.asReadonly();

  async create(dto: CreateBugReportDto): Promise<void> {
    if (this._loading()) return;

    this._loading.set(true);
    this._error.set(null);
    try {
      const created = await firstValueFrom(this.bugReportService.create(dto));
      this._created.set(created);
    } catch {
      this._error.set(SUBMIT_ERROR_MESSAGE);
    } finally {
      this._loading.set(false);
    }
  }

  reset(): void {
    this._created.set(null);
    this._error.set(null);
  }
}
