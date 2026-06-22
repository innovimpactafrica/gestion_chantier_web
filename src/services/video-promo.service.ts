import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { Observable } from 'rxjs';
import { VideoPromoResponse } from '../app/models/video-promo';
import { API } from '../app/core/constants/api-endpoints';

@Injectable({
    providedIn: 'root'
})
export class VideoPromoService {
    private http = inject(HttpClient);
    private readonly platformId = inject(PLATFORM_ID);
    private apiUrl = API.videoPromo;

    private getAuthHeaders(): HttpHeaders {
        let token = '';
        if (isPlatformBrowser(this.platformId)) {
            token = localStorage.getItem('token') || '';
        }
        return new HttpHeaders({
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        });
    }

    getVideos(page: number = 0, size: number = 10): Observable<VideoPromoResponse> {
        const headers = this.getAuthHeaders();
        return this.http.get<VideoPromoResponse>(
            `${this.apiUrl}?page=${page}&size=${size}`,
            { headers }
        );
    }
}