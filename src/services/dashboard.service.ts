import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';  // Ajustez le chemin selon votre structure

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
  endDate: number[]; // [year, month, day]
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
  private baseUrl = 'https://wakana.online/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Obtient les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Obtient l'ID de l'utilisateur connecté
   */
  private getCurrentUserId(): number | null {
    const currentUser = this.authService.currentUser();
    return currentUser?.id || null;
  }

  /**
   * Vue d'ensemble des tâches (KPIs)
   * Endpoint: api/tasks/kpis?promoterId={userId}
   */
  vueEnsemble(): Observable<TasksKpi> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    
    return this.http.get<TasksKpi>(`${this.baseUrl}/tasks/kpis`, {
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
    
    return this.http.get<GlobalIndicator>(`${this.baseUrl}/indicators/global`, {
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
    
    return this.http.get<BudgetKpi>(`${this.baseUrl}/budgets/dashboard/kpi`, {
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
    
    return this.http.get<PageableResponse<CriticalMaterial>>(`${this.baseUrl}/materials/critical`, {
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
    
    return this.http.get<PhaseIndicator[]>(`${this.baseUrl}/indicators/by-phase`, {
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
    
    return this.http.get<IncidentStatistic[]>(`${this.baseUrl}/incidents/kpi`, {
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
    
    return this.http.get<CriticalTask[]>(`${this.baseUrl}/tasks/critical`, {
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
    
    return this.http.get<PageableResponse<RecentPhoto>>(`${this.baseUrl}/progress-album/recent`, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Nombre de tâches en retard
   * Endpoint: api/tasks/late/count?promoterId={userId}
   * Retourne directement un nombre
   */
  tacheEnRetard(): Observable<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    
    return this.http.get<number>(`${this.baseUrl}/tasks/late/count`, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Nombre d'incidents des 7 derniers jours
   * Endpoint: api/incidents/count-last-7-days?promoterId={userId}
   * Retourne directement un nombre
   */
  incidents(): Observable<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams().set('promoterId', userId.toString());
    
    return this.http.get<number>(`${this.baseUrl}/incidents/count-last-7-days`, {
      headers: this.getAuthHeaders(),
      params: params
    });
  }

  /**
   * Taux de présence moyen des ouvriers
   * Endpoint: api/workers/manager/{managerId}/precense-rate
   * Retourne directement un nombre (entier)
   */
  presenceMoyenne(): Observable<number> {
    const userId = this.getCurrentUserId();
    if (!userId) {
      throw new Error('Utilisateur non connecté');
    }
    
    return this.http.get<number>(`${this.baseUrl}/workers/manager/${userId}/precense-rate`, {
      headers: this.getAuthHeaders()
    });
  }

  /**
   * Matériaux en alerte (même endpoint que materiauxCritique)
   * Endpoint: api/materials/critical?promoterId={userId}&page=0&size=10
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
   * Méthode utilitaire pour vérifier si l'utilisateur est connecté
   */
  isUserConnected(): boolean {
    return this.getCurrentUserId() !== null;
  }

  /**
   * Méthode utilitaire pour obtenir toutes les données du dashboard en une seule fois
   */
  getAllDashboardData(): Observable<{
    vueEnsemble: TasksKpi;
    tauxMoyenAvancement: GlobalIndicator;
    budget: BudgetKpi;
    materiauxCritique: PageableResponse<CriticalMaterial>;
    etatAvancement: PhaseIndicator[];
    statistiqueSignalement: IncidentStatistic[];
    tacheCritique: CriticalTask[];
    photoRecent: PageableResponse<RecentPhoto>;
    tacheEnRetard: number;
    incidents: number;
    presenceMoyenne: number;
  }> {
    // Cette méthode pourrait utiliser forkJoin pour récupérer toutes les données en parallèle
    // mais nécessiterait l'import de forkJoin depuis rxjs
    throw new Error('Méthode à implémenter avec forkJoin si nécessaire');
  }

  
}