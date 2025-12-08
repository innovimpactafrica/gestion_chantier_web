import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Interfaces pour les types de retour des APIs
export interface TasksKpi {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface GlobalIndicator {
  averageProgressPercentage: number;
}

export interface BudgetKpi {
  totalPlanned: number;
  totalConsumed: number;
  totalRemaining: number;
  consumedPercentage: number;
  remainingPercentage: number;
}

export interface CriticalMaterial {
  property: any;
  unit: any;
  id: number;
  label: string;
  quantity: number;
  criticalThreshold: number;
  unitName: string;
  propertyName: string;
  statusLabel: string;
  color: string;
}

export interface PageableResponse<T> {
  content: T[];
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

export interface PhaseIndicator {
  phaseName: string;
  averageProgressPercentage: number;
}

export interface IncidentStatistic {
  date: string;
  count: number;
  statusLabel: string;
  color: string;
}

export interface CriticalTask {
  id: number;
  endDate: number[];
  title: string;
  status: string;
  priority: string;
  color: string;
  statusLabel: string;
}

export interface RecentPhoto {
  id: number;
  realEstateProperty: any;
  phaseName: string;
  description: string;
  lastUpdated: number[];
  pictures: string[];
  entrance: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  // ✅ Utilisation de l'environment pour les URLs
  private readonly baseUrl = environment.apiUrl;
  private readonly endpoints = {
    tasks: environment.endpoints.tasks,
    indicators: environment.endpoints.indicators,
    budgets: environment.endpoints.budgets,
    materials: environment.endpoints.materials,
    incidents: environment.endpoints.incidents,
    progressAlbum: environment.endpoints.progressAlbum,
    workers: environment.endpoints.workers
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🔧 DashboardService initialisé');
    console.log('📍 Base URL:', this.baseUrl);
    console.log('📍 Endpoints configurés:', this.endpoints);
  }

  /**
   * Obtient les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    
    if (!token) {
      console.error('❌ Aucun token disponible pour DashboardService');
    }
    
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Récupère l'ID de l'utilisateur connecté
   */
  private getCurrentUserId(): number | null {
    const currentUser = this.authService.currentUser();
    console.log('👤 Current user from auth service:', currentUser);
    return currentUser?.id || null;
  }

  /**
   * Vérifie si un utilisateur est connecté
   */
  isUserConnected(): boolean {
    const token = this.authService.getToken();
    const hasToken = !!token;
    const hasUser = !!this.authService.currentUser();
    
    console.log('🔍 Token exists:', hasToken);
    console.log('🔍 User exists:', hasUser);
    
    return hasToken && hasUser;
  }

  /**
   * Vue d'ensemble des tâches (KPIs)
   * Endpoint: api/tasks/kpis?promoterId={userId}
   */
  vueEnsemble(): Observable<TasksKpi> {
    const userId = this.getCurrentUserId();
    console.log('📊 vueEnsemble - utilisateur:', userId);
    
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.tasks}/kpis`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<TasksKpi>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Taux moyen d'avancement global
   * Endpoint: api/indicators/global?promoterId={userId}
   */
  tauxMoyenAvancement(): Observable<GlobalIndicator> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.indicators}/global`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<GlobalIndicator>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Informations sur le budget
   * Endpoint: api/budgets/dashboard/kpi?promoterId={userId}
   */
  getBudget(): Observable<BudgetKpi> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.budgets}/dashboard/kpi`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<BudgetKpi>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Matériaux critiques
   * Endpoint: api/materials/critical?promoterId={userId}&page=0&size=10
   */
  materiauxCritique(page: number = 0, size: number = 10): Observable<PageableResponse<CriticalMaterial>> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams()
      .set('promoterId', userId.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    
    const url = `${this.endpoints.materials}/critical`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<PageableResponse<CriticalMaterial>>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * État d'avancement par phase
   * Endpoint: api/indicators/by-phase?promoterId={userId}
   */
  etatAvancement(): Observable<PhaseIndicator[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.indicators}/by-phase`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<PhaseIndicator[]>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Statistiques de signalement d'incidents
   * Endpoint: api/incidents/kpi?promoterId={userId}
   */
  statistiqueDeSignalement(): Observable<IncidentStatistic[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.incidents}/kpi`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<IncidentStatistic[]>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Tâches critiques
   * Endpoint: api/tasks/critical?promoterId={userId}
   */
  tacheCritique(): Observable<CriticalTask[]> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.tasks}/critical`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<CriticalTask[]>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Photos récentes de l'album de progression
   * Endpoint: api/progress-album/recent?promoterId={userId}&page=0&size=10
   */
  photoRecent(page: number = 0, size: number = 10): Observable<PageableResponse<RecentPhoto>> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams()
      .set('promoterId', userId.toString())
      .set('page', page.toString())
      .set('size', size.toString());
    
    const url = `${this.endpoints.progressAlbum}/recent`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<PageableResponse<RecentPhoto>>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Nombre de tâches en retard
   * Endpoint: api/tasks/late/count?promoterId={userId}
   */
  tacheEnRetard(): Observable<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.tasks}/late/count`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<number>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Nombre d'incidents des 7 derniers jours
   * Endpoint: api/incidents/count-last-7-days?promoterId={userId}
   */
  incidents(): Observable<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    const url = `${this.endpoints.incidents}/count-last-7-days`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<number>(url, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Taux de présence moyen des ouvriers
   * Endpoint: api/workers/manager/{managerId}/precense-rate
   */
  presenceMoyenne(): Observable<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }
    
    const url = `${this.endpoints.workers}/manager/${userId}/precense-rate`;
    
    console.log('📡 Appel API:', url);
    
    return this.http.get<number>(url, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Matériaux en alerte (alias de materiauxCritique)
   */
  materiauxEnAlerte(page: number = 0, size: number = 10): Observable<PageableResponse<CriticalMaterial>> {
    return this.materiauxCritique(page, size);
  }

  /**
   * Méthode utilitaire pour formater les dates de type number[]
   */
  formatDate(dateArray: number[]): Date {
    if (!dateArray || dateArray.length < 3) {
      return new Date();
    }
    
    const [year, month, day, hour = 0, minute = 0, second = 0] = dateArray;
    return new Date(year, month - 1, day, hour, minute, second);
  }

  /**
   * Méthode de debug pour afficher la configuration
   */
  debugConfiguration(): void {
    console.log('=== DASHBOARD SERVICE DEBUG ===');
    console.log('🔧 Environment:', environment.production ? 'PRODUCTION' : 'DEVELOPMENT');
    console.log('📍 Base URL:', this.baseUrl);
    console.log('📍 Endpoints:');
    Object.entries(this.endpoints).forEach(([key, value]) => {
      console.log(`  - ${key}: ${value}`);
    });
    console.log('👤 User ID:', this.getCurrentUserId());
    console.log('🔑 Has Token:', !!this.authService.getToken());
    console.log('================================');
  }
}