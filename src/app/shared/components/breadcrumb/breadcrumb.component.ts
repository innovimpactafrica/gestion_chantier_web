import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BreadcrumbItem, BreadcrumbService } from '../../../core/services/breadcrumb-service.service';
import { RouterModule } from '@angular/router';

import { LanguageService, Language } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { Observable } from 'rxjs';

interface Notification {
  id: number;
  libelle: string;
  description: string;
  date: string;
  read: boolean;
}

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BreadcrumbComponent implements OnInit {
  breadcrumbs: BreadcrumbItem[] = [];
  showHelpModal = false;
  emailAddress = 'contact@btpcloud.app';
  phoneNumber = '+ 221 33 971 41 12';

  // Notifications properties
  showNotificationDropdown = false;
  showNotificationModal = false;
  loadingNotifications = false;
  notifications: Notification[] = [];
  selectedNotification: Notification | null = null;
  unreadCount = 0;
  unreadCount$!: Observable<number>;
  notifications$!: Observable<any[]>;

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    public languageService: LanguageService,
    private notificationService: NotificationService,
    public authService: AuthService
  ) {
    this.unreadCount$ = this.notificationService.unreadCount$;
    this.notifications$ = this.notificationService.notifications$;
  }

  get currentLang() {
    return this.languageService.currentLang;
  }

  onLanguageChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const lang = select.value as Language;
    this.languageService.changeLanguage(lang);

    // Force breadcrumb refresh to update translations
    const currentBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
    this.breadcrumbService.setBreadcrumbs(currentBreadcrumbs);
  }

  /**
   * Toggle notification dropdown
   */
  toggleNotificationDropdown() {
    this.showNotificationDropdown = !this.showNotificationDropdown;

    if (this.showNotificationDropdown) {
      this.loadAdminNotifications();
      this.loadUnreadCount();
    }
  }

  /**
   * Close notification dropdown
   */
  closeNotificationDropdown() {
    this.showNotificationDropdown = false;
  }

  /**
   * Open notification detail modal
   */
  openNotificationDetail(notification: Notification) {
    this.selectedNotification = notification;
    this.showNotificationModal = true;
    this.showNotificationDropdown = false;

    // Mark as read when opening
    if (!notification.read) {
      this.markAsRead(notification.id);
    }
  }

  /**
   * Close notification detail modal
   */
  closeNotificationModal() {
    this.showNotificationModal = false;
    this.selectedNotification = null;
  }

  /**
   * Mark notification as read
   */
  markAsRead(id: number, event?: Event) {
    if (event) {
      event.stopPropagation();
    }
    
    // Call the service method (assuming it returns void or doesn't return an observable)
    this.notificationService.markAsRead(id);
    
    // Update local notifications array immediately
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
    }
    
    // Reload unread count after a short delay to ensure API update
    setTimeout(() => {
      this.loadUnreadCount();
    }, 300);
  }

  /**
   * Format time for notification (e.g., "14:30")
   */
  formatTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Format relative time (e.g., "Il y a 2h")
   */
  formatRelativeTime(dateString: string): string {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return this.t('notifications.justNow') || 'À l\'instant';
      if (diffMins < 60) return `${diffMins}min`;
      if (diffHours < 24) return `${diffHours}h`;
      if (diffDays < 7) return `${diffDays}j`;
      
      return date.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    } catch (error) {
      return '';
    }
  }

  /**
   * Format notification date for modal (e.g., "Lundi 9 février 2026 à 14:30")
   */
  formatNotificationDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Translate helper
   */
  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  /**
   * Close dropdown when clicking outside
   */
  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    const clickedInside = target.closest('.relative');
    
    if (!clickedInside && this.showNotificationDropdown) {
      this.showNotificationDropdown = false;
    }
  }

  ngOnInit(): void {
    // Cas 1 : on recharge manuellement les breadcrumbs à l'initialisation
    const initialBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
    this.breadcrumbService.setBreadcrumbs(initialBreadcrumbs);

    // Cas 2 : on écoute aussi les changements de navigation (navigations ultérieures)
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const routeBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
        this.breadcrumbService.setBreadcrumbs(routeBreadcrumbs);
      });

    // S'abonne pour affichage
    this.breadcrumbService.breadcrumbs$.subscribe(breadcrumbs => {
      this.breadcrumbs = breadcrumbs;
    });

    // Load notifications for Admin users
    if (this.authService.isADMINProfile()) {
      this.loadAdminNotifications();
      this.loadUnreadCount();
      
      // Subscribe to notifications$ to update local array
      this.notifications$.subscribe(notifications => {
        this.notifications = notifications;
      });

      // Subscribe to unreadCount$ to update local count
      this.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      });
    }
  }

  /**
   * Load admin notifications from API
   */
  private loadAdminNotifications(): void {
    this.loadingNotifications = true;
    
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user?.id) {
          this.notificationService.loadNotifications(user.id, 0, 10).subscribe({
            next: () => {
              this.loadingNotifications = false;
            },
            error: (err: any) => {
              console.error('Error loading notifications:', err);
              this.loadingNotifications = false;
            }
          });
        } else {
          this.loadingNotifications = false;
        }
      },
      error: (err: any) => {
        console.error('Error getting current user:', err);
        this.loadingNotifications = false;
      }
    });
  }

  /**
   * Load unread count from API
   */
  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      error: (err: any) => {
        console.error('Error loading unread count:', err);
      }
    });
  }

  // Génère le fil d'Ariane à partir des données des routes
  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: BreadcrumbItem[] = []
  ): BreadcrumbItem[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const label = child.snapshot.data['breadcrumb'];
      if (label) {
        breadcrumbs.push({ label, path: url });
      }

      return this.createBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  /**
   * Ouvre la modal Aide & Support
   */
  openHelpModal(): void {
    this.showHelpModal = true;
  }

  /**
   * Ferme la modal Aide & Support
   */
  closeHelpModal(): void {
    this.showHelpModal = false;
  }

  /**
   * Copie le texte dans le presse-papiers
   */
  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Copié dans le presse-papiers:', text);
      }).catch((err: any) => {
        console.error('Erreur lors de la copie:', err);
      });
    } else {
      // Fallback pour les anciens navigateurs
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        console.log('Copié dans le presse-papiers:', text);
      } catch (err) {
        console.error('Erreur lors de la copie:', err);
      }
      document.body.removeChild(textarea);
    }
  }
}