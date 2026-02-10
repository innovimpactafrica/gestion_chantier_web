import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { AuthService, profil } from '../../features/auth/services/auth.service';
import { SubscriptionService } from '../../../services/subscription.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import { PlanSelectionPopupComponent } from '../../shared/components/plan-selection-popup/plan-selection-popup.component';

@Component({
  standalone: true,
  imports: [CommonModule, PlanSelectionPopupComponent],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  showParametres = false;
  activeMenu = 'dashboard';
  private subscriptions: Subscription = new Subscription();
  baseUrl = environment.filebaseUrl;
  profileImageLoading = signal<boolean>(true);
  showWindowsScroll = false;
  showLogoutConfirm = signal<boolean>(false);
  showPlanSelectionPopup = signal<boolean>(false);

  public languageService = inject(LanguageService);

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

            // Ne pas afficher le popup pour les ADMIN
            console.log('👤 Utilisateur ADMIN détecté - popup désactivé');
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

        // ✅ Vérifier si on doit afficher le popup APRÈS avoir déterminé le statut
        this.checkShouldShowPlanPopup();
      },
      error: (error) => {
        console.error('❌ Erreur vérification abonnement:', error);
        this.hasActiveSubscription.set(false);
        this.isCheckingSubscription.set(false);

        // Même en cas d'erreur, vérifier si on doit afficher le popup
        this.checkShouldShowPlanPopup();
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
    const profileKeyMap: { [key: string]: string } = {
      'SITE_MANAGER': 'profile.siteManager',
      'SUBCONTRACTOR': 'profile.subcontractor',
      'SUPPLIER': 'profile.supplier',
      'ADMIN': 'profile.admin',
      'BET': 'profile.bet',
      'USER': 'profile.user',
      'PROMOTEUR': 'profile.promoter',
      'MOA': 'profile.moa',
      'NOTAIRE': 'profile.notaire',
      'RESERVATAIRE': 'profile.reservataire',
      'BANK': 'profile.bank',
      'AGENCY': 'profile.agency',
      'PROPRIETAIRE': 'profile.proprietaire',
      'SYNDIC': 'profile.syndic',
      'LOCATAIRE': 'profile.locataire',
      'PRESTATAIRE': 'profile.prestataire',
      'TOM': 'profile.tom',
      'WORKER': 'profile.worker'
    };

    const user = this.authService.currentUser();
    if (!user || !user.profil) {
      return '';
    }

    if (typeof user.profil === 'string') {
      const key = profileKeyMap[user.profil];
      return key ? this.languageService.translate(key) : user.profil;
    }

    if (Array.isArray(user.profil)) {
      return user.profil
        .map(p => {
          const key = profileKeyMap[p.toString()];
          return key ? this.languageService.translate(key) : p.toString();
        })
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

  showLogoutDialog(): void {
    this.showLogoutConfirm.set(true);
  }

  cancelLogout(): void {
    this.showLogoutConfirm.set(false);
  }

  confirmLogout(): void {
    this.showLogoutConfirm.set(false);
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Keep old method name for compatibility
  logout(): void {
    this.showLogoutDialog();
  }

  getProfileImageUrl(): string {
    return this.authService.getUserPhotoUrl();
  }

  onImageLoad(): void {
    this.profileImageLoading.set(false);
  }

  onImageError(event: any): void {
    console.warn('Erreur lors du chargement de la photo de profil, utilisation de l\'image par défaut');
    this.profileImageLoading.set(false);
    event.target.src = 'assets/images/profil.png';
  }

  /**
   * Check if we should show the plan selection popup
   * Show for non-ADMIN users without active subscription (including expired subscriptions)
   * This will show on every login until user has an active subscription
   */
  private checkShouldShowPlanPopup(): void {
    console.log('🎯 checkShouldShowPlanPopup appelé');
    console.log('  - isADMINProfile:', this.isADMINProfile());
    console.log('  - hasActiveSubscription:', this.hasActiveSubscription());
    console.log('  - isCheckingSubscription:', this.isCheckingSubscription());

    // Don't show for ADMIN users
    if (this.isADMINProfile()) {
      console.log('❌ Popup désactivé: utilisateur ADMIN');
      return;
    }

    // Wait for subscription check to complete
    if (this.isCheckingSubscription()) {
      console.log('⏳ Vérification d\'abonnement en cours, attente...');
      return;
    }

    // Show popup if user doesn't have an active subscription
    // This includes users who never subscribed or whose subscription expired
    if (!this.hasActiveSubscription()) {
      console.log('✅ Conditions remplies - affichage du popup dans 1 seconde');
      // Small delay to ensure smooth UI rendering
      setTimeout(() => {
        this.showPlanSelectionPopup.set(true);
        console.log('🎉 Popup affiché');
      }, 1000);
    } else {
      console.log('❌ Popup désactivé: abonnement actif détecté');
    }
  }

  onClosePlanPopup(): void {
    this.showPlanSelectionPopup.set(false);
  }

  onPlanSelected(planType: string): void {
    console.log('Plan selected:', planType);
    this.showPlanSelectionPopup.set(false);
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

  t(key: string): string {
    return this.languageService.translate(key);
  }
}