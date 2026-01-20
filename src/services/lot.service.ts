import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Interfaces pour les types
export interface RealEstateProperty {
  id: number;
  name: string;
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
  company: Company | null;
  createdAt: number[];
  funds: number;
  note: number;
  photo: string | null;
  idCard: string | null;
  dateOfBirth: string | null;
  qrcode: string | null;
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

export interface Company {
  id?: number;
  name?: string | null;
  logo?: string;
  primaryColor?: string | null;
  secondaryColor?: string | null;
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
  statutColor: boolean;
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
  startDate: string;  // Format: dd-MM-yyyy
  endDate: string;    // Format: dd-MM-yyyy
  realEstatePropertyId: number;
  subcontractorId: number;
  file?: File;
}

@Injectable({
  providedIn: 'root'
})
export class LotService {
  private baseURL = environment.apiBaseUrl;
  private apiUrl = `${this.baseURL}/api/lots`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  /**
   * Récupère la liste des sous-traitants avec pagination
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
   */
  getLotsByProperty(propertyId: number, page: number = 0, size: number = 10): Observable<LotsResponse> {
    const params = new HttpParams()
      .set('propertyId', propertyId.toString())
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<LotsResponse>(
      `${this.apiUrl}/by-property`,
      { 
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Crée un nouveau lot avec FormData pour supporter l'upload de fichier
   */
 /**
   * Crée un nouveau lot - Envoi en JSON
   */
 createLot(lotData: CreateLotRequest): Observable<Lot> {
  const payload = {
    name: lotData.name,
    description: lotData.description,
    startDate: lotData.startDate,  // Format dd-MM-yyyy
    endDate: lotData.endDate,      // Format dd-MM-yyyy
    realEstatePropertyId: lotData.realEstatePropertyId,
    subcontractorId: lotData.subcontractorId
  };

  console.log('📤 Création de lot - Payload JSON:', payload);

  return this.http.post<Lot>(
    this.apiUrl,
    payload,
    { headers: this.getAuthHeaders() }
  );
}

  /**
   * Met à jour un lot existant
   */
  updateLot(id: number, lotData: CreateLotRequest): Observable<Lot> {
    const payload = {
      name: lotData.name,
      description: lotData.description,
      startDate: lotData.startDate,
      endDate: lotData.endDate,
      realEstatePropertyId: lotData.realEstatePropertyId,
      subcontractorId: lotData.subcontractorId
    };

    console.log('📤 Mise à jour de lot - Payload JSON:', payload);

    return this.http.put<Lot>(
      `${this.apiUrl}/${id}`,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Supprime un lot
   */
  deleteLot(lotId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/${lotId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Récupère les headers d'authentification (avec Content-Type)
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  /**
   * Convertit un tableau de date [year, month, day] en string format dd-MM-yyyy
   */
  formatDateArrayToString(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) {
      throw new Error('Date array must contain at least 3 elements [year, month, day]');
    }
    
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  /**
   * Convertit un objet Date en string format dd-MM-yyyy
   */
  formatDateToString(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${day}-${month}-${year}`;
  }

  /**
   * Parse une string date dd-MM-yyyy en tableau [year, month, day]
   */
  parseDateStringToArray(dateString: string): number[] {
    const [day, month, year] = dateString.split('-').map(Number);
    return [year, month, day];
  }

  /**
   * Convertit yyyy-MM-dd (HTML input) vers dd-MM-yyyy (API)
   */
  convertInputDateToAPIFormat(inputDate: string): string {
    if (!inputDate) return '';
    
    const [year, month, day] = inputDate.split('-');
    return `${day}-${month}-${year}`;
  }

  /**
   * Convertit dd-MM-yyyy (API) vers yyyy-MM-dd (HTML input)
   */
  convertAPIDateToInputFormat(apiDate: string): string {
    if (!apiDate) return '';
    
    const [day, month, year] = apiDate.split('-');
    return `${year}-${month}-${day}`;
  }

  /**
   * Valide les données de création d'un lot
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
      // Valider le format dd-MM-yyyy
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dateRegex.test(lotData.startDate)) {
        errors.push('Format de date de début invalide (attendu: jj-MM-aaaa)');
      }
    }

    if (!lotData.endDate) {
      errors.push('La date de fin est requise');
    } else {
      const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
      if (!dateRegex.test(lotData.endDate)) {
        errors.push('Format de date de fin invalide (attendu: jj-MM-aaaa)');
      }
    }

    if (lotData.startDate && lotData.endDate) {
      try {
        const [startDay, startMonth, startYear] = lotData.startDate.split('-').map(Number);
        const [endDay, endMonth, endYear] = lotData.endDate.split('-').map(Number);
        
        const start = new Date(startYear, startMonth - 1, startDay);
        const end = new Date(endYear, endMonth - 1, endDay);
        
        if (end <= start) {
          errors.push('La date de fin doit être postérieure à la date de début');
        }
      } catch (error) {
        errors.push('Erreur lors de la validation des dates');
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
   */
  getSubcontractorFullName(subcontractor: Subcontractor): string {
    return `${subcontractor.prenom} ${subcontractor.nom}`.trim();
  }

  /**
   * Formate le nom de l'entreprise d'un sous-traitant
   */
  getSubcontractorCompanyName(subcontractor: Subcontractor): string {
    return subcontractor.company?.name || 'Indépendant';
  }
}