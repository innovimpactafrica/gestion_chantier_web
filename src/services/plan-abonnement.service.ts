import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Interfaces pour le typage des réponses
export interface SubscriptionPlan {
  id: number;
  name: string;
  label: string;
  description: string;
  totalCost: number;
  installmentCount: number;
  projectLimit: number;
  unlimitedProjects: boolean;
  yearlyDiscountRate: number;
  active: boolean;
}

export interface Subscription {
  id: number;
  subscriptionPlan: SubscriptionPlan;
  startDate: number[];
  endDate: number[];
  active: boolean;
  paidAmount: number;
  installmentCount: number;
  dateInvoice: number[];
  status: string;
  renewed: boolean;
  currentProjectCount: number;
  remainingProjects: number;
  properties: any[];
}

export interface CreatePlanRequest {
  id: number;
  name: string;
  label: string;
  description: string;
  totalCost: number;
  installmentCount: number;
  projectLimit: number;
  unlimitedProjects: boolean;
  yearlyDiscountRate: number;
  active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PlanAbonnementService {
  private baseUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
  }

  /**
   * Récupère tous les abonnements
   */
  getAbonnements(): Observable<Subscription[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscriptions`;
    
    
    return this.http.get<Subscription[]>(url, { headers })
      .pipe(
        tap(abonnements => {
        }),
        catchError(error => this.handleError(error, 'getAbonnements'))
      );
  }

  /**
   * Récupère un plan d'abonnement par son ID
   */
  getPlanAbonnementById(id: number): Observable<SubscriptionPlan> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans/${id}`;
    
    
    return this.http.get<SubscriptionPlan>(url, { headers })
      .pipe(
        tap(plan => {
        }),
        catchError(error => this.handleError(error, 'getPlanAbonnementById'))
      );
  }

  /**
   * Crée un nouveau plan d'abonnement
   */
  createPlanAbonnement(planData: CreatePlanRequest): Observable<SubscriptionPlan> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans`;
    
    
    return this.http.post<SubscriptionPlan>(url, planData, { headers })
      .pipe(
        tap(newPlan => {
        }),
        catchError(error => this.handleError(error, 'createPlanAbonnement'))
      );
  }

/**
 * Met à jour un plan d'abonnement
 * ✅ CORRECTION: L'endpoint retourne void (pas de corps de réponse)
 */
putPlanAbonnement(id: number, planData: CreatePlanRequest): Observable<void> {
  const headers = this.getAuthHeaders();
  const url = `${this.baseUrl}/subscription-plans/${id}`;
  
  
  return this.http.put<void>(url, planData, { headers })
    .pipe(
      tap(() => {
      }),
      catchError(error => this.handleError(error, 'putPlanAbonnement'))
    );
}

  /**
   * Supprime un plan d'abonnement
   */
  deletePlanAbonnement(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans/${id}`;
    
    
    return this.http.delete(url, { headers })
      .pipe(
        tap(() => {
        }),
        catchError(error => this.handleError(error, 'deletePlanAbonnement'))
      );
  }

  /**
   * Récupère tous les plans d'abonnement actifs
   */
  getAllActivePlans(): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans/active`;
    
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
        }),
        catchError(error => this.handleError(error, 'getAllActivePlans'))
      );
  }

  /**
   * Récupère les plans d'abonnement par nom
   */
  getPlansByName(name: string): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans/name/${name}`;
    
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
        }),
        catchError(error => this.handleError(error, 'getPlansByName'))
      );
  }
  getAllPlans(): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans`;
    
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
        }),
        catchError(error => this.handleError(error, 'getPlansByName'))
      );
  }

  /**
   * Récupère les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    
    if (this.authService && typeof this.authService.getAuthHeaders === 'function') {
      const headers = this.authService.getAuthHeaders();
      const hasAuth = headers.get('Authorization') !== null;
      
      
      if (!hasAuth) {
      }
      
      return headers;
    }
    
    
    const token = this.authService?.getToken() || localStorage.getItem('token');
    
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    
    
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  /**
   * Gestion des erreurs HTTP avec contexte
   */
  private handleError(error: any, context: string = 'unknown'): Observable<never> {
    
    if (error.error) {
    }
    
    let errorMessage = 'Une erreur est survenue';
    let userMessage = errorMessage;
    
    switch (error.status) {
      case 0:
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
        userMessage = 'Problème de connexion au serveur';
        break;
      case 400:
        errorMessage = 'Requête invalide. Vérifiez les données saisies.';
        userMessage = 'Données invalides';
        break;
      case 401:
        errorMessage = 'Non authentifié. Votre session a expiré.';
        userMessage = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 403:
        errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
        userMessage = 'Accès non autorisé';
        break;
      case 404:
        errorMessage = `Ressource non trouvée.`;
        userMessage = 'Plan d\'abonnement introuvable';
        break;
      case 409:
        errorMessage = 'Conflit - Le plan existe déjà.';
        userMessage = 'Un plan avec ce nom existe déjà';
        break;
      case 500:
        errorMessage = 'Erreur serveur interne.';
        userMessage = 'Erreur serveur. Réessayez plus tard.';
        break;
      default:
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Erreur client: ${error.error.message}`;
          userMessage = 'Erreur de connexion';
        } else {
          errorMessage = `Code: ${error.status}, Message: ${error.message}`;
          userMessage = `Erreur ${error.status}`;
        }
    }
    
    
    return throwError(() => ({
      message: errorMessage,
      userMessage: userMessage,
      status: error.status,
      context: context,
      originalError: error
    }));
  }

  /**
   * Formate les données de création de plan
   */
  formatCreatePlanData(
    name: string,
    label: string,
    description: string,
    totalCost: number,
    installmentCount: number,
    projectLimit: number,
    unlimitedProjects: boolean,
    yearlyDiscountRate: number,
    active: boolean = true
  ): CreatePlanRequest {
    return {
      id: 0, // Généré par le backend
      name,
      label,
      description,
      totalCost,
      installmentCount,
      projectLimit,
      unlimitedProjects,
      yearlyDiscountRate,
      active
    };
  }

  /**
   * Debug des endpoints disponibles
   */
  debugEndpoints(): void {
  }
}