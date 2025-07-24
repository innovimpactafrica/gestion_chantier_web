import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface EvolutionData {
  date: string;
  totalEntries: number;
  totalExits: number;
}

export interface ConsommationData {
  materialLabel: string;
  totalUsedQuantity: number;
}

export interface RepartitionData {
  [key: string]: number;
}

@Injectable({
  providedIn: 'root'
})
export class StatistiqueService {
  private baseUrl = 'https://wakana.online/api/materials';

  constructor(private http: HttpClient) { }

  getEvolution(propertyId: number): Observable<EvolutionData[]> {
    const params = new HttpParams().set('propertyId', propertyId.toString());
    return this.http.get<EvolutionData[]>(`${this.baseUrl}/monthly-stats`, { params });
  }

  getConsommation(propertyId: number): Observable<ConsommationData[]> {
    const params = new HttpParams().set('propertyId', propertyId.toString());
    return this.http.get<ConsommationData[]>(`${this.baseUrl}/kpi/top-used`, { params });
  }

  getRepartition(propertyId: number): Observable<RepartitionData> {
    return this.http.get<RepartitionData>(`${this.baseUrl}/kpis/unit-distribution/property/${propertyId}`);
  }
}