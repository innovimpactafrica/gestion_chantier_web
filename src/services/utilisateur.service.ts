import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';  // Ajustez le chemin selon votre structure

// Interface pour la pagination
interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  offset: number;
  unpaged: boolean;
  paged: boolean;
}

// Interface pour les autorités
interface Authority {
  authority: string;
}

// Interface pour le plan de subscription
interface SubscriptionPlan {
  id: number;
  name: string;
  totalCost: number;
  installmentCount: number;
}

// Interface pour la subscription
interface Subscription {
  id: number;
  user: string;
  subscriptionPlan: SubscriptionPlan;
  startDate: string;
  endDate: string;
  active: boolean;
  paidAmount: number;
  installmentCount: number;
  dateInvoice: string;
  status: string;
  renewed: boolean;
}

// Interface pour la company
interface Company {
  id: number;
  name: string;
  logo: string;
  primaryColor: string;
  secondaryColor: string;
}

// Interface pour l'utilisateur/worker
export interface Worker {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  password: string;
  adress: string;
  technicalSheet: string | null;
  profil: string;
  activated: boolean;
  notifiable: boolean;
  telephone: string;
  present:boolean;
  subscriptions: Subscription[];
  company: Company | null;
  createdAt: string | number[]; // Peut être string ou array selon l'endpoint
  funds: number;
  note: number;
  photo: string | null;
  idCard: string | null;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  accountNonLocked: boolean;
  username: string;
  authorities: Authority[];
  enabled: boolean;
}

