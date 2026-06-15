import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, timeout } from 'rxjs/operators';

@Injectable()
export class HttpErrorInterceptor implements HttpInterceptor {

  constructor() { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Ajouter des en-têtes pour optimiser la gestion du cache
    const modifiedRequest = request.clone({
      setHeaders: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });

    return next.handle(modifiedRequest).pipe(
      // Ajouter un timeout pour éviter les requêtes qui restent bloquées
      timeout(30000),
      // Réessayer automatiquement jusqu'à 2 fois en cas d'erreur
      retry(2),
      catchError((error: HttpErrorResponse) => {
        let errorMsg = '';

        if (error.error instanceof ErrorEvent) {
          // Erreur côté client
          errorMsg = `Erreur: ${error.error.message}`;
        } else {
          // Erreur côté serveur
          if (error.status === 0 && error.error instanceof ProgressEvent) {
            // Problème de connexion ou erreur de chunked encoding
            errorMsg = 'Problème de connexion au serveur. Veuillez réessayer.';
          } else {
            errorMsg = `Code: ${error.status}, Message: ${error.message}`;
          }
        }

        return throwError(() => new Error(errorMsg));
      })
    );
  }
}