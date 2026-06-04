import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

// ===========================
// INTERFACES
// ===========================

export interface Notification {
  id: number;
  libelle: string;
  description: string;
  date: number[]; // Format: [year, month, day, hour, minute, second, nano]
  read: boolean;
}

export interface Sort {
  unsorted: boolean;
  sorted: boolean;
  empty: boolean;
}

export interface Pageable {
  pageNumber: number;
  pageSize: number;
  sort: Sort;
  offset: number;
  paged: boolean;
  unpaged: boolean;
}

export interface NotificationResponse {
  content: Notification[];
  pageable: Pageable;
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: Sort;
  first: boolean;
  empty: boolean;
}

export interface CreateNotificationRequest {
  libelle: string;
  description: string;
  date: string; // Format ISO: "2026-01-29T10:27:06.293Z"
  read: boolean;
}

// ===========================
// SERVICE
// ===========================

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private baseUrl = environment.endpoints.adminNotifications;

  constructor(private http: HttpClient) {}

  /**
   * Récupère la liste des notifications (paginée)
   * @param userId - ID de l'utilisateur (optionnel)
   * @param page - Numéro de page (défaut: 0)
   * @param size - Taille de page (défaut: 10)
   */
  getNotifications(
    userId?: number,
    page: number = 0,
    size: number = 10
  ): Observable<NotificationResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (userId !== undefined && userId !== null) {
      params = params.set('userId', userId.toString());
    }

    return this.http.get<NotificationResponse>(this.baseUrl, { params });
  }

  /**
   * Envoie une nouvelle notification
   * @param notification - Données de la notification à créer
   */
  sendNotification(notification: CreateNotificationRequest): Observable<Notification> {
    return this.http.post<Notification>(this.baseUrl, notification);
  }

  /**
   * Marque toutes les notifications comme lues
   */
  readAllNotifications(): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/read-all`, null);
  }

  /**
   * Récupère le nombre de notifications non lues
   */
  getNombreDeNotificationNonLu(): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/unread/count`);
  }

  /**
   * Récupère une notification par son ID
   * @param id - ID de la notification
   */
  getNotificationById(id: number): Observable<Notification> {
    return this.http.get<Notification>(`${this.baseUrl}/${id}`);
  }

  /**
   * Supprime une notification
   * @param id - ID de la notification à supprimer
   */
  deleteNotification(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }

  /**
   * Crée une requête de notification avec la date actuelle
   * @param libelle - Titre de la notification
   * @param description - Description de la notification
   * @param read - Statut de lecture (défaut: false)
   */
  createNotificationRequest(
    libelle: string,
    description: string,
    read: boolean = false
  ): CreateNotificationRequest {
    return {
      libelle,
      description,
      date: new Date().toISOString(),
      read
    };
  }

  /**
   * Formate un tableau de date en objet Date
   * @param dateArray - Tableau de date [year, month, day, hour, minute, second, nano]
   */
  formatDateArray(dateArray: number[]): Date {
    if (!dateArray || dateArray.length < 3) {
      return new Date();
    }
    const [year, month, day, hours = 0, minutes = 0, seconds = 0] = dateArray;
    return new Date(year, month - 1, day, hours, minutes, seconds);
  }

  /**
   * Formate une date pour l'affichage
   * @param dateArray - Tableau de date
   * @param format - Format souhaité ('full', 'date', 'time', 'relative')
   */
  formatDate(dateArray: number[], format: 'full' | 'date' | 'time' | 'relative' = 'full'): string {
    const date = this.formatDateArray(dateArray);
    
    switch (format) {
      case 'full':
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'date':
        return date.toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric'
        });
      
      case 'time':
        return date.toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        });
      
      case 'relative':
        return this.getRelativeTime(date);
      
      default:
        return date.toLocaleString('fr-FR');
    }
  }

  /**
   * Obtient le temps relatif (il y a X minutes/heures/jours)
   */
  private getRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) {
      return "À l'instant";
    } else if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays === 1) {
      return "Hier";
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short'
      });
    }
  }
}