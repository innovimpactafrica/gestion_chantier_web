import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';
import { API } from '../app/core/constants/api-endpoints';

export interface PointingAddress {
  id?: number;
  latitude: number;
  longitude: number;
  name: string;
  qrcode?: string;
}

export interface PointingAddressResponse {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
}

export interface CreatePointingAddressRequest {
  latitude: number;
  longitude: number;
  name: string;
  qrcode: string;
}

export interface ProjectDetailsResponse {
  realEstateProperty: {
    id: number;
    name: string;
    qrcode: string;
    // ... other properties
  };
}

@Injectable({
  providedIn: 'root'
})
export class PointingAddressService {
  private apiUrl = API.pointingAddresses;
  private apiBaseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  saveAddress(address: CreatePointingAddressRequest): Observable<PointingAddressResponse> {
    return this.http.post<PointingAddressResponse>(this.apiUrl, address);
  }

  getAddressById(id: number): Observable<PointingAddressResponse> {
    return this.http.get<PointingAddressResponse>(`${this.apiUrl}/${id}`);
  }

  getAddressByPropertyId(propertyId: number): Observable<PointingAddressResponse[]> {
    return this.http.get<PointingAddressResponse[]>(`${this.apiUrl}/property/${propertyId}`);
  }

  updateAddress(id: number, address: CreatePointingAddressRequest): Observable<PointingAddressResponse> {
    return this.http.put<PointingAddressResponse>(`${this.apiUrl}/${id}`, address);
  }

  deleteAddress(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  /**
   * Récupère les détails d'un projet incluant son QR code
   */
  getProjectDetails(propertyId: number): Observable<ProjectDetailsResponse> {
    return this.http.get<ProjectDetailsResponse>(`${this.apiBaseUrl}/realestate/details/${propertyId}`);
  }
}