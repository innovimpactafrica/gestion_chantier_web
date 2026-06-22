import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { API } from '../app/core/constants/api-endpoints';

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
  private baseUrl = API.subscriptions;
  private baseUrlUser = API.users;
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
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


    return this.http.get<DashboardInfos>(url, { headers })
      .pipe(
        tap(infos => {
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


    return this.http.get<EvolutionData[]>(url, { headers, params })
      .pipe(
        tap(evolution => {
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


    return this.http.get<EvolutionData[]>(url, { headers, params })
      .pipe(
        tap(evolution => {
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


    return this.http.get<PlanDistribution[]>(url, { headers })
      .pipe(
        tap(distribution => {
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


    return this.http.get<InvoiceResponse>(url, { headers, params })
      .pipe(
        tap(response => {
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


    return this.http.get<ProfilDistribution[]>(url, { headers })
      .pipe(
        tap(distribution => {
        }),
        catchError(error => this.handleError(error, 'getRepartitionProfil'))
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
  }
}