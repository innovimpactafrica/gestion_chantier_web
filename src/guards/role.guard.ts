// core/guards/role.guard.ts (version améliorée)
import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthService, profil } from '../app/features/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  
  constructor(
    private authService: AuthService, 
    private router: Router
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    
    
    // Vérifier d'abord l'authentification (sécurité supplémentaire)
    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
    }

    const user = this.authService.currentUser();
    if (!user) {
      return this.router.createUrlTree(['/login'], { 
        queryParams: { returnUrl: state.url } 
      });
    }

    // Récupérer les rôles requis pour cette route
    const requiredRoles = route.data['roles'] as profil[];

    // Si aucun rôle spécifique n'est requis, autoriser l'accès
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // Vérifier si l'utilisateur a au moins un des rôles requis
    const hasRequiredRole = this.checkUserRoles(user.profil, requiredRoles);
    
    if (!hasRequiredRole) {
      
      // Rediriger vers le dashboard si l'utilisateur n'a pas les droits
      // Vous pourriez aussi créer une page d'erreur 403
      return this.router.createUrlTree(['/dashboard'], { 
        queryParams: { 
          error: 'insufficient_permissions',
          attempted: state.url 
        }
      });
    }

    return true;
  }

  /**
   * Vérifie si l'utilisateur a au moins un des rôles requis
   * Gère les cas où profil peut être un string, un tableau, ou null/undefined
   */
  private checkUserRoles(userProfiles: string | profil[] | profil | null | undefined, requiredRoles: profil[]): boolean {
    if (!userProfiles || !requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    // Normaliser userProfiles en tableau
    let profilesArray: profil[] = [];
    
    if (typeof userProfiles === 'string') {
      // Si c'est un string, vérifier si c'est un profil valide
      if (Object.values(profil).includes(userProfiles as profil)) {
        profilesArray = [userProfiles as profil];
      }
    } else if (Array.isArray(userProfiles)) {
      // Si c'est déjà un tableau, l'utiliser directement
      profilesArray = userProfiles.filter(profile => 
        Object.values(profil).includes(profile)
      );
    } else if (userProfiles && Object.values(profil).includes(userProfiles)) {
      // Si c'est un seul profil (enum)
      profilesArray = [userProfiles];
    }

    
    // Vérifier s'il y a au moins une correspondance
    const hasRole = profilesArray.some(profile => 
      requiredRoles.includes(profile)
    );
    
    return hasRole;
  }

  /**
   * Méthode utilitaire pour vérifier un rôle spécifique
   */
  hasRole(userProfiles: string | profil[] | profil | null | undefined, role: profil): boolean {
    return this.checkUserRoles(userProfiles, [role]);
  }

  /**
   * Méthode utilitaire pour vérifier plusieurs rôles (ET logique)
   */
  hasAllRoles(userProfiles: string | profil[] | profil | null | undefined, roles: profil[]): boolean {
    if (!userProfiles || !roles || roles.length === 0) {
      return false;
    }

    let profilesArray: profil[] = [];
    
    if (typeof userProfiles === 'string') {
      if (Object.values(profil).includes(userProfiles as profil)) {
        profilesArray = [userProfiles as profil];
      }
    } else if (Array.isArray(userProfiles)) {
      profilesArray = userProfiles;
    } else if (userProfiles && Object.values(profil).includes(userProfiles)) {
      profilesArray = [userProfiles];
    }

    return roles.every(role => profilesArray.includes(role));
  }
}