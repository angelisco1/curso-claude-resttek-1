import { Component, inject, OnInit, OnDestroy, computed } from '@angular/core'
import { AuthStore } from '@resttek/web-shared'
import { LucideAngularModule } from 'lucide-angular'
import { TableStore } from '../../store/table.store'
import { TABLE_STATUSES } from '../../models/table.model'
import type { Table, TableStatus } from '../../models/table.model'
import { OrderStore } from '../../../orders/store/order.store'
import type { Order } from '../../../orders/models/order.model'

export interface TableWithOrders extends Table {
  orders: Order[]
}

@Component({
  selector: 'app-mesas',
  standalone: true,
  imports: [LucideAngularModule],
  templateUrl: './mesas.component.html',
  styleUrl: './mesas.component.css'
})
export class MesasComponent implements OnInit, OnDestroy {
  private readonly authStore = inject(AuthStore)
  readonly tableStore = inject(TableStore)
  readonly orderStore = inject(OrderStore)

  readonly statuses = TABLE_STATUSES

  readonly tables = computed<TableWithOrders[]>(() => {
    const orders = this.orderStore.orders()
    return this.tableStore.tables().map(table => ({
      ...table,
      orders: orders.filter(o => o.tableId === table.id)
    }))
  })

  ngOnInit(): void {
    const restaurantId = this.authStore.user()?.restaurantId
    if (restaurantId) {
      this.tableStore.startPolling(restaurantId)
      this.orderStore.startPolling(restaurantId)
    }
  }

  ngOnDestroy(): void {
    this.tableStore.stopPolling()
    this.orderStore.stopPolling()
  }

  changeStatus(tableId: string, status: TableStatus): void {
    const restaurantId = this.authStore.user()?.restaurantId
    if (!restaurantId) return
    this.tableStore.updateStatus(restaurantId, tableId, status)
  }

  shortOrderId(orderId: string): string {
    return orderId.substring(0, 8)
  }

  pendingItems(order: Order): number {
    return order.items.filter(i => i.status !== 'entregado').length
  }
}
