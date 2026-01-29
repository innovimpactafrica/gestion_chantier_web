import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BreadcrumbItem, BreadcrumbService } from '../../../core/services/breadcrumb-service.service';
import { RouterModule } from '@angular/router';

import { LanguageService, Language } from '../../../core/services/language.service';
import { NotificationService } from '../../../core/services/notification.service';
import { AuthService } from '../../../features/auth/services/auth.service';
import { Observable } from 'rxjs';

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
  emailAddress = 'contact@btpconnect.app';
  phoneNumber = '+ 221 33 971 41 12';

  showNotificationDropdown = false;
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

  toggleNotificationDropdown(event: Event) {
    event.stopPropagation();
    this.showNotificationDropdown = !this.showNotificationDropdown;

    if (this.showNotificationDropdown) {
      // Reload notifications and unread count when opening dropdown
      this.loadAdminNotifications();
      this.loadUnreadCount();
    }
  }

  markAsRead(id: number, event: Event) {
    event.stopPropagation();
    this.notificationService.markAsRead(id);
  }


  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
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
    }
  }

  /**
   * Load admin notifications from API
   */
  private loadAdminNotifications(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (user?.id) {
          this.notificationService.loadNotifications(user.id, 0, 10).subscribe({
            error: (err) => {
              console.error('Error loading notifications:', err);
              // Notifications will remain empty, error is handled in service
            }
          });
        }
      },
      error: (err) => {
        console.error('Error getting current user:', err);
      }
    });
  }

  /**
   * Load unread count from API
   */
  private loadUnreadCount(): void {
    this.notificationService.getUnreadCount().subscribe({
      error: (err) => {
        console.error('Error loading unread count:', err);
      }
    });
  }



  // Génère le fil d’Ariane à partir des données des routes
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
      }).catch(err => {
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
