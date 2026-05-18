import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface MaterialType {
  id: number;
  nameFr: string;
  nameEn: string;
  iconPath?: string;
  iconFile?: string;
}

export interface MaterialTypePayload {
  id: number;
  nameFr: string;
  nameEn: string;
  iconPath: string | null;
  iconFile: string | null;
}

@Injectable({ providedIn: 'root' })
export class MaterialTypeService {
  private apiUrl = `${environment.apiBaseUrl}/api/material-types`;
  private fileBaseUrl = environment.filebaseUrl;

  constructor(private http: HttpClient) {}

  /** Construit l'URL complète d'affichage d'une icône depuis le chemin retourné par le backend */
  getIconUrl(iconPath: string | undefined | null): string | null {
    if (!iconPath) return null;
    if (iconPath.startsWith('http')) return iconPath;
    // Utilise filebaseUrl comme les autres images du projet
    return `${this.fileBaseUrl}${iconPath}`;
  }

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

  create(data: { nameFr: string; nameEn: string; iconFile?: string }): Observable<MaterialType> {
    const payload: MaterialTypePayload = {
      id: 0,
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      iconPath: null,
      iconFile: data.iconFile || null
    };
    return this.http.post<MaterialType>(this.apiUrl, payload, { headers: this.getHeaders() });
  }

  update(id: number, data: { nameFr: string; nameEn: string; existingIconPath?: string; iconFile?: string }): Observable<MaterialType> {
    const payload: MaterialTypePayload = {
      id,
      nameFr: data.nameFr,
      nameEn: data.nameEn,
      iconPath: data.iconFile ? null : (data.existingIconPath ?? null),
      iconFile: data.iconFile || null
    };
    return this.http.put<MaterialType>(`${this.apiUrl}/${id}`, payload, { headers: this.getHeaders() });
  }

  deleteType(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, { headers: this.getHeaders(), responseType: 'text' as 'json' });
  }
}
