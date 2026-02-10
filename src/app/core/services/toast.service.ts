import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Toast {
    id: number;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    duration?: number;
}

@Injectable({
    providedIn: 'root'
})
export class ToastService {
    private toasts$ = new BehaviorSubject<Toast[]>([]);
    private nextId = 1;

    constructor() { }

    getToasts(): Observable<Toast[]> {
        return this.toasts$.asObservable();
    }

    /**
     * Affiche un message de succès
     */
    showSuccess(message: string, duration: number = 4000): void {
        this.show('success', message, duration);
    }

    /**
     * Affiche un message d'erreur
     */
    showError(message: string, duration: number = 5000): void {
        this.show('error', message, duration);
    }

    /**
     * Affiche un message d'information
     */
    showInfo(message: string, duration: number = 4000): void {
        this.show('info', message, duration);
    }

    /**
     * Affiche un message d'avertissement
     */
    showWarning(message: string, duration: number = 4000): void {
        this.show('warning', message, duration);
    }

    /**
     * Méthode privée pour afficher un toast
     */
    private show(type: Toast['type'], message: string, duration: number): void {
        const toast: Toast = {
            id: this.nextId++,
            type,
            message,
            duration
        };

        const currentToasts = this.toasts$.value;
        this.toasts$.next([...currentToasts, toast]);

        // Auto-suppression après la durée spécifiée
        if (duration > 0) {
            setTimeout(() => {
                this.remove(toast.id);
            }, duration);
        }
    }

    /**
     * Supprime un toast par son ID
     */
    remove(id: number): void {
        const currentToasts = this.toasts$.value;
        this.toasts$.next(currentToasts.filter(t => t.id !== id));
    }

    /**
     * Supprime tous les toasts
     */
    clear(): void {
        this.toasts$.next([]);
    }
}
