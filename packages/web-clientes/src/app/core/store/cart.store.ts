import { Injectable, signal, computed } from '@angular/core'

export interface Dish {
  id: string
  name: string
  description: string | null
  price: number
  category: string
  available: boolean
  restaurantId: string
  ingredients: { ingredientId: string; quantity: number }[]
}

export interface CartItem {
  dish: Dish
  quantity: number
  notes: string
}

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly _items = signal<CartItem[]>([])
  private readonly _restaurantId = signal<string | null>(null)

  // Table the party is seated at. Outlives clear() — confirming an order empties
  // the cart but the party stays at the table and may order again.
  private readonly _tableId = signal<string | null>(null)
  private readonly _tableNumber = signal<number | null>(null)
  private readonly _partySize = signal<number | null>(null)
  private readonly _tableRestaurantId = signal<string | null>(null)

  readonly items = this._items.asReadonly()
  readonly restaurantId = this._restaurantId.asReadonly()
  readonly tableId = this._tableId.asReadonly()
  readonly tableNumber = this._tableNumber.asReadonly()
  readonly partySize = this._partySize.asReadonly()

  selectTable(restaurantId: string, tableId: string, tableNumber: number, partySize: number): void {
    this._tableRestaurantId.set(restaurantId)
    this._tableId.set(tableId)
    this._tableNumber.set(tableNumber)
    this._partySize.set(partySize)
  }

  clearTable(): void {
    this._tableRestaurantId.set(null)
    this._tableId.set(null)
    this._tableNumber.set(null)
    this._partySize.set(null)
  }

  hasTableFor(restaurantId: string): boolean {
    return this._tableRestaurantId() === restaurantId && this._tableId() !== null
  }

  readonly total = computed(() =>
    this._items().reduce((sum, item) => sum + item.dish.price * item.quantity, 0)
  )

  readonly itemCount = computed(() =>
    this._items().reduce((count, item) => count + item.quantity, 0)
  )

  addItem(dish: Dish, quantity: number = 1, notes: string = ''): void {
    if (this._restaurantId() && this._restaurantId() !== dish.restaurantId) {
      this._items.set([])
    }
    if (this._tableRestaurantId() && this._tableRestaurantId() !== dish.restaurantId) {
      this.clearTable()
    }
    this._restaurantId.set(dish.restaurantId)

    const existingIndex = this._items().findIndex(
      item => item.dish.id === dish.id && item.notes === notes
    )

    if (existingIndex >= 0) {
      const items = [...this._items()]
      items[existingIndex] = {
        ...items[existingIndex],
        quantity: items[existingIndex].quantity + quantity
      }
      this._items.set(items)
    } else {
      this._items.update(items => [...items, { dish, quantity, notes }])
    }
  }

  removeItem(dishId: string): void {
    const items = this._items().filter(item => item.dish.id !== dishId)
    this._items.set(items)
    if (items.length === 0) {
      this._restaurantId.set(null)
    }
  }

  updateQuantity(dishId: string, quantity: number): void {
    if (quantity <= 0) {
      this.removeItem(dishId)
      return
    }
    const items = this._items().map(item =>
      item.dish.id === dishId ? { ...item, quantity } : item
    )
    this._items.set(items)
  }

  clear(): void {
    this._items.set([])
    this._restaurantId.set(null)
  }
}
