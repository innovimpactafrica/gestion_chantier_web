import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, tap, shareReplay, map } from 'rxjs/operators';
import { UnitParameter, PaginatedResponse, PaginationParams } from '../../models/unit-parameter';
import { environment } from '../../../environments/environment';

// ========== INTERFACES À AJOUTER ==========

export interface UpdateUnitParameterRequest {
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY';
}

@Injectable({
  providedIn: 'root'
})
export class UnitParameterService {
  private baseUrl = `${environment.apiUrl}/unit-parameters`;
  
  // BehaviorSubjects pour chaque type avec pagination
  private documentsSubject = new BehaviorSubject<PaginatedResponse<UnitParameter> | null>(null);
  private unitsSubject = new BehaviorSubject<PaginatedResponse<UnitParameter> | null>(null);
  private materialCategoriesSubject = new BehaviorSubject<PaginatedResponse<UnitParameter> | null>(null);

  // Observables publics
  documents$ = this.documentsSubject.asObservable();
  units$ = this.unitsSubject.asObservable();
  materialCategories$ = this.materialCategoriesSubject.asObservable();

  // Cache pour éviter les appels répétés
  private cache = new Map<string, { data: any, timestamp: number }>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  constructor(private http: HttpClient) {}

  /**
 * Modifier un paramètre (méthode générique)
 */
modifierParametre(id: string, parameter: UpdateUnitParameterRequest): Observable<void> {
  return this.http.put<void>(`${this.baseUrl}/${id}`, parameter).pipe(
    tap(() => {
      this.invalidateCache();
      // Rafraîchir le bon subject selon le type
      this.refreshByType(parameter.type);
    }),
    catchError(this.handleError)
  );
}
private refreshByType(type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY'): void {
  switch (type) {
    case 'UNIT':
      this.refreshUnitsAfterModification();
      break;
    case 'DOCUMENT':
      this.refreshDocumentsAfterModification();
      break;
    case 'MATERIAL_CATEGORY':
      this.refreshMaterialCategoriesAfterModification();
      break;
  }
}
/**
 * Supprimer un paramètre (méthode générique)
 */
supprimerParametre(id: string, type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY'): Observable<void> {
  return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
    tap(() => {
      this.invalidateCache();
      // Rafraîchir le bon subject selon le type
      this.refreshByType(type);
    }),
    catchError(this.handleError)
  );
}

  // ========== MÉTHODES GÉNÉRIQUES ==========
  
  getAll(): Observable<UnitParameter[]> {
    const cacheKey = 'all-parameters';
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    return this.http.get<UnitParameter[]>(this.baseUrl).pipe(
      tap(data => this.setCachedData(cacheKey, data)),
      catchError(this.handleError),
      shareReplay(1)
    );
  }

  getByTypePaginated(
    type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY', 
    params: PaginationParams = { page: 0, size: 10 }
  ): Observable<PaginatedResponse<UnitParameter>> {
    const cacheKey = `${type}-${params.page}-${params.size}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    const httpParams = new HttpParams()
      .set('type', type)
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    return this.http.get<PaginatedResponse<UnitParameter>>(`${this.baseUrl}/by-type`, { params: httpParams }).pipe(
      tap(data => {
        this.setCachedData(cacheKey, data);
        this.updateSubjectByType(type, data);
      }),
      catchError(this.handleError),
      shareReplay(1)
    );
  }

  create(parameter: UnitParameter): Observable<UnitParameter> {
    return this.http.post<UnitParameter>(this.baseUrl, parameter).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError)
    );
  }

  // ✅ CORRECTION: L'endpoint retourne void
  update(id: string, parameter: Partial<UnitParameter>): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}`, parameter).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError)
    );
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => this.invalidateCache()),
      catchError(this.handleError)
    );
  }

  // ========== MÉTHODES POUR LES UNITÉS DE MESURE ==========
  
  getUnits(params: PaginationParams = { page: 0, size: 10 }): void {
    this.getByTypePaginated('UNIT', params).subscribe({
      next: (data) => this.unitsSubject.next(data),
      error: (error) => console.error('Erreur lors du chargement des unités:', error)
    });
  }

  addUnit(unit: Omit<UnitParameter, 'id' | 'type'>): Observable<UnitParameter> {
    const unitToCreate: UnitParameter = { ...unit, type: 'UNIT' };
    return this.create(unitToCreate).pipe(
      tap(() => this.refreshUnitsAfterModification())
    );
  }

  // ✅ CORRECTION: Retourne void
  updateUnit(id: string, unit: Partial<UnitParameter>): Observable<void> {
    return this.update(id, unit).pipe(
      tap(() => this.refreshUnitsAfterModification())
    );
  }

  deleteUnit(id: string): Observable<void> {
    return this.delete(id).pipe(
      tap(() => this.refreshUnitsAfterModification())
    );
  }

  loadMoreUnits(): void {
    const current = this.unitsSubject.value;
    if (current && !current.last) {
      this.getUnits({ page: current.number + 1, size: current.size });
    }
  }

  

  // ========== MÉTHODES POUR LES DOCUMENTS ==========
  
  getDocuments(params: PaginationParams = { page: 0, size: 10 }): void {
    this.getByTypePaginated('DOCUMENT', params).subscribe({
      next: (data) => this.documentsSubject.next(data),
      error: (error) => console.error('Erreur lors du chargement des documents:', error)
    });
  }

  addDocument(document: Omit<UnitParameter, 'id' | 'type'>): Observable<UnitParameter> {
    const documentToCreate: UnitParameter = { ...document, type: 'DOCUMENT' };
    return this.create(documentToCreate).pipe(
      tap(() => this.refreshDocumentsAfterModification())
    );
  }

  // ✅ CORRECTION: Retourne void
  updateDocument(id: string, document: Partial<UnitParameter>): Observable<void> {
    return this.update(id, document).pipe(
      tap(() => this.refreshDocumentsAfterModification())
    );
  }

  deleteDocument(id: string): Observable<void> {
    return this.delete(id).pipe(
      tap(() => this.refreshDocumentsAfterModification())
    );
  }

  loadMoreDocuments(): void {
    const current = this.documentsSubject.value;
    if (current && !current.last) {
      this.getDocuments({ page: current.number + 1, size: current.size });
    }
  }

  // ========== MÉTHODES POUR LES CATÉGORIES DE MATÉRIAUX ==========
  
  getMaterialCategories(params: PaginationParams = { page: 0, size: 10 }): void {
    this.getByTypePaginated('MATERIAL_CATEGORY', params).subscribe({
      next: (data) => this.materialCategoriesSubject.next(data),
      error: (error) => console.error('Erreur lors du chargement des catégories:', error)
    });
  }

  addMaterialCategory(category: Omit<UnitParameter, 'id' | 'type'>): Observable<UnitParameter> {
    const categoryToCreate: UnitParameter = { ...category, type: 'MATERIAL_CATEGORY' };
    return this.create(categoryToCreate).pipe(
      tap(() => this.refreshMaterialCategoriesAfterModification())
    );
  }

  // ✅ CORRECTION: Retourne void
  updateMaterialCategory(id: string, category: Partial<UnitParameter>): Observable<void> {
    return this.update(id, category).pipe(
      tap(() => this.refreshMaterialCategoriesAfterModification())
    );
  }

  deleteMaterialCategory(id: string): Observable<void> {
    return this.delete(id).pipe(
      tap(() => this.refreshMaterialCategoriesAfterModification())
    );
  }

  loadMoreMaterialCategories(): void {
    const current = this.materialCategoriesSubject.value;
    if (current && !current.last) {
      this.getMaterialCategories({ page: current.number + 1, size: current.size });
    }
  }

  // ========== MÉTHODES UTILITAIRES ==========
  
  searchByType(
    type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY', 
    searchTerm: string, 
    params: PaginationParams = { page: 0, size: 10 }
  ): Observable<PaginatedResponse<UnitParameter>> {
    const httpParams = new HttpParams()
      .set('type', type)
      .set('search', searchTerm)
      .set('page', params.page.toString())
      .set('size', params.size.toString());

    return this.http.get<PaginatedResponse<UnitParameter>>(`${this.baseUrl}/search`, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  getAllByType(type: 'DOCUMENT' | 'UNIT' | 'MATERIAL_CATEGORY'): Observable<UnitParameter[]> {
    const cacheKey = `all-${type}`;
    const cached = this.getCachedData(cacheKey);
    
    if (cached) {
      return of(cached);
    }

    return this.http.get<UnitParameter[]>(`${this.baseUrl}/all/${type.toLowerCase()}`).pipe(
      tap(data => this.setCachedData(cacheKey, data)),
      catchError(this.handleError),
      shareReplay(1)
    );
  }

  // ========== MÉTHODES PRIVÉES ==========
  
  private updateSubjectByType(type: string, data: PaginatedResponse<UnitParameter>): void {
    switch (type) {
      case 'UNIT':
        this.unitsSubject.next(data);
        break;
      case 'DOCUMENT':
        this.documentsSubject.next(data);
        break;
      case 'MATERIAL_CATEGORY':
        this.materialCategoriesSubject.next(data);
        break;
    }
  }

  private refreshUnitsAfterModification(): void {
    const current = this.unitsSubject.value;
    if (current) {
      this.getUnits({ page: current.number, size: current.size });
    } else {
      this.getUnits({ page: 0, size: 10 });
    }
  }

  private refreshDocumentsAfterModification(): void {
    const current = this.documentsSubject.value;
    if (current) {
      this.getDocuments({ page: current.number, size: current.size });
    }
  }

  private refreshMaterialCategoriesAfterModification(): void {
    const current = this.materialCategoriesSubject.value;
    if (current) {
      this.getMaterialCategories({ page: current.number, size: current.size });
    }
  }

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  private invalidateCache(): void {
    this.cache.clear();
  }

  private handleError = (error: any): Observable<never> => {
    console.error('Erreur dans UnitParameterService:', error);
    let errorMessage = 'Une erreur est survenue';
    
    if (error.status === 0) {
      errorMessage = 'Impossible de contacter le serveur';
    } else if (error.status === 404) {
      errorMessage = 'Ressource non trouvée';
    } else if (error.status === 500) {
      errorMessage = 'Erreur serveur interne';
    } else if (error.error?.message) {
      errorMessage = error.error.message;
    }
    
    return throwError(() => new Error(errorMessage));
  }
}