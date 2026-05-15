import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Ajouter cette interface après CreateUserRequest
export interface UpdateUserRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  date?: string;          // ✅ AJOUTER
  lieunaissance?: string; // ✅ AJOUTER
  adress: string;
  profil: string;
  photo?: File;
}

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
  lieunaissance:string,
  date:string,
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
  photo?: File; // Ajout du champ photo optionnel
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private baseUrl = `${environment.apiUrl}/v1`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupère un utilisateur par son ID
   */
  getUserById(id: number): Observable<User> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/user/${id}`;

    return this.http.get<User>(url, { headers })
      .pipe(
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

  return this.http.get<UserPageResponse>(url, { headers, params })
    .pipe(
      catchError(error => this.handleError(error, 'getAllUsers'))
    );
}

/**
 * Met à jour un utilisateur avec support de photo
 */
putUser(id: number, userData: UpdateUserRequest): Observable<User> {
  const url = `${this.baseUrl}/user/${id}`;
  
  
  
  // Créer un FormData pour envoyer les données + fichier photo
  const formData = new FormData();
  formData.append('nom', userData.nom);
  formData.append('prenom', userData.prenom);
  formData.append('email', userData.email);
  formData.append('telephone', userData.telephone);
  formData.append('adress', userData.adress || '');
  formData.append('profil', userData.profil);
  
  // Champs optionnels
  if (userData.date) {
    formData.append('date', userData.date);
  }
  if (userData.lieunaissance) {
    formData.append('lieunaissance', userData.lieunaissance);
  }
  
  // Ajouter la photo si elle existe
  if (userData.photo) {
    formData.append('photo', userData.photo, userData.photo.name);
  }
  
  // Headers sans Content-Type pour FormData
  const headers = this.getAuthHeaders();
  const formDataHeaders = new HttpHeaders({
    'Authorization': headers.get('Authorization') || ''
  });
  
  return this.http.put<User>(url, formData, { headers: formDataHeaders })
    .pipe(
      catchError(error => this.handleError(error, 'putUser'))
    );
}

/**
 * Formate les données de mise à jour d'utilisateur
 */
formatUpdateUserData(
  nom: string,
  prenom: string,
  email: string,
  telephone: string,
  adress: string,
  profil: string,
  photo?: File,
  date?: string,
  lieunaissance?: string
): UpdateUserRequest {
  return {
    nom,
    prenom,
    email,
    telephone,
    adress,
    profil,
    photo,
    date,
    lieunaissance
  };
}

/**
 * Met à jour un utilisateur avec FormData (pour gérer les fichiers)
 * À ajouter dans user.service.ts
 */
updateUserWithFormData(userId: number, formData: FormData): Observable<User> {
  const token = this.authService.getToken();
  
  if (!token) {
    return throwError(() => ({
      message: 'Non authentifié',
      userMessage: 'Vous devez être connecté',
      status: 401
    }));
  }

  // ⚠️ IMPORTANT: Ne pas définir Content-Type pour FormData
  // Le navigateur le définira automatiquement avec le boundary correct
  const headers = new HttpHeaders({
    'Authorization': `Bearer ${token}`
  });

  const url = `${this.baseUrl}/user/${userId}`;

  return this.http.put<User>(url, formData, { headers })
    .pipe(
      catchError(error => {
        
        let errorMessage = 'Une erreur est survenue lors de la modification';
        let userMessage = errorMessage;

        switch (error.status) {
          case 400:
            errorMessage = 'Données invalides';
            userMessage = 'Les données fournies sont invalides';
            break;
          case 401:
            errorMessage = 'Non authentifié';
            userMessage = 'Votre session a expiré';
            break;
          case 403:
            errorMessage = 'Accès refusé';
            userMessage = 'Vous n\'avez pas les permissions nécessaires';
            break;
          case 404:
            errorMessage = 'Utilisateur non trouvé';
            userMessage = 'L\'utilisateur n\'existe pas';
            break;
          case 409:
            errorMessage = 'Conflit - Email déjà utilisé';
            userMessage = 'Cet email est déjà utilisé par un autre utilisateur';
            break;
          case 413:
            errorMessage = 'Fichier trop volumineux';
            userMessage = 'La photo est trop volumineuse (max 5MB)';
            break;
          default:
            if (error.error?.message) {
              userMessage = error.error.message;
            }
        }

        return throwError(() => ({
          message: errorMessage,
          userMessage: userMessage,
          status: error.status,
          originalError: error
        }));
      })
    );
}
  /**
   * Supprime un utilisateur
   */
  deleteUser(id: number): Observable<any> {
    const headers = this.getAuthHeaders();
    const url = `${this.baseUrl}/user/${id}`;

    return this.http.delete(url, { headers })
      .pipe(
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
  

  
  return this.http.get<UserPageResponse>(url, { headers, params })
    .pipe(
      catchError(error => this.handleError(error, 'getUserByProfil'))
    );
}
/**
 * Crée un nouvel utilisateur (inscription)
 */
createUser(userData: CreateUserRequest): Observable<any> {
  const url = `${environment.endpoints.auth}/signup`;

  const formData = new FormData();
  // Champs obligatoires
  formData.append('nom', userData.nom);
  formData.append('prenom', userData.prenom);
  formData.append('email', userData.email);
  formData.append('password', userData.password);
  formData.append('telephone', userData.telephone);
  formData.append('profil', userData.profil);
  // Champs optionnels — n'envoyer que s'ils ont une valeur
  if (userData.adress?.trim()) formData.append('adress', userData.adress.trim());
  if (userData.date?.trim()) formData.append('date', userData.date.trim());
  if (userData.lieunaissance?.trim()) formData.append('lieunaissance', userData.lieunaissance.trim());
  if (userData.photo) formData.append('photo', userData.photo, userData.photo.name);

  return this.http.post(url, formData)
    .pipe(
      catchError(error => {
        if (error.status === 409) {
          return throwError(() => ({ userMessage: 'Cet email ou ce numéro est déjà utilisé.' }));
        }
        return this.handleError(error, 'createUser');
      })
    );
}

  /**
   * Récupère les headers d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    if (this.authService && typeof this.authService.getAuthHeaders === 'function') {
      return this.authService.getAuthHeaders();
    }

    const token = this.authService?.getToken() || localStorage.getItem('token');

    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }

    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

  /**
   * Gestion des erreurs HTTP avec contexte
   */
  private handleError(error: any, context: string = 'unknown'): Observable<never> {
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



}