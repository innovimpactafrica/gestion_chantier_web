import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout, map, switchMap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

// Interfaces (unchanged from your original)
export interface ProjectSearchCriteria {
  promoterId: number;
  parentPropertyId?: number;
  propertyTypeId?: number;
  minPrice?: number;
  maxPrice?: number;
  address?: string;
  latitude?: string;
  longitude?: string;
}

export interface ProjectFilters {
  search?: string;
  status?: string;
  period?: string;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface RealEstateProject {
  realEstateProperty?: RealEstateProject | null;
  id?: number;
  name: string;
  number?: string;
  address: string;
  price: number;
  numberOfRooms: number;
  area: number;
  latitude?: number;
  longitude?: number;
  description?: string;
  numberOfLots: number;
  promoterId: number;
  moaId?: number;
  managerId?: number;
  propertyTypeId: number;
  startDate: string;
  endDate: string;
  hasHall: boolean;
  hasParking: boolean;
  hasElevator: boolean;
  hasSwimmingPool: boolean;
  hasGym: boolean;
  hasPlayground: boolean;
  hasSecurityService: boolean;
  hasGarden: boolean;
  hasSharedTerrace: boolean;
  hasBicycleStorage: boolean;
  hasLaundryRoom: boolean;
  hasStorageRooms: boolean;
  hasWasteDisposalArea: boolean;
  mezzanine: boolean;
  available?: boolean;
  constructionStatus?: string;
  plan?: string;
  averageProgess?: number;
  qrcode:string;
  blocked: boolean;
}

export interface PropertyType {
  id: number;
  typename: string;
  description?: string;
}

export interface Promoter {
  id: number;
  name: string;
  email?: string;
  phone?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: { [key: string]: string[] };
}


@Injectable({
  providedIn: 'root'
})
export class RealestateService {
  private readonly endpoints = {
    save: `${environment.endpoints.realestate}/save`,
    propertyTypes: `${environment.endpoints.propertyTypes}/all`,
    promoters: `${environment.endpoints.user}/me`,
    projects: environment.endpoints.realestate,
    searchProjects: `${environment.endpoints.realestate}/search-by-promoter`,
    indicators: `${environment.endpoints.indicators}/global`,
    detailProject: environment.endpoints.realestate
  };

  private apiImageUrl = environment.filebaseUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    let headers = new HttpHeaders({
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    } else {
    }

    return headers;
  }

/**
 * Change le statut d'un projet immobilier
 * @param projectId ID du projet
 * @param status Nouveau statut (IN_PROGRESS, DELAYED, PENDING, COMPLETED)
 */
changeProjectStatus(projectId: number, status: string): Observable<ApiResponse<RealEstateProject>> {
  const url = `${this.endpoints.projects}/change-status/${projectId}/${status}`;
  
  
  return this.http.put<ApiResponse<RealEstateProject>>(url, {}, { headers: this.getHeaders() })
    .pipe(
      timeout(15000),
      retry({ count: 2, delay: 1000 }),
      catchError(this.handleError.bind(this))
    );
}

