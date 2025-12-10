import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';

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
  private baseUrl = 'https://wakana.online/api';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🔧 PlanAbonnementService initialisé');
  }

  /**
   * Récupère tous les abonnements
   */
  getAbonnements(): Observable<Subscription[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscriptions`;
    
    console.log('📡 API Call: getAbonnements');
    console.log('🔗 URL:', url);
    
    return this.http.get<Subscription[]>(url, { headers })
      .pipe(
        tap(abonnements => {
          console.log('✅ Abonnements récupérés:');
          console.log('  - Nombre d\'abonnements:', abonnements.length);
          console.log('  - Abonnements actifs:', abonnements.filter(a => a.active).length);
          console.log('  - Plans:', abonnements.map(a => a.subscriptionPlan?.name));
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
    
    console.log('📡 API Call: getPlanAbonnementById');
    console.log('🔗 URL:', url);
    console.log('🆔 Plan ID:', id);
    
    return this.http.get<SubscriptionPlan>(url, { headers })
      .pipe(
        tap(plan => {
          console.log('✅ Plan d\'abonnement récupéré:');
          console.log('  - Nom:', plan.name);
          console.log('  - Label:', plan.label);
          console.log('  - Coût total:', plan.totalCost);
          console.log('  - Actif:', plan.active);
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
    
    console.log('📡 API Call: createPlanAbonnement');
    console.log('🔗 URL:', url);
    console.log('📝 Données du plan:', planData);
    
    return this.http.post<SubscriptionPlan>(url, planData, { headers })
      .pipe(
        tap(newPlan => {
          console.log('✅ Plan d\'abonnement créé:');
          console.log('  - ID:', newPlan.id);
          console.log('  - Nom:', newPlan.name);
          console.log('  - Label:', newPlan.label);
        }),
        catchError(error => this.handleError(error, 'createPlanAbonnement'))
      );
  }

  /**
   * Met à jour un plan d'abonnement
   */
  putPlanAbonnement(id: number, planData: Partial<SubscriptionPlan>): Observable<SubscriptionPlan> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans/${id}`;
    
    console.log('📡 API Call: putPlanAbonnement');
    console.log('🔗 URL:', url);
    console.log('🆔 Plan ID:', id);
    console.log('📝 Données à mettre à jour:', planData);
    
    return this.http.put<SubscriptionPlan>(url, planData, { headers })
      .pipe(
        tap(updatedPlan => {
          console.log('✅ Plan d\'abonnement mis à jour:');
          console.log('  - ID:', updatedPlan.id);
          console.log('  - Nom:', updatedPlan.name);
          console.log('  - Label:', updatedPlan.label);
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
    
    console.log('📡 API Call: deletePlanAbonnement');
    console.log('🔗 URL:', url);
    console.log('🆔 Plan ID à supprimer:', id);
    
    return this.http.delete(url, { headers })
      .pipe(
        tap(() => {
          console.log('✅ Plan d\'abonnement supprimé avec succès');
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
    
    console.log('📡 API Call: getAllActivePlans');
    console.log('🔗 URL:', url);
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
          console.log('✅ Plans actifs récupérés:');
          console.log('  - Nombre de plans actifs:', plans.length);
          console.log('  - Plans:', plans.map(p => p.name));
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
    
    console.log('📡 API Call: getPlansByName');
    console.log('🔗 URL:', url);
    console.log('🔍 Nom recherché:', name);
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
          console.log('✅ Plans par nom récupérés:');
          console.log('  - Nombre de plans:', plans.length);
          console.log('  - Plans:', plans.map(p => p.label));
        }),
        catchError(error => this.handleError(error, 'getPlansByName'))
      );
  }
  getAllPlans(): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/subscription-plans`;
    
    console.log('📡 API Call: getPlansByName');
    console.log('🔗 URL:', url);
    console.log('🔍 Nom recherché:', name);
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
          console.log('✅ Plans par nom récupérés:');
          console.log('  - Nombre de plans:', plans.length);
          console.log('  - Plans:', plans.map(p => p.label));
        }),
        catchError(error => this.handleError(error, 'getPlansByName'))
      );
  }

  /**
   * Récupère les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    console.log('🔑 Récupération des headers d\'authentification...');
    
    if (this.authService && typeof this.authService.getAuthHeaders === 'function') {
      const headers = this.authService.getAuthHeaders();
      const hasAuth = headers.get('Authorization') !== null;
      
      console.log('🔑 Headers depuis AuthService:', hasAuth ? '✅ OK' : '❌ Manquant');
      
      if (!hasAuth) {
        console.warn('⚠️ Aucun header Authorization trouvé!');
      }
      
      return headers;
    }
    
    console.warn('⚠️ AuthService.getAuthHeaders() non disponible, utilisation du fallback');
    
    const token = this.authService?.getToken() || localStorage.getItem('token');
    
    if (token) {
      console.log('🔑 Token trouvé:', token.substring(0, 20) + '...');
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    
    console.error('❌ Aucun token d\'authentification trouvé!');
    
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  /**
   * Gestion des erreurs HTTP avec contexte
   */
  private handleError(error: any, context: string = 'unknown'): Observable<never> {
    console.error(`❌ Erreur dans PlanAbonnementService.${context}:`, error);
    console.error('❌ Status:', error.status);
    console.error('❌ Status Text:', error.statusText);
    console.error('❌ URL:', error.url);
    console.error('❌ Message:', error.message);
    
    if (error.error) {
      console.error('❌ Error body:', error.error);
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
    
    console.error('💬 Message utilisateur:', userMessage);
    
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
    console.log('🔍 === PLAN ABONNEMENT SERVICE ENDPOINTS ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Endpoints disponibles:');
    console.log('  - getAbonnements: GET', `${this.baseUrl}/subscriptions`);
    console.log('  - getPlanAbonnementById: GET', `${this.baseUrl}/subscription-plans/{id}`);
    console.log('  - createPlanAbonnement: POST', `${this.baseUrl}/subscription-plans`);
    console.log('  - putPlanAbonnement: PUT', `${this.baseUrl}/subscription-plans/{id}`);
    console.log('  - deletePlanAbonnement: DELETE', `${this.baseUrl}/subscription-plans/{id}`);
    console.log('  - getAllActivePlans: GET', `${this.baseUrl}/subscription-plans/active`);
    console.log('  - getPlansByName: GET', `${this.baseUrl}/subscription-plans/name/{name}`);
    console.log('========================');
  }
}