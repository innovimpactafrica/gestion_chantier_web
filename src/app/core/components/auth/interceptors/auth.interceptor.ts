import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

// État partagé : un seul refresh à la fois ; les autres requêtes 401 attendent
// que le nouveau token soit disponible avant d'être rejouées.
let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

const addToken = (req: HttpRequest<unknown>, token: string): HttpRequest<unknown> =>
  req.clone({ headers: req.headers.set('Authorization', `Bearer ${token}`) });

// Interceptor fonctionnel pour Angular 18
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();

  // Endpoints d'authentification : on ne déclenche jamais le refresh dessus
  // (sinon boucle infinie sur un 401 de /refresh ou /signin).
  const isAuthEndpoint =
    req.url.includes('/refresh') ||
    req.url.includes('/signin') ||
    req.url.includes('/signup');

  // On n'ajoute pas le token sur /refresh : refreshAuthToken() pose son propre
  // en-tête Authorization (le token à rafraîchir, pas forcément le token courant).
  const authReq = token && !req.url.includes('/refresh') ? addToken(req, token) : req;

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isAuthEndpoint) {
        return handle401(req, next, authService, router, error);
      }
      return throwError(() => error);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  router: Router,
  originalError: HttpErrorResponse
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
          // Rejoue la requête originale avec le nouveau token.
          return next(addToken(req, newToken));
        }

        // Refresh échoué (refreshAuthToken a déjà nettoyé l'état) : déconnexion + login.
        forceLogout(authService, router);
        return throwError(() => originalError);
      }),
      catchError((err) => {
        isRefreshing = false;
        forceLogout(authService, router);
        return throwError(() => err);
      })
    );
  }

  // Un refresh est déjà en cours : on attend le nouveau token puis on rejoue.
  return refreshTokenSubject.pipe(
    filter((t): t is string => t !== null),
    take(1),
    switchMap((newToken) => next(addToken(req, newToken)))
  );
}

function forceLogout(authService: AuthService, router: Router): void {
  authService.logout();
  router.navigate(['/login']);
}
