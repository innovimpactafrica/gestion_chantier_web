import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces pour le typage
export interface OrderItem {
  id: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
}

export interface Property {
  id: number;
  name: string;
}

export interface Supplier {
  id: number;
  prenom: string;
  nom: string;
  telephone: string;
}

export interface Order {
  id: number;
  orderDate: number[];
  status: string;
  property: Property;
  supplier: Supplier;
  items: OrderItem[];
  trackingInfo: any;
}

export interface Sort {
  unsorted: boolean;
  sorted: boolean;
  empty: boolean;
}

export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: Sort;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface OrderResponse {
  content: Order[];
  pageable: Pageable;
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: Sort;
  first: boolean;
  empty: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CommandeService {
  private baseUrl = 'https://wakana.online/api';

  constructor(private http: HttpClient) { }

  getCommandes(supplierId: number, page: number = 0, size: number = 10): Observable<OrderResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<OrderResponse>(`${this.baseUrl}/orders/supplier/${supplierId}`, { params });
  }

  getCommandesByStatus(supplierId: number, status: string, page: number = 0, size: number = 10): Observable<OrderResponse> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<OrderResponse>(`${this.baseUrl}/orders/supplier/${supplierId}`, { params });
  }
}