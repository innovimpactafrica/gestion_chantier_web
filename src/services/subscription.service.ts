import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Déclaration de la fonction OneTouch pour TypeScript
declare function sendPaymentInfos(
  orderNumber: number,
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
  clientPhone: string,
): void;

// Interfaces pour le typage
export interface Invoice {
  id: number;
  invoiceNumber: string;
  amount: number;
  createdAt: string;
  paid: boolean;
  paymentMethod: string;
  planLabel: string;
  userName: string;
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
  installmentCount: number;
  projectLimit: number;
  unlimitedProjects: boolean;
  yearlyDiscountRate: number;
  active: boolean;
  targetProfiles?: string[]; // Profils cibles pour ce plan (optionnel)
}

export interface UserSubscription {
  id: number;
  user: {
    id: number;
  };
  subscriptionPlan: SubscriptionPlan;
  createdAt: string;
  endDate: string;
  startDate: string;
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
  successUrl: string;  
  errorUrl: string;   
}

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private baseUrl = `${environment.apiUrl}/subscriptions`;
  private planBaseUrl = `${environment.apiUrl}/subscription-plans`;

  // Configuration OneTouch
  private oneTouchConfig: OneTouchConfig = {
    agencyCode: 'INIMA27104',
    secureCode: 'idZnfqdG2BZxmKsHRLnQI5ZYY5vESgsNtPcYypZy8Bm72FQcxe',
    domainName: 'https://btp.innovimpactdev.cloud/',
    successUrl:
      'https://kairosdev.sensoft-labs.com/kairos_dev/portailEtudiant/touchPaySuccess',
    errorUrl:
      'https://kairosdev.sensoft-labs.com/kairos_dev/portailEtudiant/touchPayError',
  };

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {
    this.checkOneTouchScript();
  }

  /**
   * Vérifie si le script OneTouch est chargé
   */
  private checkOneTouchScript(): void {
    if (typeof sendPaymentInfos === 'function') {
    }
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif
   */
  seeActive(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/is-active/${userId}`;


    return this.http.get<boolean>(url, { headers }).pipe(
      catchError((error) => this.handleError(error, 'seeActive')),
    );
  }

  /**
   * Vérifie si l'utilisateur peut créer un projet
   */
  canCreateProject(userId: number): Observable<boolean> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/can-create-project/${userId}`;

    return this.http.get<boolean>(url, { headers }).pipe(
      catchError((error) => this.handleError(error, 'canCreateProject')),
    );
  }

  /**
   * Récupère les factures de l'utilisateur avec pagination
   */
  getFactures(
    userId: number,
    page: number = 0,
    size: number = 10,
  ): Observable<InvoiceResponse> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const url = `${this.baseUrl}/invoices/${userId}`;


    return this.http.get<InvoiceResponse>(url, { headers, params }).pipe(
      tap((response) => {
      }),
      catchError((error) => this.handleError(error, 'getFactures')),
    );
  }

  /**
   * Récupère les plans d'abonnement par profil
   */
  getPlanSubscription(name: string): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.planBaseUrl}/name/${name}`;


    return this.http.get<SubscriptionPlan[]>(url, { headers }).pipe(
      tap((plans) => {
      }),
      catchError((error) => this.handleError(error, 'getPlanSubscription')),
    );
  }

  /**
   * Récupère tous les plans actifs
   */
  getAllActivePlans(): Observable<SubscriptionPlan[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.planBaseUrl}/active`;


    return this.http.get<SubscriptionPlan[]>(url, { headers }).pipe(
      catchError((error) => this.handleError(error, 'getAllActivePlans')),
    );
  }

  /**
   * Récupère les plans actifs filtrés par profil utilisateur
   */
  getPlansByProfile(profile: string): Observable<SubscriptionPlan[]> {

    return this.getAllActivePlans().pipe(
      map((plans) => {

        // Filtrer les plans par nom qui contient le profil
        const filteredPlans = plans.filter((plan) => {
          const planName = plan.name?.toUpperCase() || '';
          const profileUpper = profile.toUpperCase();

          // Vérifier si le nom du plan contient le profil
          const matchesByName = planName.includes(profileUpper);

          // Vérifier aussi targetProfiles si disponible
          const matchesByTargetProfiles =
            plan.targetProfiles && plan.targetProfiles.includes(profile);

          const matches = matchesByName || matchesByTargetProfiles;

          if (matches) {
          }

          return matches;
        });

        return filteredPlans;
      }),
      catchError((error) => this.handleError(error, 'getPlansByProfile')),
    );
  }

  /**
   * Récupère un plan par son ID
   */
  getPlanById(planId: number): Observable<SubscriptionPlan> {
    const headers = this.getAuthHeaders();
    const url = `${this.planBaseUrl}/${planId}`;


    return this.http.get<SubscriptionPlan>(url, { headers }).pipe(
      catchError((error) => this.handleError(error, 'getPlanById')),
    );
  }

  /**
   * Récupère l'abonnement d'un utilisateur par son ID
   */
  getSubscriptionByUser(userId: number): Observable<UserSubscription> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/user/${userId}`;


    return this.http.get<UserSubscription>(url, { headers }).pipe(
      catchError((error) => this.handleError(error, 'getSubscriptionByUser')),
    );
  }

  getSubscriptionsByProfile(profile: string): Observable<UserSubscription[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/profile/${profile}`;


    return this.http.get<UserSubscription[]>(url, { headers }).pipe(
      tap((subscriptions) => {
        subscriptions.forEach((sub, index) => {
        });
      }),
      catchError((error) =>
        this.handleError(error, 'getSubscriptionsByProfile'),
      ),
    );
  }

  /**
   * Crée un abonnement pour un utilisateur
   */
  createSubscription(
    params: CreateSubscriptionParams,
  ): Observable<CreateSubscriptionResponse> {
    const headers = this.getAuthHeaders();

    let httpParams = new HttpParams();
    if (params.num_transaction_from_gu) {
      httpParams = httpParams.set(
        'num_transaction_from_gu',
        params.num_transaction_from_gu,
      );
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


    return this.http
      .get<CreateSubscriptionResponse>(url, { headers, params: httpParams })
      .pipe(
        tap((response) => {
        }),
        catchError((error) => this.handleError(error, 'createSubscription')),
      );
  }

  /**
   * ✨ NOUVELLE MÉTHODE : Construit l'URL de callback après paiement
   */
  private buildCallbackUrl(
    userId: number,
    planId: number,
    months: number,
  ): string {
    const baseUrl = window.location.origin;

    // URL de succès : redirige vers /mon-compte avec les paramètres de paiement
    const successUrl = `${baseUrl}/#/mon-compte?payment=success&userId=${userId}&planId=${planId}&months=${months}`;


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
    months: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      // Vérification que la fonction sendPaymentInfos existe
      if (typeof sendPaymentInfos !== 'function') {
        const errorMsg =
          "Le système de paiement OneTouch n'est pas chargé. Veuillez rafraîchir la page et réessayer.";
        reject(new Error(errorMsg));
        return;
      }

      const currentOrigin = window.location.origin;
      const orderNumber = new Date().getTime();

      // ✨ MODIFICATION : URLs de redirection vers /mon-compte
      const successUrl = `${this.baseUrl}/create/${userId}/${planId}/${months}?redirect=${encodeURIComponent(`${currentOrigin}/#/mon-compte?payment=success&userId=${userId}&planId=${planId}&months=${months}`)}`;
      const failedUrl = `${currentOrigin}/#/mon-compte?payment=failed&userId=${userId}&planId=${planId}`;

      try {
        // Appel de la fonction OneTouch
        sendPaymentInfos(
          orderNumber,
          this.oneTouchConfig.agencyCode,
          this.oneTouchConfig.secureCode,
          this.oneTouchConfig.domainName,
          successUrl,
          failedUrl,
          amount,
          '',
          email,
          clientFirstName,
          clientLastName,
          clientPhone,
        );

        resolve();
      } catch (error) {
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
    isYearly: boolean,
  ): Promise<void> {

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

    // ⚠️ OVERRIDE DE TEST : Forcer le prix prélevé à 1 F CFA (IHM conserve le vrai montant affiché)
   // amount = 1;


    // Validation des données utilisateur
    if (!user.email || !user.prenom || !user.nom || !user.telephone) {
      const errorMsg =
        'Vos informations de profil sont incomplètes. Veuillez compléter votre profil avant de souscrire.';
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
        months,
      );
    } catch (error) {
      throw error;
    }
  }
  async initiateSubscriptionPaymentbis(
    userId: number,
    plan: SubscriptionPlan,
    isYearly: boolean,
  ): Promise<void> {
    const months = isYearly ? 12 : 1;
    let amount = plan.totalCost;

    if (isYearly && plan.yearlyDiscountRate > 0) {
      const yearlyPrice = plan.totalCost * 12;
      const discount = yearlyPrice * (plan.yearlyDiscountRate / 100);
      amount = yearlyPrice - discount;
    } else if (isYearly) {
      amount = plan.totalCost * 12;
    }

    const currentUser = this.authService.currentUser();
    if (currentUser) {
      await this.initiateSubscriptionPayment(currentUser, plan, isYearly);
      return;
    }

    await this.callTouchPay(amount, '', '', '', '', userId, plan.id, months);
  }
  /**
   * Récupère les headers d'authentification avec validation
   */
  private getAuthHeaders(): HttpHeaders {

    if (
      this.authService &&
      typeof this.authService.getAuthHeaders === 'function'
    ) {
      const headers = this.authService.getAuthHeaders();
      const hasAuth = headers.get('Authorization') !== null;


      if (!hasAuth) {
      }

      return headers;
    }


    const token = this.authService?.getToken() || localStorage.getItem('token');

    if (token) {
      return new HttpHeaders({
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      });
    }


    return new HttpHeaders({
      'Content-Type': 'application/json',
    });
  }

  /**
   * Gestion des erreurs HTTP avec contexte
   */
  private handleError(
    error: any,
    context: string = 'unknown',
  ): Observable<never> {

    if (error.error) {
    }

    let errorMessage = 'Une erreur est survenue';
    let userMessage = errorMessage;

    switch (error.status) {
      case 0:
        errorMessage =
          'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
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
        errorMessage =
          "Accès refusé. Vous n'avez pas les permissions nécessaires.";
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


    return throwError(() => ({
      message: errorMessage,
      userMessage: userMessage,
      status: error.status,
      context: context,
      originalError: error,
    }));
  }

}

