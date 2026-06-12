import { Injectable, Injector, runInInjectionContext } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router, UrlTree } from '@angular/router';
import { Observable, of } from 'rxjs';
import { filter, map, take, timeout, catchError } from 'rxjs/operators';
import { toObservable } from '@angular/core/rxjs-interop';
import { AuthService, profil, User } from '../app/features/auth/services/auth.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {

  constructor(
    private authService: AuthService,
    private router: Router,
    private injector: Injector
  ) {}

  canActivate(
    route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot
  ): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    if (!this.authService.isAuthenticated()) {
      return this.router.createUrlTree(['/login'], {
        queryParams: { returnUrl: state.url }
      });
    }

    const user = this.authService.currentUser();
    if (user) {
      return this.checkAccess(user, route, state);
    }

    // Authenticated but user not yet loaded (async init on F5 refresh) — wait up to 5s
    return runInInjectionContext(this.injector, () =>
      toObservable(this.authService.currentUser)
    ).pipe(
      filter(u => u !== null),
      take(1),
      timeout(5000),
      map(u => this.checkAccess(u!, route, state)),
      catchError(() =>
        of(this.router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }))
      )
    );
  }

  private checkAccess(user: User, route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    const requiredRoles = route.data['roles'] as profil[];

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const hasRequiredRole = this.checkUserRoles(user.profil, requiredRoles);

    if (!hasRequiredRole) {
      return this.router.createUrlTree(['/dashboard'], {
        queryParams: {
          error: 'insufficient_permissions',
          attempted: state.url
        }
      });
    }

    return true;
  }

  private checkUserRoles(userProfiles: string | profil[] | profil | null | undefined, requiredRoles: profil[]): boolean {
    if (!userProfiles || !requiredRoles || requiredRoles.length === 0) {
      return false;
    }

    let profilesArray: profil[] = [];

    if (typeof userProfiles === 'string') {
      if (Object.values(profil).includes(userProfiles as profil)) {
        profilesArray = [userProfiles as profil];
      }
    } else if (Array.isArray(userProfiles)) {
      profilesArray = userProfiles.filter(profile =>
        Object.values(profil).includes(profile)
      );
    } else if (userProfiles && Object.values(profil).includes(userProfiles)) {
      profilesArray = [userProfiles];
    }

    return profilesArray.some(profile => requiredRoles.includes(profile));
  }

  hasRole(userProfiles: string | profil[] | profil | null | undefined, role: profil): boolean {
    return this.checkUserRoles(userProfiles, [role]);
  }

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
      profilesArray = userProfiles as profil[];
    } else if (userProfiles && Object.values(profil).includes(userProfiles)) {
      profilesArray = [userProfiles];
    }

    return roles.every(role => profilesArray.includes(role));
  }
}
