import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn, HttpContextToken } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

// État partagé : un seul refresh à la fois ; les autres requêtes attendent que le
// nouveau token soit disponible avant d'être (re)jouées.
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

// Marqueur côté client (non envoyé sur le réseau → pas de preflight CORS) pour
// éviter de relancer un refresh en boucle sur une requête déjà rejouée.
const ALREADY_RETRIED = new HttpContextToken<boolean>(() => false);

const addToken = (req: HttpRequest<unknown>, token: string, markRetried = false): HttpRequest<unknown> =>
  req.clone({
    headers: req.headers.set('Authorization', `Bearer ${token}`),
    context: markRetried ? req.context.set(ALREADY_RETRIED, true) : req.context
  });

// Interceptor fonctionnel pour Angular 18
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Endpoints d'authentification : jamais de refresh dessus (sinon boucle infinie).
  const isAuthEndpoint =
    req.url.includes('/refresh') ||
    req.url.includes('/signin') ||
    req.url.includes('/signup');

  const alreadyRetried = req.context.get(ALREADY_RETRIED);

  // 1) PROACTIF : le backend renvoie des codes incohérents (400/401/403) quand le
  //    token est expiré. Plutôt que de réagir à ces codes, si on sait déjà que le
  //    token est expiré et qu'on a un refresh token, on rafraîchit AVANT d'envoyer.
  if (
    token &&
    !isAuthEndpoint &&
    !alreadyRetried &&
    !authService.isTokenValid() &&
    authService.getRefreshToken()
  ) {
    return refreshAndRetry(req, next, authService, router);
  }

  // On n'ajoute pas le token sur /refresh : refreshAuthToken() gère son propre body.
  const authReq = token && !req.url.includes('/refresh') ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // 2) RÉACTIF (filet de sécurité) : si une réponse d'erreur arrive alors que le
      //    token est expiré, on tente un refresh. Gardé sur isTokenValid() pour ne pas
      //    confondre avec un vrai 400 (validation) ou 403 (permission) token encore valide.
      const looksLikeAuthError =
        error.status === 401 ||
        ((error.status === 403 || error.status === 400) && !authService.isTokenValid());

      if (looksLikeAuthError && !isAuthEndpoint && !alreadyRetried) {
        return refreshAndRetry(req, next, authService, router, error);
      }
      return throwError(() => error);
    })
  );
};

function refreshAndRetry(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  originalError?: HttpErrorResponse
) {
  if (!isRefreshing) {
    isRefreshing = true;
    // Remet à null pour que les requêtes en attente ne rejouent pas avec un ancien token.
    refreshTokenSubject.next(null);

    return authService.refreshAuthToken().pipe(
      switchMap((res: any) => {
        isRefreshing = false;
        const newToken = res?.token;

        if (newToken) {
          // Débloque toutes les requêtes mises en file d'attente.
          refreshTokenSubject.next(newToken);
          // (Re)joue la requête avec le nouveau token, marquée pour ne pas reboucler.
          return next(addToken(req, newToken, true));
        }

        // Refresh échoué (refreshAuthToken a déjà nettoyé l'état) : déconnexion + login.
        forceLogout(authService, router);
        return throwError(() => originalError ?? new HttpErrorResponse({ status: 401 }));
      }),
      catchError((err) => {
        isRefreshing = false;
        forceLogout(authService, router);
        return throwError(() => err);
      })
    );
  }

  // Un refresh est déjà en cours : on attend le nouveau token puis on (re)joue.
  return refreshTokenSubject.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap((newToken) => next(addToken(req, newToken, true)))
  );
}

function forceLogout(authService: AuthService, router: Router): void {
  authService.logout();
  router.navigate(['/login']);
}