  /**
   * Build FormData with raw file
   */
  private buildFormDataWithRawFile(
    projectData: RealEstateProject,
    planFile?: File
  ): FormData {
    const formData = new FormData();

    if (planFile) {
      const validation = this.validateFile(planFile, 'image');
      if (!validation.valid) {
        throw new Error(validation.error || 'Fichier plan invalide');
      }
      formData.append('plan', planFile, planFile.name);
    } else {
    }

    const dataToSend = {
      name: projectData.name || '',
      number: projectData.number || this.generateProjectNumber().toString(),
      address: projectData.address || '',
      price: projectData.price?.toString() || '0',
      numberOfRooms: projectData.numberOfRooms?.toString() || '1',
      area: projectData.area?.toString() || '0',
      latitude: projectData.latitude?.toString() || '0',
      longitude: projectData.longitude?.toString() || '0',
      description: projectData.description || '',
      numberOfLots: projectData.numberOfLots?.toString() || '1',
      promoterId: projectData.promoterId?.toString() || '1',
      moaId: projectData.moaId?.toString() || '',
      managerId: projectData.managerId?.toString() || '',
      propertyTypeId: projectData.propertyTypeId?.toString() || '1',
      startDate: this.formatDateForApi(projectData.startDate),
      endDate: this.formatDateForApi(projectData.endDate),
      hasHall: projectData.hasHall ? 'true' : 'false',
      hasParking: projectData.hasParking ? 'true' : 'false',
      hasElevator: projectData.hasElevator ? 'true' : 'false',
      hasSwimmingPool: projectData.hasSwimmingPool ? 'true' : 'false',
      hasGym: projectData.hasGym ? 'true' : 'false',
      hasPlayground: projectData.hasPlayground ? 'true' : 'false',
      hasSecurityService: projectData.hasSecurityService ? 'true' : 'false',
      hasGarden: projectData.hasGarden ? 'true' : 'false',
      hasSharedTerrace: projectData.hasSharedTerrace ? 'true' : 'false',
      hasBicycleStorage: projectData.hasBicycleStorage ? 'true' : 'false',
      hasLaundryRoom: projectData.hasLaundryRoom ? 'true' : 'false',
      hasStorageRooms: projectData.hasStorageRooms ? 'true' : 'false',
      hasWasteDisposalArea: projectData.hasWasteDisposalArea ? 'true' : 'false',
      mezzanine: projectData.mezzanine ? 'true' : 'false'
    };

    Object.entries(dataToSend).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        formData.append(key, value);
      } else {
      }
    });

    return formData;
  }

  /**
   * Search projects by promoter with pagination
   */
  searchProjectsByPromoter(
    criteria: ProjectSearchCriteria,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedResponse<RealEstateProject>> {
    const url = `${this.endpoints.searchProjects}?page=${page}&size=${size}`;
    return this.http.post<PaginatedResponse<RealEstateProject>>(url, criteria, { headers: this.getHeaders() })
      .pipe(
        timeout(15000),
        retry({ count: 2, delay: 1000 }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get all projects with transformation for display
   */
  getProjects(
    promoterId: number,
    filters?: ProjectFilters,
    page: number = 0,
    size: number = 10
  ): Observable<any[]> {
    const criteria: ProjectSearchCriteria = {
      promoterId,
      address: filters?.search || undefined
    };
    return this.searchProjectsByPromoter(criteria, page, size)
      .pipe(
        map(response => this.transformToDisplayProjects(response.content)),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get all projects paginated
   */
  getAllProjectsPaginated(
    promoterId: number,
    page: number = 0,
    size: number = 10
  ): Observable<PaginatedResponse<any>> {
    const criteria: ProjectSearchCriteria = { promoterId };
    return this.searchProjectsByPromoter(criteria, page, size)
      .pipe(
        map(response => ({
          ...response,
          content: this.transformToDisplayProjects(response.content)
        })),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get global indicators for a project
   */
  getGlobalIndicators(realEstatePropertyId: number): Observable<any> {
    const url = `${this.endpoints.indicators}?realEstatePropertyId=${realEstatePropertyId}`;
    return this.http.get(url, { headers: this.getHeaders() })
      .pipe(
        timeout(10000),
        retry({ count: 2, delay: 1000 }),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get all property types
   */
  getPropertyTypes(): Observable<PropertyType[]> {
    return this.http.get<PropertyType[]>(this.endpoints.propertyTypes, { headers: this.getHeaders() })
      .pipe(
        timeout(10000),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get all promoters
   */
  getPromoters(): Observable<Promoter[]> {
    return this.http.get<Promoter[]>(this.endpoints.promoters, { headers: this.getHeaders() })
      .pipe(
        timeout(10000),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get project by ID
   */
  getProjectById(id: number): Observable<RealEstateProject> {
    return this.http.get<RealEstateProject>(`${this.endpoints.projects}/${id}`, { headers: this.getHeaders() })
      .pipe(
        timeout(10000),
        catchError(this.handleError.bind(this))
      );
  }

  /**
   * Get project details
   */
  getRealEstateDetails(id: number): Observable<RealEstateProject> {
    if (!id || id <= 0) {
      return throwError(() => new Error('ID invalide'));
    }
    return this.http.get<RealEstateProject>(`${this.endpoints.detailProject}/details/${id}`, { headers: this.getHeaders() })
      .pipe(
        timeout(10000),
        catchError(this.handleError.bind(this))
      );
  }



  /**
   * Delete a project
   */
  deleteProject(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${this.endpoints.projects}/${id}`, { headers: this.getHeaders() })
      .pipe(
        timeout(10000),
        catchError(this.handleError.bind(this))
      );
  }



private transformToDisplayProjects(apiProjects: RealEstateProject[]): any[] {
  return apiProjects.map(project => ({
    id: project.id || 0,
    title: project.name,
    location: this.extractLocationFromAddress(project.address),
    address: project.address,
    startDate: this.formatDisplayDate(project.startDate),
    endDate: this.formatDisplayDate(project.endDate),
    progress: this.calculateProgress(project.startDate, project.endDate),
    plan: this.apiImageUrl + (project.plan || ''),
    available: project.available,
    blocked: project.blocked === true, 
    name: project.name // Garder aussi le nom original
  }));
}

  /**
   * Extract location from address
   */
  private extractLocationFromAddress(address: string): string {
    if (!address) return 'Non spécifié';
    const parts = address.split(',');
    return parts.length > 1 ? parts[parts.length - 1].trim() : address.trim();
  }

  /**
   * Format date for display (DD.MM.YY)
   */
  private formatDisplayDate(dateString: string): string {
    if (!dateString) return '';
    try {
      const date = this.parseDate(dateString);
      if (!date) return dateString;
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}.${month}.${year}`;
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Parse date robustly
   */
  private parseDate(dateString: string | any): Date | null {
    if (!dateString || typeof dateString !== 'string') return null;
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? null : date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Calculate project progress
   */
  private calculateProgress(startDate: any, endDate: any): number {
    try {
      if (!startDate || !endDate) return 0;
      const start = this.parseDate(startDate);
      const end = this.parseDate(endDate);
      if (!start || !end) return 0;
      if (end <= start) return 0;

      const now = new Date();
      if (now < start) return 0;
      if (now > end) return 100;

      const totalDuration = end.getTime() - start.getTime();
      const elapsed = now.getTime() - start.getTime();
      if (totalDuration === 0) return 100;

      const progress = (elapsed / totalDuration) * 100;
      return Math.max(0, Math.min(100, Math.round(progress)));
    } catch (error) {
      return 0;
    }
  }

  /**
   * Process project data
   */
  public processProjectData(project: any): any {
    if (!project) return null;
    let progress = project.averageProgress !== undefined
      ? Number(project.averageProgress)
      : this.calculateProgress(project.startDate, project.endDate);
    if (isNaN(progress)) progress = 0;

    return {
      ...project,
      progress: Math.max(0, Math.min(100, progress)),
      available: Boolean(project.available),
      startDateFormatted: this.formatDisplayDate(project.startDate),
      endDateFormatted: this.formatDisplayDate(project.endDate)
    };
  }

 
  /**
   * Generate unique project number
   */
  private generateProjectNumber(): number {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return parseInt(`${timestamp.toString().slice(-6)}${random}`);
  }

  /**
   * Convert file to Base64
   */
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const result = reader.result as string;
          const base64String = result.split(',')[1];
          resolve(base64String);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => reject(new Error('Erreur lors de la lecture du fichier'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Validate file
   */
  validateFile(file: File, type: 'image' | 'pdf'): { valid: boolean; error?: string } {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (!file) return { valid: false, error: 'Aucun fichier sélectionné' };
    if (file.size > maxSize) return { valid: false, error: 'Le fichier est trop volumineux (maximum 10MB)' };

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedPdfTypes = ['application/pdf'];

    if (type === 'image' && !allowedImageTypes.includes(file.type)) {
      return { valid: false, error: 'Format d\'image non supporté (JPEG, PNG, GIF, WebP)' };
    }
    if (type === 'pdf' && !allowedPdfTypes.includes(file.type)) {
      return { valid: false, error: 'Le fichier doit être un PDF' };
    }
    return { valid: true };
  }

  /**
   * Handle HTTP errors
   */
  private handleError(error: any): Observable<never> {
    let errorMessage = 'Une erreur inconnue est survenue';
    let technicalDetails = '';


    if (error instanceof HttpErrorResponse) {
      technicalDetails = `Status: ${error.status} - ${error.statusText}`;
      switch (error.status) {
        case 0:
          errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
          break;
        case 400:
          errorMessage = 'Données invalides. Veuillez vérifier votre saisie.';
          if (error.error?.errors) {
            errorMessage += ' Détails: ' + Object.values(error.error.errors).flat().join(', ');
          }
          break;
        case 401:
          errorMessage = 'Non autorisé. Veuillez vous reconnecter.';
          break;
        case 403:
          errorMessage = 'Accès interdit. Vous n\'avez pas les permissions nécessaires.';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée.';
          break;
        case 413:
          errorMessage = 'Fichier trop volumineux. Taille maximum: 10MB.';
          break;
        case 415:
          errorMessage = 'Type de fichier non supporté.';
          break;
        case 422:
          errorMessage = 'Données non valides.';
          if (error.error?.message) errorMessage += ' ' + error.error.message;
          break;
        case 500:
          errorMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
          break;
        case 503:
          errorMessage = 'Service temporairement indisponible.';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message || 'Erreur inconnue'}`;
      }
    } else {
      errorMessage = `Erreur réseau: ${error.message || 'Inconnue'}`;
      technicalDetails = 'Vérifiez votre connexion internet';
    }

    const userError = new Error(errorMessage);
    (userError as any).technicalDetails = technicalDetails;
    return throwError(() => userError);
  }


createProject(
  projectData: RealEstateProject,
  planFile?: File,
  useBase64: boolean = true
): Observable<ApiResponse<RealEstateProject>> {
  // Check authentication synchronously
  const isAuthenticated = this.authService.isAuthenticated();
  if (!isAuthenticated) {
    return throwError(() => new Error('Utilisateur non authentifié'));
  }

  // FIX: Gérer correctement les méthodes asynchrones vs synchrones
  if (useBase64) {
    return this.createProjectWithBase64(projectData, planFile);
  } else {
    return this.createProjectWithRawFile(projectData, planFile);
  }
}

private createProjectWithBase64(
  projectData: RealEstateProject,
  planFile?: File
): Observable<ApiResponse<RealEstateProject>> {
  return new Observable(observer => {
    this.buildFormDataWithBase64(projectData, planFile)
      .then(formData => {

        this.http.post<ApiResponse<RealEstateProject>>(
          this.endpoints.save,
          formData,
          { headers: this.getHeaders() }
        ).pipe(
          timeout(30000),
          retry({
            count: 2,
            delay: (error: HttpErrorResponse, retryCount: number) => {
              if (error.status === 401 && retryCount === 1) {
                return this.authService.refreshUser().pipe(
                  switchMap(() => throwError(() => error))
                );
              }
              return throwError(() => error);
            }
          }),
          catchError(this.handleError.bind(this))
        ).subscribe({
          next: (response) => observer.next(response),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      })
      .catch(error => observer.error(error));
  });
}

private createProjectWithRawFile(
  projectData: RealEstateProject,
  planFile?: File
): Observable<ApiResponse<RealEstateProject>> {
  const formData = this.buildFormDataWithRawFile(projectData, planFile);

  return this.http.post<ApiResponse<RealEstateProject>>(
    this.endpoints.save,
    formData,
    { headers: this.getHeaders() }
  ).pipe(
    timeout(30000),
    retry({
      count: 2,
      delay: (error: HttpErrorResponse, retryCount: number) => {
        if (error.status === 401 && retryCount === 1) {
          return this.authService.refreshUser().pipe(
            switchMap(() => throwError(() => error))
          );
        }
        return throwError(() => error);
      }
    }),
    catchError(this.handleError.bind(this))
  );
}

// FIX: Correction de la méthode buildFormDataWithBase64 pour retourner une Promise
private buildFormDataWithBase64(
  projectData: RealEstateProject,
  planFile?: File
): Promise<FormData> {
  return new Promise(async (resolve, reject) => {
    try {
      const formData = new FormData();

      if (planFile) {
        const validation = this.validateFile(planFile, 'image');
        if (!validation.valid) {
          reject(new Error(validation.error || 'Fichier plan invalide'));
          return;
        }

        try {
          const planBase64 = await this.fileToBase64(planFile);
          formData.append('plan', planBase64);
} catch (error) {
          reject(new Error('Impossible d\'encoder le fichier plan'));
          return;
        }
      } else {
      }

      const dataToSend = {
        name: projectData.name || '',
        number: projectData.number || this.generateProjectNumber().toString(),
        address: projectData.address || '',
        price: projectData.price?.toString() || '0',
        numberOfRooms: projectData.numberOfRooms?.toString() || '1',
        area: projectData.area?.toString() || '0',
        latitude: projectData.latitude?.toString() || '0',
        longitude: projectData.longitude?.toString() || '0',
        description: projectData.description || '',
        numberOfLots: projectData.numberOfLots?.toString() || '1',
        promoterId: projectData.promoterId?.toString() || '1',
        moaId: projectData.moaId?.toString() || '',
        managerId: projectData.managerId?.toString() || '',
        propertyTypeId: projectData.propertyTypeId?.toString() || '1',
        startDate: this.formatDateForApi(projectData.startDate),
        endDate: this.formatDateForApi(projectData.endDate),
        hasHall: projectData.hasHall ? 'true' : 'false',
        hasParking: projectData.hasParking ? 'true' : 'false',
        hasElevator: projectData.hasElevator ? 'true' : 'false',
        hasSwimmingPool: projectData.hasSwimmingPool ? 'true' : 'false',
        hasGym: projectData.hasGym ? 'true' : 'false',
        hasPlayground: projectData.hasPlayground ? 'true' : 'false',
        hasSecurityService: projectData.hasSecurityService ? 'true' : 'false',
        hasGarden: projectData.hasGarden ? 'true' : 'false',
        hasSharedTerrace: projectData.hasSharedTerrace ? 'true' : 'false',
        hasBicycleStorage: projectData.hasBicycleStorage ? 'true' : 'false',
        hasLaundryRoom: projectData.hasLaundryRoom ? 'true' : 'false',
        hasStorageRooms: projectData.hasStorageRooms ? 'true' : 'false',
        hasWasteDisposalArea: projectData.hasWasteDisposalArea ? 'true' : 'false',
        mezzanine: projectData.mezzanine ? 'true' : 'false'
      };

      Object.entries(dataToSend).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          formData.append(key, value);
        } else {
        }
      });

      resolve(formData);
    } catch (error) {
      reject(error);
    }
  });
}

// FIX: Correction du format de date
private formatDateForApi(date: string | Date): string {
  if (!date) return '';
  
  let dateObj: Date;
  if (typeof date === 'string') {
    // Si c'est déjà au format YYYY-MM-DD du input date HTML
    if (date.includes('-') && date.length === 10) {
      dateObj = new Date(date);
    } else {
      dateObj = new Date(date);
    }
  } else {
    dateObj = date;
  }
  
  if (isNaN(dateObj.getTime())) {
    return '';
  }
  
  // Format MM-DD-YYYY comme attendu par l'API
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const day = dateObj.getDate().toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  return `${month}-${day}-${year}`;
}

// FIX: Correction de la méthode updateProject
updateProject(
  id: number,
  projectData: RealEstateProject,
  planFile?: File
): Observable<ApiResponse<RealEstateProject>> {
  if (planFile) {
    return this.createProjectWithRawFile(projectData, planFile).pipe(
      switchMap(formData => 
        this.http.put<ApiResponse<RealEstateProject>>(
          `${this.endpoints.projects}/${id}`,
          formData,
          { headers: this.getHeaders() }
        )
      )
    );
  } else {
    return new Observable(observer => {
      this.buildFormDataWithBase64(projectData).then(formData => {
        this.http.put<ApiResponse<RealEstateProject>>(
          `${this.endpoints.projects}/${id}`,
          formData,
          { headers: this.getHeaders() }
        ).pipe(
          timeout(30000),
          retry({ count: 2, delay: 1000 }),
          catchError(this.handleError.bind(this))
        ).subscribe({
          next: (response) => observer.next(response),
          error: (error) => observer.error(error),
          complete: () => observer.complete()
        });
      }).catch(error => observer.error(error));
    });
  }
}

// FIX: Correction de la méthode getlisteProjectsByPromoters
getlisteProjectsByPromoters(promoterId: number, page: number = 0, size: number = 10): Observable<any> {
  const params = new HttpParams()
    .set('promoterId', promoterId.toString())
    .set('page', page.toString())
    .set('size', size.toString());
  
  const url = `${environment.endpoints.realestate}/search-by-promoter`;
  
  return this.http.get<any>(url, { 
    params,
    headers: this.getHeaders() // FIX: Ajouter les headers d'authentification
  }).pipe(
    timeout(15000),
    retry({ count: 2, delay: 1000 }),
    catchError(this.handleError.bind(this))
  );
}
}