import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, map, retry } from 'rxjs/operators';

import { environment } from '../../../environments/environment';

import {
  Task,
  TaskCreateRequest,
  TaskUpdateRequest,
  TaskPriority,
  TaskStatus,
  ApiResponse,
  PaginatedResponse,
  Executor,
  RealEstateProperty
} from '../../models/Task';

// Types pour une meilleure gestion des erreurs
export interface TaskServiceError {
  message: string;
  status?: number;
  code?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  realEstatePropertyId?: number;
  executorId?: number;
  search?: string;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly baseUrl = `${environment.apiUrl}/tasks`; // Utilisation de l'URL de l'environnement
  private readonly authTokenKey = 'token';

  // État réactif pour les tâches (optionnel)
  private readonly tasksSubject = new BehaviorSubject<Task[]>([]);
  public readonly tasks$ = this.tasksSubject.asObservable();

  /**
   * Récupère toutes les tâches avec pagination
   */
  getAllTasks(
    page: number = 1,
    limit: number = 10,
    filters?: TaskFilters
  ): Observable<PaginatedResponse<Task>> {
    const params = this.buildHttpParams({
      page: page.toString(),
      limit: limit.toString(),
      ...this.sanitizeFilters(filters)
    });

    return this.http.get<PaginatedResponse<Task>>(this.baseUrl, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      retry(2),
      catchError(error => this.handleError('Erreur lors de la récupération des tâches', error))
    );
  }

