import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SubscriptionService, SubscriptionPlan } from '../../../services/subscription.service';
import { PlanAbonnementService } from '../../../services/plan-abonnement.service'; // Import PlanService
import { UserService, User } from '../../../services/user.service'; // Import UserService
import { CommonModule } from '@angular/common';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-profile-offers',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-offers.component.html',
  styleUrls: ['./profile-offers.component.css'],
  animations: [
    trigger('planFade', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('600ms ease-out')
      ])
    ])
  ]
})
export class ProfileOffersComponent implements OnInit {
  userId: number | null = null;
  userProfile: string | null = null;
  availablePlans: SubscriptionPlan[] = [];
  isLoadingPlans = true;
  animationKey = 0;
  currentUser: User | null = null;
// Ajoutez ces propriétés à la classe
hasError = false;
errorMessage = '';
  // Plans filtrés selon le profil
  currentPremiumPlan: SubscriptionPlan | null = null;
  currentBasicPlan: SubscriptionPlan | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private subscriptionService: SubscriptionService,
    private planService: PlanAbonnementService, // Inject PlanService
    private userService: UserService // Inject UserService
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.userId = params['id'] ? +params['id'] : null;
      const urlProfile = params['profil'] || null;
  
      if (this.userId && urlProfile) {
        // On passe urlProfile pour la vérification
        this.fetchUserProfile(this.userId, urlProfile);
      } else if (!this.userId) {
        console.error('❌ ID utilisateur manquant');
        this.hasError = true;
        this.errorMessage = 'Identifiant utilisateur manquant dans l\'URL.';
        this.isLoadingPlans = false;
      } else if (!urlProfile) {
        console.error('❌ Profil manquant');
        this.hasError = true;
        this.errorMessage = 'Profil utilisateur manquant dans l\'URL.';
        this.isLoadingPlans = false;
      }
    });
  }

