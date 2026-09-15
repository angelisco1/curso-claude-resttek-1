import { Component, inject, OnDestroy } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { LucideAngularModule } from 'lucide-angular'
import { BugReportStore } from '../../store/bug-report.store'

export const MAX_DESCRIPTION_LENGTH = 5000

@Component({
  selector: 'app-report-bug',
  standalone: true,
  imports: [FormsModule, LucideAngularModule],
  templateUrl: './report-bug.component.html',
  styleUrl: './report-bug.component.css'
})
export class ReportBugComponent implements OnDestroy {
  readonly store = inject(BugReportStore)

  readonly maxLength = MAX_DESCRIPTION_LENGTH

  description = ''

  get canSubmit(): boolean {
    return this.description.trim().length > 0 && !this.store.loading()
  }

  async onSubmit(): Promise<void> {
    if (!this.canSubmit) return
    await this.store.create({ description: this.description.trim() })
  }

  reportAnother(): void {
    this.description = ''
    this.store.reset()
  }

  ngOnDestroy(): void {
    // El store es `providedIn: 'root'`: se limpia al salir para no volver
    // a entrar en la pantalla de éxito del reporte anterior.
    this.store.reset()
  }
}
