  import { Injectable } from '@angular/core';
  import { HttpClient, HttpParams, HttpHeaders, HttpErrorResponse } from '@angular/common/http';
  import { Observable, throwError } from 'rxjs';
  import { catchError } from 'rxjs/operators';

  export interface BudgetResponse {
    id: number;
    plannedBudget: number;
    consumedBudget: number;
    remainingBudget: number;
  }
  export interface CreateTaskRequest {
    
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    startDate: string; // Format: MM-DD-YYYY
    endDate: string;   // Format: MM-DD-YYYY
    realEstatePropertyId: number;
    executorIds: number[];
    pictures: string[]; // Tableau de base64 strings
  }

  export interface UpdateTaskRequest {
    status: string; // Rendre obligatoire au lieu de optionnel
    title?: string;
    description?: string;
    priority?: string;
    startDate?: string;
    endDate?: string;
    realEstatePropertyId?: number;
    executorIds?: number[];
    pictures?: string[];
  }
  export interface ProgressAlbum {
    id: number;
    phaseName: string;
    description: string;
    lastUpdated: string | number[];
    pictures: string[];
    entrance: boolean;
    realEstateProperty: {
      id: number;
      name: string;
      address: string;
      plan: string;
    };
  }

  export interface Task {
    id: number;
    title: string;
    description: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED';
    startDate: number[];
    endDate: number[];
    pictures: string[];
    realEstateProperty: {
      id: number;
      name: string;
      number: string;
      address: string;
      price: number;
      numberOfRooms: number;
      area: number;
      latitude: string;
      longitude: string;
      available: boolean;
      reservationFee: number;
      discount: number;
      feesFile: number;
      description: string;
      plan: string;
      legalStatus: string;
      numberOfLots: number;
      level: number;
      promoter: {
        id: number;
        nom: string;
        prenom: string;
        email: string;
        password: string;
        adress: string;
        technicalSheet: string | null;
        profil: string;
        activated: boolean;
        notifiable: boolean;
        telephone: string;
        subscriptions: Array<{
          id: number;
          subscriptionPlan: {
            id: number;
            name: string;
            totalCost: number;
            installmentCount: number;
          };
          startDate: number[];
          endDate: number[];
          active: boolean;
          paidAmount: number;
          installmentCount: number;
          dateInvoice: string | null;
          status: string;
          renewed: boolean;
        }>;
        company: {
          id: number;
          name: string | null;
          logo: string;
          primaryColor: string | null;
          secondaryColor: string | null;
        };
        createdAt: number[];
        funds: number;
        note: number;
        photo: string | null;
        idCard: string | null;
        accountNonExpired: boolean;
        credentialsNonExpired: boolean;
        accountNonLocked: boolean;
        hibernateLazyInitializer: any;
        username: string;
        authorities: Array<{
          authority: string;
        }>;
        enabled: boolean;
      };
      recipient: any;
      notary: any;
      agency: any;
      bank: any;
      parentProperty: any;
      timestamp: number;
      pictures: string[];
      propertyType: {
        id: number;
        typeName: string;
        parent: boolean;
        hibernateLazyInitializer: any;
      };
      constructionPhaseIndicators: Array<{
        id: number;
        phaseName: string;
        progressPercentage: number;
        lastUpdated: string;
      }>;
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
      status: string;
      constructionStatus: string;
      lotFeesPaid: boolean;
      lotFee: {
        id: number;
        name: string;
        fee: number;
        hibernateLazyInitializer: any;
      };
      coOwner: boolean;
      budget: number;
      allocateDate: string | null;
      rental: boolean;
      commentcount: number;
      rentalDate: string | null;
      soldAt: string | null;
      workers: any[];
      startDate: number[];
      endDate: number[];
      hibernateLazyInitializer: any;
      mezzanine: boolean;
    };
    executors: Array<{
      id: number;
      nom: string;
      prenom: string;
      email: string;
      password: string;
      adress: string;
      technicalSheet: string | null;
      profil: string;
      activated: boolean;
      notifiable: boolean;
      telephone: string;
      subscriptions: Array<{
        id: number;
        subscriptionPlan: {
          id: number;
          name: string;
          totalCost: number;
          installmentCount: number;
        };
        startDate: number[];
        endDate: number[];
        active: boolean;
        paidAmount: number;
        installmentCount: number;
        dateInvoice: string | null;
        status: string;
        renewed: boolean;
      }>;
      company: any;
      createdAt: number[];
      funds: number;
      note: number;
      photo: string;
      idCard: string | null;
      accountNonExpired: boolean;
      credentialsNonExpired: boolean;
      accountNonLocked: boolean;
      username: string;
      authorities: Array<{
        authority: string;
      }>;
      enabled: boolean;
    }>;
  }

  export interface TasksResponse {
    content: Task[];
    pageable: {
      pageNumber: number;
      pageSize: number;
      sort: {
        unsorted: boolean;
        sorted: boolean;
        empty: boolean;
      };
      offset: number;
      paged: boolean;
      unpaged: boolean;
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    first: boolean;
    empty: boolean;
  }

  export interface Expense {
    id: number;
    description: string;
    date: number[];
    amount: number;
    budget: {
      id: number;
      plannedBudget: number;
      consumedBudget: number;
      remainingBudget: number;
      property: any;
    };
    evidence:string

  }

  export interface ExpensesResponse {
    content: Expense[];
    pageable: {
      pageNumber: number;
      pageSize: number;
      sort: {
        unsorted: boolean;
        sorted: boolean;
        empty: boolean;
      };
      offset: number;
      paged: boolean;
      unpaged: boolean;
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    first: boolean;
    empty: boolean;
  }

// project-details.service.ts
export interface CreateExpenseRequest {
  description: string;
  date: string;
  amount: number; // ← Changez 'amont' en 'amount'
  budgetId: number;
}

  export interface CreateAlbumRequest {
    realEstatePropertyId: number;
    name: string;
    description: string;
    pictures: string[];
  }

  export interface UpdateAlbumRequest {
    name?: string;
    description?: string;
    pictures?: string[];
  }
  export interface IndicatorUpdateResponse {
    id: number;
    phaseName: string;
    progressPercentage: number;
    lastUpdated: string;
  }

  export interface DocumentType {
    id: number;
    label: string;
    code: string;
    hasStartDate: boolean;
    hasEndDate: boolean;
    type: string;
  }

  export interface DocumentTypesResponse {
    content: DocumentType[];
  }

  export interface Document {
    id: number;
    title: string;
    file: string;
    description: string;
    type: DocumentType | null;
    startDate: number[];
    endDate: number[];
  }

  export interface DocumentsResponse {
    content: Document[];
    pageable: {
      pageNumber: number;
      pageSize: number;
      sort: {
        unsorted: boolean;
        sorted: boolean;
        empty: boolean;
      };
      offset: number;
      paged: boolean;
      unpaged: boolean;
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    first: boolean;
    empty: boolean;
  }

  export interface CreateDocumentRequest {
    title: string;
    file: string;
    description: string;
    realEstatePropertyId: number;
    typeId: number;
    startDate: string; // format dd-MM-yyyy
    endDate: string; // format dd-MM-yyyy
  }

  // Nouvelles interfaces pour les signalements
  export interface Signalement {
    id: number;
    title: string;
    description: string;
    createdAt: number[];
    propertyName: string;
    pictures: string[];
  }

  export interface SignalementResponse {
    content: Signalement[];
    pageable: {
      pageNumber: number;
      pageSize: number;
      sort: {
        unsorted: boolean;
        sorted: boolean;
        empty: boolean;
      };
      offset: number;
      paged: boolean;
      unpaged: boolean;
    };
    totalElements: number;
    totalPages: number;
    last: boolean;
    numberOfElements: number;
    size: number;
    number: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
      };
    first: boolean;
    empty: boolean;
  }

  export interface CreateSignalementRequest {
    title: string;
    description: string;
    propertyId: number;
    pictures: string[];
  }

 @Injectable({
  providedIn: 'root'
})
export class ProjectBudgetService {
  private baseUrl = 'https://wakana.online/api/';

  constructor(private http: HttpClient) {}

  // Méthode privée pour obtenir les headers d'authentification
  private getAuthHeaders(forFormData: boolean = false): HttpHeaders {
    const token = localStorage.getItem('token') || 
                  sessionStorage.getItem('token') || 
                  localStorage.getItem('authToken') || 
                  sessionStorage.getItem('authToken') ||
                  localStorage.getItem('accessToken') || 
                  sessionStorage.getItem('accessToken') ||
                  localStorage.getItem('jwt') || 
                  sessionStorage.getItem('jwt');
    
    console.log('Token récupéré pour headers:', token ? token.substring(0, 20) + '...' : 'null');
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      return new HttpHeaders();
    }
    
    if (forFormData) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`
      });
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    });
  }

  // Méthode pour gérer les erreurs HTTP
  private handleError(error: HttpErrorResponse) {
    console.error('Erreur HTTP détaillée:', error);
    
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = error.error.message;
    } else {
      errorMessage = `Code d'erreur: ${error.status}\nMessage: ${error.message}`;
      
      if (error.status === 403) {
        errorMessage = "Accès refusé. Vérifiez vos autorisations.";
      } else if (error.status === 401) {
        errorMessage = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.status === 400) {
        errorMessage = "Données invalides. Vérifiez les informations saisies.";
      } else if (error.status === 404) {
        errorMessage = "Ressource introuvable.";
      }
    }
    
    return throwError(errorMessage);
  }
  createTask(taskData: CreateTaskRequest): Observable<any> {
    const headers = this.getAuthHeaders(true); // true pour FormData (sans Content-Type)
    
    // Créer un FormData pour l'envoi multipart
    const formData = new FormData();
    
    // Ajouter les champs texte
    formData.append('title', taskData.title);
    formData.append('description', taskData.description);
    formData.append('priority', taskData.priority);
    formData.append('startDate', taskData.startDate);
    formData.append('endDate', taskData.endDate);
    formData.append('realEstatePropertyId', taskData.realEstatePropertyId.toString());
    
    // Ajouter les executors (IDs) - format correct pour l'API
    taskData.executorIds.forEach((executorId) => {
      formData.append('executorIds', executorId.toString());
    });
    
    // Ajouter les images (format correct pour l'API)
    if (taskData.pictures && taskData.pictures.length > 0) {
      taskData.pictures.forEach((pictureBase64: string) => {
        // L'API attend directement les strings base64, pas des fichiers Blob
        formData.append('pictures', pictureBase64);
      });
    }
    
    console.log('Envoi FormData pour tâche avec:', {
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      startDate: taskData.startDate,
      endDate: taskData.endDate,
      realEstatePropertyId: taskData.realEstatePropertyId,
      executorIds: taskData.executorIds,
      pictureCount: taskData.pictures ? taskData.pictures.length : 0
    });
    console.log(headers, formData);
    return this.http.post<any>(
      `${this.baseUrl}/tasks`, // URL corrigée sans double /api
      formData,
      { headers }
    ).pipe(
      catchError((error) => {
        console.error('Erreur détaillée lors de la création de tâche:', error);
        return this.handleError(error);
      })
    );
  }
  updateTaskStatus(id: number, status: string): Observable<any> {
    const headers = this.getAuthHeaders(true);
    
    const formData = new FormData();
    formData.append('status', status);
    
    console.log('Mise à jour du statut de la tâche:', { id, status });
    
    return this.http.put<any>(
      `${this.baseUrl}/tasks/${id}`,
      formData,
      { headers }
    ).pipe(
      catchError((error) => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        return this.handleError(error);
      })
    );
  }

