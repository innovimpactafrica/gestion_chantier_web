import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// ─── Déclaration SDK TouchPay (chargé via index.html) ────────────────────────
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

// ─── Interfaces ───────────────────────────────────────────────────────────────

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
    sort: { unsorted: boolean; sorted: boolean; empty: boolean };
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
  sort: { unsorted: boolean; sorted: boolean; empty: boolean };
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
  targetProfiles?: string[];
}

export interface UserSubscription {
  id: number;
  user: { id: number };
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

// ─── Nouvelles interfaces paiement ───────────────────────────────────────────

/** Paramètres retournés par le backend pour déclencher TouchPay */
export interface TouchPayParams {
  orderNumber: number;
  agencyCode: string;
  secureCode: string;
  domainName: string;
  successUrl: string;
  failedUrl: string;
  amount: number;
  email: string;
  clientFirstName: string;
  clientLastName: string;
  clientPhone: string;
}

/** Historique d'un paiement */
export interface PaymentHistory {
  id: number;
  orderNumber: number;
  userId: number;
  userName: string;
  planLabel: string;
  months: number;
  amount: number;
  paymentSuccess: boolean;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  errorCode: string | null;
  numTransactionFromGu: string | null;
  numCommand: string | null;
  initiatedAt: string;
  confirmedAt: string | null;
}

/** Réponse paginée */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

/** Filtres pour lister l'historique */
export interface PaymentHistoryFilters {
  userId?: number;
  orderNumber?: number;
  status?: 'PENDING' | 'SUCCESS' | 'FAILED';
  from?: string; // ISO datetime : ex "2026-01-01T00:00:00"
  to?: string;
  page?: number;
  size?: number;
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root',
})
export class SubscriptionService {
  private baseUrl = `${environment.apiUrl}/subscriptions`;
  private planBaseUrl = `${environment.apiUrl}/subscription-plans`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // PAIEMENT — Nouveau flux via backend
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Étape 1 — Appelle le backend pour :
   *   • Créer un historique de paiement en statut PENDING
   *   • Récupérer les paramètres TouchPay (agencyCode, secureCode, montant, URLs...)
   * Étape 2 — Déclenche la popup TouchPay avec ces paramètres
   *
   * Usage : await subscriptionService.initiatePayment(userId, planId, months)
   */
  async initiatePayment(
    userId: number,
    planId: number,
    months: number = 1,
  ): Promise<void> {

    // 1. Récupère les paramètres depuis le backend (crée l'historique PENDING)
    const params = await firstValueFrom(
      this.http.post<TouchPayParams>(
        `${this.baseUrl}/payment-params`,
        { userId, planId, months },
        { headers: this.getAuthHeaders() },
      ).pipe(
        catchError(error => this.handleError(error, 'initiatePayment')),
      ),
    );

    // 2. Vérifie que le SDK TouchPay est bien chargé dans index.html
    if (typeof sendPaymentInfos !== 'function') {
      throw new Error(
        "Le SDK TouchPay n'est pas chargé. Vérifiez que le script est bien dans index.html.",
      );
    }

    // 3. Déclenche la popup de paiement TouchPay
    sendPaymentInfos(
      params.orderNumber,
      params.agencyCode,
      params.secureCode,
      params.domainName,
      params.successUrl,
      params.failedUrl,
      params.amount,
      '',
      params.email,
      params.clientFirstName,
      params.clientLastName,
      params.clientPhone,
    );
  }

