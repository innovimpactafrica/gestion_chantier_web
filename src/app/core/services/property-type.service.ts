// ⚠️ CORRIGER property-type.service.ts - Méthode update
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { PropertyType } from '../../models/property-type';
import { environment } from '../../../environments/environment';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PropertyTypeService {
  private apiBaseUrl = `${environment.apiUrl}/property-types`;

  constructor(private http: HttpClient) {}

  // Récupérer toutes les propriétés
  getAll(): Observable<PropertyType[]> {
    return this.http.get<PropertyType[]>(`${this.apiBaseUrl}/all`).pipe(
      catchError(error => {
        throw error;
      })
    );
  }

  // Créer une propriété
  create(propertyType: PropertyType): Observable<PropertyType> {
    return this.http.post<PropertyType>(`${this.apiBaseUrl}/save`, propertyType);
  }

  // Récupérer par ID
  getById(id: number): Observable<PropertyType> {
    return this.http.get<PropertyType>(`${this.apiBaseUrl}/${id}`);
  }

  // ⚠️ CORRIGER: Mettre à jour une propriété
  update(propertyType: PropertyType): Observable<PropertyType> {
    return this.http.put<PropertyType>(
      `${this.apiBaseUrl}/${propertyType.id}`, // ⚠️ Utiliser l'ID de l'objet
      propertyType
    );
  }

  // Supprimer une propriété
  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiBaseUrl}/delete/${id}`);
  }
}