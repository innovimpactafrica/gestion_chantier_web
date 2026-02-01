import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { tap, catchError } from 'rxjs/operators';

export interface PropertyTypeRequest {
  typeName: string;
  parent: boolean;
}

export interface PropertyType {
  id?: number;
  typeName: string;
  parent: boolean;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PropertyTypeService {
  private apiBaseUrl = `${environment.apiUrl}/property-types`;

  constructor(private http: HttpClient) {}

  // ✅ Récupérer TOUTES les propriétés SANS pagination (pour les dropdowns/sélecteurs)
  getAll(): Observable<PropertyType[]> {
    return this.http.get<PropertyType[]>(`${this.apiBaseUrl}/all`).pipe(
      tap(data => console.log('Types de propriétés chargés (sans pagination):', data)),
      catchError(error => {
        console.error('Erreur lors du chargement des types:', error);
        throw error;
      })
    );
  }

  // ✅ Récupérer les propriétés AVEC pagination (pour la page de gestion)
  getAllPaginated(page: number = 0, size: number = 10): Observable<PageResponse<PropertyType>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<PageResponse<PropertyType>>(`${this.apiBaseUrl}/paginated`, { params }).pipe(
      tap(data => console.log('Types de propriétés chargés (avec pagination):', data)),
      catchError(error => {
        console.error('Erreur lors du chargement des types:', error);
        throw error;
      })
    );
  }

  // Créer un type de propriété
  create(propertyType: PropertyTypeRequest): Observable<PropertyType> {
    return this.http.post<PropertyType>(`${this.apiBaseUrl}/save`, propertyType);
  }

  // Récupérer par ID
  getById(id: number): Observable<PropertyType> {
    return this.http.get<PropertyType>(`${this.apiBaseUrl}/${id}`);
  }

  // Mettre à jour un type de propriété
  update(id: number, propertyType: PropertyTypeRequest): Observable<PropertyType> {
    return this.http.put<PropertyType>(`${this.apiBaseUrl}/${id}`, propertyType);
  }

  // Supprimer un type de propriété
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/${id}`);
  }
}