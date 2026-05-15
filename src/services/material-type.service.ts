import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface MaterialType {
  id: number;
  nameFr: string;
  nameEn: string;
}

@Injectable({ providedIn: 'root' })
export class MaterialTypeService {
  private apiUrl = `${environment.apiBaseUrl}/api/material-types`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token =
      localStorage.getItem('auth_token') ||
      localStorage.getItem('token') ||
      sessionStorage.getItem('auth_token') ||
      sessionStorage.getItem('token');
    let headers = new HttpHeaders({ 'Content-Type': 'application/json', Accept: 'application/json' });
    if (token) headers = headers.set('Authorization', `Bearer ${token}`);
    return headers;
  }

  getAll(): Observable<MaterialType[]> {
    return this.http.get<MaterialType[]>(this.apiUrl, { headers: this.getHeaders() });
  }

  search(query: string): Observable<MaterialType[]> {
    const params = new HttpParams().set('q', query);
    return this.http.get<MaterialType[]>(`${this.apiUrl}/search`, { params, headers: this.getHeaders() });
  }

  create(data: { nameFr: string; nameEn: string }): Observable<MaterialType> {
    return this.http.post<MaterialType>(this.apiUrl, data, { headers: this.getHeaders() });
  }

  update(id: number, data: { nameFr: string; nameEn: string }): Observable<MaterialType> {
    return this.http.put<MaterialType>(`${this.apiUrl}/${id}`, { id, ...data }, { headers: this.getHeaders() });
  }

  deleteType(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, { headers: this.getHeaders() });
  }
}
