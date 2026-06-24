import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError, firstValueFrom } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { API } from '../app/core/constants/api-endpoints';
import { TouchPayParams, BackendDateTime } from './subscription.service';

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

export interface QuoteTokenBalance {
  id: number;
  userId: number;
  userFullName: string;
  balance: number;
  totalPurchased: number;
  totalConsumed: number;
  createdAt: BackendDateTime | string;
  lastRechargedAt: BackendDateTime | string | null;
  lastConsumedAt: BackendDateTime | string | null;
}

export interface RechargeQuoteTokensRequest {
  userId: number;
  amount: number;
}

/**
 * Prix unitaire d'un crédit IA en F CFA.
 * ⚠️ Valeur provisoire en attendant que le backend expose une tarification officielle
 * (le prix exact n'a pas encore été communiqué — à ajuster ici une fois connu).
 */
export const PRICE_PER_QUOTE_TOKEN = 500;

@Injectable({
  providedIn: 'root',
})
export class QuoteTokenService {
  private baseUrl = API.quoteTokens;
  /** Endpoint payment-params des abonnements, réutilisé pour les achats de crédits IA */
  private paymentParamsUrl = `${API.subscriptions}/payment-params`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  /** Récupère le solde de crédits IA d'un utilisateur */
  getBalance(userId: number): Observable<QuoteTokenBalance> {
    return this.http
      .get<QuoteTokenBalance>(`${this.baseUrl}/user/${userId}`, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'getBalance')));
  }

  /** Crédite directement le compte (appelé après confirmation du paiement) */
  recharge(userId: number, amount: number): Observable<QuoteTokenBalance> {
    const body: RechargeQuoteTokensRequest = { userId, amount };
    return this.http
      .post<QuoteTokenBalance>(`${this.baseUrl}/recharge`, body, {
        headers: this.getAuthHeaders(),
      })
      .pipe(catchError(error => this.handleError(error, 'recharge')));
  }

  /**
   * Déclenche l'achat payant de crédits IA via TouchPay, en réutilisant l'endpoint
   * payment-params des abonnements (discriminé par `type: 'QUOTE_TOKEN'`).
   * À la confirmation du paiement (retour TouchPay), il faut appeler `recharge()`
   * pour créditer effectivement les jetons.
   */
  async initiateTokenPurchase(
    userId: number,
    tokenAmount: number,
    user: { email: string; prenom: string; nom: string; telephone: string },
  ): Promise<void> {
    const amount = tokenAmount * PRICE_PER_QUOTE_TOKEN;

    const params = await firstValueFrom(
      this.http
        .post<TouchPayParams>(
          this.paymentParamsUrl,
          { userId, tokenAmount, amount, type: 'QUOTE_TOKEN' },
          { headers: this.getAuthHeaders() },
        )
        .pipe(catchError(error => this.handleError(error, 'initiateTokenPurchase'))),
    );

    if (typeof sendPaymentInfos !== 'function') {
      throw new Error(
        "Le SDK TouchPay n'est pas chargé. Vérifiez que le script est bien dans index.html.",
      );
    }

    sendPaymentInfos(
      params.orderNumber,
      params.agencyCode,
      params.secureCode,
      params.domainName,
      params.successUrl,
      params.failedUrl,
      amount,
      '',
      user.email,
      user.prenom,
      user.nom,
      user.telephone,
    );
  }

  private getAuthHeaders(): HttpHeaders {
    if (this.authService && typeof this.authService.getAuthHeaders === 'function') {
      return this.authService.getAuthHeaders();
    }

    const token = this.authService?.getToken() || localStorage.getItem('token');

    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : '',
      'Content-Type': 'application/json',
    });
  }

  private handleError(error: any, context: string = 'unknown'): Observable<never> {
    let userMessage = 'Une erreur est survenue';

    switch (error.status) {
      case 0:
        userMessage = 'Problème de connexion au serveur';
        break;
      case 401:
        userMessage = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 403:
        userMessage = 'Accès non autorisé';
        break;
      case 404:
        userMessage = 'Aucun solde de crédits trouvé pour cet utilisateur';
        break;
      default:
        userMessage = `Erreur ${error.status}`;
    }

    return throwError(() => ({
      message: userMessage,
      userMessage,
      status: error.status,
      context,
      originalError: error,
    }));
  }
}
