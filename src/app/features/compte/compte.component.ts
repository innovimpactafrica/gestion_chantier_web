import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../auth/services/auth.service';
import { SubscriptionService, Invoice, InvoiceResponse, SubscriptionPlan, UserSubscription } from '../../../services/subscription.service';

@Component({
  selector: 'app-compte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css']
})
export class CompteComponent implements OnInit, OnDestroy {
  activeTab = signal<'informations' | 'abonnements' | 'factures'>('informations');
  userForm!: FormGroup;
  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  
  // Messages de notification
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  // Gestion de l'abonnement actif
  hasActiveSubscription = signal(false);
  isCheckingSubscription = signal(false);
  currentSubscription = signal<UserSubscription | null>(null);
  photoLoadError = false;

  // Plans d'abonnement
  subscriptionPlans = signal<SubscriptionPlan[]>([]);
  isLoadingPlans = signal(false);
  premiumPlan = signal<SubscriptionPlan | null>(null);
  basicPlan = signal<SubscriptionPlan | null>(null);
  isYearlyBilling = signal(false);

  // Factures dynamiques
  factures = signal<Invoice[]>([]);
  totalFactures = signal(0);
  currentPage = signal(0);
  pageSize = 5;
  totalPages = signal(0);
  isLoadingFactures = signal(false);

  // État du traitement de paiement - SÉPARÉ pour chaque plan
  isProcessingBasic = signal(false);
  isProcessingPremium = signal(false);

  // Gestion du script OneTouch
  private oneTouchCheckInterval: any;
  private oneTouchLoaded = signal(false);
  private maxOneTouchAttempts = 30;

  private fb = inject(FormBuilder);
  public authService = inject(AuthService);
  private subscriptionService = inject(SubscriptionService);

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
    this.loadOneTouchScript();
    this.startOneTouchMonitoring();
  }

  private loadOneTouchScript(): void {
    const existingScript = document.querySelector('script[src*="form.js"]');
    
    if (!existingScript) {
      console.log('📥 Chargement manuel du script OneTouch...');
      
      const script = document.createElement('script');
      script.src = 'https://test.solinusteam.com/Scripts/form.js';
      script.type = 'text/javascript';
      
      script.onload = () => {
        console.log('✅ Script OneTouch chargé manuellement avec succès');
        this.oneTouchLoaded.set(true);
      };
      
      script.onerror = (error) => {
        console.error('❌ Erreur chargement manuel du script OneTouch:', error);
      };
      
      document.head.appendChild(script);
    }
  }

  ngOnDestroy(): void {
    this.stopOneTouchMonitoring();
  }

  private startOneTouchMonitoring(): void {
    console.log('🔍 Début de la surveillance du script OneTouch...');
    
    let attempts = 0;
    
    this.oneTouchCheckInterval = setInterval(() => {
      attempts++;
      
      if (this.isOneTouchScriptLoaded()) {
        console.log('✅ Script OneTouch chargé avec succès');
        this.oneTouchLoaded.set(true);
        this.stopOneTouchMonitoring();
        return;
      }
      
      if (attempts >= this.maxOneTouchAttempts) {
        console.warn('⚠️ Script OneTouch non chargé après 15 secondes');
        this.stopOneTouchMonitoring();
        return;
      }
      
      if (attempts % 5 === 0) {
        console.log(`⏳ Attente du script OneTouch... (${attempts}/${this.maxOneTouchAttempts})`);
      }
    }, 500);
  }

  private stopOneTouchMonitoring(): void {
    if (this.oneTouchCheckInterval) {
      clearInterval(this.oneTouchCheckInterval);
      this.oneTouchCheckInterval = null;
    }
  }

  private isOneTouchScriptLoaded(): boolean {
    return typeof (window as any).sendPaymentInfos === 'function';
  }

  private initializeForm(): void {
    this.userForm = this.fb.group({
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      nom: ['', [Validators.required, Validators.minLength(2)]],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9\s\-\+\(\)]+$/)]],
      email: ['', [Validators.required, Validators.email]],
      adress: [''],
      company: ['']
    });
  }

  private loadUserData(): void {
    this.isLoading.set(true);
    const user = this.authService.currentUser();

    if (user) {
      this.currentUser.set(user);
      this.populateForm(user);
      this.loadFactures(user.id);
      this.checkUserSubscription(user.id);
      this.isLoading.set(false);
    } else {
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          if (user) {
            this.currentUser.set(user);
            this.populateForm(user);
            this.loadFactures(user.id);
            this.checkUserSubscription(user.id);
          }
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Erreur chargement utilisateur:', error);
          this.showError('Impossible de charger les informations utilisateur');
          this.isLoading.set(false);
        }
      });
    }
  }
  /**
 * Vérifie si l'utilisateur est un administrateur
 */