// Dans votre service
updateTask(id: number, taskData: UpdateTaskRequest ): Observable<any> {
  const headers = this.getAuthHeaders(true);
  
  const formData = new FormData();
  
  // Ajouter seulement les champs présents dans la requête
  if (taskData.title !== undefined) formData.append('title', taskData.title || '');
  if (taskData.description !== undefined) formData.append('description', taskData.description || '');
  if (taskData.priority !== undefined) formData.append('priority', taskData.priority || '');
  if (taskData.startDate !== undefined) formData.append('startDate', taskData.startDate || '');
  if (taskData.endDate !== undefined) formData.append('endDate', taskData.endDate || '');
  if (taskData.status !== undefined) formData.append('status', taskData.status || '');
  if (taskData.realEstatePropertyId !== undefined) {
    formData.append('realEstatePropertyId', taskData.realEstatePropertyId.toString());
  }
  
  // Ajouter les executors si présents
  if (taskData.executorIds && taskData.executorIds.length > 0) {
    taskData.executorIds.forEach((executorId) => {
      formData.append('executorIds', executorId.toString());
    });
  }
  
  // Ajouter les images si présentes
  if (taskData.pictures && taskData.pictures.length > 0) {
    taskData.pictures.forEach((pictureBase64: string) => {
      formData.append('pictures', pictureBase64);
    });
  }
  
  console.log('Mise à jour de la tâche:', { id, data: taskData });
  
  return this.http.put<any>(
    `${this.baseUrl}tasks/${id}`,
    formData,
    { headers }
  ).pipe(
    catchError((error) => {
      console.error('Erreur lors de la mise à jour de tâche:', error);
      return this.handleError(error);
    })
  );
}
  // Méthode utilitaire pour convertir base64 en Blob
  private base64ToBlob(base64: string): Blob {
    try {
      // Extraire le type MIME et les données base64
      const parts = base64.split(';base64,');
      if (parts.length < 2) {
        throw new Error('Format base64 invalide');
      }
      
      const mimeType = parts[0].split(':')[1];
      const byteString = atob(parts[1]);
      
      // Convertir en ArrayBuffer
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uint8Array = new Uint8Array(arrayBuffer);
      
      for (let i = 0; i < byteString.length; i++) {
        uint8Array[i] = byteString.charCodeAt(i);
      }
      
      return new Blob([arrayBuffer], { type: mimeType });
    } catch (error) {
      console.error('Erreur lors de la conversion base64 en Blob:', error);
      throw new Error('Impossible de convertir l\'image');
    }
  }

  // === MÉTHODES POUR LES ALBUMS AVEC FORMDATA ===

  saveAlbum(album: any): Observable<any> {
    const headers = this.getAuthHeaders(true);
    
    // Créer un FormData pour l'envoi multipart
    const formData = new FormData();
    
    // Ajouter les champs texte
    formData.append('realEstatePropertyId', album.realEstatePropertyId.toString());
    formData.append('name', album.name);
    formData.append('description', album.description);
    
    // Ajouter les images (convertir les base64 en fichiers Blob)
    if (album.pictures && album.pictures.length > 0) {
      album.pictures.forEach((pictureBase64: string, index: number) => {
        try {
          const blob = this.base64ToBlob(pictureBase64);
          const fileName = `image-${index + 1}.png`;
          formData.append('pictures', blob, fileName);
        } catch (error) {
          console.error(`Erreur avec l'image ${index + 1}:`, error);
        }
      });
    }
    
    console.log('Envoi FormData avec:', {
      realEstatePropertyId: album.realEstatePropertyId,
      name: album.name,
      description: album.description,
      pictureCount: album.pictures ? album.pictures.length : 0
    });
    
    return this.http.post<any>(
      `${this.baseUrl}/progress-album/save`,
      formData,
      { headers }
    ).pipe(
      catchError((error) => {
        console.error('Erreur détaillée lors de la création d\'album:', error);
        return this.handleError(error);
      })
    );
  }

  updateAlbum(id: number, album: any): Observable<any> {
    const headers = this.getAuthHeaders(true);
    
    const formData = new FormData();
    
    if (album.name) formData.append('name', album.name);
    if (album.description) formData.append('description', album.description);
    
    // Ajouter les nouvelles images si présentes
    if (album.pictures && album.pictures.length > 0) {
      album.pictures.forEach((pictureBase64: string, index: number) => {
        try {
          const blob = this.base64ToBlob(pictureBase64);
          const fileName = `image-${index + 1}.png`;
          formData.append('pictures', blob, fileName);
        } catch (error) {
          console.error(`Erreur avec l'image ${index + 1}:`, error);
        }
      });
    }
    
    return this.http.put<any>(
      `${this.baseUrl}/progress-album/update/${id}`,
      formData,
      { headers }
    ).pipe(catchError(this.handleError));
  }

  // === MÉTHODES EXISTANTES ===

  GetProjectBudget(propertyId: number): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/budgets/property/${propertyId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  getAlbum(propertyId: number): Observable<any[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<any[]>(`${this.baseUrl}/progress-album/by-property/${propertyId}`, { headers })
      .pipe(catchError(this.handleError));
  }

  getTasks(propertyId: number, page: number = 0, size: number = 10): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/tasks/by-property/${propertyId}?page=${page}&size=${size}`, { headers })
      .pipe(catchError(this.handleError));
  }

  putBudget(id: number, amont: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('amont', amont.toString());
    
    return this.http.put<any>(
      `${this.baseUrl}/budgets/${id}`,
      null,
      { headers, params }
    ).pipe(catchError(this.handleError));
  }

  getDepense(budgetId: number, page: number = 0, size: number = 10): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/expenses/budget/${budgetId}?page=${page}&size=${size}`, { headers })
      .pipe(catchError(this.handleError));
  }

  createDepense(expense: any): Observable<any> {
    const headers = this.getAuthHeaders();
    
    return this.http.post<any>(
      `${this.baseUrl}/expenses`,
      expense, 
      { headers }
    ).pipe(catchError(this.handleError));
  }

  putDepense(id: number, expense: any): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.put<any>(`${this.baseUrl}/expenses/${id}`, expense, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteDepense(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.baseUrl}/expenses/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteAlbum(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.baseUrl}/progress-album/delete/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  getDocumentsType(): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/documents/types`, { headers })
      .pipe(catchError(this.handleError));
  }

  updateIndicator(indicatorId: number, progressPercentage: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams().set('progressPercentage', progressPercentage.toString());
    
    return this.http.put<any>(
      `${this.baseUrl}/indicators/update/${indicatorId}`,
      null,
      { headers, params }
    ).pipe(catchError(this.handleError));
  }

  getDocuments(propertyId: number, page: number = 0, size: number = 10): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/documents/property/${propertyId}?page=${page}&size=${size}`, { headers })
      .pipe(catchError(this.handleError));
  }

  saveDocument(formData: FormData): Observable<any> {
    const headers = this.getAuthHeaders(true);
  
    // Ajouter les champs requis même s'ils sont vides
    const requiredFields = ['title', 'description', 'realEstatePropertyId', 'typeId', 'startDate', 'endDate'];
    requiredFields.forEach(field => {
      if (!formData.has(field)) {
        formData.append(field, '');
      }
    });
  
    if (!formData.has('file')) {
      formData.append('file', '');
    }
  
    // Log des clés et valeurs du FormData avec assertion de type
    console.log('Envoi FormData pour document avec champs:');
    for (const [key, value] of (formData as any).entries()) {
      console.log(`${key}: ${value instanceof File ? value.name : value}`);
    }
  
    // Vérifier le token
    const token = headers.get('Authorization')?.replace('Bearer ', '');
    console.log('Token envoyé:', token ? token.substring(0, 20) + '...' : 'Aucun token');
  
    return this.http.post<any>(`${this.baseUrl}documents/add`, formData, { headers })
      .pipe(
        catchError((error) => {
          console.error('Erreur détaillée lors de la création du document:', error);
          return this.handleError(error);
        })
      );
  }
  

  getSignalement(propertyId: number, page: number = 0, size: number = 10): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.get<any>(`${this.baseUrl}/incidents?propertyId=${propertyId}&page=${page}&size=${size}`, { headers })
      .pipe(catchError(this.handleError));
  }
