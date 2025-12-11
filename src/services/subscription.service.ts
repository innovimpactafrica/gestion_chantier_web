import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Déclaration de la fonction OneTouch pour TypeScript
declare function sendPaymentInfos(
  orderNumber: string,
  agencyCode: string,
  secureCode: string,
  domainName: string,
  successUrl: string,
  failedUrl: string,
  amount: number,
  city: string,
  email: string,
  clientFirstName: string,
  clientLastName: string,
  clientPhone: string
): void;

// Interfaces pour le typage
export interface Invoice {
  id: number;
  invoiceNumber: string;
  createdAt: string;
  amount: number;
  planLabel: string;
  startDate: string;
  endDate: string;
  paid: boolean;
  user?: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    telephone: string;
    adress: string;
    company?: {
      name: string;
      logo: string;
    };
  };
  subscriptionPlan?: {
    name: string;
    label: string;
    description: string;
    startDate: string;
    endDate: string;
    totalCost: number;
    installmentCount: number;
    projectLimit: number;
  };
  subscription?: {
    startDate: string;
    endDate: string;
    paidAmount: number;
    installmentCount: number;
  };
}

export interface InvoiceResponse {
  content: Invoice[];
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

export interface SubscriptionPlan {
  id: number;
  name: string;
  label: string;
  description: string;
  totalCost: number;
  startDate: string;
  endDate: string;
  installmentCount: number;
  projectLimit: number;
  unlimitedProjects: boolean;
  yearlyDiscountRate: number;
  active: boolean;
}

export interface UserSubscription {
  id: number;
  user: {
    id: number;
    nom: string;
    prenom: string;
    email: string;
    // autres propriétés utilisateur...
  };
  subscriptionPlan: SubscriptionPlan;
  startDate: string; // Format: "YYYY-MM-DD"
  endDate: string;   // Format: "YYYY-MM-DD"
  active: boolean;
  paidAmount: number;
  installmentCount: number;
  dateInvoice: string;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED'; // Ajustez selon vos statuts
  renewed: boolean;
  currentProjectCount: number;
  remainingProjects: number;
  createdAt?: string;
  properties?: any[]; // Ou définissez une interface Property si nécessaire
}

export interface CreateSubscriptionParams {
  userId: number;
  planId: number;
  months: number;
  num_transaction_from_gu?: string;
  num_command?: string;
  amount?: number;
  errorCode?: string;
}

export interface CreateSubscriptionResponse {
  id: number;
  userId: number;
  planId: number;
  months: number;
  status: string;
  message?: string;
}

export interface OneTouchConfig {
  agencyCode: string;
  secureCode: string;
  domainName: string;
}

@Injectable({
  providedIn: 'root'
})
export class SubscriptionService {
  private baseUrl = 'https://wakana.online/api/subscriptions';
  private planBaseUrl = 'https://wakana.online/api/subscription-plans';
  
  // Configuration OneTouch
  private oneTouchConfig: OneTouchConfig = {
    agencyCode: 'SOLI26685',
    secureCode: 'SJeOJiLKfP2FUHWgTEzhX8Y0km36CwGkbJQTKdplZM3QORfQ6m',
    domainName: 'solimus.net'
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🔧 SubscriptionService initialisé');
    this.checkOneTouchScript();
  }

