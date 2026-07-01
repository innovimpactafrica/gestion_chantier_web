import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Plan3dItem {
  propertyId: number;
  propertyName: string;
  address: string;
  fileLink: string;
  planLink: string;
}

export interface Plan3dPageResponse {
  content: Plan3dItem[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
}

@Injectable({ providedIn: 'root' })
export class Plan3dService {
  private readonly base = `${environment.apiUrl}/realestate/plan3d`;

  constructor(private http: HttpClient) {}

  upload(propertyId: number, file: File): Observable<Plan3dItem> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('propertyId', String(propertyId));
    return this.http.post<Plan3dItem>(this.base, formData);
  }

  getByUser(userId: number, page = 0, size = 12): Observable<Plan3dPageResponse> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Plan3dPageResponse>(`${this.base}/user/${userId}`, { params });
  }
}