// Dans project-budget.service.ts
saveSignalementWithFormData(formData: FormData): Observable<any> {
  const headers = this.getAuthHeaders(true);
  return this.http.post<any>(`${this.baseUrl}/incidents/save`, formData, { headers })
    .pipe(catchError(this.handleError));
}
  saveSignalement(data: CreateSignalementRequest | FormData): Observable<any> {
    let headers: HttpHeaders;
    
    if (data instanceof FormData) {
      headers = this.getAuthHeaders(true); // Headers pour FormData
    } else {
      headers = this.getAuthHeaders(); // Headers pour JSON
    }
    
    return this.http.post<any>(`${this.baseUrl}/incidents/save`, data, { headers })
      .pipe(catchError(this.handleError));
  }

  deleteSignalement(id: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.baseUrl}/incidents/${id}`, { headers })
      .pipe(catchError(this.handleError));
  }

  // Méthode utilitaire pour debug
  checkAuthToken(): void {
    const possibleKeys = ['token', 'authToken', 'accessToken', 'jwt', 'bearerToken'];
    
    console.log('=== VÉRIFICATION DES TOKENS ===');
    possibleKeys.forEach(key => {
      const localValue = localStorage.getItem(key);
      const sessionValue = sessionStorage.getItem(key);
      
      if (localValue) {
        console.log(`localStorage.${key}:`, localValue.substring(0, 20) + '...');
      }
      if (sessionValue) {
        console.log(`sessionStorage.${key}:`, sessionValue.substring(0, 20) + '...');
      }
    });
    
    console.log('Clés localStorage:', Object.keys(localStorage));
    console.log('Clés sessionStorage:', Object.keys(sessionStorage));
    console.log('===============================');
  }
}