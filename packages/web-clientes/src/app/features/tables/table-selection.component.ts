import { Component, inject, OnInit, signal } from '@angular/core'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { LucideAngularModule } from 'lucide-angular'
import { TableService } from '../../core/services/table.service'
import { RestaurantService } from '../../core/services/restaurant.service'
import { CartStore } from '../../core/store/cart.store'
import { Table } from '../../core/models/table.model'
import { Restaurant } from '../../core/models/restaurant.model'

const MAX_PARTY_SIZE = 20

@Component({
  selector: 'app-table-selection',
  standalone: true,
  imports: [RouterLink, LucideAngularModule],
  template: `
    <div class="container">
      <div class="page-header">
        <a routerLink="/restaurants" class="back-link">← Volver a restaurantes</a>
        <h1>{{ restaurant()?.name || 'Selecciona tu mesa' }}</h1>
        <p>Indica cuántos sois y elige una mesa libre para empezar a pedir</p>
      </div>

      <section class="card party-card">
        <h2>¿Cuántas personas sois?</h2>
        <div class="party-selector">
          <button class="qty-btn" (click)="decrementParty()" [disabled]="partySize() <= 1" aria-label="Quitar una persona">−</button>
          <span class="party-value">{{ partySize() }}</span>
          <button class="qty-btn" (click)="incrementParty()" [disabled]="partySize() >= maxPartySize" aria-label="Añadir una persona">+</button>
        </div>
      </section>

      <section class="tables-section">
        <h2>Mesas disponibles para {{ partySize() }} {{ partySize() === 1 ? 'persona' : 'personas' }}</h2>

        @if (loading()) {
          <div class="spinner"></div>
        } @else if (error()) {
          <div class="alert-error">{{ error() }}</div>
        } @else if (tables().length === 0) {
          <div class="empty-state card">
            <lucide-icon name="armchair" [size]="40"></lucide-icon>
            <p>No hay mesas libres para {{ partySize() }} {{ partySize() === 1 ? 'persona' : 'personas' }} en este momento.</p>
            <p class="empty-hint">Prueba con un grupo más pequeño o vuelve a intentarlo en unos minutos.</p>
          </div>
        } @else {
          <div class="tables-grid">
            @for (table of tables(); track table.id) {
              <button
                type="button"
                class="table-card card"
                [class.selected]="selectedTableId() === table.id"
                (click)="selectTable(table)">
                <div class="table-head">
                  <span class="table-number">Mesa {{ table.number }}</span>
                  <span class="badge-libre">Libre</span>
                </div>
                @if (table.description) {
                  <p class="table-description">{{ table.description }}</p>
                }
                <p class="table-capacity">
                  <lucide-icon name="users" [size]="14"></lucide-icon>
                  Hasta {{ table.capacity }} {{ table.capacity === 1 ? 'persona' : 'personas' }}
                </p>
              </button>
            }
          </div>
        }
      </section>

      @if (confirmError()) {
        <div class="alert-error">{{ confirmError() }}</div>
      }

      <div class="actions">
        <button
          class="btn btn-primary continue-btn"
          [disabled]="!selectedTableId() || confirming()"
          (click)="continueToMenu()">
          @if (confirming()) {
            Reservando mesa...
          } @else {
            Continuar a la carta
          }
        </button>
      </div>
    </div>
  `,
  styles: [`
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .back-link {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 8px;
      display: inline-block;
    }
    .page-header p {
      color: var(--text-secondary);
    }
    .party-card {
      padding: 20px;
      margin-bottom: 28px;
    }
    .party-card h2, .tables-section h2 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .party-selector {
      display: flex;
      align-items: center;
      gap: 20px;
    }
    .qty-btn {
      width: 44px;
      height: 44px;
      border-radius: var(--radius-sm);
      background: var(--bg-hover);
      color: var(--text-primary);
      font-size: 20px;
      font-weight: 600;
      transition: all var(--transition);
    }
    .qty-btn:hover:not(:disabled) {
      background: var(--green-glow);
      color: var(--green-light);
    }
    .qty-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
    .party-value {
      font-size: 28px;
      font-weight: 700;
      color: var(--text-primary);
      min-width: 48px;
      text-align: center;
    }
    .tables-section {
      margin-bottom: 28px;
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }
    .table-card {
      text-align: left;
      padding: 16px 20px;
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      color: var(--text-primary);
      transition: all var(--transition);
    }
    .table-card:hover {
      transform: translateY(-2px);
      border-color: var(--green-medium);
    }
    .table-card.selected {
      border-color: var(--green-light);
      box-shadow: 0 0 0 3px var(--green-glow);
    }
    .table-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .table-number {
      font-size: 16px;
      font-weight: 600;
    }
    .badge-libre {
      padding: 3px 10px;
      font-size: 11px;
      font-weight: 500;
      border-radius: 20px;
      background: var(--green-glow);
      color: var(--green-light);
    }
    .table-description {
      color: var(--text-muted);
      font-size: 13px;
      margin-bottom: 6px;
    }
    .table-capacity {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text-secondary);
      font-size: 13px;
    }
    .empty-hint {
      color: var(--text-muted);
      font-size: 13px;
      margin-top: 6px;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
    }
    .continue-btn {
      min-width: 220px;
      justify-content: center;
    }
    .continue-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class TableSelectionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute)
  private readonly router = inject(Router)
  private readonly tableService = inject(TableService)
  private readonly restaurantService = inject(RestaurantService)
  private readonly cartStore = inject(CartStore)

  readonly maxPartySize = MAX_PARTY_SIZE

  readonly restaurant = signal<Restaurant | null>(null)
  readonly tables = signal<Table[]>([])
  readonly partySize = signal(2)
  readonly selectedTableId = signal<string | null>(null)
  readonly loading = signal(true)
  readonly error = signal<string | null>(null)
  readonly confirming = signal(false)
  readonly confirmError = signal<string | null>(null)

  private restaurantId = ''

  ngOnInit(): void {
    this.restaurantId = this.route.snapshot.paramMap.get('id')!

    this.restaurantService.getById(this.restaurantId).subscribe({
      next: (restaurant) => this.restaurant.set(restaurant),
      error: () => {}
    })

    this.loadAvailableTables()
  }

  incrementParty(): void {
    if (this.partySize() >= MAX_PARTY_SIZE) return
    this.partySize.update(n => n + 1)
    this.loadAvailableTables()
  }

  decrementParty(): void {
    if (this.partySize() <= 1) return
    this.partySize.update(n => n - 1)
    this.loadAvailableTables()
  }

  selectTable(table: Table): void {
    this.confirmError.set(null)
    this.selectedTableId.set(table.id)
  }

  continueToMenu(): void {
    const tableId = this.selectedTableId()
    const table = this.tables().find(t => t.id === tableId)
    if (!tableId || !table) return

    this.confirming.set(true)
    this.confirmError.set(null)

    this.tableService.occupy(this.restaurantId, tableId, this.partySize()).subscribe({
      next: (occupied) => {
        this.cartStore.selectTable(this.restaurantId, occupied.id, occupied.number, this.partySize())
        this.router.navigate(['/restaurants', this.restaurantId])
      },
      error: (err) => {
        this.confirming.set(false)
        this.confirmError.set(
          err?.error?.message ?? 'No se pudo reservar la mesa. Puede que alguien se haya sentado antes; elige otra.'
        )
        this.selectedTableId.set(null)
        this.loadAvailableTables()
      }
    })
  }

  private loadAvailableTables(): void {
    this.loading.set(true)
    this.error.set(null)
    this.selectedTableId.set(null)

    this.tableService.getAvailable(this.restaurantId, this.partySize()).subscribe({
      next: (tables) => {
        this.tables.set(tables)
        this.loading.set(false)
      },
      error: () => {
        this.error.set('Error al cargar las mesas disponibles')
        this.loading.set(false)
      }
    })
  }
}
