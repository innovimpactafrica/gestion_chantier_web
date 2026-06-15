
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { catchError, delayWhen, Observable, retry, retryWhen, take, throwError, timeout, timer } from 'rxjs';
import { Material, MaterialResponse } from '../../models/material';
import { environment } from '../../../environments/environment';
import { CreateMaterial } from '../../models/material.model';
// import{Unit}

@Injectable({
  providedIn: 'root'
})
export class MaterialsService {
  private apiUrl = `${environment.apiUrl}/materials`;
  
  constructor(private http: HttpClient) {}

  // liste des unites de mesures 
  getUnits(page: number = 0, size: number = 10): Observable<any> {
    const url = `${this.apiUrl}/unit-parameters/by-type?type=UNIT&page=${page}&size=${size}`;
    return this.http.get(url);
  }

  // createMaterial(material: Material): Observable<any> {
  //   const headers = new HttpHeaders({
  //     'Content-Type': 'application/json',
  //     'Accept': '*/*'
  //   });

  //   return this.http.post<any>(this.apiUrl, material, { headers })
  //     .pipe(
  //       catchError(error => this.handleError(error))
  //     );
  // }

  createMaterial(material: CreateMaterial): Observable<any> {
    return this.http.post<any>(this.apiUrl, material);
  }

  getMaterials(page: number = 0, size: number = 10): Observable<MaterialResponse> {
    // Utiliser HttpParams pour construire les paramètres de requête
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    // Définir les en-têtes pour optimiser la requête
    const headers = new HttpHeaders({
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Accept-Encoding': 'gzip, deflate, br'
    });


    // Utiliser responseType: 'json' pour s'assurer que la réponse est correctement parsée
    return this.http.get<MaterialResponse>(this.apiUrl, { 
      params, 
      headers,
      responseType: 'json'
    }).pipe(
      // Augmenter le timeout pour donner plus de temps à la requête
      timeout(30000),
      // Implémenter une stratégie de retry avec délai exponentiel
      retry(2),
      catchError(error => this.handleError(error))
    );
  }

  private handleError(error: any): Observable<never> {
    // Améliorer la gestion des erreurs
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.status) {
      // Erreur avec code HTTP
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
    } else if (error.name === 'TimeoutError') {
      errorMessage = 'La requête a pris trop de temps à répondre';
    } else if (error instanceof ProgressEvent) {
      errorMessage = 'Problème de connexion au serveur';
    }
    
    return throwError(() => new Error(errorMessage));
  }
}
