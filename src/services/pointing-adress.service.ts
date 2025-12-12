import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

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

@Injectable({
  providedIn: 'root'
})
export class PointingAddressService {
  private apiUrl = environment.apiUrlAddress;

  constructor(private http: HttpClient) {}

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
}