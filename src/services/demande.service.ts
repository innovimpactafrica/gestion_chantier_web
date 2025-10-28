import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';

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

export interface Demande {
  id: number;
  commandeId: string; // Added
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
  materials: Material[]; // Added
  activities: Activity[]; // Added
  totalAmount: number; // Added
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
  private apiUrl = 'https://wakana.online/api/study-requests/bet';
  private kpiUrl = 'https://wakana.online/api/study-requests/kpi/bet';
  private reportsUrl = 'https://wakana.online/api/study-requests/reports';

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {
    console.log('DemandeService initialisé - AuthService disponible:', !!this.authService);
  }

  createReport(reportData: {
    title: string;
    versionNumber: number;
    studyRequestId: number;
    authorId: number;
  }, file: File): Observable<Report> {
    console.log('=== SERVICE DEBUG CRÉATION ===');
    console.log('AuthService disponible:', !!this.authService);

    if (!this.authService) {
      throw new Error('AuthService non disponible dans DemandeService');
    }

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

    console.log('Token récupéré:', !!token);
    console.log('URL:', this.reportsUrl);
    console.log('FormData contents:');
    const keys = ['title', 'file', 'versionNumber', 'studyRequestId', 'authorId'];
    keys.forEach(key => {
      const value = formData.get(key);
      if (value instanceof File) {
        console.log(`${key}: File(${value.name}, ${value.size} bytes, ${value.type})`);
      } else {
        console.log(`${key}:`, value);
      }
    });

    return this.http.post<Report>(this.reportsUrl, formData, { headers });
  }

  createReportWithToken(reportData: {
    title: string;
    versionNumber: number;
    studyRequestId: number;
    authorId: number;
  }, file: File, token: string): Observable<Report> {
    if (!token) {
      throw new Error('Token d\'authentification requis');
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

    console.log('=== SERVICE WITH EXTERNAL TOKEN ===');
    console.log('Token fourni:', !!token);
    console.log('Données envoyées:');
    console.log('- title:', reportData.title);
    console.log('- versionNumber:', reportData.versionNumber);
    console.log('- studyRequestId:', reportData.studyRequestId);
    console.log('- authorId:', reportData.authorId);
    console.log('- file:', file.name, '(', file.size, 'bytes )');

    return this.http.post<Report>(this.reportsUrl, formData, { headers });
  }

  createReportFormData(formData: FormData): Observable<Report> {
    if (!this.authService) {
      throw new Error('AuthService non disponible');
    }

    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post<Report>(this.reportsUrl, formData, { headers });
  }

  getDemande(betId: number, page: number = 0, size: number = 10): Observable<DemandeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<DemandeResponse>(`${this.apiUrl}/${betId}`, { params });
  }

  updateDemandeStatus(demandeId: number, status: string): Observable<any> {
    const token = this.authService.getToken();
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }

    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.patch(`${this.apiUrl}/${demandeId}/status`, { status }, { headers });
  }

  getPercentageCount(betId: number): Observable<PercentageCountResponse> {
    return this.http.get<PercentageCountResponse>(`${this.kpiUrl}/${betId}`);
  }

  getVolumetry(betId: number): Observable<VolumetryResponse> {
    return this.http.get<VolumetryResponse>(`${this.kpiUrl}/${betId}/volumetry`);
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

  getDemandesByStatus(betId: number, page: number = 0, size: number = 10, status?: string): Observable<DemandeResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (status) {
      params = params.set('status', status);
    }

    return this.http.get<DemandeResponse>(`${this.apiUrl}/${betId}`, { params });
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

  changePageSize(betId: number, page: number, newSize: number): Observable<DemandeResponse> {
    return this.getDemande(betId, page, newSize);
  }

  debugService(): void {
    console.log('=== DEBUG DEMANDE SERVICE ===');
    console.log('AuthService injecté:', !!this.authService);
    console.log('URLs configurées:');
    console.log('- apiUrl:', this.apiUrl);
    console.log('- reportsUrl:', this.reportsUrl);
    console.log('- kpiUrl:', this.kpiUrl);
    
    if (this.authService) {
      try {
        const token = this.authService.getToken();
        console.log('Token disponible:', !!token);
        console.log('Utilisateur authentifié:', this.authService.isAuthenticated());
      } catch (error) {
        console.error('Erreur accès AuthService:', error);
      }
    }
  }
}