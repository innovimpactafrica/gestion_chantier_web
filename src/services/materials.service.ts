import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, retry } from 'rxjs/operators';


// Ajoutez cette interface au début du fichier avec les autres interfaces
export interface StockMovement {
  id: number;
  material: {
    id: number;
    label: string;
    quantity: number;
    criticalThreshold: number;
    createdAt: number[];
    unit: Unit;
    property: Property;
  };
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  movementDate: number[];
  comment: string;
}

export interface StockMovementsResponse {
  content: StockMovement[];
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

interface CreateStockMovement {
  materialId: number;
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  comment: string;
}
// Interfaces définies directement dans le service
interface Unit {
  id: number;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: string;
}

interface Property {
  id: number;
  name: string;
  number: string;
  address: string;
}

interface Material {
  id: number;
  label: string;
  quantity: number;
  criticalThreshold: number;
  createdAt: number[];
  unit: Unit;
  property: Property;
}

export interface MaterialsResponse {
  content: Material[];
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

interface CreateMaterial {
  label: string;
  quantity: number;
  criticalThreshold: number;
  unitId: number;
  propertyId: number;
}
// Ajoutez ces interfaces dans materials.service.ts
interface OrderItem {
  id: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
}

interface Supplier {
  id: number;
  prenom: string;
  nom: string;
  telephone: string;
}

interface Property {
  id: number;
  name: string;
}

export interface Order {
  materials: any;
  id: number;
  orderDate: number[];
  status: string;
  property: Property;
  supplier: Supplier;
  items: OrderItem[];
  trackingInfo: any;
}

export interface OrdersResponse {
  content: Order[];
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

interface CreateOrderItem {
  materialId: number;
  quantity: number;
}

export interface CreateOrder {
  propertyId: number;
  materials: CreateOrderItem[];
}
@Injectable({
  providedIn: 'root'
})
export class MaterialsService {
  private apiUrl = 'https://wakana.online/api/materials';
  private materialsSubject = new BehaviorSubject<MaterialsResponse | null>(null);
  public materials$ = this.materialsSubject.asObservable();

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('auth_token') || 
                 localStorage.getItem('token') || 
                 sessionStorage.getItem('auth_token') ||
                 sessionStorage.getItem('token');
    
    console.log('Token utilisé:', token ? 'Token présent' : 'Aucun token trouvé');
    
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    });

    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  private handleError = (error: HttpErrorResponse) => {
    let errorMessage = 'Une erreur est survenue';
    
    console.error('Erreur HTTP complète:', error);
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      switch (error.status) {
        case 401:
          errorMessage = 'Non authentifié - Veuillez vous reconnecter';
          // Optionnel : rediriger vers la page de connexion
          // this.router.navigate(['/login']);
          break;
        case 403:
          errorMessage = 'Accès refusé - Permissions insuffisantes';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur interne';
          break;
        default:
          errorMessage = `Erreur ${error.status}: ${error.message}`;
      }
    }
    
    return throwError(() => ({ 
      message: errorMessage, 
      status: error.status, 
      error: error.error 
    }));
  };

  getStock(propertyId: number, page: number = 0, size: number = 10): Observable<MaterialsResponse> {
    // Vérifier si le token existe avant de faire la requête
    const token = localStorage.getItem('auth_token') || 
                 localStorage.getItem('token') || 
                 sessionStorage.getItem('auth_token') ||
                 sessionStorage.getItem('token');
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      return throwError(() => ({ 
        message: 'Token d\'authentification manquant', 
        status: 401 
      }));
    }

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    console.log(`Requête GET vers: ${this.apiUrl}/property/${propertyId}`);
    console.log('Paramètres:', { page, size });
    
