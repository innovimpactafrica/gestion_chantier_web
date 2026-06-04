import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../features/auth/services/auth.service';

export interface TasksKPIs {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  overdueTasks: number;
}

export interface PropertyIndicator {
  id: number;
  phaseName: string;
  progressPercentage: number;
  lastUpdated: string;
}

export interface BudgetKpiResponse {
  totalPlanned: number;
  totalConsumed: number;
  totalRemaining: number;
  consumedPercentage: number;
  remainingPercentage: number;
}

export interface Task {
  id: number;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: string;
  dueDate?: string;
  promoterId: number;
  realEstatePropertyId: number;
}

export interface TasksResponse {
  tasks: Task[];
  total: number;
}


@Injectable({
  providedIn: 'root'
})
export class DahsboardService {

  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  getTasksKPIs(realEstatePropertyId: number, promoterId: number): Observable<any> {
    const url = `${this.baseUrl}/tasks/kpis?realEstatePropertyId=${realEstatePropertyId}&promoterId=${promoterId}`;
    return this.http.get<any>(url).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getUserProperties(promoterId: number): Observable<any[]> {
    const url = `${this.baseUrl}/properties?promoterId=${promoterId}`;
    return this.http.get<any[]>(url).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getGlobalIndicators(): Observable<any> {
    return this.authService.getCurrentUser().pipe(
      switchMap(user => {
        if (!user || !user.id) {
          return throwError(() => new Error("Impossible de récupérer l'ID du promoteur connecté."));
        }
        const url = `${this.baseUrl}/indicators/global?promoterId=${user.id}`;
        return this.http.get<any>(url);
      }),
      catchError(error => throwError(() => error))
    );
  }

  getPropertyIndicators(propertyId: number): Observable<PropertyIndicator[]> {
    return this.http.get<PropertyIndicator[]>(`${this.baseUrl}/indicators/property/${propertyId}`);
  }

  getBudgetDashboardKpiWithParams(
    propertyId: number,
    promoterId: number,
    additionalParams?: { [key: string]: string | number }
  ): Observable<BudgetKpiResponse> {
    let params = new HttpParams()
      .set('propertyId', propertyId.toString())
      .set('promoterId', promoterId.toString());

    if (additionalParams) {
      Object.keys(additionalParams).forEach(key => {
        params = params.set(key, additionalParams[key].toString());
      });
    }

    return this.http.get<BudgetKpiResponse>(`${this.baseUrl}/budgets/dashboard/kpi`, { params })
      .pipe(catchError(error => throwError(() => error)));
  }

  getCriticalMaterials(promoterId: number, page: number = 0, size: number = 10): Observable<any> {
    if (!promoterId) {
      return throwError(() => new Error('ID promoteur manquant'));
    }

    const params = new HttpParams()
      .set('promoterId', promoterId)
      .set('page', page)
      .set('size', size);

    return this.http.get<any>(`${this.baseUrl}/materials/critical`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getIncidentsKpi(promoterId: number): Observable<any> {
    if (!promoterId) {
      return throwError(() => new Error('ID promoteur manquant'));
    }

    const params = new HttpParams().set('promoterId', promoterId);
    return this.http.get<any>(`${this.baseUrl}/incidents/kpi`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }

  getRecentProgressAlbums(promoterId: number, page: number = 0, size: number = 10): Observable<any> {
    const params = new HttpParams()
      .set('promoterId', promoterId.toString())
      .set('page', page)
      .set('size', size);

    return this.http.get<any>(`${this.baseUrl}/progress-album/recent`, { params }).pipe(
      catchError(error => throwError(() => error))
    );
  }
}
