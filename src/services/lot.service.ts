import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

// Interfaces pour les types

export interface Comment {
  id: number;
  text: string;
  userId: number;
  username: string;
  lotId: number;
  createdAt: number[];
}

export interface CreateCommentRequest {
  lotId: number;
  userId: number;
  commentText: string;
}
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

export interface LotDocument {
  id: number;
  libelle: string;
  filePath: string;
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
  ) { }
  // Ajoutez ces interfaces en haut du fichier après les interfaces existantes


  // Ajoutez ces méthodes dans la classe LotService

  /**
   * Récupère un lot par son ID
   */
  getLotById(lotId: number): Observable<Lot> {

    return this.http.get<Lot>(
      `${this.apiUrl}/${lotId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Récupère les commentaires d'un lot
   */
  getCommentsForLot(lotId: number): Observable<Comment[]> {

    return this.http.get<Comment[]>(
      `${this.apiUrl}/${lotId}/comments`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Crée un commentaire pour un lot
   */
  createCommentToLot(lotId: number, userId: number, commentText: string): Observable<Comment> {
    if (!commentText?.trim()) {
      throw new Error('Le texte du commentaire est requis');
    }

    const params = new HttpParams()
      .set('userId', userId.toString())
      .set('commentText', commentText.trim());


    return this.http.post<Comment>(
      `${this.apiUrl}/${lotId}/comments`,
      null,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Formate un tableau de date en string lisible
   */
  formatCommentDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 6) {
      return 'Date inconnue';
    }

    const [year, month, day, hour, minute] = dateArray;
    const date = new Date(year, month - 1, day, hour, minute);

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    // Si moins d'une heure
    if (diffMins < 60) {
      return diffMins <= 1 ? "À l'instant" : `Il y a ${diffMins} min`;
    }

    // Si moins de 24h
    if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    }

    // Si moins de 7 jours
    if (diffDays < 7) {
      return `Il y a ${diffDays}j`;
    }

    // Sinon date complète
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year} à ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  }
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


    return this.http.post<Lot>(
      this.apiUrl,
      payload,
      { headers: this.getAuthHeaders() }
    );
  }
  /**
   * Met à jour la progression d'un lot
   */
  updateLotProgress(lotId: number, percentage: number): Observable<Lot> {
    if (percentage < 0 || percentage > 100) {
      throw new Error('Le pourcentage doit être entre 0 et 100');
    }

    const params = new HttpParams().set('percentage', percentage.toString());


    return this.http.put<Lot>(
      `${this.apiUrl}/${lotId}/progress`,
      null,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Change le statut d'un lot
   */
  changeStatus(lotId: number, status: string): Observable<Lot> {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'PLANNED', 'COMPLETED'];

    if (!validStatuses.includes(status)) {
      throw new Error(`Statut invalide. Valeurs autorisées: ${validStatuses.join(', ')}`);
    }

    const params = new HttpParams().set('status', status);


    return this.http.put<Lot>(
      `${this.apiUrl}/${lotId}/status`,
      null,
      {
        params,
        headers: this.getAuthHeaders()
      }
    );
  }

  /**
   * Récupère la liste des fichiers/documents associés à un lot
   */
  getLotFiles(lotId: number): Observable<LotDocument[]> {
    return this.http.get<LotDocument[]>(
      `${this.apiUrl}/${lotId}/files`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Récupère les fichiers joints à un lot — alias de getLotFiles()
   * Endpoint : GET /api/lots/{lotId}/files
   * Retourne : [{ id, libelle, filePath }]
   */
  getFileToLot(lotId: number): Observable<LotDocument[]> {
    return this.getLotFiles(lotId);
  }

  /**
   * Upload un fichier vers un lot (multipart/form-data)
   */
  uploadLotFile(lotId: number, file: File, libelle: string): Observable<LotDocument> {
    if (!file) {
      throw new Error('Aucun fichier sélectionné');
    }

    if (!libelle?.trim()) {
      throw new Error('Le libellé du document est requis');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('libelle', libelle.trim());

    // Important : NE PAS mettre 'Content-Type' manuellement avec FormData
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${this.authService.getToken()}`
      // Content-Type sera automatiquement défini par le navigateur avec boundary
    });


    return this.http.post<LotDocument>(
      `${this.apiUrl}/${lotId}/files`,
      formData,
      { headers }
    );
  }

  /**
   * Supprime un fichier/document d'un lot
   */
  deleteLotFile(fileId: number): Observable<void> {

    return this.http.delete<void>(
      `${this.apiUrl}/files/${fileId}`,
      { headers: this.getAuthHeaders() }
    );
  }

  /**
   * Construit l'URL de téléchargement/visualisation d'un document
   */
  getDocumentDownloadUrl(filePath: string): string {
    // L'URL complète dépend de votre configuration backend
    // Ajustez selon votre environnement
    return `${this.baseURL}/uploads/${filePath}`;
  }

  /**
   * Convertit le statut français vers le statut API
   */
  convertStatusToAPI(displayStatus: string): string {
    const statusMap: Record<string, string> = {
      'En attente': 'PENDING',
      'En cours': 'IN_PROGRESS',
      'Planifié': 'PLANNED',
      'Terminé': 'COMPLETED'
    };
    return statusMap[displayStatus] || 'PENDING';
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