isAdmin(): boolean {
  const user = this.currentUser();
  if (!user) return false;
  
  let userProfile = '';
  
  if (Array.isArray(user.profil) && user.profil.length > 0) {
    userProfile = user.profil[0];
  } 
  else if (user.profils && typeof user.profils === 'string') {
    userProfile = user.profils;
  }
  else if (typeof user.profil === 'string') {
    userProfile = user.profil as any;
  }
  
  return userProfile.toUpperCase() === 'ADMIN';
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
        
        if (isActive) {
          // Charger les détails de l'abonnement en cours
          this.loadCurrentSubscription(userId);
        } else {
          // Charger les plans disponibles
          const user = this.currentUser();
          if (user) {
            this.loadSubscriptionPlans(user);
          }
        }
        
        this.isCheckingSubscription.set(false);
      },
      error: (error) => {
        console.error('❌ Erreur vérification abonnement:', error);
        this.hasActiveSubscription.set(false);
        this.isCheckingSubscription.set(false);
        
        // En cas d'erreur, charger les plans par défaut
        const user = this.currentUser();
        if (user) {
          this.loadSubscriptionPlans(user);
        }
      }
    });
  }

  /**
   * Charge les détails de l'abonnement en cours
   */
  private loadCurrentSubscription(userId: number): void {
    console.log('📥 Chargement de l\'abonnement en cours...');
    
    this.subscriptionService.getSubscriptionByUser(userId).subscribe({
      next: (subscription: UserSubscription) => {
        console.log('✅ Abonnement en cours récupéré:', subscription);
        this.currentSubscription.set(subscription);
      },
      error: (error) => {
        console.error('❌ Erreur chargement abonnement en cours:', error);
        this.showError('Impossible de charger les détails de votre abonnement');
      }
    });
  }

  /**
   * Formatte la date d'expiration
   */
  getExpirationDate(): string {
    const subscription = this.currentSubscription();
    if (!subscription || !subscription.createdAt) {
      return 'Non disponible';
    }
    
    const createdDate = new Date(subscription.createdAt);
    // Ajouter 1 mois à la date de création (à adapter selon votre logique)
    createdDate.setMonth(createdDate.getMonth() + 1);
    
    return createdDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formatte la période de l'abonnement
   */
  getSubscriptionPeriod(): string {
    const subscription = this.currentSubscription();
    if (!subscription || !subscription.createdAt) {
      return 'Non disponible';
    }
    
    const startDate = new Date(subscription.createdAt);
    const endDate = new Date(subscription.createdAt);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
    
    return `Du ${formatDate(startDate)} au ${formatDate(endDate)}`;
  }

  /**
   * Retourne le nom du plan de l'abonnement en cours
   */
  getCurrentPlanName(): string {
    const subscription = this.currentSubscription();
    return subscription?.subscriptionPlan?.name || 'N/A';
  }

  /**
   * Retourne le label du plan (BASIC/PREMIUM)
   */
  getCurrentPlanLabel(): string {
    const subscription = this.currentSubscription();
    return subscription?.subscriptionPlan?.label || 'N/A';
  }

  /**
   * Retourne le montant payé
   */
  getCurrentPlanAmount(): string {
    const subscription = this.currentSubscription();
    if (!subscription?.subscriptionPlan?.totalCost) {
      return '0 F CFA';
    }
    return `${subscription.subscriptionPlan.totalCost.toLocaleString('fr-FR')} F CFA`;
  }

  /**
   * Retourne le mode de paiement (à adapter selon vos données)
   */
  getPaymentMethod(): string {
    return 'Carte bancaire'; // À adapter selon vos données
  }

  /**
   * Vérifie si le plan est illimité
   */
  isUnlimitedProjects(): boolean {
    const subscription = this.currentSubscription();
    return subscription?.subscriptionPlan?.unlimitedProjects || false;
  }

  /**
   * Retourne la limite de projets
   */
  getProjectLimit(): number {
    const subscription = this.currentSubscription();
    return subscription?.subscriptionPlan?.projectLimit || 0;
  }

  /**
   * Retourne le nombre d'échéances
   */
  getInstallmentCount(): number {
    const subscription = this.currentSubscription();
    return subscription?.subscriptionPlan?.installmentCount || 1;
  }

  private populateForm(user: User): void {
    this.userForm.patchValue({
      prenom: user.prenom,
      nom: user.nom,
      telephone: user.telephone,
      email: user.email,
      adress: user.adress,
      company: user.company?.name || ''
    });
  }

  setActiveTab(tab: 'informations' | 'abonnements' | 'factures'): void {
    this.activeTab.set(tab);
    
    if (tab === 'factures' && this.currentUser()) {
      this.loadFactures(this.currentUser()!.id);
    }
    
    if (tab === 'abonnements' && this.currentUser()) {
      // Recharger le statut de l'abonnement
      this.checkUserSubscription(this.currentUser()!.id);
    }
  }

  getPageTitle(): string {
    const titles = {
      'informations': 'Informations personnelles',
      'abonnements': 'Abonnements',
      'factures': 'Factures'
    };
    return titles[this.activeTab()];
  }



  getUserFullName(): string {
    const user = this.currentUser();
    if (!user) return 'Utilisateur';
    return `${user.prenom} ${user.nom}`;
  }

  getUserProfile(): string {
    const user = this.currentUser();
    if (!user) return 'Utilisateur';
    
    let profile = '';
    
    if (Array.isArray(user.profil) && user.profil.length > 0) {
      profile = user.profil[0];
    } 
    else if (user.profils && typeof user.profils === 'string') {
      profile = user.profils;
    }
    else if (typeof user.profil === 'string') {
      profile = user.profil as any;
    }
    
    return profile ? this.formatProfileName(profile) : 'Utilisateur';
  }

  private formatProfileName(profile: string): string {
    const profileMap: { [key: string]: string } = {
      'SITE_MANAGER': 'Manager',
      'SUBCONTRACTOR': 'Sous-traitant',
      'SUPPLIER': 'Fournisseur',
      'ADMIN': 'Administrateur',
      'BET': 'Bureau d\'études',
      'USER': 'Utilisateur'
    };
    
    return profileMap[profile] || profile;
  }
/**
 * Gère l'erreur de chargement de la photo
 */
onPhotoError(): void {
  console.warn('Erreur lors du chargement de la photo de profil');
  this.photoLoadError = true;
}

/**
 * Réinitialise l'erreur de photo (utile lors du changement de photo)
 */
resetPhotoError(): void {
  this.photoLoadError = false;
}

/**
 * Obtient les initiales de l'utilisateur pour le placeholder
 * @returns string - Les initiales (ex: "AD", "CG")
 */
getUserInitials(): string {
  const user = this.currentUser();
  if (!user) return 'U';
  
  const firstInitial = user.prenom?.charAt(0)?.toUpperCase() || '';
  const lastInitial = user.nom?.charAt(0)?.toUpperCase() || '';
  
  return `${firstInitial}${lastInitial}` || 'U';
}

/**
 * Vérifie si l'utilisateur a une photo de profil valide
 * @returns boolean
 */
hasUserPhoto(): boolean {
  const user = this.currentUser();
  return !!(user?.photo);
}

/**
 * Obtient l'URL complète de la photo de profil
 * @returns string - L'URL de la photo ou une chaîne vide
 */
getUserPhotoUrl(): string {
  const user = this.currentUser();
  if (user?.photo) {
    // Utiliser la méthode du service ou construire l'URL
    return this.authService.getUserPhotoUrl(user.id);
    // const baseUrl = 'https://wakana.online/repertoire_samater/';
  }
  return '';
}


  private loadSubscriptionPlans(user: User): void {
    this.isLoadingPlans.set(true);
    
    let userProfile = '';
    
    if (Array.isArray(user.profil) && user.profil.length > 0) {
      userProfile = user.profil[0];
    } 
    else if (user.profils && typeof user.profils === 'string') {
      userProfile = user.profils;
    }
    else if (typeof user.profil === 'string') {
      userProfile = user.profil as any;
    }

    console.log('🔍 Profil utilisateur détecté:', userProfile);

    if (!userProfile) {
      console.error('❌ Aucun profil trouvé pour l\'utilisateur');
      this.showError('Impossible de déterminer votre profil utilisateur');
      this.isLoadingPlans.set(false);
      return;
    }

    this.subscriptionService.getPlanSubscription(userProfile).subscribe({
      next: (plans: SubscriptionPlan[]) => {
        console.log('✅ Plans reçus:', plans);
        this.subscriptionPlans.set(plans);
        
        const premium = plans.find(plan => 
          plan.label?.toUpperCase() === 'PREMIUM' || 
          plan.name?.toUpperCase() === 'PREMIUM'
        );
        const basic = plans.find(plan => 
          plan.label?.toUpperCase() === 'BASIC' || 
          plan.name?.toUpperCase() === 'BASIC'
        );
        
        this.premiumPlan.set(premium || null);
        this.basicPlan.set(basic || null);
        
        this.isLoadingPlans.set(false);
      },
      error: (error) => {
        console.error('❌ Erreur chargement plans:', error);
        this.showError('Impossible de charger les plans d\'abonnement');
        this.isLoadingPlans.set(false);
      }
    });
  }

  toggleBillingPeriod(): void {
    this.isYearlyBilling.set(!this.isYearlyBilling());
  }

  calculatePrice(plan: SubscriptionPlan): number {
    if (!this.isYearlyBilling()) {
      return plan.totalCost;
    }
    
    if (plan.yearlyDiscountRate > 0) {
      const yearlyPrice = plan.totalCost * 12;
      const discount = yearlyPrice * (plan.yearlyDiscountRate / 100);
      return Math.round((yearlyPrice - discount) / 12);
    }
    
    return plan.totalCost;
  }

  formatPrice(plan: SubscriptionPlan): string {
    const price = this.calculatePrice(plan);
    return price.toLocaleString('fr-FR');
  }

  getPlanLabel(plan: SubscriptionPlan): string {
    return plan.label || plan.name || 'Plan';
  }

  getPlanDescription(plan: SubscriptionPlan): string {
    if (plan.description) {
      return plan.description;
    }
    
    if (plan.label === 'BASIC') {
      return 'Plan de base pour démarrer votre projet';
    } else if (plan.label === 'PREMIUM') {
      return 'Plan complet avec toutes les fonctionnalités avancées';
    }
    
    return 'Plan d\'abonnement';
  }

  async subscribeToPlan(planName: string): Promise<void> {
    const user = this.currentUser();
    
    if (!user) {
      this.showError('Vous devez être connecté pour souscrire à un abonnement');
      return;
    }

    if (!user.email || !user.prenom || !user.nom || !user.telephone) {
      this.showError('Vos informations de profil sont incomplètes. Veuillez compléter votre profil avant de souscrire.');
      return;
    }

    const plan = planName === 'Premium' ? this.premiumPlan() : this.basicPlan();
    
    if (!plan) {
      this.showError('Plan non disponible');
      return;
    }

    if (planName === 'Premium') {
      this.isProcessingPremium.set(true);
    } else {
      this.isProcessingBasic.set(true);
    }
    
    try {
      if (!this.isOneTouchScriptLoaded()) {
        this.showError(
          'Le système de paiement n\'est pas disponible. ' +
          'Veuillez rafraîchir la page et réessayer.'
        );
        return;
      }

      this.showInfo('Redirection vers la page de paiement...');

      await this.subscriptionService.initiateSubscriptionPayment(
        user,
        plan,
        this.isYearlyBilling()
      );
      
    } catch (error: any) {
      console.error('❌ Erreur lors de la souscription:', error);
      this.showError(error.message || 'Une erreur est survenue');
      
    } finally {
      if (planName === 'Premium') {
        this.isProcessingPremium.set(false);
      } else {
        this.isProcessingBasic.set(false);
      }
    }
  }

  loadFactures(userId: number, page: number = 0): void {
    this.isLoadingFactures.set(true);
    this.currentPage.set(page);
    
    this.subscriptionService.getFactures(userId, page, this.pageSize).subscribe({
      next: (response: InvoiceResponse) => {
        this.factures.set(response.content);
        this.totalFactures.set(response.totalElements);
        this.totalPages.set(response.totalPages);
        this.isLoadingFactures.set(false);
      },
      error: (error) => {
        console.error('Erreur chargement factures:', error);
        this.showError('Impossible de charger les factures');
        this.factures.set([]);
        this.isLoadingFactures.set(false);
      }
    });
  }

  getFilteredFactures(): Invoice[] {
    return this.factures();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatMontant(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F CFA`;
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages() && this.currentUser()) {
      this.loadFactures(this.currentUser()!.id, page);
    }
  }

  goToNextPage(): void {
    if (this.currentPage() < this.totalPages() - 1) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  goToPreviousPage(): void {
    if (this.currentPage() > 0) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  getPageInfo(): string {
    const start = this.currentPage() * this.pageSize + 1;
    const end = Math.min((this.currentPage() + 1) * this.pageSize, this.totalFactures());
    return `${start} - ${end} sur ${this.totalFactures()}`;
  }

  payerFacture(id: string): void {
    this.showInfo('Redirection vers le paiement...');
  }

  telechargerFacture(id: number): void {
    this.showInfo('Téléchargement en cours...');
  }

  
  onSubmit(): void {
    if (this.userForm.invalid) {
      this.showError('Veuillez remplir correctement tous les champs requis');
      Object.keys(this.userForm.controls).forEach(key => {
        const control = this.userForm.get(key);
        if (control?.invalid) {
          control.markAsTouched();
        }
      });
      return;
    }

    this.isSaving.set(true);
    const formData = this.userForm.value;

    this.authService.updateUserProfile(formData).subscribe({
      next: (updatedUser) => {
        this.currentUser.set(updatedUser);
        this.showSuccess('Vos informations ont été mises à jour avec succès');
        this.isSaving.set(false);
      },
      error: (error) => {
        console.error('Erreur mise à jour profil:', error);
        this.showError('Une erreur est survenue lors de la mise à jour');
        this.isSaving.set(false);
      }
    });
  }

  onCancel(): void {
    const user = this.currentUser();
    if (user) {
      this.populateForm(user);
      this.showInfo('Modifications annulées');
    }
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.userForm.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  getFieldError(fieldName: string): string {
    const field = this.userForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) return 'Ce champ est requis';
      if (field.errors['email']) return 'Email invalide';
      if (field.errors['minlength']) return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      if (field.errors['pattern']) return 'Format invalide';
    }
    return '';
  }

  private showSuccess(message: string): void {
    this.successMessage.set(message);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
    setTimeout(() => this.successMessage.set(null), 5000);
  }

  private showError(message: string): void {
    this.errorMessage.set(message);
    this.successMessage.set(null);
    this.infoMessage.set(null);
    setTimeout(() => this.errorMessage.set(null), 5000);
  }

  private showInfo(message: string): void {
    this.infoMessage.set(message);
    this.successMessage.set(null);
    this.errorMessage.set(null);
    setTimeout(() => this.infoMessage.set(null), 5000);
  }

  closeMessage(): void {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    this.infoMessage.set(null);
  }
}