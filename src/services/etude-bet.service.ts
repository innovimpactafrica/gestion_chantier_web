import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Report {
  id: number;
  title: string;
  fileUrl: string;
  versionNumber: number;
  submittedAt: number[];
  authorId: number;
  authorName: string;
}

export interface Etude {
  id: number;
  title: string;
  description: string;
  status: string;
  createdAt: number[];
  propertyId: number;
  propertyName: string;
  propertyImg: string;
  moaId: number;
  moaName: string;
  betId: number;
  betName: string;
  reports: Report[];
}

export interface EtudeResponse {
  content: Etude[];
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

export interface UpdateBetRequest {
  title: string;
  file: string;
  versionNumber: number;
  studyRequestId: number;
  authorId: number;
}

export interface CreateEtudeRequest {
  title: string;
  description: string;
  propertyId: number;
  clientId: number;
  betId: number;
}

@Injectable({
  providedIn: 'root'
})
export class EtudeBetService {
  private apiUrl = 'https://wakana.online/';

  constructor(private http: HttpClient) { }

  /**
   * Récupère la liste des études pour une propriété donnée avec pagination
   * @param propertyId ID de la propriété
   * @param page Numéro de page (commence à 0)
   * @param size Taille de la page (par défaut 5)
   * @returns Observable<EtudeResponse>
   */
  getEtude(propertyId: number, page: number = 0, size: number = 5): Observable<EtudeResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<EtudeResponse>(
      `${this.apiUrl}api/study-requests/property/${propertyId}`,
      { params }
    );
  }

  /**
   * Met à jour un rapport BET
   * @param reportId ID du rapport
   * @param updateData Données de mise à jour
   * @returns Observable<any>
   */
  updateBet(reportId: number, updateData: UpdateBetRequest): Observable<any> {
    return this.http.put(
      `${this.apiUrl}api/study-requests/reports/${reportId}`,
      updateData
    );
  }

  /**
   * Supprime un rapport BET
   * @param reportId ID du rapport
   * @returns Observable<any>
   */
  deleteBet(reportId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}api/study-requests/reports/${reportId}`
    );
  }

  /**
   * Accepte/valide une étude
   * @param etudeId ID de l'étude
   * @returns Observable<any>
   */
  acceptEtude(etudeId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}api/study-requests/${etudeId}/accept`,
      {}
    );
  }

  /**
   * Rejette une étude
   * @param etudeId ID de l'étude
   * @returns Observable<any>
   */
  rejectEtude(etudeId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}api/study-requests/${etudeId}/reject`,
      {}
    );
  }

  /**
   * Crée une nouvelle étude
   * @param createData Données de création
   * @returns Observable<any>
   */
  createEtude(createData: CreateEtudeRequest): Observable<any> {
    return this.http.post(
      `${this.apiUrl}api/study-requests`,
      createData
    );
  }

  /**
   * Récupère la liste des BET disponibles (à adapter selon votre API)
   * @returns Observable<any[]>
   */
  getAvailableBETs(): Observable<any[]> {
    // Cette méthode devra être adaptée selon votre API
    // Pour l'instant, elle retourne une liste statique
    return new Observable(observer => {
      observer.next([
        { id: 1, name: 'Sonora BET' },
        { id: 2, name: 'Alpha Dieye' },
        { id: 3, name: 'BET Structura' },
        { id: 4, name: 'ClimaTech' }
      ]);
      observer.complete();
    });
  }
}