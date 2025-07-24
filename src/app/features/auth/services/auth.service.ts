import { Injectable, signal, computed, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, tap, catchError, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';

// Interface pour le plan d'abonnement
interface SubscriptionPlan {
  id: number;
  name: string;
  totalCost: number;
  installmentCount: number;
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
  USER = 'USER'
}
export enum profil {
  SITE_MANAGER = 'SITE_MANAGER',
  SUBCONTRACTOR = 'SUBCONTRACTOR',
  SUPPLIER = 'SUPPLIER'
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
  adress: string;
  technicalSheet: string | null;
  profil: profil[];
  activated: boolean;
  notifiable: boolean;
  telephone: string;
  subscriptions: Subscription[];
  company: any | null;
  createdAt: number[]; // [year, month, day, hour, minute, second, nanosecond]
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
  user: User;
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
[x: string]: any;
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
  private apiUrl = 'https://wakana.online/api/v1/auth';
  private userApiUrl = 'https://wakana.online/api/v1/user';
  
  // Configuration des profils disponibles
  private readonly profilesConfig: any[] = [
    // {
    //   key: profil.ADMIN,
    //   label: 'Administrateur',
    //   description: 'Accès complet au système',
    //   icon: 'admin-icon',
    //   permissions: ['FULL_ACCESS']
    // },
    {
      key: profil.SITE_MANAGER,
      label: 'Gestionnaire de Site',
      description: 'Gestion des sites et équipes',
      icon: 'manager-icon',
      permissions: ['SITE_MANAGEMENT', 'TEAM_MANAGEMENT']
    },
    {
      key: profil.SUPPLIER,
      label: 'Fournisseur',
      description: 'Fourniture de matériaux et services',
      icon: 'supplier-icon',
      permissions: ['SUPPLY_MANAGEMENT', 'INVENTORY_ACCESS']
    },
    {
      key: profil.SUBCONTRACTOR,
      label: 'Sous-traitant',
      description: 'Exécution de travaux spécialisés',
      icon: 'subcontractor-icon',
      permissions: ['PROJECT_ACCESS', 'TASK_MANAGEMENT']
    },
    // {
    //   key: profil.USER,
    //   label: 'Utilisateur',
    //   description: 'Accès de base au système',
    //   icon: 'user-icon',
    //   permissions: ['BASIC_ACCESS']
    // }
  ];
  
  // Signals pour l'état d'authentification
  private _currentUser = signal<User | null>(null);
  private _isAuthenticated = signal(false);
  private _token = signal<string | null>(null);

  // Signaux en lecture seule pour les composants
  currentUser = this._currentUser.asReadonly();
  isAuthenticated = this._isAuthenticated.asReadonly();
  
  // Computed signals pour les informations utilisateur
  userProfile = computed(() => this._currentUser()?.profil || null);
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

  // Computed signal pour les permissions basées sur le profil
  userPermissions = computed(() => {
    const profile = this.userProfile();
    if (!profile) return [];
    
    const config = this.profilesConfig.find(p => p.key === profile);
    return config?.permissions || [];
  });

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Vérifier s'il y a un token stocké au démarrage
    this.initializeAuthState();
  }

  private initializeAuthState(): void {
    // Vérifier si on est côté client avant d'utiliser localStorage
    if (isPlatformBrowser(this.platformId)) {
      const storedToken = localStorage.getItem('token');
      
      if (storedToken) {
        this._token.set(storedToken);
        this._isAuthenticated.set(true);
        
        // Récupérer les informations utilisateur fraîches depuis l'API
        this.getCurrentUser().subscribe({
          next: (user) => {
            this._currentUser.set(user);
            console.log('Utilisateur récupéré depuis l\'API:', user);
          },
          error: (error) => {
            console.error('Erreur lors de la récupération de l\'utilisateur:', error);
            // Si l'API échoue, nettoyer les données d'authentification
            this.clearAuthData();
          }
        });
      } 
    }
  }


  
  // Méthode pour obtenir la liste des profils disponibles
  getAvailableProfiles(): any[] {
    return this.profilesConfig;
  }

  // Méthode pour obtenir la configuration d'un profil spécifique
  getProfileConfig(profile: profil): any | undefined {
    return this.profilesConfig.find(p => p.key === profile);
  }

  // Méthode pour obtenir les profils disponibles pour la création de compte
  getRegistrationProfiles(): any[] {
    // Exclure ADMIN des profils disponibles lors de l'inscription
    return this.profilesConfig.filter(p => p.key !== profil.SITE_MANAGER);
  }

  register(registrationData: RegistrationData): Observable<any> {
    // Validation du profil
    if (!Object.values(profil).includes(registrationData.profil)) {
      throw new Error('Profil utilisateur invalide');
    }

    // Créer FormData si nécessaire pour l'upload de fichiers
    const formData = new FormData();
    Object.entries(registrationData).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });

    return this.http.post(`${this.apiUrl}/signup`, formData);
  }

  // Surcharge pour accepter aussi FormData (rétrocompatibilité)
  registerWithFormData(data: FormData): Observable<any> {
    return this.http.post(`${this.apiUrl}/signup`, data);
  }

  login(credentials: { email: string; password: string }): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/signin`, credentials)
      .pipe(
        tap(response => {
          // Mettre à jour les signals après une connexion réussie
          this.setAuthData(response.token, response.user);
        })
      );
  }

  logout(): void {
    this.clearAuthData();
    // Optionnel: appeler l'API de déconnexion
    // this.http.post(`${this.apiUrl}/logout`, {}).subscribe();
  }

  private setAuthData(token: string, user: User): void {
    // Stocker seulement le token dans localStorage
    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem('token', token);
      // console.log('Token stocké dans localStorage');
    }
    
    // Mettre à jour les signals
    this._token.set(token);
    this._currentUser.set(user);
    this._isAuthenticated.set(true);
  }

  private clearAuthData(): void {
    // Nettoyer localStorage seulement côté client
    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user'); // Au cas où il y aurait encore des données anciennes
    }
    
    // Réinitialiser les signals
    this._token.set(null);
    this._currentUser.set(null);
    this._isAuthenticated.set(false);
  }

  // Méthode pour obtenir le token (utile pour les intercepteurs)
  getToken(): string | null {
    return this._token();
  }

  // Méthode pour obtenir les headers d'authentification
  private getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }
  // getConnectedUserId(): number | null {
  //   return this._currentUser()?.id ?? null;
  
  
  // Nouvelle méthode pour récupérer l'utilisateur connecté depuis l'API
  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.userApiUrl}/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      tap(user => {
        if (user && user.profil) {
          // console.log('Profil de l\'utilisateur connecté:', user.profil);
        }
        this._currentUser.set(user);
        // console.log('Informations utilisateur mises à jour:', user);
      }),
      catchError(error => {
        // console.error('Erreur lors de la récupération de l\'utilisateur:', error);
        return of(null as any);
      })
    );
  }
  

  // Méthode pour obtenir l'URL de la photo de profil
  getUserPhotoUrl(userId?: number): string {
    const user = this._currentUser();
    const id = userId || user?.id;
    
    if (id) {
      return `${this.userApiUrl}/photo/${id}`;
    }
    
    return 'assets/images/profil.png'; // Image par défaut
  }

  // Méthode pour vérifier si l'utilisateur a une photo
  hasUserPhoto(): boolean {
    const user = this._currentUser();
    return user?.photo !== null && user?.photo !== undefined;
  }

  // Méthodes pour vérifier les rôles et profils
  // hasProfile(profile: UserProfile): boolean {
  //   return this.userProfile() === profile;
  // }

  // hasAnyProfile(profiles: UserProfile[]): boolean {
  //   const userProfile = this.userProfile();
  //   return userProfile ? profiles.includes(userProfile) : false;
  // }

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

  // Méthode pour vérifier si l'utilisateur peut effectuer certaines actions
  canPerformAction(): boolean {
    return this.isAccountValid() && this.isAuthenticated();
  }

  // Méthodes spécifiques aux nouveaux profils
  canManageSites(): boolean {
    return this.isSiteManager();
  }
  isSiteManager(): boolean {
    throw new Error('Method not implemented.');
  }

  canSupplyMaterials(): boolean {
    return this.isSupplier();
  }
  isSupplier(): boolean {
    throw new Error('Method not implemented.');
  }

  canManageSubcontracts(): boolean {
    return  this.isSubcontractor();
  }
  isSubcontractor(): boolean {
    throw new Error('Method not implemented.');
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

  // Méthode pour mettre à jour le profil utilisateur
  updateUserProfile(userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.userApiUrl}/profile`, userData, { 
      headers: this.getAuthHeaders() 
    }).pipe(
      tap(updatedUser => {
        this._currentUser.set(updatedUser);
        // console.log('Profil utilisateur mis à jour:', updatedUser);
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

  // Méthode utilitaire pour vérifier si on est côté client
  private isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  // Méthodes pour la gestion des notifications
  canReceiveNotifications(): boolean {
    return this._currentUser()?.notifiable || false;
  }

  // Méthode pour vérifier la validité du compte
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

  // Méthode pour obtenir le profil formaté en français
  // getFormattedUserProfile(): string {
  //   const profile = this.userProfile();
  //   const config = this.getProfileConfig(profile as profil);
  //   return config?.label || 'Utilisateur';
  // }

  // Méthode pour obtenir la description du profil
  // getUserProfileDescription(): string {
  //   const profile = this.userProfile();
  //   const config = this.getProfileConfig(profile as profil);
  //   return config?.description || 'Accès de base au système';
  // }

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
}