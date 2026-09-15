import { Injectable, inject } from '@angular/core'
import { HttpClient, HttpParams } from '@angular/common/http'
import { Observable } from 'rxjs'
import { API_URL } from '@resttek/web-shared'
import { Table } from '../models/table.model'

@Injectable({ providedIn: 'root' })
export class TableService {
  private readonly http = inject(HttpClient)
  private readonly apiUrl = inject(API_URL)

  private buildUrl(restaurantId: string): string {
    return `${this.apiUrl}/public/restaurants/${restaurantId}/tables`
  }

  getAvailable(restaurantId: string, partySize: number): Observable<Table[]> {
    const params = new HttpParams().set('partySize', partySize)
    return this.http.get<Table[]>(`${this.buildUrl(restaurantId)}/available`, { params })
  }

  occupy(restaurantId: string, tableId: string, partySize: number): Observable<Table> {
    return this.http.post<Table>(`${this.buildUrl(restaurantId)}/${tableId}/occupy`, { partySize })
  }
}
