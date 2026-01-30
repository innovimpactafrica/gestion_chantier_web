import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, Subject, takeUntil, interval } from 'rxjs';
import { BreadcrumbItem, BreadcrumbService } from '../../../core/services/breadcrumb-service.service';
import { RouterModule } from '@angular/router';
import { NotificationService, Notification } from '../../../../services/notification.service';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BreadcrumbComponent implements OnInit, OnDestroy {
  breadcrumbs: BreadcrumbItem[] = [];
  
  // Aide & Support
  showHelpModal = false;
  emailAddress = 'contact@btpconnect.app';
  phoneNumber = '+ 221 33 971 41 12';
  
  // Notifications
  showNotificationDropdown = false;
  notifications: Notification[] = [];
  unreadCount: number = 0;
  loadingNotifications: boolean = false;
  selectedNotification: Notification | null = null;
  showNotificationModal: boolean = false;
  
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    // Initialisation des breadcrumbs
    const initialBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
    this.breadcrumbService.setBreadcrumbs(initialBreadcrumbs);
    
    this.router.events
      .pipe(
        filter(event => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        const routeBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
        this.breadcrumbService.setBreadcrumbs(routeBreadcrumbs);
      });
    
    this.breadcrumbService.breadcrumbs$
      .pipe(takeUntil(this.destroy$))
      .subscribe(breadcrumbs => {
        this.breadcrumbs = breadcrumbs;
      });

    // Chargement initial des notifications
    this.loadUnreadCount();
    
    // Rafraîchir le compteur toutes les 30 secondes
    interval(30000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.loadUnreadCount();
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===========================
  // BREADCRUMBS
  // ===========================

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

  // ===========================
  // NOTIFICATIONS
  // ===========================

  /**
   * Charge le nombre de notifications non lues
   */
  loadUnreadCount(): void {
    this.notificationService.getNombreDeNotificationNonLu()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (count) => {
          this.unreadCount = count;
        },
        error: (error) => {
          console.error('Erreur lors du chargement du compteur:', error);
        }
      });
  }

  /**
   * Toggle du dropdown de notifications
   */
  toggleNotificationDropdown(): void {
    this.showNotificationDropdown = !this.showNotificationDropdown;
    
    if (this.showNotificationDropdown) {
      this.loadNotifications();
      // Marquer toutes comme lues
      if (this.unreadCount > 0) {
        this.markAllAsRead();
      }
    }
  }

  /**
   * Charge les 10 dernières notifications
   */
  loadNotifications(): void {
    this.loadingNotifications = true;
    
    this.notificationService.getNotifications(undefined, 0, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.notifications = response.content || [];
          this.loadingNotifications = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des notifications:', error);
          this.loadingNotifications = false;
          this.notifications = [];
        }
      });
  }

  /**
   * Marque toutes les notifications comme lues
   */
  markAllAsRead(): void {
    this.notificationService.readAllNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.unreadCount = 0;
          // Mettre à jour le statut local
          this.notifications.forEach(n => n.read = true);
        },
        error: (error) => {
          console.error('Erreur lors du marquage des notifications:', error);
        }
      });
  }

  /**
   * Ouvre le détail d'une notification
   */
  openNotificationDetail(notification: Notification): void {
    this.loadingNotifications = true;
    
    this.notificationService.getNotificationById(notification.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (fullNotification) => {
          this.selectedNotification = fullNotification;
          this.showNotificationModal = true;
          this.showNotificationDropdown = false;
          this.loadingNotifications = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement de la notification:', error);
          this.loadingNotifications = false;
        }
      });
  }

  /**
   * Ferme le modal de notification
   */
  closeNotificationModal(): void {
    this.showNotificationModal = false;
    this.selectedNotification = null;
  }

  /**
   * Ferme le dropdown de notifications
   */
  closeNotificationDropdown(): void {
    this.showNotificationDropdown = false;
  }

  /**
   * Formate la date pour l'affichage
   */
  formatNotificationDate(dateArray: number[]): string {
    return this.notificationService.formatDate(dateArray, 'full');
  }

  /**
   * Formate la date pour affichage relatif
   */
  formatRelativeTime(dateArray: number[]): string {
    return this.notificationService.formatDate(dateArray, 'relative');
  }

  /**
   * Formate l'heure seule
   */
  formatTime(dateArray: number[]): string {
    return this.notificationService.formatDate(dateArray, 'time');
  }

  // ===========================
  // AIDE & SUPPORT
  // ===========================

  openHelpModal(): void {
    this.showHelpModal = true;
  }

  closeHelpModal(): void {
    this.showHelpModal = false;
  }

  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Copié dans le presse-papiers:', text);
      }).catch(err => {
        console.error('Erreur lors de la copie:', err);
      });
    } else {
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