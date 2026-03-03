import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { OrderMaterial } from './materials.service';

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
  materials?: OrderMaterial[]; // ✅ Ajout
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
export interface CreateQuoteItemRequest {
  itemId: number;
  price: number;
}

export interface CreateQuoteRequest {
  orderId: number;
  items: CreateQuoteItemRequest[];
  generedById: number;
}


export interface Quote {
  id: number;
  uploadedAt: number[];
  totalAmount: number;
  generedBy: QuoteUser;
}
export interface QuoteUser {
  id: number;
  nom: string;
  prenom: string;
  email?: string;
  telephone?: string;
  profil?: string;
  photo?: string;
  company?: string;
}

export interface QuoteResponse {
  content: Quote[];
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
 * Créer une citation (quote) pour une commande
 */
  createQuote(orderId: number, payload: CreateQuoteRequest): Observable<Quote> {
    return this.http.post<Quote>(
      `${this.baseUrl}/orders/${orderId}/quote`,
      payload
    );
  }
/**
 * Récupère les citations d'une commande 
 */
getQuotes(
  orderId: number,
  page?: number,
  size?: number
): Observable<QuoteResponse> {

  let params = new HttpParams();

  if (page !== undefined) {
    params = params.set('page', page.toString());
  }

  if (size !== undefined) {
    params = params.set('size', size.toString());
  }

  return this.http.get<QuoteResponse>(
    `${this.baseUrl}/orders/${orderId}/quotes`,
    { params }
  );
}


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