import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../environments/environment';

export interface Partner {
    id: number;
    name: string;
    logo: string;
    link: string;
}

@Injectable({
    providedIn: 'root'
})
export class PartnerService {
    private http = inject(HttpClient);
    private apiUrl = `${environment.apiUrl}/partners`;

    /**
     * Récupère la liste de tous les partenaires
     */
    getPartners(): Observable<Partner[]> {
        return this.http.get<Partner[]>(this.apiUrl);
    }

    /**
     * Récupère un partenaire par son ID
     */
    getPartnerById(id: number): Observable<Partner> {
        return this.http.get<Partner>(`${this.apiUrl}/${id}`);
    }
}