  /**
   * Alias avec objet user complet (pour compatibilité avec l'existant)
   * Usage : await subscriptionService.initiateSubscriptionPayment(user, plan, isYearly)
   */
  async initiateSubscriptionPayment(
    user: any,
    plan: SubscriptionPlan,
    isYearly: boolean,
  ): Promise<void> {

    if (!user.email || !user.prenom || !user.nom || !user.telephone) {
      throw new Error(
        'Vos informations de profil sont incomplètes. Veuillez compléter votre profil avant de souscrire.',
      );
    }

    const months = isYearly ? 12 : 1;
    await this.initiatePayment(user.id, plan.id, months);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HISTORIQUE DES PAIEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Liste l'historique des paiements avec pagination et filtres.
   *
   * Filtres disponibles :
   *   - userId      : filtrer par utilisateur
   *   - orderNumber : rechercher un paiement précis
   *   - status      : PENDING | SUCCESS | FAILED
   *   - from / to   : plage de dates (ISO datetime)
   *   - page / size : pagination (défaut : page=0, size=20)
   */
  getPaymentHistory(
    filters: PaymentHistoryFilters = {},
  ): Observable<PageResponse<PaymentHistory>> {

    let params = new HttpParams()
      .set('page', (filters.page ?? 0).toString())
      .set('size', (filters.size ?? 20).toString());

    if (filters.userId != null)
      params = params.set('userId', filters.userId.toString());
    if (filters.orderNumber != null)
      params = params.set('orderNumber', filters.orderNumber.toString());
    if (filters.status)
      params = params.set('status', filters.status);
    if (filters.from)
      params = params.set('from', filters.from);
    if (filters.to)
      params = params.set('to', filters.to);

    return this.http
      .get<PageResponse<PaymentHistory>>(`${this.baseUrl}/history`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(catchError(error => this.handleError(error, 'getPaymentHistory')));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ABONNEMENTS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Vérifie si l'utilisateur a un abonnement actif */
  seeActive(userId: number): Observable<boolean> {
    return this.http
      .get<boolean>(`${this.baseUrl}/is-active/${userId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'seeActive')));
  }

  /** Vérifie si l'utilisateur peut créer un projet */
  canCreateProject(userId: number): Observable<boolean> {
    return this.http
      .get<boolean>(`${this.baseUrl}/can-create-project/${userId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'canCreateProject')));
  }

  /** Récupère l'abonnement d'un utilisateur */
  getSubscriptionByUser(userId: number): Observable<UserSubscription> {
    return this.http
      .get<UserSubscription>(`${this.baseUrl}/user/${userId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'getSubscriptionByUser')));
  }

  /** Récupère les abonnements par profil */
  getSubscriptionsByProfile(profile: string): Observable<UserSubscription[]> {
    return this.http
      .get<UserSubscription[]>(`${this.baseUrl}/profile/${profile}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'getSubscriptionsByProfile')));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PLANS
  // ═══════════════════════════════════════════════════════════════════════════

  /** Récupère les plans d'abonnement par nom de profil */
  getPlanSubscription(name: string): Observable<SubscriptionPlan[]> {
    return this.http
      .get<SubscriptionPlan[]>(`${this.planBaseUrl}/name/${name}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'getPlanSubscription')));
  }

  /** Récupère tous les plans actifs */
  getAllActivePlans(): Observable<SubscriptionPlan[]> {
    return this.http
      .get<SubscriptionPlan[]>(`${this.planBaseUrl}/active`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'getAllActivePlans')));
  }

  /** Récupère les plans actifs filtrés par profil utilisateur */
  getPlansByProfile(profile: string): Observable<SubscriptionPlan[]> {
    return this.getAllActivePlans().pipe(
      map(plans =>
        plans.filter(plan => {
          const planName = plan.name?.toUpperCase() || '';
          const profileUpper = profile.toUpperCase();
          return (
            planName.includes(profileUpper) ||
            (plan.targetProfiles && plan.targetProfiles.includes(profile))
          );
        }),
      ),
      catchError(error => this.handleError(error, 'getPlansByProfile')),
    );
  }

  /** Récupère un plan par son ID */
  getPlanById(planId: number): Observable<SubscriptionPlan> {
    return this.http
      .get<SubscriptionPlan>(`${this.planBaseUrl}/${planId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'getPlanById')));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // FACTURES
  // ═══════════════════════════════════════════════════════════════════════════

  /** Récupère les factures de l'utilisateur avec pagination */
  getFactures(
    userId: number,
    page: number = 0,
    size: number = 10,
  ): Observable<InvoiceResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http
      .get<InvoiceResponse>(`${this.baseUrl}/invoices/${userId}`, {
        headers: this.getAuthHeaders(),
        params,
      })
      .pipe(catchError(error => this.handleError(error, 'getFactures')));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // PRIVÉ
  // ═══════════════════════════════════════════════════════════════════════════

  private getAuthHeaders(): HttpHeaders {
    if (
      this.authService &&
      typeof this.authService.getAuthHeaders === 'function'
    ) {
      return this.authService.getAuthHeaders();
    }

    const token =
      this.authService?.getToken() || localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });
  }

  private handleError(error: any, context: string = 'unknown'): Observable<never> {
    let errorMessage = 'Une erreur est survenue';
    let userMessage = errorMessage;

    switch (error.status) {
      case 0:
        errorMessage = 'Impossible de contacter le serveur.';
        userMessage = 'Problème de connexion au serveur';
        break;
      case 400:
        errorMessage = 'Requête invalide. Vérifiez les paramètres.';
        userMessage = 'Données invalides';
        break;
      case 401:
        errorMessage = 'Session expirée.';
        userMessage = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 403:
        errorMessage = "Accès refusé.";
        userMessage = 'Accès non autorisé';
        break;
      case 404:
        errorMessage = 'Ressource non trouvée.';
        userMessage = 'Aucune donnée trouvée';
        break;
      case 500:
        errorMessage = 'Erreur serveur interne.';
        userMessage = 'Erreur serveur. Réessayez plus tard.';
        break;
      default:
        errorMessage = `Code: ${error.status}, Message: ${error.message}`;
        userMessage = `Erreur ${error.status}`;
    }

    return throwError(() => ({
      message: errorMessage,
      userMessage,
      status: error.status,
      context,
      originalError: error,
    }));
  }
}
