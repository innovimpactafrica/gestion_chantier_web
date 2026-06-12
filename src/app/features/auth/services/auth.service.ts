import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../../../environments/environment';

// Interface pour le plan d'abonnement
interface SubscriptionPlan {
  id: number;
  name: string;
  totalCost: number;
  installmentCount: number;
}
// Interface pour la mise à jour du profil utilisateur
export interface UpdateUserProfileData {
  nom?: string;
  prenom?: string;
  email?: string;
  telephone?: string;
  date?: string;
  lieunaissance?: string;
  adress?: string;
  profil?: string;
  photo?: File;
}

// Interface pour l'abonnement
interface Subscription {
  id: number;
  subscriptionPlan: SubscriptionPlan;
  startDate: number[]; // [year, month, day]
  endDate: number[]; // [year, month, day]
  active: boolean;
  paidAmount: number;
  installmentCount: number;
  dateInvoice: string | null;
  status: 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  renewed: boolean;
}

// Interface pour les autorités/rôles
interface Authority {
  authority: string;
}

// Enum pour les profils utilisateur
export enum UserProfile {
  ADMIN = 'ADMIN',
  SITE_MANAGER = 'SITE_MANAGER',
  SUPPLIER = 'SUPPLIER',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  USER = 'USER',
  BET = 'BET'
}

export enum profil {
  SITE_MANAGER = 'SITE_MANAGER',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  // SUPPLIER = 'SUPPLIER'
}

// Type pour les profils disponibles
export type ProfileType = keyof typeof profil;

// Interface utilisateur mise à jour avec les nouveaux profils
export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  date: string,
  lieunaissance: string;
  adress: string;
  technicalSheet: string | null;
  profil: profil[]; // ⚠️ CORRECTION: array de profils
  profils: string; // ⚠️ AJOUT: propriété pour l'API qui envoie "profils" comme string
  activated: boolean;
  notifiable: boolean;
  telephone: string;
  subscriptions: Subscription[];
  company: any | null;
  createdAt: number[];
  funds: number;
  note: number;
  photo: string | null;
  idCard: string | null;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  accountNonLocked: boolean;
  authorities: Authority[];
  username: string;
  enabled: boolean;
}

interface LoginResponse {
  token: string;
  refreshToken: string;
  user?: User;
}
interface ResetPassword {
  email: string;
}

// Interface pour les données d'inscription
export interface RegistrationData {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  adress: string;
  profil: profil;
  company?: any;
}

// Configuration des profils avec leurs propriétés
export interface ProfileConfig {
  key: profil;
  label: string;
  description: string;
  icon?: string;
  permissions?: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.endpoints.auth;
  private userApiUrl = environment.endpoints.user;

  // Configuration des profils disponibles
  private readonly profilesConfig: ProfileConfig[] = [
    {
      key: profil.SITE_MANAGER,
      label: 'Gestionnaire de Site',
      description: 'Gestion des sites et équipes',
      icon: 'manager-icon',
      permissions: ['SITE_MANAGEMENT', 'TEAM_MANAGEMENT', 'REPORT_CREATE', 'REPORT_VIEW']
    },
    {
      key: profil.SUBCONTRACTOR,
      label: 'Fournisseur',
      description: 'Fourniture de matériaux et services',
      icon: 'supplier-icon',
      permissions: ['SUPPLY_MANAGEMENT', 'INVENTORY_ACCESS', 'REPORT_VIEW']
    },
    {
      key: profil.SUBCONTRACTOR,
      label: 'Sous-traitant',
      description: 'Exécution de travaux spécialisés',
      icon: 'subcontractor-icon',
      permissions: ['PROJECT_ACCESS', 'TASK_MANAGEMENT', 'REPORT_CREATE', 'REPORT_VIEW']
    }
  ];

  // Signals pour l'état d'authentification
  private _currentUser = signal<User | null>(null);
  private _isAuthenticated = signal(false);
  private _token = signal<string | null>(null);
  private _refreshToken = signal<string | null>(null);

