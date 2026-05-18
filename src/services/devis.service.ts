import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

// ─── Enums ─────────────────────────────────────────────────────────────────────
export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED';
export type ProjectType  = 'VILLA' | 'IMMEUBLE' | 'COMMERCE' | 'BUREAU' | 'ENTREPOT' | 'AUTRE';
export type FinishingLevel = 'ECONOMIQUE' | 'STANDARD' | 'HAUT_STANDING' | 'LUXE';
export type SoilType = 'NORMAL' | 'ROCHEUX' | 'SABLEUX' | 'ARGILEUX';
export type AccessDifficulty = 'FACILE' | 'MOYEN' | 'DIFFICILE';

// ─── DTOs ──────────────────────────────────────────────────────────────────────
export interface GenerateQuoteRequest {
  userId: number;
  country: string;
  city: string;
  neighborhood?: string | null;
  address?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  projectType: ProjectType;
  projectName: string;
  totalArea: number;
  numberOfFloors?: number | null;
  numberOfRooms?: number | null;
  numberOfApartments?: number | null;
  hasBasement: boolean;
  hasParking: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  hasElevator: boolean;
  finishingLevel: FinishingLevel;
  soilType: SoilType;
  accessDifficulty: AccessDifficulty;
  existingStructure: boolean;
  desiredStartDate?: string | null;
  estimatedDurationMonths?: number | null;
  additionalNotes?: string | null;
}

export interface ConstructionQuote {
  id: number;
  projectName: string;
  projectType: ProjectType;
  city: string;
  country: string;
  neighborhood?: string;
  address?: string;
  totalArea: number;
  numberOfFloors?: number;
  numberOfRooms?: number;
  numberOfApartments?: number;
  hasBasement?: boolean;
  hasParking?: boolean;
  hasPool?: boolean;
  hasGarden?: boolean;
  hasElevator?: boolean;
  finishingLevel: FinishingLevel;
  soilType: SoilType;
  accessDifficulty: AccessDifficulty;
  existingStructure?: boolean;
  totalHT?: number;
  totalTTC?: number;
  tvaRate?: number;
  executionDelay?: string;
  status: QuoteStatus;
  validUntil?: number[];
  createdAt: number[];
  userId: number;
  userFullName?: string;
  desiredStartDate?: string;
  estimatedDurationMonths?: number;
  additionalNotes?: string;
}

// ─── Detail view (GET /{id}/user/{userId}) ────────────────────────────────────
export interface QuoteLine {
  designation: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface QuoteLot {
  lotNumber: number;
  lotName: string;
  description: string;
  lines: QuoteLine[];
  lotTotal: number;
}

export interface ConstructionQuoteDetail {
  id: number;
  projectName: string;
  clientName?: string;
  generatedAt?: string;
  validUntil?: string;
  location?: string;
  projectType: ProjectType;
  projectDetails?: string | null;
  lots: QuoteLot[];
  totalHT: number;
  tvaRate: number;
  totalTVA: number;
  totalTTC: number;
  executionDelay?: string;
  notes?: string;
  disclaimer?: string;
  status?: QuoteStatus;
}

export interface PagedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

@Injectable({ providedIn: 'root' })
export class DevisService {
  private readonly base = `${environment.apiBaseUrl}/api/construction-quotes`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('auth_token') ||
      sessionStorage.getItem('token');
    let h = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
    if (token) h = h.set('Authorization', `Bearer ${token}`);
    return h;
  }

  /** POST /api/construction-quotes/generate */
  generate(payload: GenerateQuoteRequest): Observable<ConstructionQuote> {
    return this.http.post<ConstructionQuote>(`${this.base}/generate`, payload, { headers: this.getHeaders() });
  }

  /** GET /api/construction-quotes/user/{userId}?page=0&size=20 */
  getUserQuotes(userId: number, page = 0, size = 20): Observable<PagedResponse<ConstructionQuote>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<PagedResponse<ConstructionQuote>>(`${this.base}/user/${userId}`, { headers: this.getHeaders(), params });
  }

  /** GET /api/construction-quotes/user/{userId}/search?q=... */
  searchQuotes(userId: number, q: string): Observable<PagedResponse<ConstructionQuote>> {
    const params = new HttpParams().set('q', q);
    return this.http.get<PagedResponse<ConstructionQuote>>(`${this.base}/user/${userId}/search`, { headers: this.getHeaders(), params });
  }

  /** GET /api/construction-quotes/user/{userId}/status?status=... */
  filterByStatus(userId: number, status: QuoteStatus): Observable<PagedResponse<ConstructionQuote>> {
    const params = new HttpParams().set('status', status);
    return this.http.get<PagedResponse<ConstructionQuote>>(`${this.base}/user/${userId}/status`, { headers: this.getHeaders(), params });
  }

  /** GET /api/construction-quotes/{id}/user/{userId} */
  getById(id: number, userId: number): Observable<ConstructionQuoteDetail> {
    return this.http.get<ConstructionQuoteDetail>(`${this.base}/${id}/user/${userId}`, { headers: this.getHeaders() });
  }

  /** DELETE /api/construction-quotes/{id}/user/{userId} */
  delete(id: number, userId: number): Observable<any> {
    return this.http.delete(`${this.base}/${id}/user/${userId}`, { headers: this.getHeaders(), responseType: 'text' as 'json' });
  }

  /** PATCH /api/construction-quotes/{id}/user/{userId}/status */
  updateStatus(id: number, userId: number, status: QuoteStatus): Observable<ConstructionQuote> {
    return this.http.patch<ConstructionQuote>(`${this.base}/${id}/user/${userId}/status`, { status }, { headers: this.getHeaders() });
  }

  /** GET /api/construction-quotes/quote/{id}/pdf */
  getPdfUrl(id: number): string {
    return `${this.base}/quote/${id}/pdf`;
  }

  /** Download PDF with auth token as query param */
  getPdfUrlWithToken(id: number): string {
    const token =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('auth_token') ||
      sessionStorage.getItem('token');
    return `${this.base}/quote/${id}/pdf${token ? '?token=' + token : ''}`;
  }

  /** Parse Spring date arrays [year, month(1-based), day, h, m, s, nano] */
  parseDate(arr: number[] | string | undefined | null): Date | null {
    if (!arr) return null;
    if (typeof arr === 'string') return new Date(arr);
    if (Array.isArray(arr) && arr.length >= 3) {
      return new Date(arr[0], arr[1] - 1, arr[2], arr[3] ?? 0, arr[4] ?? 0, arr[5] ?? 0);
    }
    return null;
  }
}
