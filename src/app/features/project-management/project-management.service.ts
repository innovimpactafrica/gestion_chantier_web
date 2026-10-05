import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';

export type ManagementRole = 'PROMOTEUR' | 'MOA' | 'SITE_MANAGER';

export interface ManagementUser {
  id: number;
  prenom: string;
  nom: string;
  telephone?: string;
  email: string;
  photo?: string;
}

export interface ManagementView {
  promoter: ManagementUser | null;
  moa: ManagementUser | null;
  siteManager: ManagementUser | null;
  creatorId: number | null;
}

export interface CreateManagementRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  profil: ManagementRole;
}

@Injectable({ providedIn: 'root' })
export class ProjectManagementService {
  private readonly baseUrl = `${environment.apiUrl}/dywanes`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  get(propertyId: number): Observable<ManagementView> {
    return this.http.get<ManagementView>(`${this.baseUrl}/projects/${propertyId}/management`, {
      headers: this.headers()
    });
  }

  assign(propertyId: number, role: ManagementRole, userId: number | null): Observable<ManagementView> {
    return this.http.put<ManagementView>(`${this.baseUrl}/projects/${propertyId}/management/${role}`, { userId }, {
      headers: this.headers()
    });
  }

  create(propertyId: number, request: CreateManagementRequest): Observable<ManagementView> {
    return this.http.post<ManagementView>(`${this.baseUrl}/projects/${propertyId}/management`, request, {
      headers: this.headers()
    });
  }

  users(propertyId: number, role: ManagementRole): Observable<ManagementUser[]> {
    return this.http.get<ManagementUser[]>(`${this.baseUrl}/projects/${propertyId}/management/users/${role}`, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.authService.getToken()}`,
      'Content-Type': 'application/json'
    });
  }
}
