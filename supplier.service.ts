import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

// Interfaces pour les types de retour
export interface OrderCountByStatus {
  PENDING: number;
  APPROVED: number;
  REJECTED: number;
  IN_DELIVERY: number;
  DELIVERED: number;
}

export interface TopProperty {
  totalOrders: number;
  propertyId: number;
  propertyName: string;
}

export interface DashboardInfos {
  orderCountByStatus: OrderCountByStatus;
  orderPercentageByStatus: OrderCountByStatus; // Même structure
  topProperties: TopProperty[];
}

export interface QuoteItem {
  itemId: number;
  price: number;
}

export interface ValidationCommand {
  orderId: number;
  items: QuoteItem[];
  generedById: number;
}

@Injectable({
  providedIn: 'root'
})
export class SupplierService {
  private baseUrl = 'https://wakana.online/api';

  constructor(private http: HttpClient) { }

  getInfosDashboard(supplierId: number): Observable<DashboardInfos> {
    return this.http.get<DashboardInfos>(`${this.baseUrl}/orders/dashboard/${supplierId}`);
  }

  validerCommande(orderId: number, validationData: ValidationCommand): Observable<any> {
    return this.http.post(`${this.baseUrl}/orders/${orderId}/quote`, validationData);
  }

  rejeterCommande(orderId: number): Observable<any> {
    const params = new HttpParams().set('status', 'REJECTED');
    return this.http.put(`${this.baseUrl}/orders/${orderId}/status`, null, { params });
  }
}