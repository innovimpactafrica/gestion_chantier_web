import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';
import { environment } from '../environments/environment';

export interface Material {
  name: string;
  stock: string;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface Activity {
  action: string;
  user: string;
  date: number[];
}

export interface Report {
  id: number;
  title: string;
  fileUrl: string;
  versionNumber: number;
  submittedAt: number[];
  authorId: number;
  authorName: string;
}

export interface CreateReportRequest {
  title: string;
  versionNumber: number;
  authorId: number;
  authorName: string;
  studyRequestId: number;
}

export interface Comment {
  id: number;
  text: string;
  author: string;
  createdAt: number[];
  studyRequestId: number;
}

export interface CreateCommentRequest {
  text: string;
  author: string;
  studyRequestId: number;
}

export interface Demande {
  id: number;
  commandeId: string;
  title: string;
  description: string;
  status: 'VALIDATED' | 'REJECTED' | 'PENDING' | 'IN_PROGRESS' | 'DELIVERED';
  createdAt: number[];
  propertyId: number;
  propertyName: string;
  propertyImg: string;
  moaId: number;
  moaName: string;
  betId: number;
  betName: string;
  reports: Report[];
  materials: Material[];
  activities: Activity[];
  totalAmount: number;
  comments?: Comment[];
}

export interface Pageable {
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
}

export interface DemandeResponse {
  content: Demande[];
  pageable: Pageable;
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

export interface PercentageCountResponse {
  total: number;
  percentages: {
    PENDING: number;
    IN_PROGRESS: number;
    DELIVERED: number;
    VALIDATED: number;
    REJECTED: number;
  };
  counts: {
    PENDING: number;
    IN_PROGRESS: number;
    DELIVERED: number;
    VALIDATED: number;
    REJECTED: number;
  };
}

export interface VolumetryResponse {
  totalStudyRequests: number;
  distinctPropertiesCount: number;
  totalReports: number;
}

@Injectable({
  providedIn: 'root'
})
export class DemandeService {
  private apiUrl = `${environment.apiUrl}/study-requests`;
  private betApiUrl = `${environment.apiUrl}/study-requests/bet`;
  private kpiUrl = `${environment.apiUrl}/study-requests/kpi/bet`;
  private reportsUrl = `${environment.apiUrl}/study-requests/reports`;
  private commentsUrl = `${environment.apiUrl}/study-requests/comments`;

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });
  }

  // ========== GESTION DES DEMANDES ==========

  getDemande(betId: number, page: number = 0, size: number = 10): Observable<DemandeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<DemandeResponse>(`${this.betApiUrl}/${betId}`, { params });
  }

  getDemandesByStatus(betId: number, page: number = 0, size: number = 10, status?: string): Observable<DemandeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<DemandeResponse>(`${this.betApiUrl}/${betId}`, { params });
  }

  getAllDemandes(betId: number, pageSize: number = 20): Observable<Demande[]> {
    return new Observable<Demande[]>(observer => {
      const allDemandes: Demande[] = [];
      let currentPage = 0;
      let totalPages = 1;

      const fetchNextPage = () => {
        this.getDemande(betId, currentPage, pageSize).subscribe({
          next: (response: DemandeResponse) => {
            allDemandes.push(...response.content);
            totalPages = response.totalPages;
            if (currentPage < totalPages - 1) {
              currentPage++;
              fetchNextPage();
            } else {
              observer.next(allDemandes);
              observer.complete();
            }
          },
          error: (err) => {
            observer.error(err);
          }
        });
      };

      fetchNextPage();
    });
  }

  // ========== ACTIONS SUR LES DEMANDES ==========

  acceptDemande(demandeId: number): Observable<Demande> {
    const headers = this.getAuthHeaders();
    return this.http.put<Demande>(`${this.apiUrl}/${demandeId}/accept`, {}, { headers });
  }

  rejectDemande(demandeId: number, rejectionReason?: string): Observable<Demande> {
    const headers = this.getAuthHeaders();
    const body = rejectionReason ? { rejectionReason } : {};
    return this.http.put<Demande>(`${this.apiUrl}/${demandeId}/reject`, body, { headers });
  }

  validateDemande(demandeId: number): Observable<Demande> {
    const headers = this.getAuthHeaders();
    return this.http.put<Demande>(`${this.apiUrl}/${demandeId}/validate`, {}, { headers });
  }

  deliverDemande(demandeId: number): Observable<Demande> {
    const headers = this.getAuthHeaders();
    return this.http.put<Demande>(`${this.apiUrl}/${demandeId}/deliver`, {}, { headers });
  }

  deleteDemande(demandeId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.apiUrl}/${demandeId}`, { headers });
  }

  updateDemandeStatus(demandeId: number, status: string): Observable<any> {
    const headers = this.getAuthHeaders();
    return this.http.patch(`${this.apiUrl}/${demandeId}/status`, { status }, { headers });
  }

  // ========== GESTION DES RAPPORTS ==========

  createReport(reportData: {
    title: string;
    versionNumber: number;
    studyRequestId: number;
    authorId: number;
  }, file: File): Observable<Report> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    const formData = new FormData();
    formData.append('title', reportData.title);
    formData.append('file', file, file.name);
    formData.append('versionNumber', reportData.versionNumber.toString());
    formData.append('studyRequestId', reportData.studyRequestId.toString());
    formData.append('authorId', reportData.authorId.toString());

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<Report>(this.reportsUrl, formData, { headers });
  }

  uploadReportFile(reportId: number, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    return this.http.post(`${this.reportsUrl}/${reportId}/upload`, formData);
  }

  createReportWithFile(createData: CreateReportRequest, file: File): Observable<Report> {
    const formData = new FormData();
    formData.append('title', createData.title);
    formData.append('versionNumber', createData.versionNumber.toString());
    formData.append('authorId', createData.authorId.toString());
    formData.append('authorName', createData.authorName);
    formData.append('studyRequestId', createData.studyRequestId.toString());
    formData.append('file', file);

    return this.http.post<Report>(this.reportsUrl, formData);
  }

  // ========== GESTION DES COMMENTAIRES ==========

  getComments(studyRequestId: number): Observable<Comment[]> {
    return this.http.get<Comment[]>(`${this.commentsUrl}/${studyRequestId}`);
  }

  createComment(commentData: CreateCommentRequest): Observable<Comment> {
    const headers = this.getAuthHeaders();
    return this.http.post<Comment>(this.commentsUrl, commentData, { headers });
  }

  deleteComment(commentId: number): Observable<void> {
    const headers = this.getAuthHeaders();
    return this.http.delete<void>(`${this.commentsUrl}/${commentId}`, { headers });
  }

  // ========== KPI ==========

  getPercentageCount(betId: number): Observable<PercentageCountResponse> {
    return this.http.get<PercentageCountResponse>(`${this.kpiUrl}/${betId}`);
  }

  getVolumetry(betId: number): Observable<VolumetryResponse> {
    return this.http.get<VolumetryResponse>(`${this.kpiUrl}/${betId}/volumetry`);
  }

  // ========== UTILITAIRES ==========

  changePageSize(betId: number, page: number, newSize: number): Observable<DemandeResponse> {
    return this.getDemande(betId, page, newSize);
  }
}