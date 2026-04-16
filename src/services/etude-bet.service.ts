import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { AuthService } from '../app/features/auth/services/auth.service';

// ─── Commentaires ─────────────────────────────────────────────────────────────

export interface Comment {
  id: number;
  content: string;
  createdAt: number[];
  authorId: number;
  authorName: string;
}

export interface CreateCommentRequest {
  content: string;
}

// ─── Rapports BET ─────────────────────────────────────────────────────────────

export interface Report {
  id: number;
  title: string;
  fileUrl: string;
  versionNumber: number;
  submittedAt: number[];
  authorId: number;
  authorName: string;
}

export interface UpdateBetRequest {
  title: string;
  file: string;
  versionNumber: number;
  studyRequestId: number;
  authorId: number;
}

// ─── Documents d'étude ────────────────────────────────────────────────────────

export interface StudyDocument {
  id: number;
  name: string;
  fileUrl: string;
  type: string;
  studyRequestId: number;
}

// ─── Étude BET ────────────────────────────────────────────────────────────────

export interface EtudeBet {
  id: number;
  title: string;
  description: string;
  studyType: string;
  objective: string;
  problemObserved: string;
  status: string;
  createdAt: number[];
  updatedAt: number[];
  propertyId: number;
  propertyName: string;
  propertyImg: string;
  moaId: number;
  moaName: string;
  betId: number;
  betName: string;
  reports: Report[];
  documents: StudyDocument[];
}

/** @deprecated Use EtudeBet */
export type Etude = EtudeBet;

export interface EtudeBetResponse {
  content: EtudeBet[];
  totalPages: number;
  totalElements: number;
  numberOfElements: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

/** @deprecated Use EtudeBetResponse */
export type EtudeResponse = EtudeBetResponse;

// ─── Création d'étude ─────────────────────────────────────────────────────────

export interface CreateEtudeRequest {
  title: string;
  description: string;
  studyType: string;
  objective: string;
  problemObserved: string;
  propertyId: number;
  clientId: number;
  betId: number;
  documentTypes: string[];
  files: File[];
}

// ─── Rapport IA ───────────────────────────────────────────────────────────────

export interface StudyIAReport {
  id: number;
  title: string;
  description: string;
  studyType: string;
  objective: string;
  problemObserved: string;
  propertyId: number;
  propertyName: string;
  propertyImg: string;
  documents: string[];
  severity: string;
  observations: { en: string; fr: string };
  recommendations: { en: string; fr: string };
  conclusion: { en: string; fr: string };
  createdAt: number[];
  updatedAt: number[];
}

// ─── Service ──────────────────────────────────────────────────────────────────

@Injectable({
  providedIn: 'root'
})
export class EtudeBetService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  private getHeaders(): HttpHeaders {
    return this.authService.getAuthHeaders();
  }

  changeEtudeStatus(studyId: number, status: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/study-requests/${studyId}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }

  /** Headers sans Content-Type pour multipart/form-data */
  private getHeadersWithoutContentType(): HttpHeaders {
    const headers = this.authService.getAuthHeaders();
    return headers.delete('Content-Type');
  }

  /** Formate un tableau [année, mois, jour, ...] en dd/MM/yyyy */
  formatStudyDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
  }

  /**
   * Récupère la liste paginée des études pour une propriété (vue MOA)
   */
  getEtude(propertyId: number, page: number = 0, size: number = 5): Observable<EtudeBetResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<EtudeBetResponse>(
      `${this.apiUrl}/study-requests/property/${propertyId}`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Récupère la liste paginée des études assignées au BET connecté
   * GET /api/bet/study-requests
   */
  getEtudeBet(page: number = 0, size: number = 10): Observable<EtudeBetResponse> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    return this.http.get<EtudeBetResponse>(
      `${this.apiUrl}/bet/study-requests`,
      { headers: this.getHeaders(), params }
    );
  }

  /**
   * Crée une nouvelle étude en multipart/form-data
   */
  createEtude(data: CreateEtudeRequest): Observable<any> {
    const formData = new FormData();
    formData.append('title', data.title);
    formData.append('description', data.description);
    formData.append('studyType', data.studyType);
    formData.append('objective', data.objective);
    formData.append('problemObserved', data.problemObserved);
    formData.append('propertyId', data.propertyId.toString());
    formData.append('clientId', data.clientId.toString());
    formData.append('betId', data.betId.toString());
    data.documentTypes.forEach(type => formData.append('documentTypes', type));
    data.files.forEach(file => formData.append('files', file));

    return this.http.post(
      `${this.apiUrl}/study-requests`,
      formData,
      { headers: this.getHeadersWithoutContentType() }
    );
  }

  /**
   * Met à jour une étude existante
   */
  updateEtude(etudeId: number, updateData: Partial<CreateEtudeRequest>): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/study-requests/${etudeId}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Met à jour un rapport BET
   */
  updateReport(reportId: number, updateData: UpdateBetRequest): Observable<any> {
    return this.http.put(
      `${this.apiUrl}/study-requests/reports/${reportId}`,
      updateData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Supprime un rapport BET
   */
  deleteReport(reportId: number): Observable<any> {
    return this.http.delete(
      `${this.apiUrl}/study-requests/reports/${reportId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Accepte/valide une étude
   */
  acceptEtude(etudeId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/study-requests/${etudeId}/accept`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Change le statut d'un incident (Corrections demandées)
   */
  changeIncidentStatus(incidentId: number, status: string): Observable<any> {
    return this.http.patch(
      `${this.apiUrl}/incidents/${incidentId}/status`,
      { status },
      { headers: this.getHeaders() }
    );
  }

  /**
   * Rejette une étude
   */
  rejectEtude(etudeId: number): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/study-requests/${etudeId}/reject`,
      {},
      { headers: this.getHeaders() }
    );
  }

  /**
   * Récupère le rapport IA d'une étude
   * GET /api/ai/study-rapports/by-study/{studyRequestId}
   */
  getDetailsFromIA(studyRequestId: number): Observable<StudyIAReport> {
    return this.http.get<StudyIAReport>(
      `${this.apiUrl}/ai/study-rapports/by-study/${studyRequestId}`,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Crée un commentaire sur une étude
   */
  createComment(studyRequestId: number, userId: number, commentData: CreateCommentRequest): Observable<any> {
    return this.http.post(
      `${this.apiUrl}/study-requests/comment/study/${studyRequestId}/users/${userId}`,
      commentData,
      { headers: this.getHeaders() }
    );
  }

  /**
   * Récupère les commentaires d'une étude
   */
  getComment(studyRequestId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(
      `${this.apiUrl}/study-requests/comments/${studyRequestId}`,
      { headers: this.getHeaders() }
    );
  }
}