import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../../../../features/auth/services/auth.service';
import { catchError, switchMap, throwError, BehaviorSubject, filter, take } from 'rxjs';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

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
              return throwError(() => error);
            }),
            catchError((refreshErr) => {
              isRefreshing = false;
              return throwError(() => refreshErr);
            })
          );
        } else {
          // Attendre que le jeton soit rafraîchi par une autre requête
          return refreshTokenSubject.pipe(
            filter(newToken => newToken !== null),
            take(1),
            switchMap((newToken) => {
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