  /**
   * Vérifie si le script OneTouch est chargé
   */
  private checkOneTouchScript(): void {
    if (typeof sendPaymentInfos === 'function') {
      console.log('✅ Script OneTouch chargé avec succès');
    } else {
      console.warn('⚠️ Script OneTouch non détecté au démarrage du service');
      console.warn('Le script sera vérifié à nouveau lors du premier appel de paiement');
    }
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif
   */
  seeActive(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/is-active/${userId}`;
    
    console.log('📡 API Call: seeActive');
    console.log('🔗 URL:', url);
    console.log('👤 UserId:', userId);
    
    return this.http.get<boolean>(url, { headers })
      .pipe(
        tap(isActive => console.log('✅ Is Active:', isActive)),
        catchError(error => this.handleError(error, 'seeActive'))
      );
  }
  
/**
 * Récupère une facture par son ID
 */
getFactureById(invoiceId: number, userId: number): Observable<Invoice> {
  const headers = this.getAuthHeaders();
  const url = `${this.baseUrl}/invoices/${userId}/${invoiceId}`;
  
  console.log('📡 API Call: getFactureById');
  console.log('🔗 URL:', url);
  console.log('🧾 InvoiceId:', invoiceId);

  return this.http.get<Invoice>(url, { headers })
    .pipe(
      tap(invoice => {
        console.log('✅ Facture récupérée:', invoice);
      }),
      catchError(error => this.handleError(error, 'getFactureById'))
    );
}
  /**
   * Vérifie si l'utilisateur peut créer un projet
   */
  canCreateProject(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/can-create-project/${userId}`;
    
    return this.http.get<boolean>(url, { headers })
      .pipe(
        tap(canCreate => console.log('✅ Can Create Project:', canCreate)),
        catchError(error => this.handleError(error, 'canCreateProject'))
      );
  }

  /**
   * Récupère les factures de l'utilisateur avec pagination
   */
  getFactures(userId: number, page: number = 0, size: number = 10): Observable<InvoiceResponse> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const url = `${this.baseUrl}/invoices/${userId}`;
    
    console.log('📡 API Call: getFactures');
    console.log('🔗 URL:', url);
    console.log('👤 UserId:', userId);
    console.log('📄 Page:', page);
    console.log('📊 Size:', size);

    return this.http.get<InvoiceResponse>(url, { headers, params })
      .pipe(
        tap(response => {
          console.log('✅ Factures récupérées:');
          console.log('  - Total elements:', response.totalElements);
          console.log('  - Total pages:', response.totalPages);
          console.log('  - Current page:', response.number);
          console.log('  - Items:', response.content.length);
        }),
        catchError(error => this.handleError(error, 'getFactures'))
      );
  }

  /**
   * Récupère les plans d'abonnement par profil
   */
  getPlanSubscription(name: string): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.planBaseUrl}/name/${name}`;
    
    console.log('📡 API Call: getPlanSubscription');
    console.log('🔗 URL complète:', url);
    console.log('👔 Profil:', name);
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => {
          console.log('✅ Plans d\'abonnement récupérés:');
          console.log('  - Nombre de plans:', plans.length);
          console.log('  - Plans:', plans.map(p => ({
            id: p.id,
            name: p.name,
            label: p.label,
            totalCost: p.totalCost
          })));
        }),
        catchError(error => this.handleError(error, 'getPlanSubscription'))
      );
  }

  /**
   * Récupère tous les plans actifs
   */
  getAllActivePlans(): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.planBaseUrl}/active`;
    
    console.log('📡 API Call: getAllActivePlans');
    console.log('🔗 URL:', url);
    
    return this.http.get<SubscriptionPlan[]>(url, { headers })
      .pipe(
        tap(plans => console.log('✅ Plans actifs récupérés:', plans.length)),
        catchError(error => this.handleError(error, 'getAllActivePlans'))
      );
  }

  /**
   * Récupère un plan par son ID
   */
  getPlanById(planId: number): Observable<SubscriptionPlan> {
    const headers = this.getAuthHeaders();
    const url = `${this.planBaseUrl}/${planId}`;
    
    console.log('📡 API Call: getPlanById');
    console.log('🔗 URL:', url);
    console.log('🆔 Plan ID:', planId);
    
    return this.http.get<SubscriptionPlan>(url, { headers })
      .pipe(
        tap(plan => console.log('✅ Plan récupéré:', plan)),
        catchError(error => this.handleError(error, 'getPlanById'))
      );
  }
/**
 * Récupère l'abonnement d'un utilisateur par son ID
 */