// Interface pour la réponse paginée
export interface WorkersResponse {
  content: Worker[];
  pageable: Pageable;
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

// Interface pour la création d'un worker
export interface CreateWorkerRequest {
  nom: string;
  prenom: string;
  email: string;
  password: string;
  telephone: string;
  date: string;
  lieunaissance: string;
  adress: string;
  profil: string;
  propertyId?: number; // Ajoutez ce champ optionnel
}

@Injectable({
  providedIn: 'root'
})
export class UtilisateurService {
  private apiUrl = 'https://wakana.online/api/workers';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupère la liste des utilisateurs/workers avec pagination
   * @param page Numéro de la page (par défaut 0)
   * @param size Taille de la page (par défaut 30)
   * @returns Observable de la réponse paginée
   */
  listUsers(page: number = 0, size: number = 30): Observable<WorkersResponse> {
    const currentUserId = this.authService.currentUser()?.id;
    
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<WorkersResponse>(
      `${this.apiUrl}/${currentUserId}/team/others`,
      
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }
  getWorkers(page: number = 0, size: number = 30,propertyId:number): Observable<WorkersResponse> {
    
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<WorkersResponse>(
      `${this.apiUrl}/property/${propertyId}`,
      
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Récupère la liste des fournisseurs avec pagination
   * @param page Numéro de la page (par défaut 0)
   * @param size Taille de la page (par défaut 30)
   * @returns Observable de la réponse paginée des fournisseurs
   */
  getSuppliers(page: number = 0, size: number = 30): Observable<WorkersResponse> {
    const currentUserId = this.authService.currentUser()?.id;
    
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<WorkersResponse>(
      `${this.apiUrl}/${currentUserId}/suppliers`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Récupère la liste des sous-traitants avec pagination
   * @param page Numéro de la page (par défaut 0)
   * @param size Taille de la page (par défaut 30)
   * @returns Observable de la réponse paginée des sous-traitants
   */
  getSubcontractors(page: number = 0, size: number = 30): Observable<WorkersResponse> {
    const currentUserId = this.authService.currentUser()?.id;
    
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<WorkersResponse>(
      `${this.apiUrl}/${currentUserId}/subcontractors`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Crée un nouveau worker
   * @param workerData Données du worker à créer
   * @returns Observable de la réponse de création
   */ 
  createUser(workerData: CreateWorkerRequest): Observable<Worker> {
    const currentUserId = this.authService.currentUser()?.id;
    
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    return this.http.post<Worker>(
      `${this.apiUrl}/create/${currentUserId}`,
      workerData,
      { headers: this.getAuthHeaders() }
    );
  }


  createWorker(workerData: CreateWorkerRequest,propertyId: number): Observable<Worker> {
 
    
    if (!propertyId) {
      throw new Error('Utilisateur non connecté');
    }

    return this.http.post<Worker>(
      `${this.apiUrl}/save/${propertyId}`,
      workerData,
      { headers: this.getAuthHeaders() }
    );
  }
  /**
   * Crée un nouveau fournisseur (worker avec profil SUPPLIER)
   * @param supplierData Données du fournisseur à créer
   * @returns Observable de la réponse de création
   */
  createSupplier(supplierData: Omit<CreateWorkerRequest, 'profil'>): Observable<Worker> {
    const currentUserId = this.authService.currentUser()?.id;
    
    if (!currentUserId) {
      throw new Error('Utilisateur non connecté');
    }

    // Ajouter le profil SUPPLIER automatiquement
    const workerData: CreateWorkerRequest = {
      ...supplierData,
      profil: 'SUPPLIER'
    };

    return this.http.post<Worker>(
      `${this.apiUrl}/create/${currentUserId}`,
      workerData,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Récupère les headers d'authentification
   * @returns HttpHeaders avec le token d'authentification
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Recherche des utilisateurs par nom
   * @param searchTerm Terme de recherche
   * @param page Numéro de la page
   * @param size Taille de la page
   * @returns Observable de la réponse paginée filtrée
   */
  searchUsers(searchTerm: string, page: number = 0, size: number = 30): Observable<WorkersResponse> {
    // Pour l'instant, on récupère tous les utilisateurs et on filtre côté client
    // Idéalement, l'API devrait supporter un paramètre de recherche
    return this.listUsers(page, size);
  }

  /**
   * Filtre les utilisateurs par statut
   * @param status Statut à filtrer
   * @param page Numéro de la page
   * @param size Taille de la page
   * @returns Observable de la réponse paginée filtrée
   */
  filterUsersByStatus(status: string, page: number = 0, size: number = 30): Observable<WorkersResponse> {
    // Pour l'instant, on récupère tous les utilisateurs et on filtre côté client
    // Idéalement, l'API devrait supporter un paramètre de filtrage par statut
    return this.listUsers(page, size);
  }

  /**
   * Convertit un Worker en TeamMember pour la compatibilité avec le composant existant
   * @param worker Worker à convertir
   * @returns TeamMember converti
   */
  static workerToTeamMember(worker: Worker): any {
    // Mapping des statuts - vous pouvez ajuster selon vos besoins
    let status: 'affecté' | 'non-affecté' | 'en mission' | 'inactive' = 'non-affecté';
    
    if (!worker.enabled || !worker.activated) {
      status = 'inactive';
    } else if (worker.profil === 'WORKER') {
      status = 'affecté'; // Par défaut, considérer les workers comme affectés
    }

    return {
      id: worker.id,
      name: `${worker.prenom} ${worker.nom}`,
      phone: worker.telephone,
      email: worker.email,
      position: worker.profil === 'WORKER' ? 'Ouvrier' : worker.profil,
      status: status,
      selected: false,
      // Données supplémentaires du worker
      originalWorker: worker
    };
  }

  /**
   * Convertit un Worker en Supplier pour l'affichage
   * @param worker Worker à convertir
   * @returns Supplier converti
   */
   workerToSupplier(worker: Worker): any {
    let status: 'actif' | 'inactif' = 'actif';
    
    if (!worker.enabled || !worker.activated) {
      status = 'inactif';
    }

    return {
      id: worker.id,
      raisonSociale: worker.company?.name || 'N/A',
      nomContact: `${worker.prenom} ${worker.nom}`,
      telephone: worker.telephone,
      email: worker.email,
      profil: worker.profil,
      status: status,
      selected: false,
      // Données supplémentaires du worker
      originalWorker: worker
    };
  }

  /**
   * Convertit un Worker en Subcontractor pour l'affichage
   * @param worker Worker à convertir
   * @returns Subcontractor converti
   */
  static workerToSubcontractor(worker: Worker): any {
    return {
      id: worker.id,
      raisonSociale: worker.company?.name || 'N/A',
      nomContact: `${worker.prenom} ${worker.nom}`,
      telephone: worker.telephone,
      email: worker.email,
      status: worker.enabled && worker.activated ? 'active' : 'inactive',
      selected: false,
      // Données supplémentaires du worker
      originalWorker: worker
    };
  }

  /**
   * Formate la date de création d'un worker
   * @param createdAt Date de création (string ou array)
   * @returns Date formatée
   */
  static formatCreatedDate(createdAt: string | number[]): Date {
    if (typeof createdAt === 'string') {
      return new Date(createdAt);
    }
    
    if (!createdAt || createdAt.length < 3) {
      return new Date();
    }
    
    const [year, month, day, hour = 0, minute = 0, second = 0] = createdAt;
    return new Date(year, month - 1, day, hour, minute, second);
  }

  /**
   * Valide les données de création d'un worker
   * @param workerData Données à valider
   * @returns Array des erreurs de validation
   */
  static validateWorkerData(workerData: CreateWorkerRequest): string[] {
    const errors: string[] = [];

    if (!workerData.nom?.trim()) {
      errors.push('Le nom est requis');
    }

    if (!workerData.prenom?.trim()) {
      errors.push('Le prénom est requis');
    }

    if (!workerData.email?.trim()) {
      errors.push('L\'email est requis');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workerData.email)) {
      errors.push('Format d\'email invalide');
    }

    if (!workerData.password?.trim()) {
      errors.push('Le mot de passe est requis');
    } else if (workerData.password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (!workerData.telephone?.trim()) {
      errors.push('Le téléphone est requis');
    }

    if (!workerData.adress?.trim()) {
      errors.push('L\'adresse est requise');
    }

    if (!workerData.lieunaissance?.trim()) {
      errors.push('Le lieu de naissance est requis');
    }

    if (!workerData.date?.trim()) {
      errors.push('La date de naissance est requise');
    }

    if (!workerData.profil?.trim()) {
      errors.push('Le profil est requis');
    }

    return errors;
  }

  /**
   * Valide les données de création d'un fournisseur
   * @param supplierData Données à valider
   * @returns Array des erreurs de validation
   */
  static validateSupplierData(supplierData: any): string[] {
    const errors: string[] = [];

    if (!supplierData.nom?.trim()) {
      errors.push('Le nom est requis');
    }

    if (!supplierData.prenom?.trim()) {
      errors.push('Le prénom est requis');
    }

    if (!supplierData.email?.trim()) {
      errors.push('L\'email est requis');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierData.email)) {
      errors.push('Format d\'email invalide');
    }

    if (!supplierData.password?.trim()) {
      errors.push('Le mot de passe est requis');
    } else if (supplierData.password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    if (!supplierData.telephone?.trim()) {
      errors.push('Le téléphone est requis');
    }

    if (!supplierData.adress?.trim()) {
      errors.push('L\'adresse est requise');
    }

    if (!supplierData.lieunaissance?.trim()) {
      errors.push('Le lieu de naissance est requis');
    }

    if (!supplierData.date?.trim()) {
      errors.push('La date de naissance est requise');
    }

    return errors;
  }
}
/*


*/