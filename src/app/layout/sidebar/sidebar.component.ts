import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { AuthService, profil } from '../../features/auth/services/auth.service';
import { SubscriptionService } from '../../../services/subscription.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { signal, computed, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import { LayoutService } from '../../core/services/layout.service';
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
    private subscriptionService: SubscriptionService,
    private layoutService: LayoutService
  ) { }

  closeSidebar(): void {
    this.layoutService.closeSidebar();
  }

  ngOnInit(): void {
    // Synchronise immédiatement le menu actif sur l'URL réelle (rechargement de page, lien direct...)
    this.syncActiveMenuFromUrl(this.router.url);

    // Puis tient ce menu à jour à chaque navigation effective (clic sidebar, redirection de garde
    // d'accès, bouton précédent/suivant...), au lieu de ne dépendre que des clics sidebar eux-mêmes.
    const navSubscription = this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.syncActiveMenuFromUrl(event.urlAfterRedirects));
    this.subscriptions.add(navSubscription);

    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: (user) => {
          // Ne pas réinitialiser activeMenu ici : il est déjà synchronisé sur l'URL réelle,
          // l'écraser pourrait l'aligner à tort sur le dashboard alors que l'utilisateur est ailleurs.

          // Vérifier l'abonnement seulement si ce n'est pas un ADMIN
          if (user && user.id && !this.isADMINProfile()) {
            this.checkUserSubscription(user.id);
          } else {
            // Les ADMIN n'ont pas besoin de vérification d'abonnement
            this.isCheckingSubscription.set(false);
            this.hasActiveSubscription.set(true);

            // Ne pas afficher le popup pour les ADMIN
          }
        },
        error: (error) => {
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
    this.isCheckingSubscription.set(true);

    this.subscriptionService.seeActive(userId).subscribe({
      next: (isActive: boolean) => {
        this.hasActiveSubscription.set(isActive);
        this.isCheckingSubscription.set(false);

        // ✅ Vérifier si on doit afficher le popup APRÈS avoir déterminé le statut
        this.checkShouldShowPlanPopup();
      },
      error: (error) => {
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

  /** Association route -> identifiant de menu, utilisée pour resynchroniser activeMenu sur l'URL réelle. */
  private readonly routeMenuMap: { path: string; menuId: string }[] = [
    { path: '/dashboard-admin/paiements', menuId: 'paiements' },
    { path: '/dashboard-admin', menuId: 'dashboard-admin' },
    { path: '/utilisateurs', menuId: 'utilisateurs' },
    { path: '/abonnements', menuId: 'abonnements' },
    { path: '/reclamations', menuId: 'reclamations' },
    { path: '/humanresources', menuId: 'hr' },
    { path: '/subcontractor', menuId: 'subcontractor' },
    { path: '/fournisseur', menuId: 'suppliers' },
    { path: '/dashboard-etude', menuId: 'dashboard-etude' },
    { path: '/dashboard', menuId: 'dashboard' },
    { path: '/demande', menuId: 'demande' },
    { path: '/projects', menuId: 'projects' },
    { path: '/jalons', menuId: 'jalons' },
    { path: '/gestion-salaire', menuId: 'gestion-salaire' },
    { path: '/plan3d', menuId: 'plan3d' },
    { path: '/devis', menuId: 'devis' },
    { path: '/dashboardf', menuId: 'dashboardf' },
    { path: '/commandes', menuId: 'commandes' },
    { path: '/mon-compte', menuId: 'mon-compte' },
    { path: '/parametres/unite-mesure', menuId: 'unite-mesure' },
    { path: '/parametres/documents', menuId: 'documents' },
    { path: '/parametres/typebien', menuId: 'typebien' },
    { path: '/parametres/categories', menuId: 'categories' }
  ];

  /**
   * Resynchronise le menu actif sur l'URL réellement affichée, au lieu de ne dépendre que des clics
   * sidebar : couvre les redirections de garde d'accès (ex: dashboard refusé -> /mon-compte), les
   * rechargements de page, les liens directs et le bouton précédent/suivant du navigateur.
   */
  private syncActiveMenuFromUrl(url: string): void {
    const cleanUrl = (url || '').split('?')[0].split('#')[0];

    const match = [...this.routeMenuMap]
      .sort((a, b) => b.path.length - a.path.length)
      .find(entry => cleanUrl === entry.path || cleanUrl.startsWith(entry.path + '/'));

    if (match) {
      this.activeMenu = match.menuId;
    } else if (!cleanUrl || cleanUrl === '/') {
      this.initializeActiveMenu();
    }
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

  isPromoterProfile(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;
    if (typeof user.profil === 'string') return user.profil === 'PROMOTEUR';
    if (Array.isArray(user.profil)) return user.profil.includes('PROMOTEUR' as any);
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
      // Accès refusé : on redirige vers la page d'abonnement, et on aligne le menu actif sur
      // la page réellement affichée (sinon "Dashboard" reste surligné alors que c'est "Mon compte" qui s'affiche).
      this.activeMenu = 'mon-compte';
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
    
    // Fermer le sidebar sur mobile après navigation
    this.layoutService.closeSidebar();
  }

  navigateToSubSection(path: string, label: string, menuId: string): void {
    this.activeMenu = menuId;
    this.router.navigate([path]);
    this.breadcrumbService.addBreadcrumb({ label, path });
    // Fermer le sidebar sur mobile après navigation
    this.layoutService.closeSidebar();
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
    const user = this.authService.currentUser();
    const photo = user?.photo;
    
    if (photo && !this.profileImageError) {
      if (photo.startsWith('http') || photo.startsWith('data:')) {
        return photo;
      }
      return `${environment.filebaseUrl}${photo}`;
    }
    return 'assets/images/profil.png';
  }

  hasUserPhoto(): boolean {
    const user = this.authService.currentUser();
    const photo = user?.photo;
    
    if (!photo || photo === 'string' || photo === 'null' || photo === 'assets/images/profil.png' || photo.includes('profil.png')) {
      return false;
    }
    return !this.profileImageError;
  }

  profileImageError = false;

  onImageLoad(): void {
    this.profileImageLoading.set(false);
    this.profileImageError = false;
  }

  onImageError(event: any): void {
    this.profileImageLoading.set(false);
    this.profileImageError = true;
  }

  /**
   * Check if we should show the plan selection popup
   * Show for non-ADMIN users without active subscription (including expired subscriptions)
   * This will show on every login until user has an active subscription
   */
  private checkShouldShowPlanPopup(): void {

    // Don't show for ADMIN users
    if (this.isADMINProfile()) {
      return;
    }

    // Wait for subscription check to complete
    if (this.isCheckingSubscription()) {
      return;
    }

    // Show popup if user doesn't have an active subscription
    // This includes users who never subscribed or whose subscription expired
    if (!this.hasActiveSubscription()) {
      // Small delay to ensure smooth UI rendering
      setTimeout(() => {
        this.showPlanSelectionPopup.set(true);
      }, 1000);
    } else {
    }
  }

  onClosePlanPopup(): void {
    this.showPlanSelectionPopup.set(false);
  }

  onPlanSelected(planType: string): void {
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
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }
}