// core/guards/auth.guard.ts (version simplifiée pour les tests)
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    console.log('🔐 AuthGuard - Vérification de l\'accès à:', state.url);

    // Vérifier si l'utilisateur est authentifié
    const isAuthenticated = this.authService.isAuthenticated();
    console.log('👤 Utilisateur authentifié:', isAuthenticated);

    if (!isAuthenticated) {
      console.log('❌ Accès refusé - Utilisateur non authentifié');
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    // Vérifier la validité du token, ou si on peut le rafraîchir
    if (!this.authService.isTokenValid() && !this.authService.getRefreshToken()) {
      console.log('❌ Token invalide ou expiré (pas de refresh token disponible)');
      this.authService.logout();
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url, reason: 'token_expired' }
      });
    }

    // Vérifier la présence des données utilisateur
    const user = this.authService.currentUser();
    if (!user && !this.authService.getRefreshToken() && !this.authService.isTokenValid()) {
      console.log('❌ Aucune information utilisateur disponible');
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url, reason: 'user_data_missing' }
      });
    }

    // Pour les routes avec userId, vérifier que l'utilisateur correspond
    const userIdParam = route.paramMap.get('userId') || route.queryParams['id'];
    if (userIdParam) {
      const routeUserId = +userIdParam;
      if (!user || routeUserId !== user.id) {
        console.log('❌ Accès refusé - UserId ne correspond pas à l\'utilisateur connecté');
        return this.router.createUrlTree(['/portail'], {
          queryParams: { error: 'access_denied' }
        });
      }
    }

    console.log('✅ AuthGuard - Accès autorisé');
    return true;
  }
}