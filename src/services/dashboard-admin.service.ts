import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Interfaces pour le typage des réponses
export interface DashboardInfos {
  totalSubscriptions: number;
  activeSubscriptions: number;
  expiredSubscriptions: number;
  weeklySubscriptions: number;
  monthlySubscriptions: number;
  yearlySubscriptions: number;
  totalRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  paidRevenue: number;
  unpaidRevenue: number;
  paidPercentage: number;
  unpaidPercentage: number;
}

export interface EvolutionData {
  month: string;
  total: number;
}

export interface PlanDistribution {
  planName: string;
  percentage: number;
}

export interface ProfilDistribution {
  profil: string;
  count: number;
}

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

@Injectable({
  providedIn: 'root'
})
export class DashboardAdminService {
  private baseUrl = environment.endpoints.subscriptions;
  private baseUrlUser = environment.endpoints.user;
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🔧 DashboardAdminService initialisé');
  }

  /**
   * Récupère les informations générales du dashboard
   */
  getInfosDashboard(year?: number): Observable<DashboardInfos> {
    const headers = this.getAuthHeaders();
    let url = `${this.baseUrl}/dashbord`;

    if (year) {
      url += `?year=${year}`;
    }

    console.log('📡 API Call: getInfosDashboard', year ? `for year ${year}` : '');
    console.log('🔗 URL:', url);

    return this.http.get<DashboardInfos>(url, { headers })
      .pipe(
        tap(infos => {
          console.log('✅ Dashboard infos récupérées:');
          console.log('  - Total abonnements:', infos.totalSubscriptions);
          console.log('  - Abonnements actifs:', infos.activeSubscriptions);
          console.log('  - Revenu total:', infos.totalRevenue);
          console.log('  - Taux de paiement:', infos.paidPercentage + '%');
        }),
        catchError(error => this.handleError(error, 'getInfosDashboard'))
      );
  }

  /**
   * Récupère l'évolution des abonnements par mois
   */
  getEvolution(year?: number): Observable<EvolutionData[]> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (year) {
      params = params.set('year', year.toString());
    }

    const url = `${this.baseUrl}/evolution`;

    console.log('📡 API Call: getEvolution');
    console.log('🔗 URL:', url);
    console.log('📅 Year:', year || 'current');

    return this.http.get<EvolutionData[]>(url, { headers, params })
      .pipe(
        tap(evolution => {
          console.log('✅ Évolution des abonnements récupérée:');
          console.log('  - Nombre de mois:', evolution.length);
          console.log('  - Total annuel:', evolution.reduce((sum, item) => sum + item.total, 0));
        }),
        catchError(error => this.handleError(error, 'getEvolution'))
      );
  }

  /**
   * Récupère l'évolution des revenus par mois
   */
  getRevenuEvolution(year?: number): Observable<EvolutionData[]> {
    const headers = this.getAuthHeaders();
    let params = new HttpParams();

    if (year) {
      params = params.set('year', year.toString());
    }

    const url = `${this.baseUrl}/revenues/evolution`;

    console.log('📡 API Call: getRevenuEvolution');
    console.log('🔗 URL:', url);
    console.log('📅 Year:', year || 'current');

    return this.http.get<EvolutionData[]>(url, { headers, params })
      .pipe(
        tap(evolution => {
          console.log('✅ Évolution des revenus récupérée:');
          console.log('  - Nombre de mois:', evolution.length);
          console.log('  - Revenu annuel:', evolution.reduce((sum, item) => sum + item.total, 0));
        }),
        catchError(error => this.handleError(error, 'getRevenuEvolution'))
      );
  }

  /**
   * Récupère la distribution des plans d'abonnement
   */
  getDistributionsPlan(): Observable<PlanDistribution[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/plan-distribution`;

    console.log('📡 API Call: getDistributionsPlan');
    console.log('🔗 URL:', url);

    return this.http.get<PlanDistribution[]>(url, { headers })
      .pipe(
        tap(distribution => {
          console.log('✅ Distribution des plans récupérée:');
          console.log('  - Nombre de plans:', distribution.length);
          console.log('  - Plans:', distribution.map(p => `${p.planName}: ${p.percentage}%`));
        }),
        catchError(error => this.handleError(error, 'getDistributionsPlan'))
      );
  }

  /**
   * Récupère les dernières factures avec pagination
   */
  getLastInvoices(page: number = 0, size: number = 10): Observable<InvoiceResponse> {
    const headers = this.getAuthHeaders();
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    const url = `${this.baseUrl}/invoices-lastest`;

    console.log('📡 API Call: getLastInvoices');
    console.log('🔗 URL:', url);
    console.log('📄 Page:', page);
    console.log('📊 Size:', size);

    return this.http.get<InvoiceResponse>(url, { headers, params })
      .pipe(
        tap(response => {
          console.log('✅ Dernières factures récupérées:');
          console.log('  - Total éléments:', response.totalElements);
          console.log('  - Pages totales:', response.totalPages);
          console.log('  - Page actuelle:', response.number);
          console.log('  - Factures:', response.content.length);
        }),
        catchError(error => this.handleError(error, 'getLastInvoices'))
      );
  }

  /**
   * Récupère la répartition des profils utilisateurs
   */
  getRepartitionProfil(): Observable<ProfilDistribution[]> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrlUser}/profil-distribution`;

    console.log('📡 API Call: getRepartitionProfil');
    console.log('🔗 URL:', url);

    return this.http.get<ProfilDistribution[]>(url, { headers })
      .pipe(
        tap(distribution => {
          console.log('✅ Répartition des profils récupérée:');
          console.log('  - Nombre de profils:', distribution.length);
          console.log('  - Total utilisateurs:', distribution.reduce((sum, item) => sum + item.count, 0));
          console.log('  - Profils principaux:', distribution.filter(p => p.count > 0).map(p => `${p.profil}: ${p.count}`));
        }),
        catchError(error => this.handleError(error, 'getRepartitionProfil'))
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
    console.error(`❌ Erreur dans DashboardAdminService.${context}:`, error);
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
        errorMessage = `Ressource non trouvée pour l'endpoint spécifié.`;
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
    console.log('🔍 === DASHBOARD ADMIN ENDPOINTS ===');
    console.log('Base URL Subscriptions:', this.baseUrl);
    console.log('Base URL Users:', this.baseUrlUser);
    console.log('Endpoints disponibles:');
    console.log('  - getInfosDashboard: GET', `${this.baseUrl}/dashboard`);
    console.log('  - getEvolution: GET', `${this.baseUrl}/evolution?year={year}`);
    console.log('  - getRevenuEvolution: GET', `${this.baseUrl}/revenues/evolution?year={year}`);
    console.log('  - getDistributionsPlan: GET', `${this.baseUrl}/plan-distribution`);
    console.log('  - getLastInvoices: GET', `${this.baseUrl}/invoices-lastest?page={page}&size={size}`);
    console.log('  - getRepartitionProfil: GET', `${this.baseUrlUser}/profil-distribution`);
    console.log('========================');
  }
}