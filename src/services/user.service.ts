import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';

// Interfaces pour le typage des réponses
export interface SubscriptionPlan {
  id: number;
  name: string;
  label: string;
  description: string;
  totalCost: number;
  installmentCount: number;
  projectLimit: number;
  unlimitedProjects: boolean;
  yearlyDiscountRate: number;
  active: boolean;
}

export interface UserSubscription {
  id: number;
  subscriptionPlan: SubscriptionPlan;
  startDate: number[];
  endDate: number[];
  active: boolean;
  paidAmount: number;
  installmentCount: number;
  dateInvoice: number[];
  status: string;
  renewed: boolean;
  currentProjectCount: number;
  remainingProjects: number;
  properties: any[];
}

export interface Authority {
  authority: string;
}

export interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  adress: string;
  technicalSheet: any;
  profil: string;
  activated: boolean;
  notifiable: boolean;
  telephone: string;
  subscription: UserSubscription;
  company: any;
  createdAt: number[];
  funds: number;
  note: number;
  photo: string;
  idCard: string;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  accountNonLocked: boolean;
  authorities: Authority[];
  username: string;
  enabled: boolean;
}
export interface UserPageResponse {
  content: User[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  first: boolean;
  empty: boolean;
}


export interface CreateUserRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  date: string;
  lieunaissance: string;
  adress: string;
  profil: string;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = 'https://wakana.online/api/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('🔧 UserService initialisé');
  }

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById(id: number): Observable<User> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/user/${id}`;
    
    console.log('📡 API Call: getUserById');
    console.log('🔗 URL:', url);
    console.log('👤 User ID:', id);
    
    return this.http.get<User>(url, { headers })
      .pipe(
        tap(user => {
          console.log('✅ Utilisateur récupéré:');
          console.log('  - Nom:', user.nom);
          console.log('  - Prénom:', user.prenom);
          console.log('  - Email:', user.email);
          console.log('  - Profil:', user.profil);
          console.log('  - Abonnement actif:', user.subscription?.active || 'Aucun');
        }),
        catchError(error => this.handleError(error, 'getUserById'))
      );
  }
/**
 * Récupère tous les utilisateurs avec possibilité de recherche et filtrage par profil
 */
getAllUsers(keyword?: string, profil?: string, page: number = 0, size: number = 10): Observable<UserPageResponse> {
  const headers = this.getAuthHeaders();
  
  // Construction des paramètres de requête
  let params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());
  
  // Ajout du keyword s'il est fourni
  if (keyword && keyword.trim() !== '') {
    params = params.set('keyword', keyword.trim());
  }
  
  // Ajout du profil s'il est fourni
  if (profil && profil.trim() !== '') {
    params = params.set('profil', profil.trim());
  }

  const url = `${this.baseUrl}/user/search`;
  
  console.log('📡 API Call: getAllUsers');
  console.log('🔗 URL:', url);
  console.log('🔍 Keyword:', keyword || 'Aucun');
  console.log('👔 Profil:', profil || 'Tous');
  console.log('📄 Page:', page);
  console.log('📊 Size:', size);
  
  return this.http.get<UserPageResponse>(url, { headers, params })
    .pipe(
      tap(response => {
        console.log('✅ Utilisateurs récupérés:');
        console.log('  - Total éléments:', response.totalElements);
        console.log('  - Pages totales:', response.totalPages);
        console.log('  - Page actuelle:', response.number);
        console.log('  - Utilisateurs:', response.content.length);
        console.log('  - Utilisateurs avec abonnement:', response.content.filter(u => u.subscription).length);
      }),
      catchError(error => this.handleError(error, 'getAllUsers'))
    );
}
  /**
   * Met à jour un utilisateur
   */
  putUser(id: number, userData: Partial<User>): Observable<User> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/user/${id}`;
    
    console.log('📡 API Call: putUser');
    console.log('🔗 URL:', url);
    console.log('👤 User ID:', id);
    console.log('📝 Données à mettre à jour:', userData);
    
    return this.http.put<User>(url, userData, { headers })
      .pipe(
        tap(updatedUser => {
          console.log('✅ Utilisateur mis à jour:');
          console.log('  - Nom:', updatedUser.nom);
          console.log('  - Prénom:', updatedUser.prenom);
          console.log('  - Email:', updatedUser.email);
        }),
        catchError(error => this.handleError(error, 'putUser'))
      );
  }

  /**
   * Supprime un utilisateur
   */
  deleteUser(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/user/${id}`;
    
    console.log('📡 API Call: deleteUser');
    console.log('🔗 URL:', url);
    console.log('👤 User ID à supprimer:', id);
    
    return this.http.delete(url, { headers })
      .pipe(
        tap(() => {
          console.log('✅ Utilisateur supprimé avec succès');
        }),
        catchError(error => this.handleError(error, 'deleteUser'))
      );
  }
/**
 * Récupère les utilisateurs par profil avec possibilité de recherche
 */
getUserByProfil(profil: string, keyword?: string, page: number = 0, size: number = 10): Observable<UserPageResponse> {
  const headers = this.getAuthHeaders();
  // Construction des paramètres de requête
  let params = new HttpParams()
    .set('profil', profil)
    .set('page', page.toString())
    .set('size', size.toString());
  
  // Ajout du keyword s'il est fourni
  if (keyword && keyword.trim() !== '') {
    params = params.set('keyword', keyword.trim());
  }

  const url = `${this.baseUrl}/user/by-profil`;
  
  console.log('📡 API Call: getUserByProfil');
  console.log('🔗 URL:', url);
  console.log('👔 Profil:', profil);
  console.log('🔍 Keyword:', keyword || 'Aucun');
  console.log('📄 Page:', page);
  console.log('📊 Size:', size);
  
  return this.http.get<UserPageResponse>(url, { headers, params })
    .pipe(
      tap(response => {
        console.log('✅ Utilisateurs par profil récupérés:');
        console.log('  - Total éléments:', response.totalElements);
        console.log('  - Pages totales:', response.totalPages);
        console.log('  - Page actuelle:', response.number);
        console.log('  - Utilisateurs:', response.content.length);
        console.log('  - Utilisateurs avec abonnement:', response.content.filter(u => u.subscription).length);
      }),
      catchError(error => this.handleError(error, 'getUserByProfil'))
    );
}
/**
 * Crée un nouvel utilisateur (inscription)
 */
createUser(userData: CreateUserRequest): Observable<any> {
  // Pour l'inscription, on n'utilise PAS les headers d'authentification
  const headers = new HttpHeaders({
    'Content-Type': 'application/json'
  });
  
  const url = `${this.baseUrl}/auth/signup`;
  
  console.log('📡 API Call: createUser (inscription)');
  console.log('🔗 URL:', url);
  console.log('📋 Content-Type: application/json');
  console.log('👤 Données nouvel utilisateur:', {
    nom: userData.nom,
    prenom: userData.prenom,
    email: userData.email,
    telephone: userData.telephone,
    profil: userData.profil,
    date: userData.date,
    lieunaissance: userData.lieunaissance,
    adress: userData.adress,
    password: '***'
  });
  
  // Vérification des champs obligatoires
  const requiredFields = ['nom', 'prenom', 'email', 'password', 'telephone', 'adress', 'profil'];
  const missingFields = requiredFields.filter(field => !userData[field as keyof CreateUserRequest]);
  
  if (missingFields.length > 0) {
    console.error('❌ Champs obligatoires manquants:', missingFields);
  }
  
  return this.http.post(url, userData, { headers })
    .pipe(
      tap(response => {
        console.log('✅ Utilisateur créé avec succès:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur createUser - Status:', error.status);
        console.error('❌ Erreur createUser - Body:', error.error);
        console.error('❌ Erreur createUser - Message:', error.message);
        
        // Si erreur 400, afficher les détails
        if (error.status === 400) {
          console.error('❌ ERREUR 400 - Données envoyées:', userData);
          if (error.error?.message) {
            console.error('❌ Message serveur:', error.error.message);
          }
          if (error.error?.errors) {
            console.error('❌ Détails des erreurs:', error.error.errors);
          }
        }
        
        return this.handleError(error, 'createUser');
      })
    );
}

  /**
   * Récupère les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    console.log('🔑 Récupération des headers d\'authentification...');
    
    if (this.authService && typeof this.authService.getAuthHeaders === 'function') {
      const headers = this.authService.getAuthHeaders();
      const hasAuth = headers.get('Authorization') !== null;
      
      console.log('🔑 Headers depuis AuthService:', hasAuth ? '✅ OK' : '❌ Manquant');
      
      if (!hasAuth) {
        console.warn('⚠️ Aucun header Authorization trouvé!');
      }
      
      return headers;
    }
    
    console.warn('⚠️ AuthService.getAuthHeaders() non disponible, utilisation du fallback');
    
    const token = this.authService?.getToken() || localStorage.getItem('token');
    
    if (token) {
      console.log('🔑 Token trouvé:', token.substring(0, 20) + '...');
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    
    console.error('❌ Aucun token d\'authentification trouvé!');
    
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  /**
   * Gestion des erreurs HTTP avec contexte
   */
  private handleError(error: any, context: string = 'unknown'): Observable<never> {
    console.error(`❌ Erreur dans UserService.${context}:`, error);
    console.error('❌ Status:', error.status);
    console.error('❌ Status Text:', error.statusText);
    console.error('❌ URL:', error.url);
    console.error('❌ Message:', error.message);
    
    if (error.error) {
      console.error('❌ Error body:', error.error);
    }
    
    let errorMessage = 'Une erreur est survenue';
    let userMessage = errorMessage;
    
    switch (error.status) {
      case 0:
        errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
        userMessage = 'Problème de connexion au serveur';
        break;
      case 400:
        errorMessage = 'Requête invalide. Vérifiez les données saisies.';
        userMessage = 'Données invalides';
        break;
      case 401:
        errorMessage = 'Non authentifié. Votre session a expiré.';
        userMessage = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 403:
        errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
        userMessage = 'Accès non autorisé';
        break;
      case 404:
        errorMessage = `Utilisateur non trouvé.`;
        userMessage = 'Utilisateur introuvable';
        break;
      case 409:
        errorMessage = 'Conflit - L\'utilisateur existe déjà.';
        userMessage = 'Un utilisateur avec cet email ou téléphone existe déjà';
        break;
      case 500:
        errorMessage = 'Erreur serveur interne.';
        userMessage = 'Erreur serveur. Réessayez plus tard.';
        break;
      default:
        if (error.error instanceof ErrorEvent) {
          errorMessage = `Erreur client: ${error.error.message}`;
          userMessage = 'Erreur de connexion';
        } else {
          errorMessage = `Code: ${error.status}, Message: ${error.message}`;
          userMessage = `Erreur ${error.status}`;
        }
    }
    
    console.error('💬 Message utilisateur:', userMessage);
    
    return throwError(() => ({
      message: errorMessage,
      userMessage: userMessage,
      status: error.status,
      context: context,
      originalError: error
    }));
  }

  /**
   * Formate les données de création d'utilisateur
   */
  formatCreateUserData(
    nom: string,
    prenom: string,
    email: string,
    password: string,
    telephone: string,
    date: string,
    lieunaissance: string,
    adress: string,
    profil: string
  ): CreateUserRequest {
    return {
      nom,
      prenom,
      email,
      password,
      telephone,
      date,
      lieunaissance,
      adress,
      profil
    };
  }



  /**
   * Debug des endpoints disponibles
   */
  debugEndpoints(): void {
    console.log('🔍 === USER SERVICE ENDPOINTS ===');
    console.log('Base URL:', this.baseUrl);
    console.log('Endpoints disponibles:');
    console.log('  - getUserById: GET', `${this.baseUrl}/user/{id}`);
    console.log('  - putUser: PUT', `${this.baseUrl}/user/{id}`);
    console.log('  - deleteUser: DELETE', `${this.baseUrl}/user/{id}`);
    console.log('  - createUser: POST', `${this.baseUrl}/auth/signup`);
    console.log('========================');
  }
}