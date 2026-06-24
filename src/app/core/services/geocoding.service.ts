import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface GeocodingResult {
  displayName: string;
  latitude: number;
  longitude: number;
}

/**
 * Géocodage d'adresses via Nominatim (OpenStreetMap) — gratuit, sans clé API.
 * Limite d'usage : ~1 requête/seconde, toujours débouncer les appels côté appelant.
 */
@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private readonly baseUrl = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  search(query: string, limit: number = 5): Observable<GeocodingResult[]> {
    if (!query || query.trim().length < 3) {
      return of([]);
    }

    const params = new HttpParams()
      .set('format', 'json')
      .set('q', query.trim())
      .set('limit', limit.toString())
      .set('addressdetails', '1');

    return this.http.get<any[]>(this.baseUrl, { params }).pipe(
      map(results => (results || []).map(r => ({
        displayName: r.display_name,
        latitude: parseFloat(r.lat),
        longitude: parseFloat(r.lon)
      }))),
      catchError(() => of([]))
    );
  }
}
