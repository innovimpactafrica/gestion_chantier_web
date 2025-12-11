import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { AuthService, profil } from '../../features/auth/services/auth.service';
import { SubscriptionService } from '../../../services/subscription.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { signal, computed } from '@angular/core';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  showParametres = false;
  activeMenu = 'dashboard';
  private subscriptions: Subscription = new Subscription();
  baseUrl = 'https://wakana.online/repertoire_samater/';
  profileImageLoading = true;
  showWindowsScroll = false;

  // Signals pour la gestion de l'abonnement
  private readonly hasActiveSubscription = signal<boolean>(false);
  private readonly isCheckingSubscription = signal<boolean>(true);

  // Computed signals pour le template
  readonly canAccessDashboard = computed(() => {
    // Les ADMIN ont toujours accès
    if (this.isADMINProfile()) {
      return true;
    }
    // Les autres profils doivent avoir un abonnement actif
    return this.hasActiveSubscription();
  });

  readonly checkingSubscription = computed(() => this.isCheckingSubscription());

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    public authService: AuthService,
    private subscriptionService: SubscriptionService
  ) { }

  ngOnInit(): void {
    this.initializeActiveMenu();

    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: (user) => {
          this.initializeActiveMenu();
          
          // Vérifier l'abonnement seulement si ce n'est pas un ADMIN
          if (user && user.id && !this.isADMINProfile()) {
            this.checkUserSubscription(user.id);
          } else {
            // Les ADMIN n'ont pas besoin de vérification d'abonnement
            this.isCheckingSubscription.set(false);
            this.hasActiveSubscription.set(true);
          }
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
          this.isCheckingSubscription.set(false);
        }
      });

      this.subscriptions.add(userSubscription);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Vérifie si l'utilisateur a un abonnement actif
   */
  private checkUserSubscription(userId: number): void {
    console.log('🔍 Vérification de l\'abonnement pour userId:', userId);
    this.isCheckingSubscription.set(true);

    this.subscriptionService.seeActive(userId).subscribe({
      next: (isActive: boolean) => {
        console.log('✅ Statut abonnement actif:', isActive);
        this.hasActiveSubscription.set(isActive);
        this.isCheckingSubscription.set(false);
      },
      error: (error) => {
        console.error('❌ Erreur vérification abonnement:', error);
        this.hasActiveSubscription.set(false);
        this.isCheckingSubscription.set(false);
      }
    });
  }

  getInitialDashboardRoute(): string {
    if (this.isADMINProfile()) {
      return '/dashboard-admin';
    } else if (this.isBETProfile()) {
      return '/dashboard-etude';
    } else if (this.isSUPPLIERProfile()) {
      return '/dashboardf';
    } else {
      return '/dashboard';
    }
  }

  private initializeActiveMenu(): void {
    const route = this.getInitialDashboardRoute();
    this.activeMenu = route.substring(1); 
  }

  isADMINProfile(): boolean {
    const user = this.authService.currentUser();
    if (!user) {
      return false;
    }

    if (typeof user.profil === 'string') {
      return user.profil === 'ADMIN';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('ADMIN' as any);
    }

    return false;
  }

  isSUPPLIERProfile(): boolean {
    const user = this.authService.currentUser();
    if (!user) {
      return false;
    }

    if (typeof user.profil === 'string') {
      return user.profil === 'SUPPLIER';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('SUPPLIER' as any);
    }

    return false;
  }
  
  isBETProfile(): boolean {
    const user = this.authService.currentUser();
    if (!user) {
      return false;
    }

    if (typeof user.profil === 'string') {
      return user.profil === 'BET';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('BET' as any);
    }

    return false;
  }
  
  getUserProfile(): string {
    const user = this.authService.currentUser();
    if (!user || !user.profil) {
      return '';
    }

    if (typeof user.profil === 'string') {
      return user.profil;
    } else if (Array.isArray(user.profil)) {
      return user.profil.map(p => p.toString()).join(', ');
    }

    return '';
  }

  getTranslatedProfile(): string {
    const profileTranslations: { [key: string]: string } = {
      'SITE_MANAGER': 'Manager',
      'SUBCONTRACTOR': 'Sous-traitant',
      'SUPPLIER': 'Fournisseur',
      'ADMIN': 'Administrateur',
      'BET': 'Bureau d\'études',
      'USER': 'Utilisateur',
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage'
    };

    const user = this.authService.currentUser();
    if (!user || !user.profil) {
      return '';
    }

    if (typeof user.profil === 'string') {
      return profileTranslations[user.profil] || user.profil;
    } 
    
    if (Array.isArray(user.profil)) {
      return user.profil
        .map(p => profileTranslations[p.toString()] || p.toString())
        .join(', ');
    }

    return '';
  }

  toggleParametres(): void {
    this.showParametres = !this.showParametres;
  }

  navigateTo(path: string, label: string, menuId: string): void {
    // Vérifier si l'utilisateur peut accéder au dashboard
    if ((path === '/dashboard' || path === '/dashboard-etude' || path === '/dashboardf') 
        && !this.canAccessDashboard()) {
      console.warn('Accès au dashboard refusé: pas d\'abonnement actif');
      // Optionnel: afficher un message ou rediriger vers la page d'abonnement
      this.router.navigate(['/mon-compte']);
      return;
    }

    this.activeMenu = menuId;
    this.router.navigate([path]);

    if (path === '/dashboard' || path === '/dashboard-etude' || path === '/dashboardf' || path === '/dashboard-admin') {
      this.breadcrumbService.reset();
    } else {
      this.breadcrumbService.setBreadcrumbs([
        { label, path }
      ]);
    }
  }

  navigateToSubSection(path: string, label: string, menuId: string): void {
    this.activeMenu = menuId;
    this.router.navigate([path]);
    this.breadcrumbService.addBreadcrumb({ label, path });
  }

  isActive(menuId: string): boolean {
    return this.activeMenu === menuId;
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getProfileImageUrl(): string {
    this.profileImageLoading = true;
    const user = this.authService.currentUser();

    if (user?.photo) {
      return `${this.baseUrl}${user.photo}${new Date().getTime()}`;
    }

    return 'assets/images/profil.png';
  }

  onImageLoad(): void {
    this.profileImageLoading = false;
  }

  onImageError(event: any): void {
    console.warn('Erreur lors du chargement de la photo de profil, utilisation de l\'image par défaut');
    this.profileImageLoading = false;
    event.target.src = 'assets/images/profil.png';
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  get currentUser() {
    return this.authService.currentUser();
  }

  get userFullName() {
    return this.authService.userFullName();
  }

  get userProfileSignal() {
    return this.authService.userProfile();
  }

  get isUserAuthenticated() {
    return this.authService.isAuthenticated();
  }

  getUserInitials(): string {
    return this.authService.getUserInitials();
  }

  getUserEmail(): string {
    const user = this.currentUser;
    return user?.email || '';
  }

  getUserPhone(): string {
    const user = this.currentUser;
    return user?.telephone || '';
  }

  isUserActivated(): boolean {
    return this.authService.isUserActivated();
  }

  debugUserProfile(): void {
    console.log('Current User:', this.currentUser);
    console.log('Is ADMIN Profile:', this.isADMINProfile());
    console.log('Is BET Profile:', this.isBETProfile());
    console.log('Is SUPPLIER Profile:', this.isSUPPLIERProfile());
    console.log('User Profile:', this.getUserProfile());
    console.log('User Profil Type:', typeof this.currentUser?.profil);
    console.log('User Profil Value:', this.currentUser?.profil);
    console.log('Has Active Subscription:', this.hasActiveSubscription());
    console.log('Can Access Dashboard:', this.canAccessDashboard());
  }
}