    return this.http.get<MaterialsResponse>(
      `${this.apiUrl}/property/${propertyId}`, 
      { 
        params,
        headers: this.getHeaders() 
      }
    ).pipe(
      retry(1), // Réessayer une fois en cas d'échec
      catchError(this.handleError)
    );
  }

  createStock(material: CreateMaterial): Observable<Material> {
    const token = localStorage.getItem('auth_token') || 
                 localStorage.getItem('token') || 
                 sessionStorage.getItem('auth_token') ||
                 sessionStorage.getItem('token');
    
    if (!token) {
      console.warn('Aucun token d\'authentification trouvé');
      return throwError(() => ({ 
        message: 'Token d\'authentification manquant', 
        status: 401 
      }));
    }

    console.log('Création d\'un nouveau matériau:', material);
    
    return this.http.post<Material>(
      this.apiUrl, 
      material,
      { headers: this.getHeaders() }
    ).pipe(
      catchError(this.handleError)
    );
  }
  

  // Méthode pour vérifier la validité du token
  checkTokenValidity(): Observable<any> {
    return this.http.get(`${this.apiUrl}/validate-token`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Méthode existante pour récupérer tous les matériaux
   */
  getMaterials(): Observable<MaterialsResponse> {
    return this.http.get<MaterialsResponse>(this.apiUrl, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Méthode existante pour créer un matériau
   */
  createMaterial(material: CreateMaterial): Observable<Material> {
    return this.http.post<Material>(this.apiUrl, material, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour le cache des matériaux
   */
  updateMaterialsCache(materials: MaterialsResponse): void {
    this.materialsSubject.next(materials);
  }

  /**
   * Supprime un matériau
   */
  deleteMaterial(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  /**
   * Met à jour un matériau existant
   */
  updateMaterial(id: number, material: Partial<CreateMaterial>): Observable<Material> {
    return this.http.put<Material>(`${this.apiUrl}/${id}`, material, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError)
    );
  }

  // Dans la classe MaterialsService, ajoutez ces méthodes :

/**
 * Récupère les mouvements de stock pour une propriété donnée
 * @param propertyId L'ID de la propriété
 * @param page Numéro de page (0-based)
 * @param size Taille de la page
 * @returns Observable des mouvements de stock
 */
getStockMove(propertyId: number, page: number = 0, size: number = 10): Observable<StockMovementsResponse> {
  const token = localStorage.getItem('auth_token') || 
               localStorage.getItem('token') || 
               sessionStorage.getItem('auth_token') ||
               sessionStorage.getItem('token');
  
  if (!token) {
    console.warn('Aucun token d\'authentification trouvé');
    return throwError(() => ({ 
      message: 'Token d\'authentification manquant', 
      status: 401 
    }));
  }

  const params = new HttpParams()
    .set('propertyId', propertyId.toString())
    .set('page', page.toString())
    .set('size', size.toString());
  
  console.log(`Requête GET vers: ${this.apiUrl}/movements`);
  console.log('Paramètres:', { propertyId, page, size });
  
  return this.http.get<StockMovementsResponse>(
    `${this.apiUrl}/movements`, 
    { 
      params,
      headers: this.getHeaders() 
    }
  ).pipe(
    retry(1),
    catchError(this.handleError)
  );
}

/**
 * Crée un nouveau mouvement de stock
 * @param movement Les données du mouvement à créer
 * @returns Observable du mouvement créé
 */
createStockMove(movement: CreateStockMovement): Observable<StockMovement> {
  const token = localStorage.getItem('auth_token') || 
               localStorage.getItem('token') || 
               sessionStorage.getItem('auth_token') ||
               sessionStorage.getItem('token');
  
  if (!token) {
    console.warn('Aucun token d\'authentification trouvé');
    return throwError(() => ({ 
      message: 'Token d\'authentification manquant', 
      status: 401 
    }));
  }

  console.log('Création d\'un nouveau mouvement de stock:', movement);
  
  return this.http.post<StockMovement>(
    `${this.apiUrl}/movements`, 
    movement,
    { headers: this.getHeaders() }
  ).pipe(
    catchError(this.handleError)
  );
}

/**
 * Récupère les commandes en attente pour un fournisseur
 * @param propertyId ID du fournisseur
 * @param page Numéro de page (0-based)
 * @param size Taille de la page
 */
getCommand(propertyId: number, page: number = 0, size: number = 10): Observable<OrdersResponse> {
  const params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  return this.http.get<OrdersResponse>(
    `https://wakana.online/api/orders/supplier/${propertyId}/pending`,
    { 
      params,
      headers: this.getHeaders() 
    }
  ).pipe(
    catchError(this.handleError)
  );
}
getLivraison(propertyId: number, page: number = 0, size: number = 10): Observable<OrdersResponse> {
  const params = new HttpParams()
    .set('page', page.toString())
    .set('size', size.toString());

  return this.http.get<OrdersResponse>(
    `https://wakana.online/api/orders/supplier/${propertyId}/delivery`,
    { 
      params,
      headers: this.getHeaders() 
    }
  ).pipe(
    catchError(this.handleError)
  );
}
/**
 * Crée une nouvelle commande
 * @param order Les données de la commande à créer
 */
createCommand(order: CreateOrder): Observable<Order> {
  return this.http.post<Order>(
    'https://wakana.online/api/orders',
    order,
    { headers: this.getHeaders() }
  ).pipe(
    catchError(this.handleError)
  );
}
}