import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service'; // Ajustez le chemin selon votre structure

// Interfaces pour les types
export interface RealEstateProperty {
  id: number;
  name: string;
  // ... autres propriétés
}

export interface Subcontractor {
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
  subscriptions: any[];
  company: {
    id: number;
    name: string | null;
    logo: string;
    primaryColor: string | null;
    secondaryColor: string | null;
  } | null;
  createdAt: number[];
  funds: number;
  note: number;
  photo: string | null;
  idCard: string | null;
  accountNonExpired: boolean;
  credentialsNonExpired: boolean;
  accountNonLocked: boolean;
  authorities: { authority: string }[];
  username: string;
  enabled: boolean;
}

export interface SubcontractorsResponse {
  content: Subcontractor[];
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
  totalPages: number;
  totalElements: number;
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

export interface Lot {
  id: number;
  name: string;
  description: string;
  startDate: number[];
  endDate: number[];
  status: string;
  realEstateProperty: RealEstateProperty;
  subcontractor: Subcontractor;
  comments: any[];
  progressPercentage: number;
  statutColor:boolean
}

export interface LotsResponse {
  content: Lot[];
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
  totalPages: number;
  totalElements: number;
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

export interface CreateLotRequest {
  name: string;
  description: string;
  startDate: string; // Format: "YYYY-MM-DD"
  endDate: string;   // Format: "YYYY-MM-DD"
  realEstatePropertyId: number;
  subcontractorId: number;
}


@Injectable({
  providedIn: 'root'
})
export class LotService {
  private baseURL = 'https://wakana.online/';
  private apiUrl = `${this.baseURL}api/lots`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupère la liste des sous-traitants avec pagination
   * @param page Numéro de la page (par défaut 0)
   * @param size Taille de la page (par défaut 30)
   * @returns Observable de la réponse paginée des sous-traitants
   */
  getSubcontractors(page: number = 0, size: number = 30): Observable<SubcontractorsResponse> {
    const managerId = this.authService.currentUser()?.id;
    
    if (!managerId) {
      throw new Error('Utilisateur non connecté');
    }

    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<SubcontractorsResponse>(
      `${this.baseURL}api/workers/${managerId}/subcontractors`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Récupère la liste des lots par propriété avec pagination
   * @param propertyId ID de la propriété
   * @param page Numéro de la page (par défaut 0)
   * @param size Taille de la page (par défaut 10)
   * @returns Observable de la réponse paginée des lots
   */
  getLotsByProperty(propertyId: number, page: number = 0, size: number = 10): Observable<LotsResponse> {
    const params = new HttpParams()
      .set('propertyId', propertyId.toString())
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<LotsResponse>(
      `${this.baseURL}api/lots/by-property`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Crée un nouveau lot
   * @param lotData Données du lot à créer
   * @returns Observable du lot créé
   */
    createLot(lotData: CreateLotRequest): Observable<Lot> {
        return this.http.post<Lot>(
          this.apiUrl,
        lotData,
        { headers: this.getAuthHeaders() }
      );
    }


// Dans LotService
updateLot(id: number, lotData: CreateLotRequest): Observable<Lot> {
  return this.http.put<Lot>(
    `${this.apiUrl}/${id}`,
    lotData,
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
   * Convertit un tableau de date [year, month, day] en string format YYYY-MM-DD
   * @param dateArray Tableau de date [year, month, day]
   * @returns String formatée YYYY-MM-DD
   */
  formatDateArrayToString(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) {
      throw new Error('Date array must contain at least 3 elements [year, month, day]');
    }
    
    const [year, month, day] = dateArray;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  /**
   * Convertit un objet Date en string format YYYY-MM-DD
   * @param date Objet Date
   * @returns String formatée YYYY-MM-DD
   */
  formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }

  /**
   * Parse une string date YYYY-MM-DD en tableau [year, month, day]
   * @param dateString String date format YYYY-MM-DD
   * @returns Tableau [year, month, day]
   */
  parseDateStringToArray(dateString: string): number[] {
    const [year, month, day] = dateString.split('-').map(Number);
    return [year, month, day];
  }

  /**
   * Valide les données de création d'un lot
   * @param lotData Données à valider
   * @returns Array des erreurs de validation
   */
  validateLotData(lotData: CreateLotRequest): string[] {
    const errors: string[] = [];

    if (!lotData.name?.trim()) {
      errors.push('Le nom du lot est requis');
    }

    if (!lotData.description?.trim()) {
      errors.push('La description du lot est requise');
    }

    if (!lotData.startDate) {
      errors.push('La date de début est requise');
    } else {
      try {
        new Date(lotData.startDate);
      } catch {
        errors.push('Format de date de début invalide');
      }
    }

    if (!lotData.endDate) {
      errors.push('La date de fin est requise');
    } else {
      try {
        new Date(lotData.endDate);
      } catch {
        errors.push('Format de date de fin invalide');
      }
    }

    if (lotData.startDate && lotData.endDate) {
      const start = new Date(lotData.startDate);
      const end = new Date(lotData.endDate);
      
      if (end <= start) {
        errors.push('La date de fin doit être postérieure à la date de début');
      }
    }

    if (!lotData.realEstatePropertyId) {
      errors.push('L\'ID de la propriété immobilière est requis');
    }

    if (!lotData.subcontractorId) {
      errors.push('L\'ID du sous-traitant est requis');
    }

    return errors;
  }

  /**
   * Formate le nom complet d'un sous-traitant
   * @param subcontractor Sous-traitant
   * @returns Nom complet formaté
   */
  getSubcontractorFullName(subcontractor: Subcontractor): string {
    return `${subcontractor.prenom} ${subcontractor.nom}`;
  }

  /**
   * Formate le nom de l'entreprise d'un sous-traitant
   * @param subcontractor Sous-traitant
   * @returns Nom de l'entreprise ou "Indépendant"
   */
  getSubcontractorCompanyName(subcontractor: Subcontractor): string {
    return subcontractor.company?.name || 'Indépendant';
  }
}