getSubscriptionByUser(userId: number): Observable<UserSubscription> {
  const headers = this.getAuthHeaders();
  const url = `${this.baseUrl}/user/${userId}`;
  
  console.log('📡 API Call: getSubscriptionByUser');
  console.log('🔗 URL:', url);
  console.log('👤 UserId:', userId);
  
  return this.http.get<UserSubscription>(url, { headers })
    .pipe(
      tap(subscription => {
        console.log('✅ Abonnement utilisateur récupéré:');
        console.log('  - ID Abonnement:', subscription.id);
        console.log('  - Plan:', subscription.subscriptionPlan?.name);
        console.log('  - Date création:', subscription.createdAt);
        
      }),
      catchError(error => this.handleError(error, 'getSubscriptionByUser'))
    );
}
  /**
   * Crée un abonnement pour un utilisateur
   */
  createSubscription(params: CreateSubscriptionParams): Observable<CreateSubscriptionResponse> {
    const headers = this.getAuthHeaders();
    
    let httpParams = new HttpParams();
    if (params.num_transaction_from_gu) {
      httpParams = httpParams.set('num_transaction_from_gu', params.num_transaction_from_gu);
    }
    if (params.num_command) {
      httpParams = httpParams.set('num_command', params.num_command);
    }
    if (params.amount) {
      httpParams = httpParams.set('amount', params.amount.toString());
    }
    if (params.errorCode) {
      httpParams = httpParams.set('errorCode', params.errorCode);
    }

    const url = `${this.baseUrl}/create/${params.userId}/${params.planId}/${params.months}`;
    
    console.log('📡 API Call: createSubscription');
    console.log('🔗 URL:', url);
    console.log('👤 UserId:', params.userId);
    console.log('🎫 PlanId:', params.planId);
    console.log('📅 Months:', params.months);
    
    return this.http.get<CreateSubscriptionResponse>(url, { headers, params: httpParams })
      .pipe(
        tap(response => {
          console.log('✅ Abonnement créé avec succès:', response);
        }),
        catchError(error => this.handleError(error, 'createSubscription'))
      );
  }

  /**
   * ✨ NOUVELLE MÉTHODE : Construit l'URL de callback après paiement
   */
  private buildCallbackUrl(userId: number, planId: number, months: number): string {
    const baseUrl = window.location.origin;
    
    // URL de succès : redirige vers /mon-compte avec les paramètres de paiement
    const successUrl = `${baseUrl}/#/mon-compte?payment=success&userId=${userId}&planId=${planId}&months=${months}`;
    
    console.log('🔗 URL de succès construite:', successUrl);
    
    return successUrl;
  }

  /**
   * ✨ MODIFIÉ : Lance le processus de paiement OneTouch avec redirection vers /mon-compte
   */
  callTouchPay(
    amount: number,
    email: string,
    clientFirstName: string,
    clientLastName: string,
    clientPhone: string,
    userId: number,
    planId: number,
    months: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Vérification que la fonction sendPaymentInfos existe
      if (typeof sendPaymentInfos !== 'function') {
        const errorMsg = 'Le système de paiement OneTouch n\'est pas chargé. Veuillez rafraîchir la page et réessayer.';
        console.error('💡 Solution: Assurez-vous que le script OneTouch est bien inclus dans index.html');
        console.error('💡 URL du script: https://test.solinusteam.com/Scripts/form.js');
        reject(new Error(errorMsg));
        return;
      }

      const currentOrigin = window.location.origin;
      const orderNumber = new Date().getTime().toString();
      
      // ✨ MODIFICATION : URLs de redirection vers /mon-compte
      const successUrl = `${this.baseUrl}/create/${userId}/${planId}/${months}?redirect=${encodeURIComponent(`${currentOrigin}/#/mon-compte?payment=success&userId=${userId}&planId=${planId}&months=${months}`)}`;
      const failedUrl = `${currentOrigin}/#/mon-compte?payment=failed&userId=${userId}&planId=${planId}`;

      console.log('💳 Paramètres de paiement OneTouch:');
      console.log('  - Order Number:', orderNumber);
      console.log('  - Amount:', amount);
      console.log('  - Success URL:', successUrl);
      console.log('  - Failed URL:', failedUrl);

      try {
        // Appel de la fonction OneTouch
        sendPaymentInfos(
          orderNumber,
          this.oneTouchConfig.agencyCode,
          this.oneTouchConfig.secureCode,
          this.oneTouchConfig.domainName,
          successUrl,
          failedUrl,
          10,
          'Dakar',
          email,
          clientFirstName,
          clientLastName,
          clientPhone
        );
        
        console.log('✅ Redirection vers OneTouch en cours...');
        resolve();
      } catch (error) {
        console.error('❌ Erreur lors du lancement de OneTouch:', error);
        reject(error);
      }
    });
  }

  /**
   * ✨ MODIFIÉ : Méthode simplifiée pour initier un paiement d'abonnement
   */
  async initiateSubscriptionPayment(
    user: any,
    plan: SubscriptionPlan,
    isYearly: boolean
  ): Promise<void> {
    console.log('🚀 Initiation du paiement d\'abonnement');
    console.log('👤 Utilisateur:', user.id, user.email);
    console.log('📦 Plan:', plan.id, plan.label);
    console.log('📅 Type:', isYearly ? 'Annuel' : 'Mensuel');

    // Calcul du montant et des mois
    const months = isYearly ? 12 : 1;
    let amount = plan.totalCost;
    
    if (isYearly && plan.yearlyDiscountRate > 0) {
      const yearlyPrice = plan.totalCost * 12;
      const discount = yearlyPrice * (plan.yearlyDiscountRate / 100);
      amount = yearlyPrice - discount;
    } else if (isYearly) {
      amount = plan.totalCost * 12;
    }

    console.log('💰 Montant calculé:', amount);
    console.log('📅 Nombre de mois:', months);

    // Validation des données utilisateur
    if (!user.email || !user.prenom || !user.nom || !user.telephone) {
      const errorMsg = 'Vos informations de profil sont incomplètes. Veuillez compléter votre profil avant de souscrire.';
      console.error('❌', errorMsg);
      throw new Error(errorMsg);
    }

    // Lancement du paiement OneTouch
    try {
      await this.callTouchPay(
        amount,
        user.email,
        user.prenom,
        user.nom,
        user.telephone,
        user.id,
        plan.id,
        months
      );
    } catch (error) {
      console.error('❌ Erreur lors de l\'initiation du paiement:', error);
      throw error;
    }
  }

  /**
   * Récupère les headers d'authentification avec validation
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
    console.error(`❌ Erreur dans SubscriptionService.${context}:`, error);
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
        errorMessage = 'Requête invalide. Vérifiez les paramètres.';
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
        errorMessage = `Ressource non trouvée pour le profil spécifié.`;
        userMessage = 'Aucune donnée trouvée';
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
   * Debug des endpoints disponibles
   */
  debugEndpoints(): void {
    console.log('🔍 === DEBUG ENDPOINTS ===');
    console.log('Base URL Subscriptions:', this.baseUrl);
    console.log('Base URL Plans:', this.planBaseUrl);
    console.log('Endpoints disponibles:');
    console.log('  - seeActive: GET', `${this.baseUrl}/is-active/{userId}`);
    console.log('  - canCreateProject: GET', `${this.baseUrl}/can-create-project/{userId}`);
    console.log('  - getFactures: GET', `${this.baseUrl}/invoices/{userId}?page=0&size=10`);
    console.log('  - getPlanSubscription: GET', `${this.planBaseUrl}/name/{name}`);
    console.log('  - getAllActivePlans: GET', `${this.planBaseUrl}/active`);
    console.log('  - getPlanById: GET', `${this.planBaseUrl}/{id}`);
    console.log('  - createSubscription: GET', `${this.baseUrl}/create/{userId}/{planId}/{months}`);
    console.log('OneTouch Script:', typeof sendPaymentInfos === 'function' ? '✅ Chargé' : '❌ Non chargé');
    console.log('========================');
  }
}