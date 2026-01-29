import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, throwError } from 'rxjs';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface AdminNotification {
    id: number;
    title: string;
    message: string;
    messageParams?: any;
    date: Date;
    read: boolean;
    type: 'NEW_USER' | 'OTHER';
    data?: any;
}

interface AdminNotificationAPIResponse {
    id: number;
    libelle: string;
    description: string;
    date: number[]; // [year, month, day, hour, minute, second, nano]
    read: boolean;
}

interface NotificationPageResponse {
    content: AdminNotificationAPIResponse[];
    totalElements?: number;
    totalPages?: number;
}

@Injectable({
    providedIn: 'root'
})
export class NotificationService {

    private notificationsSubject = new BehaviorSubject<AdminNotification[]>([]);
    notifications$ = this.notificationsSubject.asObservable();

    private unreadCountSubject = new BehaviorSubject<number>(0);
    unreadCount$ = this.unreadCountSubject.asObservable();

    private loadingSubject = new BehaviorSubject<boolean>(false);
    loading$ = this.loadingSubject.asObservable();

    private errorSubject = new BehaviorSubject<string | null>(null);
    error$ = this.errorSubject.asObservable();

    constructor(private http: HttpClient) { }

    /**
     * Load notifications from API with query parameters
     */
    loadNotifications(userId: number, page: number = 0, size: number = 10): Observable<AdminNotification[]> {
        this.loadingSubject.next(true);
        this.errorSubject.next(null);

        const params = new HttpParams()
            .set('userId', userId.toString())
            .set('page', page.toString())
            .set('size', size.toString());

        return this.http.get<NotificationPageResponse>(
            environment.endpoints.adminNotifications,
            { params }
        ).pipe(
            map(response => this.mapAPINotifications(response.content)),
            tap(notifications => {
                this.notificationsSubject.next(notifications);
                this.loadingSubject.next(false);
                // Don't update unread count here, use dedicated endpoint
            }),
            catchError(error => {
                console.error('Error loading notifications:', error);
                this.errorSubject.next('Erreur lors du chargement des notifications');
                this.loadingSubject.next(false);
                return throwError(() => error);
            })
        );
    }

    /**
     * Get unread count from dedicated API endpoint
     */
    getUnreadCount(): Observable<number> {
        return this.http.get<number>(
            environment.endpoints.adminNotificationsUnreadCount
        ).pipe(
            tap(count => {
                this.unreadCountSubject.next(count);
            }),
            catchError(error => {
                console.error('Error fetching unread count:', error);
                return throwError(() => error);
            })
        );
    }

    /**
     * Map API response to internal notification format
     */
    private mapAPINotifications(apiNotifications: AdminNotificationAPIResponse[]): AdminNotification[] {
        return apiNotifications.map(apiNotif => ({
            id: apiNotif.id,
            title: apiNotif.libelle,
            message: apiNotif.description,
            date: this.mapAPIDateToJSDate(apiNotif.date),
            read: apiNotif.read,
            type: 'NEW_USER', // Default type, can be enhanced based on API data
            data: null
        }));
    }

    /**
     * Convert API date array to JavaScript Date
     * API format: [year, month, day, hour, minute, second, nanosecond]
     */
    private mapAPIDateToJSDate(dateArray: number[]): Date {
        if (!dateArray || dateArray.length < 6) {
            return new Date();
        }

        const [year, month, day, hour, minute, second] = dateArray;
        // Month is 1-based in API, 0-based in JavaScript Date
        return new Date(year, month - 1, day, hour, minute, second);
    }

    /**
     * Mark a single notification as read
     */
    markAsRead(id: number): void {
        // Optimistic update
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n =>
            n.id === id ? { ...n, read: true } : n
        );
        this.notificationsSubject.next(updatedNotifications);
        this.updateUnreadCount();

        // Note: If you need to sync with backend for individual mark as read,
        // implement PUT /api/admin-notifications/{id}/read endpoint call here
    }

    /**
     * Mark all notifications as read via API
     */
    markAllAsRead(): Observable<void> {
        // Optimistic update
        const currentNotifications = this.notificationsSubject.value;
        const updatedNotifications = currentNotifications.map(n => ({ ...n, read: true }));
        this.notificationsSubject.next(updatedNotifications);
        this.updateUnreadCount();

        return this.http.put<void>(
            `${environment.endpoints.adminNotifications}/read-all`,
            {}
        ).pipe(
            tap(() => {
                console.log('All notifications marked as read');
            }),
            catchError(error => {
                console.error('Error marking all as read:', error);
                // Revert optimistic update on error
                this.notificationsSubject.next(currentNotifications);
                this.updateUnreadCount();
                return throwError(() => error);
            })
        );
    }

    /**
     * Get current notifications
     */
    getNotifications(): Observable<AdminNotification[]> {
        return this.notifications$;
    }

    /**
     * Add a new notification (for real-time updates via WebSocket, etc.)
     */
    addNotification(notification: Omit<AdminNotification, 'id' | 'date' | 'read'>) {
        const currentNotifications = this.notificationsSubject.value;
        const newNotification: AdminNotification = {
            ...notification,
            id: Date.now(),
            date: new Date(),
            read: false
        };

        this.notificationsSubject.next([newNotification, ...currentNotifications]);
        this.updateUnreadCount();
    }

    /**
     * Update unread count
     */
    private updateUnreadCount() {
        const count = this.notificationsSubject.value.filter(n => !n.read).length;
        this.unreadCountSubject.next(count);
    }

    /**
     * Clear all notifications
     */
    clearNotifications(): void {
        this.notificationsSubject.next([]);
        this.updateUnreadCount();
    }
}
