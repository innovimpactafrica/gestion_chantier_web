

import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { AuthService } from '../../features/auth/services/auth.service';
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

  constructor(
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    public authService: AuthService // Injection du service d'authentification
  ) {}

  ngOnInit(): void {
    // Récupérer les informations utilisateur au chargement du composant
    if (this.authService.isAuthenticated()) {
      const userSubscription = this.authService.refreshUser().subscribe({
        next: (user) => {
          console.log('Utilisateur chargé dans la sidebar:', user);
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
    if (path === '/dashboard') {
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
    this.router.navigate(['/login']); // Ajustez la route selon votre configuration
  }

  // Méthode pour obtenir l'URL de la photo de profil
// base url pour les images 
  baseUrl = 'https://wakana.online/repertoire_samater/';
  // getProfileImageUrl(): string {

  //   const user = this.authService.currentUser();
  //   if (user && this.authService.hasUserPhoto()) {
  //     return this.authService.getUserPhotoUrl();
  //   }
  //   return 'assets/images/profil.png'; // Image par défaut
  // }

  // getProfileImageUrl(): string {
  //   const user = this.authService.currentUser();
  //   if (user && user.photo) {
  //     // Ajoutez le baseUrl devant le chemin de la photo
  //     return this.baseUrl + user.photo;
  //   }
  //   return 'assets/images/profil.png'; // Image par défaut
  // }


  // Ajoutez cette propriété pour suivre l'état de chargement
profileImageLoading = true;

getProfileImageUrl(): string {
  this.profileImageLoading = true;
  const user = this.authService.currentUser();
  
  if (user?.photo) {
    return `${this.baseUrl}${user.photo}?${new Date().getTime()}`; // Ajout d'un timestamp pour éviter le cache
  }
  
  return 'assets/images/profil.png';
}

onImageLoad(): void {
  this.profileImageLoading = false;
}

// onImageError(event: any): void {
//   console.warn('Erreur de chargement de la photo de profil');
//   this.profileImageLoading = false;
//   event.target.src = 'assets/images/profil.png';
// }
  // Méthode pour gérer les erreurs de chargement d'image
  onImageError(event: any): void {
    console.warn('Erreur lors du chargement de la photo de profil, utilisation de l\'image par défaut');
    event.target.src = 'assets/images/profil.png';
  }

  // Méthode pour obtenir le nom d'affichage formaté
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  // Méthode pour obtenir le profil formaté
  // getUserProfile(): string {
  //   return this.authService.getFormattedUserProfile();
  // }

  // getProfileImageUrl(): string {
  //   return this.authService.getUserPhotoUrl();
  // }

  // Méthodes pour accéder aux signals du service d'authentification
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

  // Méthode pour vérifier si l'utilisateur a des permissions spéciales
  // isAdmin(): boolean {
  //   return this.authService.isAdmin();
  // }

  isSiteManager(): boolean {
    return this.authService.isSiteManager();
  }

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
}