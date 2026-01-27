import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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
  private baseUrl = `${environment.apiBaseUrl}/api`;

  constructor(private http: HttpClient) { }

  /**
   * Récupère les commandes d'un fournisseur avec pagination
   */
  getCommandes(supplierId: number, page: number = 0, size: number = 10): Observable<OrderResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<OrderResponse>(`${this.baseUrl}/orders/supplier/${supplierId}`, { params });
  }

  /**
   * Récupère les commandes d'un fournisseur filtrées par statut
   */
  getCommandesByStatus(supplierId: number, status: string, page: number = 0, size: number = 10): Observable<OrderResponse> {
    const params = new HttpParams()
      .set('status', status)
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<OrderResponse>(`${this.baseUrl}/orders/supplier/${supplierId}`, { params });
  }

  /**
   * Récupère les détails d'une commande par son ID
   */
  getOrderById(orderId: number): Observable<Order> {
    return this.http.get<Order>(`${this.baseUrl}/orders/${orderId}`);
  }

  /**
   * Met à jour le statut d'une commande
   * @param orderId - ID de la commande
   * @param status - Nouveau statut (PENDING, APPROVED, REJECTED, DELIVERED, IN_DELIVERY)
   */
  updateStatusOrder(orderId: number, status: string): Observable<Order> {
    const params = new HttpParams().set('status', status);
    return this.http.put<Order>(`${this.baseUrl}/orders/${orderId}/status`, null, { params });
  }

  /**
   * Supprime une commande
   */
  deleteCommande(orderId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/orders/${orderId}`);
  }
}