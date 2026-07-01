import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

// Sentinel distinct de `null` (qui signifie "pas encore résolu") pour signaler un échec
// de refresh aux requêtes mises en attente, sinon elles restent bloquées indéfiniment.
const REFRESH_FAILED = Symbol('REFRESH_FAILED');

// Interceptor fonctionnel pour Angular 18
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();
  
  let authReq = req;
  
  // N'ajoutez pas de token pour la route de refresh
  if (token && !req.url.includes('/refresh')) {
    authReq = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`)
    });
  }
  
  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // Évitez de boucler sur la route de refresh ou signin
      if (error.status === 401 && !req.url.includes('/refresh') && !req.url.includes('/signin')) {
        
        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          return authService.refreshAuthToken().pipe(
            switchMap((refreshResponse) => {
              isRefreshing = false;
              if (refreshResponse && refreshResponse.token) {
                refreshTokenSubject.next(refreshResponse.token);
                // Relance de la requête originale
                const newAuthReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${refreshResponse.token}`)
                });
                return next(newAuthReq);
              }
              // Échec du refresh : prévenir les requêtes en attente pour qu'elles
              // n'attendent pas indéfiniment un token qui ne viendra jamais.
              refreshTokenSubject.next(REFRESH_FAILED);
              return throwError(() => error);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              refreshTokenSubject.next(REFRESH_FAILED);
              return throwError(() => refreshErr);
            })
          );
        } else {
          // Attendre que le jeton soit rafraîchi par une autre requête
          return refreshTokenSubject.pipe(
            filter(newToken => newToken !== null),
            take(1),
            switchMap((newToken) => {
              if (newToken === REFRESH_FAILED) {
                return throwError(() => error);
              }
              const newAuthReq = req.clone({
                headers: req.headers.set('Authorization', `Bearer ${newToken}`)
              });
              return next(newAuthReq);
            })
          );
        }
      }
      return throwError(() => error);
    })
  );
};

