import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UnitParameter {
  id?: string;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY';
}

export interface Unit {
  id?: string;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: 'UNIT';
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PaginationParams {
  page: number;
  size: number;
  type?: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY';
}

@Injectable({
  providedIn: 'root'
})
export class UnitParameterService {
  private baseUrl = environment.endpoints.unitParameters;

  constructor(private http: HttpClient) {}

  getAll(params: PaginationParams): Observable<PaginatedResponse<UnitParameter>> {
    let httpParams = new HttpParams()
      .set('page', params.page.toString())
      .set('size', params.size.toString());
      
    if (params.type) {
      httpParams = httpParams.set('type', params.type);
      return this.http.get<PaginatedResponse<UnitParameter>>(`${this.baseUrl}/by-type`, { params: httpParams });
    }
    
    // Fallback if no type is provided (assuming backend supports it)
    return this.http.get<PaginatedResponse<UnitParameter>>(`${this.baseUrl}`, { params: httpParams });
  }

  getById(id: string): Observable<UnitParameter> {
    return this.http.get<UnitParameter>(`${this.baseUrl}/${id}`);
  }

  create(body: UnitParameter): Observable<UnitParameter> {
    return this.http.post<UnitParameter>(this.baseUrl, body);
  }

  update(id: string, body: UnitParameter): Observable<UnitParameter> {
    return this.http.put<UnitParameter>(`${this.baseUrl}/${id}`, body);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}