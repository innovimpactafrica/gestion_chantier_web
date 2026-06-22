import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService, UserSubscription, toJsDate } from '../../../services/subscription.service';
import { AuthService } from '../auth/services/auth.service';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-user-subscriptions',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-subscriptions.component.html',
  styleUrls: ['./user-subscriptions.component.css']
})
export class UserSubscriptionsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  userId: number | null = null;
  userProfile: string | null = null;
  subscriptions: UserSubscription[] = [];
  loading = true;
  error: string | null = null;
  isAuthenticated = false;
  currentUserId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    public authService: AuthService
  ) { }

  ngOnInit(): void {
    // Vérifier l'authentification
    this.isAuthenticated = this.authService.isAuthenticated();
    this.currentUserId = this.authService.getConnectedUserId();


    // Récupérer les paramètres de l'URL
    this.route.queryParams.pipe(
      takeUntil(this.destroy$)
    ).subscribe(params => {
      this.userId = params['id'] ? +params['id'] : null;
      this.userProfile = params['profil'] || null;


      // Validation des paramètres
      if (!this.userProfile) {
        this.error = 'Paramètre profil requis dans l\'URL';
        this.loading = false;
        return;
      }

      // Vérification de sécurité : l'utilisateur ne peut voir que ses propres abonnements
      if (this.isAuthenticated && this.userId && this.currentUserId !== this.userId) {
        this.error = 'Vous n\'êtes pas autorisé à voir ces abonnements';
        this.loading = false;
        return;
      }

      // Si l'utilisateur n'est pas authentifié
      if (!this.isAuthenticated) {
        this.error = 'Veuillez vous connecter pour voir vos abonnements';
        this.loading = false;
        return;
      }

      // Charger les abonnements
      this.loadSubscriptions();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadSubscriptions(): void {
    if (!this.isAuthenticated) {
      this.error = 'Authentification requise';
      this.loading = false;
      return;
    }

    // Utiliser l'ID de l'utilisateur connecté si disponible, sinon celui de l'URL
    const targetUserId = this.currentUserId || this.userId;

    if (!targetUserId) {
      this.error = 'ID utilisateur non disponible';
      this.loading = false;
      return;
    }


    this.subscriptionService.getSubscriptionByUser(targetUserId).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (subscription: UserSubscription) => {
        this.subscriptions = subscription ? [subscription] : [];
        this.loading = false;
        this.error = null;
      },
      error: (err: any) => {

        if (err.status === 401 || err.status === 403) {
          this.error = 'Session expirée. Veuillez vous reconnecter.';
        } else if (err.status === 404) {
          this.error = null; // Pas d'erreur si aucun abonnement trouvé
          this.subscriptions = [];
        } else {
          this.error = 'Erreur lors du chargement des abonnements.';
        }

        this.loading = false;
      }
    });
  }

  getStatus(subscription: UserSubscription): string {
    const now = new Date();
    const endDate = toJsDate(subscription.endDate);

    if (endDate && endDate < now) return 'Expiré';

    const startDate = toJsDate(subscription.startDate);
    if (startDate && startDate > now) return 'En attente';

    return 'Actif';
  }

  /** Convertit startDate/endDate/createdAt (tableau backend ou chaîne ISO) en Date JS pour le pipe `date` */
  toDate(value: UserSubscription['startDate'] | UserSubscription['endDate']): Date | null {
    return toJsDate(value);
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'Actif':
        return 'text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-semibold';
      case 'Expiré':
        return 'text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-semibold';
      case 'En attente':
        return 'text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-semibold';
      default:
        return 'text-gray-600 bg-gray-50 px-2 py-1 rounded-full text-xs font-semibold';
    }
  }

  navigateToOffers(): void {
    if (this.userId && this.userProfile) {
      // Construction de l'URL avec l'ID et le profil pour correspondre à la nouvelle route sub/:id/:profil
      const url = this.router.serializeUrl(
        this.router.createUrlTree(['/sub', this.userId, this.userProfile])
      );
      window.open(url, '_blank');
    } else {
    }
  }

  getProfileDisplayName(profile: string | null): string {
    if (!profile) return '';

    const profileNames: { [key: string]: string } = {
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage',
      'SUPPLIER': 'Fournisseur',
      'WORKER': 'Ouvrier',
      'SITE_MANAGER': 'Chef de Chantier',
      'SUBCONTRACTOR': 'Sous-traitant',
      'ADMIN': 'Administrateur'
    };

    return profileNames[profile.toUpperCase()] || profile;
  }

  getProfileDescription(profile: string | null): string {
    if (!profile) return '';

    const descriptions: { [key: string]: string } = {
      'PROMOTEUR': 'Accès complet aux fonctionnalités de gestion de projet et suivi des chantiers.',
      'MOA': 'Maître d\'ouvrage avec droits de supervision et validation des projets.',
      'SUPPLIER': 'Fournisseur avec accès aux commandes et livraisons.',
      'WORKER': 'Ouvrier avec accès limité aux tâches assignées.',
      'SITE_MANAGER': 'Chef de chantier avec gestion complète du personnel et des ressources.',
      'SUBCONTRACTOR': 'Sous-traitant avec accès aux lots et tâches assignés.',
      'ADMIN': 'Administrateur avec tous les droits système.'
    };

    return descriptions[profile.toUpperCase()] || 'Profil utilisateur standard.';
  }

  getAvailableSubscriptionTypes(profile: string | null): string[] {
    if (!profile) return [];

    const profileRules: { [key: string]: string[] } = {
      'PROMOTEUR': ['Premium', 'Basic'],
      'MOA': ['Premium', 'Basic'],
      'SUPPLIER': ['Basic', 'Standard'],
      'WORKER': ['Basic'],
      'SITE_MANAGER': ['Premium', 'Basic'],
      'SUBCONTRACTOR': ['Premium', 'Basic'],
      'ADMIN': ['Premium', 'Basic', 'Standard']
    };

    return profileRules[profile.toUpperCase()] || ['Basic'];
  }

  getSubscriptionType(subscription: UserSubscription): string {
    // Déterminer le type d'abonnement basé sur le nom du plan
    const planName = subscription.subscriptionPlan?.name?.toLowerCase() || '';
    const planLabel = subscription.subscriptionPlan?.label?.toLowerCase() || '';


    // Vérifier Premium
    if (planName.includes('premium') || planName.includes('pro') ||
      planLabel.includes('premium') || planLabel.includes('pro')) {
      return 'Premium';
    }

    // Vérifier Basic
    if (planName.includes('basic') || planName.includes('basique') ||
      planLabel.includes('basic') || planLabel.includes('basique')) {
      return 'Basic';
    }

    // Vérifier Standard
    if (planName.includes('standard') || planLabel.includes('standard')) {
      return 'Standard';
    }

    // Par défaut, retourner le nom du plan ou 'Standard'
    return subscription.subscriptionPlan?.label || subscription.subscriptionPlan?.name || 'Standard';
  }

  getSubscriptionTypeClass(type: string): string {
    switch (type.toLowerCase()) {
      case 'premium':
        return 'text-purple-600 bg-purple-50 px-3 py-1 rounded-full text-sm font-semibold';
      case 'basic':
        return 'text-blue-600 bg-blue-50 px-3 py-1 rounded-full text-sm font-semibold';
      case 'standard':
        return 'text-gray-600 bg-gray-50 px-3 py-1 rounded-full text-sm font-semibold';
      default:
        return 'text-gray-600 bg-gray-50 px-3 py-1 rounded-full text-sm font-semibold';
    }
  }

  viewDetails(subscription: UserSubscription): void {
    this.router.navigate(['/subscription-details'], {
      queryParams: {
        id: subscription.id,
        userId: subscription.user.id
      }
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  retryLoad(): void {
    this.error = null;
    this.loading = true;
    this.loadSubscriptions();
  }
}