  // Signaux en lecture seule pour les composants   
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = this._isAuthenticated.asReadonly();

  // ✅ CORRECTION: Améliorer le computed signal userProfile
  userProfile = computed(() => {
    const user = this._currentUser();
    if (!user) return null;

    // Retourner toujours un array pour la cohérence
    if (user.profils && typeof user.profils === 'string') {
      return [user.profils as any];
    }

    if (Array.isArray(user.profil) && user.profil.length > 0) {
      return user.profil;
    }

    if (typeof user.profil === 'string') {
      return [user.profil as any];
    }

    return null;
  });

  userFullName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.prenom} ${user.nom}` : null;
  });

  isUserActivated = computed(() => this._currentUser()?.activated || false);
  isUserEnabled = computed(() => this._currentUser()?.enabled || false);

  // Computed signals pour les abonnements
  activeSubscriptions = computed(() =>
    this._currentUser()?.subscriptions.filter(sub => sub.active) || []
  );

  hasActiveSubscription = computed(() => this.activeSubscriptions().length > 0);

  // Computed signals pour les informations de compte
  userFunds = computed(() => this._currentUser()?.funds || 0);
  userNote = computed(() => this._currentUser()?.note || 0);

  isAccountValid = computed(() => {
    const user = this._currentUser();
    return user ?
      user.accountNonExpired &&
      user.credentialsNonExpired &&
      user.accountNonLocked &&
      user.enabled &&
      user.activated : false;
  });
  isADMINProfile(): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    // Vérifier d'abord la propriété "profils" (string) de l'API
    if (user.profils && typeof user.profils === 'string') {
      return user.profils === 'ADMIN';
    }

    // Ensuite vérifier la propriété "profil" (array) de l'interface
    if (user.profil && Array.isArray(user.profil)) {
      return user.profil.includes('ADMIN' as any);
    }

    // Vérifier aussi si "profil" est une string
    if (user.profil && typeof user.profil === 'string') {
      return user.profil === 'ADMIN';
    }

    return false;
  }
  isBETProfile(): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    // Vérifier d'abord la propriété "profils" (string) de l'API
    if (user.profil && typeof user.profil === 'string') {
      return user.profil === 'BET';
    }

    // Ensuite vérifier la propriété "profil" (array) de l'interface
    if (user.profil && Array.isArray(user.profil)) {
      return user.profil.includes('BET' as any);
    }

    // Vérifier aussi si "profil" est une string
    if (user.profil && typeof user.profil === 'string') {
      return user.profil === 'BET';
    }

    return false;
  }
  isSUPPLIERProfile(): boolean {
    const user = this.currentUser();
    if (!user) {
      return false;
    }

    // Vérifier d'abord la propriété "profils" (string) de l'API
    if (user.profil && typeof user.profil === 'string') {
      return user.profil === 'SUPPLIER';
    }

    // Ensuite vérifier la propriété "profil" (array) de l'interface
    if (user.profil && Array.isArray(user.profil)) {
      return user.profil.includes('SUPPLIER' as any);
    }

    // Vérifier aussi si "profil" est une string
    if (user.profil && typeof user.profil === 'string') {
      return user.profil === 'SUPPLIER';
    }

    return false;
  }

  // ✅ CORRECTION: Computed signal pour les permissions basées sur les profils (array)
  userPermissions = computed(() => {
    const profiles = this.userProfile();
    if (!profiles || profiles.length === 0) return [];

    const allPermissions: string[] = [];
    profiles.forEach(profile => {
      const config = this.profilesConfig.find(p => p.key === profile);
      if (config?.permissions) {
        allPermissions.push(...config.permissions);
      }
    });

    // Retourner les permissions uniques
    return [...new Set(allPermissions)];
  });
  userState$: any;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.initializeAuthState();
  }
  updateUserWithFormData(userId: number, formData: FormData): Observable<User> {
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    const updateUrl = `${this.userApiUrl}/update/${userId}`;

    return this.http.put<User>(updateUrl, formData, { headers }).pipe(
      tap(updatedUser => {
        this._currentUser.set(updatedUser);

        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }),
      catchError(error => {
        throw error;
      })
    );
  }
  // Nouvelle méthode pour mettre à jour UN utilisateur (pas le currentUser)
updateAnyUserWithFormData(userId: number, formData: FormData): Observable<User> {
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${this.getToken()}`
  });

  const updateUrl = `${this.userApiUrl}/update/${userId}`;

  return this.http.put<User>(updateUrl, formData, { headers }).pipe(
    tap(updatedUser => {
      const currentUserId = this._currentUser()?.id;
      if (currentUserId === userId) {
        this._currentUser.set(updatedUser);
        if (isPlatformBrowser(this.platformId)) {
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
      }
    }),
    catchError(error => {
      throw error;
    })
  );
}

  private initializeAuthState(): void {
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem('token') || localStorage.getItem('auth_token');
      const refreshToken = localStorage.getItem('refreshToken');
      const storedUser = localStorage.getItem('user');

      if (storedToken && this.isTokenValidFormat(storedToken)) {
        this._token.set(storedToken);
        // Synchroniser les deux clés
        localStorage.setItem('token', storedToken);
        localStorage.setItem('auth_token', storedToken);

        if (refreshToken) this._refreshToken.set(refreshToken);
        this._isAuthenticated.set(true);

        // Restaurer l'utilisateur depuis le cache pour que les guards passent immédiatement
        if (storedUser) {
          try {
            this._currentUser.set(JSON.parse(storedUser));
          } catch (e) {
            // ignore parsing errors
          }
        }

        if (this.isTokenValid()) {
          this.getCurrentUser().subscribe({
            next: (user) => {
              if (user) {
                this._currentUser.set(user);
                localStorage.setItem('user', JSON.stringify(user));
              }
            },
            error: () => {
              // L'intercepteur gère le refresh 401 — on ne nettoie pas ici
            }
          });
        } else if (refreshToken) {
          this.refreshAuthToken().subscribe();
        } else {
          // Token expiré sans refresh token — vérification async avec le backend.
          // Ne jamais appeler clearAuthData() ici de façon synchrone : le guard serait
          // déjà évalué avec _isAuthenticated = false, provoquant une redirection vers
          // login à chaque F5 même si l'utilisateur est connecté.
          // getCurrentUser() appellera clearAuthData() de façon async si le backend répond 401.
          this.getCurrentUser().subscribe({
            next: (user) => {
              if (user) {
                this._currentUser.set(user);
                localStorage.setItem('user', JSON.stringify(user));
              }
            },
            error: () => {}
          });
        }
      }
    }
  }

  // ✅ NOUVELLE MÉTHODE: Vérification du format du token
  private isTokenValidFormat(token: string): boolean {
    try {
      const parts = token.split('.');
      return parts.length === 3;
    } catch {
      return false;
    }
  }

  // Méthodes pour obtenir les profils
  getAvailableProfiles(): ProfileConfig[] {
    return this.profilesConfig;
  }

  getProfileConfig(profile: profil): ProfileConfig | undefined {
    return this.profilesConfig.find(p => p.key === profile);
  }

  getRegistrationProfiles(): ProfileConfig[] {
    return this.profilesConfig; // Tous les profils sont disponibles pour l'inscription
  }

  register(registrationData: RegistrationData): Observable<any> {
    if (!Object.values(profil).includes(registrationData.profil)) {
      throw new Error('Profil utilisateur invalide');
    }

    const formData = new FormData();
    Object.entries(registrationData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    return this.http.put(`${this.apiUrl}/signup`, formData);
  }

  registerWithFormData(data: FormData): Observable<any> {
    return this.http.put(`${this.apiUrl}/signup`, data);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/signin`, credentials)
      .pipe(
        tap(response => {
          this.setAuthData(response.token, response.refreshToken, response.user);
        })
      );
  }

  resetPassword(credentials: { email: string; }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/password/reset`, credentials)
      .pipe(
        tap(response => {
          this.setAuthData(response.token, response.refreshToken, response.user);
        })
      );
  }


  logout(): void {
    this.clearAuthData();
  }

  private setAuthData(token: string, refreshToken?: string, user?: User | null): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token); // alias lu par certains services
      if (refreshToken) {
        localStorage.setItem('refreshToken', refreshToken);
      }
      if (user) {
        localStorage.setItem('user', JSON.stringify(user));
      }
    }

    this._token.set(token);
    if (refreshToken) this._refreshToken.set(refreshToken);
    if (user) this._currentUser.set(user);
    this._isAuthenticated.set(true);
  }

  private clearAuthData(): void {
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('auth_token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
    }

    this._token.set(null);
    this._refreshToken.set(null);
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
  }

  // ✅ CORRECTION MAJEURE: Méthode pour obtenir le token
  getToken(): string | null {
    const token = this._token();

    if (!token) {
      return null;
    }

    // Retrait de la suppression automatique stricte sinon l'intercepteur n'a pas le temps
    // de déclencher le refresh token
    // On revoie le token, c'est l'intercepteur qui va gérer le refresh si expiré ou l'API qui revoie 401.

    return token;
  }

  // Mettre à jour le token
  updateToken(token: string, refreshToken?: string): void {
    this._token.set(token);
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
      localStorage.setItem('auth_token', token);
      if (refreshToken) {
        this._refreshToken.set(refreshToken);
        localStorage.setItem('refreshToken', refreshToken);
      }
    }
  }

  getRefreshToken(): string | null {
    return this._refreshToken() || (isPlatformBrowser(this.platformId) ? localStorage.getItem('refreshToken') : null);
  }

  // Méthode de Refresh Token
  refreshAuthToken(): Observable<any> {
    const refreshToken = this._refreshToken() || (isPlatformBrowser(this.platformId) ? localStorage.getItem('refreshToken') : null);
    if (!refreshToken) {
      this.clearAuthData();
      return of(null);
    }
    
    // Remplacer "refresh" par votre route de refresh token côté back
    return this.http.post<any>(`${this.apiUrl}/refresh`, { refreshToken }).pipe(
      tap((tokens: any) => {
        this.updateToken(tokens.token, tokens.refreshToken);
      }),
      catchError(err => {
        this.clearAuthData();
        // Optionnel : rediriger vers /login via Router (s'il est injecté)
        return of(null);
      })
    );
  }

  // ✅ CORRECTION MAJEURE: Méthode pour obtenir les headers d'authentification
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();

    if (!token) {
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ✅ AMÉLIORATION: Validation du token plus robuste
  isTokenValid(): boolean {
    const token = this._token();

    if (!token) {
      return false;
    }

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length !== 3) {
        return false;
      }

      const payload = JSON.parse(atob(tokenParts[1]));

      if (payload.exp) {
        const expirationTime = payload.exp * 1000;
        const currentTime = Date.now();
        const marginTime = 5 * 60 * 1000;

        if (expirationTime - marginTime <= currentTime) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }

  // ✅ MÉTHODE CORRIGÉE: Récupération de l'utilisateur avec meilleure gestion d'erreurs
  getCurrentUser(): Observable<User> {
    const headers = this.getAuthHeaders();

    // Vérifier si on a un token valide avant de faire l'appel
    if (!headers.get('Authorization')) {
      return of(null as any);
    }

    return this.http.get<User>(`${this.userApiUrl}/me`, { headers }).pipe(
      tap(user => {
        if (user) {
          this._currentUser.set(user);
          if (isPlatformBrowser(this.platformId)) {
            localStorage.setItem('user', JSON.stringify(user));
          }
        }
      }),
      catchError(error => {
        if (error.status === 401 || error.status === 403) {
          this.clearAuthData();
        }
        return of(null as any);
      })
    );
  }

  // ✅ NOUVELLES MÉTHODES: Vérifications des profils avec gestion d'array
  hasProfile(profile: profil): boolean {
    const userProfiles = this.userProfile();
    return userProfiles ? userProfiles.includes(profile) : false;
  }

  hasAnyProfile(profiles: profil[]): boolean {
    const userProfiles = this.userProfile();
    if (!userProfiles) return false;

    return profiles.some(profile => userProfiles.includes(profile));
  }

  isSiteManager(): boolean {
    return this.hasProfile(profil.SITE_MANAGER);
  }

  // isSupplier(): boolean {
  //   return this.hasProfile(profil.SUPPLIER);
  // }

  isSubcontractor(): boolean {
    return this.hasProfile(profil.SUBCONTRACTOR);
  }

  // ✅ MÉTHODES CORRIGÉES: Vérifications des permissions
  hasAuthority(authority: string): boolean {
    const user = this._currentUser();
    return user?.authorities.some(auth => auth.authority === authority) || false;
  }

  hasPermission(permission: string): boolean {
    const permissions = this.userPermissions();
    return permissions.includes(permission);
  }

  hasAnyPermission(requiredPermissions: string[]): boolean {
    const userPermissions = this.userPermissions();
    return requiredPermissions.some(permission => userPermissions.includes(permission));
  }

  // ✅ NOUVELLES MÉTHODES: Vérifications des actions spécifiques
  canCreateReport(): boolean {
    return this.isAccountValid() &&
      this.isAuthenticated() &&
      this.hasPermission('REPORT_CREATE');
  }

  canViewReport(): boolean {
    return this.isAccountValid() &&
      this.isAuthenticated() &&
      this.hasPermission('REPORT_VIEW');
  }

  canPerformAction(): boolean {
    return this.isAccountValid() && this.isAuthenticated();
  }

  // Méthodes spécifiques aux nouveaux profils
  canManageSites(): boolean {
    return this.isSiteManager() && this.hasPermission('SITE_MANAGEMENT');
  }



  canManageSubcontracts(): boolean {
    return this.isSubcontractor() && this.hasPermission('TASK_MANAGEMENT');
  }

  canAccessProjects(): boolean {
    return this.canManageSites() || this.canManageSubcontracts();
  }

  // Méthodes utilitaires pour les abonnements
  getActiveSubscription(): Subscription | null {
    const activeSubscriptions = this.activeSubscriptions();
    return activeSubscriptions.length > 0 ? activeSubscriptions[0] : null;
  }

  getSubscriptionStatus(): string {
    const activeSubscription = this.getActiveSubscription();
    return activeSubscription?.status || 'NONE';
  }

  // ✅ NOUVELLE MÉTHODE: ID de l'utilisateur connecté
  getConnectedUserId(): number | null {
    return this._currentUser()?.id ?? null;
  }

  // Méthode pour formater la date de création
  getUserCreationDate(): Date | null {
    const user = this._currentUser();
    if (!user?.createdAt) return null;

    const [year, month, day, hour, minute, second] = user.createdAt;
    return new Date(year, month - 1, day, hour, minute, second);
  }

  // Méthode pour formater les dates d'abonnement
  formatSubscriptionDate(dateArray: number[]): Date {
    const [year, month, day] = dateArray;
    return new Date(year, month - 1, day);
  }

  // Méthode pour rafraîchir les informations utilisateur
  refreshUser(): Observable<User> {
    return this.getCurrentUser();
  }

  // Méthode pour mettre à jour le profil utilisateur (avec ou sans photo)
  updateUserProfile(formData: FormData, id: number): Observable<User> {
    // Pour FormData, ne pas définir Content-Type (le navigateur le fait automatiquement avec boundary)
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.getToken()}`
    });

    return this.http.put<User>(`${this.userApiUrl}/${id}`, formData, { headers }).pipe(
      tap(updatedUser => {
        this._currentUser.set(updatedUser);
      }),
      catchError(error => {
        throw error;
      })
    );
  }

  // Méthodes utilitaires pour les informations utilisateur
  getUserInitials(): string {
    const user = this._currentUser();
    if (!user) return '';

    const firstInitial = user.prenom.charAt(0).toUpperCase();
    const lastInitial = user.nom.charAt(0).toUpperCase();
    return `${firstInitial}${lastInitial}`;
  }

  getUserDisplayName(): string {
    return this.userFullName() || 'Utilisateur';
  }

  /**
   * Retourne l'URL complète de la photo de l'utilisateur
   */
  getUserPhotoUrl(userId?: number): string {
    const user = this._currentUser();
    const id = userId || user?.id;

    // Si l'utilisateur a une photo définie (chemin relatif)
    if (user?.photo) {
      return `${environment.filebaseUrl}${user.photo}?t=${new Date().getTime()}`;
    }

    // Fallback vers l'API si aucun chemin n'est stocké (si supporté par le backend)
    // ou vers l'image par défaut
    if (id) {
      return `${this.userApiUrl}/photo/${id}?t=${new Date().getTime()}`;
    }

    return 'assets/images/profil.png';
  }

  hasUserPhoto(): boolean {
    const user = this._currentUser();
    return user?.photo !== null && user?.photo !== undefined;
  }

  // Méthodes pour la gestion des notifications
  canReceiveNotifications(): boolean {
    return this._currentUser()?.notifiable || false;
  }

  // Méthodes pour vérifier la validité du compte
  isAccountExpired(): boolean {
    const user = this._currentUser();
    return user ? !user.accountNonExpired : true;
  }

  areCredentialsExpired(): boolean {
    const user = this._currentUser();
    return user ? !user.credentialsNonExpired : true;
  }

  isAccountLocked(): boolean {
    const user = this._currentUser();
    return user ? !user.accountNonLocked : true;
  }

  // ✅ NOUVELLES MÉTHODES: Formatage des profils
  getFormattedUserProfile(): string[] {
    const profiles = this.userProfile();
    if (!profiles) return ['Utilisateur'];

    return profiles.map(profile => {
      const config = this.getProfileConfig(profile);
      return config?.label || profile;
    });
  }

  getUserProfileDescription(): string[] {
    const profiles = this.userProfile();
    if (!profiles) return ['Accès de base au système'];

    return profiles.map(profile => {
      const config = this.getProfileConfig(profile);
      return config?.description || 'Accès de base au système';
    });
  }

  // Méthode pour valider les données d'inscription
  validateRegistrationData(data: RegistrationData): string[] {
    const errors: string[] = [];

    if (!data.nom?.trim()) {
      errors.push('Le nom est requis');
    }

    if (!data.prenom?.trim()) {
      errors.push('Le prénom est requis');
    }

    if (!data.email?.trim()) {
      errors.push('L\'email est requis');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Format d\'email invalide');
    }

    if (!data.password?.trim()) {
      errors.push('Le mot de passe est requis');
    } else if (data.password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (!data.telephone?.trim()) {
      errors.push('Le téléphone est requis');
    }

    if (!data.profil) {
      errors.push('Le profil est requis');
    } else if (!Object.values(profil).includes(data.profil)) {
      errors.push('Profil utilisateur invalide');
    }

    return errors;
  }
  // ✅ NOUVELLE MÉTHODE: Récupérer le premier profil de manière fiable
  getUserFirstProfile(): string | null {
    const user = this._currentUser();
    if (!user) return null;

    // Vérifier la propriété profils (string) en premier
    if (user.profils && typeof user.profils === 'string') {
      return user.profils;
    }

    // Ensuite vérifier profil (array)
    if (Array.isArray(user.profil) && user.profil.length > 0) {
      return user.profil[0];
    }

    // Fallback: profil comme string
    if (typeof user.profil === 'string') {
      return user.profil as any;
    }

    return null;
  }

}