  /**
   * Récupère une tâche par son ID
   */
  getTaskById(id: number): Observable<ApiResponse<Task>> {
    this.validateId(id);

    return this.http.get<ApiResponse<Task>>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la récupération de la tâche', error))
    );
  }

  /**
   * Crée une nouvelle tâche
   */
  createTask(taskData: TaskCreateRequest): Observable<ApiResponse<Task>> {
    this.validateTaskCreateRequest(taskData);

    const formData = this.buildFormData(taskData);

    return this.http.post<ApiResponse<Task>>(this.baseUrl, formData, {
      headers: this.getAuthHeaders(false) // false pour ne pas inclure Content-Type avec FormData
    }).pipe(
      map(response => {
        // Mise à jour de l'état local si nécessaire
        if (response.data) {
          this.updateLocalTasks(response.data, 'add');
        }
        return response;
      }),
      catchError(error => this.handleError('Erreur lors de la création de la tâche', error))
    );
  }

  /**
   * Met à jour une tâche existante
   */
  updateTask(taskData: TaskUpdateRequest): Observable<ApiResponse<Task>> {
    this.validateId(taskData.id);

    const { id, ...updateData } = taskData;
    const formData = this.buildFormDataFromObject(updateData);

    return this.http.put<ApiResponse<Task>>(`${this.baseUrl}/${id}`, formData, {
      headers: this.getAuthHeaders(false)
    }).pipe(
      map(response => {
        if (response.data) {
          this.updateLocalTasks(response.data, 'update');
        }
        return response;
      }),
      catchError(error => this.handleError('Erreur lors de la mise à jour de la tâche', error))
    );
  }

  /**
   * Met à jour le statut d'une tâche
   */
  updateTaskStatus(id: number, status: TaskStatus): Observable<ApiResponse<Task>> {
    this.validateId(id);

    return this.http.patch<ApiResponse<Task>>(`${this.baseUrl}/${id}/status`,
      { status },
      { headers: this.getAuthHeaders() }
    ).pipe(
      map(response => {
        if (response.data) {
          this.updateLocalTasks(response.data, 'update');
        }
        return response;
      }),
      catchError(error => this.handleError('Erreur lors de la mise à jour du statut', error))
    );
  }
  

  /**
   * Supprime une tâche
   */
  deleteTask(id: number): Observable<ApiResponse<void>> {
    this.validateId(id);

    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${id}`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(response => {
        this.updateLocalTasks({ id } as Task, 'delete');
        return response;
      }),
      catchError(error => this.handleError('Erreur lors de la suppression de la tâche', error))
    );
  }

  /**
   * Récupère les exécuteurs disponibles
   */
  getExecutors(): Observable<ApiResponse<Executor[]>> {
    return this.http.get<ApiResponse<Executor[]>>(`${environment.apiUrl}/executors`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la récupération des exécuteurs', error))
    );
  }

  /**
   * Récupère les propriétés immobilières disponibles
   */
  getRealEstateProperties(): Observable<ApiResponse<RealEstateProperty[]>> {
    return this.http.get<ApiResponse<RealEstateProperty[]>>(`${environment.apiUrl}/real-estate-properties`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la récupération des propriétés', error))
    );
  }

  /**
   * Récupère les tâches par propriété immobilière
   */
  getTasksByProperty(propertyId: number): Observable<ApiResponse<Task[]>> {
    this.validateId(propertyId);

    return this.http.get<ApiResponse<Task[]>>(`${environment.apiUrl}/real-estate-properties/${propertyId}/tasks`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la récupération des tâches de la propriété', error))
    );
  }

  /**
   * Récupère les tâches assignées à un exécuteur
   */
  getTasksByExecutor(executorId: number): Observable<ApiResponse<Task[]>> {
    this.validateId(executorId);

    return this.http.get<ApiResponse<Task[]>>(`${environment.apiUrl}/executors/${executorId}/tasks`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la récupération des tâches de l\'exécuteur', error))
    );
  }

  /**
   * Upload des images pour une tâche
   */
  uploadTaskImages(taskId: number, files: File[]): Observable<ApiResponse<string[]>> {
    this.validateId(taskId);
    this.validateFiles(files);

    const formData = new FormData();
    files.forEach(file => formData.append('images', file));

    return this.http.post<ApiResponse<string[]>>(`${this.baseUrl}/${taskId}/images`, formData, {
      headers: this.getAuthHeaders(false)
    }).pipe(
      catchError(error => this.handleError('Erreur lors de l\'upload des images', error))
    );
  }

  /**
   * Supprime une image d'une tâche
   */
  deleteTaskImage(taskId: number, imageUrl: string): Observable<ApiResponse<void>> {
    this.validateId(taskId);
    if (!imageUrl?.trim()) {
      return throwError(() => new Error('URL de l\'image requise'));
    }

    return this.http.delete<ApiResponse<void>>(`${this.baseUrl}/${taskId}/images`, {
      headers: this.getAuthHeaders(),
      body: { imageUrl }
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la suppression de l\'image', error))
    );
  }

  /**
   * Recherche de tâches avec debounce
   */
  searchTasks(query: string, filters?: TaskFilters): Observable<PaginatedResponse<Task>> {
    const params = this.buildHttpParams({
      search: query,
      ...this.sanitizeFilters(filters)
    });

    return this.http.get<PaginatedResponse<Task>>(`${this.baseUrl}/search`, {
      params,
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la recherche', error))
    );
  }

  /**
   * Récupère les statistiques des tâches
   */
  getTasksStatistics(): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.baseUrl}/statistics`, {
      headers: this.getAuthHeaders()
    }).pipe(
      catchError(error => this.handleError('Erreur lors de la récupération des statistiques', error))
    );
  }

  // ===== MÉTHODES PRIVÉES UTILITAIRES =====

  /**
   * Gère les erreurs HTTP avec un format cohérent
   */
  private handleError(baseMessage: string, error: HttpErrorResponse): Observable<never> {
    console.error(`${baseMessage}:`, error);

    let errorMessage = baseMessage;

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `${baseMessage}: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.error?.message) {
        errorMessage = `${baseMessage}: ${error.error.message}`;
      } else {
        errorMessage = `${baseMessage} (${error.status}: ${error.statusText})`;
      }
    }

    const taskError: TaskServiceError = {
      message: errorMessage,
      status: error.status,
      code: error.statusText
    };

    return throwError(() => taskError);
  }

  /**
   * Récupère les en-têtes d'authentification
   */
  private getAuthHeaders(includeContentType: boolean = true): HttpHeaders {
    let headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getAuthToken()}`
    });

    if (includeContentType) {
      headers = headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  /**
   * Récupère le token d'authentification
   */
  private getAuthToken(): string {
    if (isPlatformBrowser(this.platformId)) {
      return localStorage.getItem(this.authTokenKey) || '';
    }
    return '';
  }

  /**
   * Construit les paramètres HTTP
   */
  private buildHttpParams(params: Record<string, string>): HttpParams {
    let httpParams = new HttpParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        httpParams = httpParams.set(key, value);
      }
    });

    return httpParams;
  }

  /**
   * Nettoie les filtres en supprimant les valeurs undefined
   */
  private sanitizeFilters(filters?: TaskFilters): Record<string, string> {
    if (!filters) return {};

    return Object.fromEntries(
      Object.entries(filters)
        .filter(([_, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => [key, String(value)])
    );
  }

  /**
   * Construit un FormData à partir des données de création de tâche
   */
  private buildFormData(taskData: TaskCreateRequest): FormData {
    const formData = new FormData();

    // Données de base
    formData.append('title', taskData.title);
    formData.append('description', taskData.description);
    formData.append('priority', taskData.priority);
    formData.append('startDate', taskData.startDate);
    formData.append('endDate', taskData.endDate);
    formData.append('realEstatePropertyId', taskData.realEstatePropertyId.toString());

    // Gestion des executorIds
    if (taskData.executorIds?.length) {
      formData.append('executorIds', JSON.stringify(taskData.executorIds));
    }

    // Gestion des fichiers
    if (taskData.pictures?.length) {
      taskData.pictures.forEach((file) => {
        if (file instanceof File) {
          formData.append('pictures', file);
        }
      });
    }

    return formData;
  }

  /**
   * Construit un FormData à partir d'un objet générique
   */
  private buildFormDataFromObject(data: Record<string, any>): FormData {
    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (key === 'pictures' && Array.isArray(value)) {
          value.forEach((file) => {
            if (file instanceof File) {
              formData.append('pictures', file);
            }
          });
        } else if (key === 'executorIds' && Array.isArray(value)) {
          formData.append(key, JSON.stringify(value));
        } else {
          formData.append(key, String(value));
        }
      }
    });

    return formData;
  }

  /**
   * Met à jour l'état local des tâches
   */
  private updateLocalTasks(task: Task, action: 'add' | 'update' | 'delete'): void {
    const currentTasks = this.tasksSubject.value;

    switch (action) {
      case 'add':
        this.tasksSubject.next([...currentTasks, task]);
        break;
      case 'update':
        const updatedTasks = currentTasks.map(t => t.id === task.id ? task : t);
        this.tasksSubject.next(updatedTasks);
        break;
      case 'delete':
        const filteredTasks = currentTasks.filter(t => t.id !== task.id);
        this.tasksSubject.next(filteredTasks);
        break;
    }
  }

  // ===== MÉTHODES DE VALIDATION =====

  /**
   * Valide un ID
   */
  private validateId(id: number): void {
    if (!id || !Number.isInteger(id) || id <= 0) {
      throw new Error('ID invalide');
    }
  }

  /**
   * Valide les données de création de tâche
   */
  private validateTaskCreateRequest(taskData: TaskCreateRequest): void {
    if (!taskData.title?.trim()) {
      throw new Error('Le titre de la tâche est requis');
    }
    if (!taskData.description?.trim()) {
      throw new Error('La description de la tâche est requise');
    }
    if (!taskData.priority) {
      throw new Error('La priorité de la tâche est requise');
    }
    if (!taskData.startDate) {
      throw new Error('La date de début est requise');
    }
    if (!taskData.endDate) {
      throw new Error('La date de fin est requise');
    }
    if (!taskData.realEstatePropertyId || taskData.realEstatePropertyId <= 0) {
      throw new Error('ID de propriété immobilière invalide');
    }
  }

  /**
   * Valide les fichiers
   */
  private validateFiles(files: File[]): void {
    if (!files?.length) {
      throw new Error('Aucun fichier fourni');
    }

    const maxFileSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    files.forEach(file => {
      if (file.size > maxFileSize) {
        throw new Error(`Le fichier ${file.name} est trop volumineux (max 10MB)`);
      }
      if (!allowedTypes.includes(file.type)) {
        throw new Error(`Type de fichier non supporté: ${file.type}`);
      }
    });
  }
}