// Modifiez fetchUserProfile pour vérifier la correspondance
fetchUserProfile(id: number, urlProfile: string | null): void {
  this.isLoadingPlans = true;
  console.log(`🔍 Récupération du profil pour l'utilisateur ID: ${id}`);

  this.userService.getUserById(id).subscribe({
    next: (user: User) => {
      console.log('✅ Utilisateur trouvé:', user);
      this.currentUser = user;
      
      if (user.profil) {
        this.userProfile = user.profil;
        console.log(`👤 Profil récupéré de l'API: ${this.userProfile}`);
        
        // VÉRIFICATION CRITIQUE : Le profil URL doit correspondre au profil utilisateur
        if (urlProfile && urlProfile.toUpperCase() !== user.profil.toUpperCase()) {
          console.error('❌ ERREUR: Le profil URL ne correspond pas au profil de l\'utilisateur');
          this.hasError = true;
          this.errorMessage = 'Accès non autorisé : le profil spécifié ne correspond pas à votre compte.';
          this.isLoadingPlans = false;
          return;
        }
        
        this.loadPlansForProfile();
      } else {
        console.warn('⚠️ L\'utilisateur n\'a pas de profil défini');
        this.hasError = true;
        this.errorMessage = 'Cet utilisateur n\'a pas de profil défini.';
        this.isLoadingPlans = false;
      }
    },
    error: (err) => {
      console.error('❌ Erreur lors de la récupération de l\'utilisateur:', err);
      this.hasError = true;
      this.errorMessage = 'Utilisateur introuvable ou erreur de connexion.';
      this.isLoadingPlans = false;
    }
  });
}


  loadPlansForProfile(): void {
    if (!this.userProfile) {
      console.error('❌ Aucun profil utilisateur défini');
      this.isLoadingPlans = false;
      return;
    }
    // let userProfile=''
    console.log('🔍 Chargement de TOUS les plans (via PlanService like Portal)');
    console.log('👤 Profil cible:', this.userProfile);

    // Utiliser PlanAbonnementService.getAllPlans() COMME LE PORTAIL
    // Cela évite l'erreur 400 sur /active et correspond au comportement du portail
    this.subscriptionService.getPlanSubscription(this.userProfile).subscribe({
      next: (allPlans: SubscriptionPlan[]) => {

        // Normalisation du profil (retirer espaces, tout en majuscules)
        const profileToCheck = this.userProfile!.trim().toUpperCase();

        this.availablePlans = allPlans.filter(plan => {
          // Vérification nom du plan
          const planName = (plan.name || '').toUpperCase();
          // Vérification des profils cibles si disponibles
          const targetProfiles = (plan as any).targetProfiles || [];

          const nameMatch = planName.includes(profileToCheck);
          const targetMatch = Array.isArray(targetProfiles) && targetProfiles.some((p: string) =>
            p.toUpperCase().includes(profileToCheck)
          );

          console.log(`  - Plan: "${plan.name}" | Match nom: ${nameMatch} | Match target: ${targetMatch}`);
          return nameMatch || targetMatch;
        });

        console.log(`✅ Plans filtrés pour "${this.userProfile}":`, this.availablePlans);

        this.assignPlans();
        console.log('✅ Plans assignés:', {
          premium: this.currentPremiumPlan?.name,
          basic: this.currentBasicPlan?.name
        });
        this.isLoadingPlans = false;
        this.animationKey++;
      },
      error: (err: any) => {
        console.error('❌ Erreur lors du chargement des plans:', err);
        this.isLoadingPlans = false;
      }
    });
  }

  private assignPlans(): void {
    console.log('🔍 Assignation des plans...');
    console.log('📦 Plans disponibles:', this.availablePlans);

    // Assigner les plans selon leur LABEL (PREMIUM ou BASIC)
    this.currentPremiumPlan = this.availablePlans.find(plan => {
      const label = plan.label?.toUpperCase() || '';
      const isPremium = label === 'PREMIUM';
      console.log(`Plan "${plan.name}" - Label: "${plan.label}" - Est Premium? ${isPremium}`);
      return isPremium;
    }) || null;

    this.currentBasicPlan = this.availablePlans.find(plan => {
      const label = plan.label?.toUpperCase() || '';
      const isBasic = label === 'BASIC';
      console.log(`Plan "${plan.name}" - Label: "${plan.label}" - Est Basic? ${isBasic}`);
      return isBasic;
    }) || null;

    console.log('✅ Plans assignés:', {
      premium: this.currentPremiumPlan,
      basic: this.currentBasicPlan
    });
  }

  private getPlanType(plan: SubscriptionPlan): string {
    const label = plan.label?.toUpperCase() || '';

    if (label === 'PREMIUM') {
      return 'Premium';
    } else if (label === 'BASIC') {
      return 'Basic';
    }
    return 'Standard';
  }

  getProfileDisplayName(): string {
    if (!this.userProfile) return '';

    const profileNames: { [key: string]: string } = {
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage',
      'SUPPLIER': 'Fournisseur',
      'WORKER': 'Ouvrier',
      'SITE_MANAGER': 'Chef de Chantier',
      'ADMIN': 'Administrateur'
    };

    return profileNames[this.userProfile.toUpperCase()] || this.userProfile;
  }

  formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  truncateDescription(description: string): string {
    return description.length > 100 ? description.substring(0, 100) + '...' : description;
  }
// appelle de la methode getPlanSubscription() 

  async goToSubscription(planType: string): Promise<void> {
    // Rediriger vers la page d'abonnement avec le plan sélectionné
    const plan = planType === 'premium' ? this.currentPremiumPlan :
      planType === 'basic' ? this.currentBasicPlan : null;

    if (plan && this.currentUser?.id) {
      try {
        const isYearly = plan.installmentCount === 12;
        await this.subscriptionService.initiateSubscriptionPaymentbis(this.currentUser.id, plan, isYearly);
      } catch (error) {
        console.error('Erreur lors de l\'initiation du paiement:', error);
      }
    } else if (plan) {
      this.router.navigate(['/login'], {
        queryParams: {
          planId: plan.id,
          planType: planType,
          profile: this.userProfile
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/subscriptions'], {
      queryParams: { profil: this.userProfile }
    });
  }

  getCurrentName(): string {
    // Retourner le nom du profil actuel
    return this.getProfileDisplayName();
  }
}