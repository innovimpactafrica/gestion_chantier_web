import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BudgetResponse {
  id: number;
  plannedBudget: number;
  consumedBudget: number;
  remainingBudget: number;
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

export interface CreateExpenseRequest {
  description: string;
  date: string;
  amount: number;
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
  private baseUrl = 'https://wakana.online/api';

  constructor(private http: HttpClient) {}

  // Méthodes existantes
  GetProjectBudget(propertyId: number): Observable<BudgetResponse> {
    return this.http.get<BudgetResponse>(`${this.baseUrl}/budgets/property/${propertyId}`);
  }

  getAlbum(propertyId: number): Observable<ProgressAlbum[]> {
    return this.http.get<ProgressAlbum[]>(`${this.baseUrl}/progress-album/by-property/${propertyId}`);
  }

  // Gestion des tâches
  getTasks(propertyId: number, page: number = 0, size: number = 10): Observable<TasksResponse> {
    return this.http.get<TasksResponse>(`${this.baseUrl}/tasks/by-property/${17}?page=${page}&size=${size}`);
  }

  // Gestion du budget

// Dans votre ProjectBudgetService
putBudget(id: number, amount: number): Observable<BudgetResponse> {
  const params = new HttpParams().set('amount', amount.toString());
  
  return this.http.put<BudgetResponse>(
    `${this.baseUrl}/budgets/${id}`,
    null, // Pas de body pour cette requête
    { params }
  );
}

  // Gestion des dépenses
  getDepense(budgetId: number, page: number = 0, size: number = 10): Observable<ExpensesResponse> {
    return this.http.get<ExpensesResponse>(`${this.baseUrl}/expenses/budget/${budgetId}?page=${page}&size=${size}`);
  }

  createDepense(expense: CreateExpenseRequest): Observable<Expense> {
    return this.http.post<Expense>(`${this.baseUrl}/expenses`, expense);
  }

  putDepense(id: number, expense: Partial<CreateExpenseRequest>): Observable<Expense> {
    return this.http.put<Expense>(`${this.baseUrl}/expenses/${id}`, expense);
  }

  deleteDepense(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/expenses/${id}`);
  }

  // Gestion des albums
  saveAlbum(album: CreateAlbumRequest): Observable<ProgressAlbum> {
    return this.http.post<ProgressAlbum>(`${this.baseUrl}/progress-album/save`, album);
  }

  updateAlbum(id: number, album: UpdateAlbumRequest): Observable<ProgressAlbum> {
    return this.http.put<ProgressAlbum>(`${this.baseUrl}/progress-album/update/${id}`, album);
  }
 
  deleteAlbum(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/progress-album/delete/${id}`);
  }

  // Gestion des documents
  getDocumentsType(): Observable<DocumentTypesResponse> {
    return this.http.get<DocumentTypesResponse>(`${this.baseUrl}/documents/types`);
  }
  updateIndicator(indicatorId: number, progressPercentage: number): Observable<IndicatorUpdateResponse> {
    const params = new HttpParams().set('progressPercentage', progressPercentage.toString());
    
    return this.http.put<IndicatorUpdateResponse>(
      `${this.baseUrl}/indicators/update/${indicatorId}`,
      null, // Pas de body pour cette requête
      { params }
    );
  }
  getDocuments(propertyId: number, page: number = 0, size: number = 10): Observable<DocumentsResponse> {
    return this.http.get<DocumentsResponse>(`${this.baseUrl}/documents/property/${propertyId}?page=${page}&size=${size}`);
  }

  saveDocument(document: CreateDocumentRequest): Observable<Document> {
    return this.http.post<Document>(`${this.baseUrl}/documents/add`, document);
  }

  // Nouvelles méthodes pour les signalements
  getSignalement(propertyId: number, page: number = 0, size: number = 10): Observable<SignalementResponse> {
    return this.http.get<SignalementResponse>(`${this.baseUrl}/incidents?propertyId=${propertyId}&page=${page}&size=${size}`);
  }

  saveSignalement(signalement: CreateSignalementRequest): Observable<Signalement> {
    return this.http.post<Signalement>(`${this.baseUrl}/incidents/save`, signalement);
  }

  deleteSignalement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/incidents/${id}`);
  }
}