import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { AuthService, profil } from '../../features/auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit, OnDestroy {
  // État pour déterminer si le sous-menu des paramètres est affiché ou non
  showParametres = false;

  // État pour suivre l'élément de menu actif
  activeMenu = 'dashboard'; // Par défaut sur dashboard

  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();

  // Base URL pour les images
  baseUrl = 'https://wakana.online/repertoire_samater/';

  // Propriété pour suivre l'état de chargement de l'image de profil
  profileImageLoading = true;

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    // Initialiser le menu actif selon le profil utilisateur
    this.initializeActiveMenu();

    // Récupérer les informations utilisateur au chargement du composant
    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: (user) => {
          // Réinitialiser le menu actif après le chargement de l'utilisateur
          this.initializeActiveMenu();
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'utilisateur:', error);
        }
      });

      this.subscriptions.add(userSubscription);
    }
  }

  ngOnDestroy(): void {
    // Nettoyer les subscriptions pour éviter les fuites mémoire
    this.subscriptions.unsubscribe();
  }

  /**
   * Initialise le menu actif selon le profil de l'utilisateur
   */
  private initializeActiveMenu(): void {
    if (this.isBETProfile()) {
      // Pour les profils BET, défaut sur tableau de bord étude
      this.activeMenu = 'dashboard-etude';
    } else {
      // Pour les autres profils, défaut sur dashboard principal
      this.activeMenu = 'dashboard';
    }
  }

  /**
   * Vérifie si l'utilisateur connecté a un profil BET
   * @returns boolean - true si l'utilisateur est BET, false sinon
   */
  isSUPPLIERProfile(): boolean {
    const user = this.authService.currentUser();
    if (!user) {
      return false;
    }

    // Vérifier si le profil est "BET" (string) ou si c'est un tableau contenant "BET"
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

    // Vérifier si le profil est "BET" (string) ou si c'est un tableau contenant "BET"
    if (typeof user.profil === 'string') {
      return user.profil === 'BET';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('BET' as any);
    }

    return false;
  }
  
  /**
   * Obtient le profil de l'utilisateur pour l'affichage
   * @returns string - Le profil de l'utilisateur ou une chaîne vide
   */
  getUserProfile(): string {
    const user = this.authService.currentUser();
    if (!user || !user.profil) {
      return '';
    }

    // Gestion du profil string ou array
    if (typeof user.profil === 'string') {
      return user.profil;
    } else if (Array.isArray(user.profil)) {
      // Si plusieurs profils, les joindre avec une virgule
      return user.profil.map(p => p.toString()).join(', ');
    }

    return '';
  }

  // Méthode pour basculer l'affichage du sous-menu des paramètres
  toggleParametres(): void {
    this.showParametres = !this.showParametres;
  }

  // Méthode pour naviguer vers une route et mettre à jour le fil d'Ariane
  navigateTo(path: string, label: string, menuId: string): void {
    // Mettre à jour le menu actif
    this.activeMenu = menuId;

    // Navigation vers la route
    this.router.navigate([path]);

    // Mise à jour du fil d'Ariane
    if (path === '/dashboard' || path === '/dashboard-etude' || path === '/dashboardf') {
      // Cas particulier pour Dashboard: on reset le fil d'Ariane à juste "Accueil"
      this.breadcrumbService.reset();
    } else {
      // Pour les autres routes, on définit un nouveau fil d'Ariane avec Accueil + la destination
      this.breadcrumbService.setBreadcrumbs([
        { label, path }
      ]);
    }
  }

  // Méthode pour naviguer vers une sous-section et ajouter un niveau au fil d'Ariane
  navigateToSubSection(path: string, label: string, menuId: string): void {
    // Mettre à jour le menu actif
    this.activeMenu = menuId;

    this.router.navigate([path]);
    this.breadcrumbService.addBreadcrumb({ label, path });
  }

  // Méthode pour vérifier si un menu est actif
  isActive(menuId: string): boolean {
    return this.activeMenu === menuId;
  }

  // Méthode pour gérer la déconnexion
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Méthode pour obtenir l'URL de la photo de profil
  getProfileImageUrl(): string {
    this.profileImageLoading = true;
    const user = this.authService.currentUser();

    if (user?.photo) {
      return `${this.baseUrl}${user.photo}?${new Date().getTime()}`;
    }

    return 'assets/images/profil.png';
  }

  onImageLoad(): void {
    this.profileImageLoading = false;
  }

  // Méthode pour gérer les erreurs de chargement d'image
  onImageError(event: any): void {
    console.warn('Erreur lors du chargement de la photo de profil, utilisation de l\'image par défaut');
    this.profileImageLoading = false;
    event.target.src = 'assets/images/profil.png';
  }

  // Méthode pour obtenir le nom d'affichage formaté
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  // Getters pour l'accès aux informations utilisateur
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

  // Méthode pour obtenir les initiales de l'utilisateur
  getUserInitials(): string {
    return this.authService.getUserInitials();
  }

  // Méthodes pour vérifier les profils (adaptées pour BET)



  // Méthode pour obtenir des informations supplémentaires sur l'utilisateur
  getUserEmail(): string {
    const user = this.currentUser;
    return user?.email || '';
  }

  getUserPhone(): string {
    const user = this.currentUser;
    return user?.telephone || '';
  }

  // Méthode pour vérifier si l'utilisateur est activé
  isUserActivated(): boolean {
    return this.authService.isUserActivated();
  }

  /**
   * Méthode utilitaire pour debug - à supprimer en production
   */
  debugUserProfile(): void {
    console.log('Current User:', this.currentUser);
    console.log('Is BET Profile:', this.isBETProfile());
    console.log('User Profile:', this.getUserProfile());
    console.log('User Profil Type:', typeof this.currentUser?.profil);
    console.log('User Profil Value:', this.currentUser?.profil);
  }
}