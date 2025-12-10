import { Component, OnInit, signal, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../auth/services/auth.service';
import {
  SubscriptionService,
  Invoice,
  InvoiceResponse,
  SubscriptionPlan,
  UserSubscription
} from '../../../services/subscription.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

  // Messages
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  // Abonnement
  hasActiveSubscription = signal(false);
  isCheckingSubscription = signal(false);
  currentSubscription = signal<UserSubscription | null>(null);
  photoLoadError = false;

  // Plans
  subscriptionPlans = signal<SubscriptionPlan[]>([]);
  isLoadingPlans = signal(false);
  premiumPlan = signal<SubscriptionPlan | null>(null);
  basicPlan = signal<SubscriptionPlan | null>(null);
  isYearlyBilling = signal(false);

  // Factures
  factures = signal<Invoice[]>([]);
  totalFactures = signal(0);
  currentPage = signal(0);
  pageSize = 5;
  totalPages = signal(0);
  isLoadingFactures = signal(false);

  // Paiement
  isProcessingBasic = signal(false);
  isProcessingPremium = signal(false);

  // OneTouch
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
 * Retourne le nombre de jours restants avant expiration
 */
getDaysRemaining(): number {
  const subscription = this.currentSubscription();
  if (!subscription || !subscription.endDate) {
    return 0;
  }

  const endDate = new Date(subscription.endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Réinitialiser l'heure pour comparer uniquement les jours
  endDate.setHours(0, 0, 0, 0);
  
  const diffTime = endDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
}

/**
 * Retourne le statut de l'abonnement avec style
 */
getSubscriptionStatus(): {
  text: string;
  color: string;
  icon: string;
  urgency: 'critical' | 'warning' | 'normal' | 'expired';
} {
  const daysRemaining = this.getDaysRemaining();
  
  if (daysRemaining === 0) {
    return {
      text: 'Expiré',
      color: 'text-red-600 bg-red-50',
      icon: '❌',
      urgency: 'expired'
    };
  } else if (daysRemaining <= 7) {
    return {
      text: `${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} restant${daysRemaining > 1 ? 's' : ''}`,
      color: 'text-red-600 bg-red-50',
      icon: '⚠️',
      urgency: 'critical'
    };
  } else if (daysRemaining <= 30) {
    return {
      text: `${daysRemaining} jours restants`,
      color: 'text-orange-600 bg-orange-50',
      icon: '⏰',
      urgency: 'warning'
    };
  } else {
    return {
      text: `${daysRemaining} jours restants`,
      color: 'text-green-600 bg-green-50',
      icon: '✓',
      urgency: 'normal'
    };
  }
}

/**
 * Retourne une barre de progression pour la durée de l'abonnement
 */
getSubscriptionProgress(): number {
  const subscription = this.currentSubscription();
  if (!subscription || !subscription.startDate || !subscription.endDate) {
    return 0;
  }

  const startDate = new Date(subscription.startDate);
  const endDate = new Date(subscription.endDate);
  const today = new Date();

  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = today.getTime() - startDate.getTime();
  
  const progress = (elapsed / totalDuration) * 100;
  return Math.min(Math.max(progress, 0), 100);
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
 /**
 * Formatte la date d'expiration
 */
getExpirationDate(): string {
  const subscription = this.currentSubscription();
  if (!subscription || !subscription.endDate) {
    return 'Non disponible';
  }

  try {
    const date = new Date(subscription.endDate);
    
    if (isNaN(date.getTime())) {
      return 'Non disponible';
    }

    // Format: "09/12/2025"
    return date.toLocaleDateString('fr-FR');
  } catch (error) {
    console.error('Erreur lors du formatage de la date:', error);
    return 'Non disponible';
  }
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

telechargerFacturePDF(facture: Invoice): void {
  const html = this.construireHTMLFacture(facture);

  // créer un conteneur caché
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.top = '0';
  container.style.left = '-99999px';
  container.style.width = '794px'; // ≈ 210mm pour taille A4
  container.style.padding = '20px';
  container.style.background = '#ffffff';
  container.innerHTML = html;
  document.body.appendChild(container);

  // 👉 Injecter Tailwind (important)
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = 'https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css';
  container.appendChild(style);

  // attendre le chargement du style
  style.onload = () => {
    html2canvas(container, {
      scale: 2, // 👍 meilleure qualité du PDF
      useCORS: true // utile si images
    }).then(canvas => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');

      // calcul taille automatiquement
      const imgWidth = 210;
      const pageHeight = 297;
      let imgHeight = canvas.height * imgWidth / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      // 💡 Gestion multi-pages si contenu dépasse une page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`facture-${facture.invoiceNumber}.pdf`);
      document.body.removeChild(container);
    });
  };
}
private genererFacturePDF(facture: Invoice, printWindow: Window): void {
  const htmlContent = this.construireHTMLFacture(facture);

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="fr">
    <head>
      <meta charset="UTF-8">
      <title>Facture ${facture.invoiceNumber}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
      <style>
        body { font-family: 'Inter', sans-serif; margin:0; padding:0; background:white; }
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { margin: 0; }
        }
      </style>
    </head>
    <body>
      ${htmlContent}
      <script>
  function waitForReady() {
    const hasContent = document.body.innerHTML.length > 1000; // Vérifier si le contenu est chargé
    const tailwindLoaded = window.tailwind !== undefined;     // Vérifier si Tailwind est chargé
    
    if (hasContent && tailwindLoaded) {
      setTimeout(() => window.print(), 800); // Délai avant impression
    } else {
      setTimeout(waitForReady, 400); // Réessayer tant que non prêt
    }
  }

  window.onload = () => {
    setTimeout(waitForReady, 500); // On attend un peu
  };

  // ❌ ON DÉSACTIVE TOUTE FERMETURE
  window.onafterprint = null;
</script>

    </body>
    </html>
  `);

  printWindow.document.close();
}
private construireHTMLFacture(facture: Invoice): string {
    const formatDate = (date: string) =>
      new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });

    const formatAmount = (amount: number) =>
      new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', minimumFractionDigits: 0 }).format(amount);

    const user = this.authService.currentUser();
    const sousTotal = facture.amount || 0;
    const tva = sousTotal * 0.18;
    const totalTTC = sousTotal + tva;

    return `
      <div class="min-h-screen bg-white p-10">
        <div class="max-w-4xl mx-auto">
          <!-- Bande orange -->
          <div class="bg-gradient-to-r from-[#FF5C02] to-[#FF7A33] h-3 rounded-t-lg"></div>

          <div class="border-2 border-gray-200 rounded-b-lg p-12 bg-white">
            <!-- Header -->
            <div class="flex justify-between items-start mb-12 pb-8 border-b-2 border-gray-100">
              <div class="flex items-center gap-6">
                <div class="w-24 h-24 rounded-xl overflow-hidden border border-gray-200">
  <img src="assets/images/btp.png" alt="Logo BTP" class="w-full h-full object-cover" crossOrigin="anonymous">
</div>

                <div>
                  <h1 class="text-3xl font-bold">BTP</h1>
                  <p class="text-gray-600">La solution complète</p>
                  <p class="text-sm text-gray-500">Dakar, Sénégal • contact@BTP.sn</p>
                </div>
              </div>

              <div class="text-right">
                <div class="inline-block bg-[#FF5C02] text-white px-4 py-2 rounded-lg mb-4">
                  <p class="text-sm font-medium">FACTURE</p>
                </div>
                <p class="text-2xl font-bold">${facture.invoiceNumber}</p>
                <p class="text-sm text-gray-600">Date d'émission : ${formatDate(facture.createdAt)}</p>
                ${facture.paid
                  ? `<span class="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">PAYÉE</span>`
                  : `<span class="inline-flex items-center gap-2 mt-3 px-3 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">EN ATTENTE</span>`}
              </div>
            </div>

            <!-- Client -->
            <div class="mb-12">
              <h2 class="text-lg font-semibold mb-4">Facturé à</h2>
              <div class="bg-gray-50 p-6 rounded-xl border">
                <p class="text-xl font-bold">${user?.prenom || ''} ${user?.nom || ''}</p>
                ${user?.company?.name ? `<p class="font-medium mt-2">${user.company.name}</p>` : ''}
                <div class="text-sm text-gray-600 mt-3 space-y-1">
                  <p>${user?.email || ''}</p>
                  <p>${user?.telephone || ''}</p>
                  <p>${user?.adress || ''}</p>
                </div>
              </div>
            </div>

            <!-- Tableau abonnement -->
            <div class="mb-8">
              <h2 class="text-lg font-semibold mb-4">Détails de l'abonnement</h2>
              <table class="w-full border-collapse">
                <thead>
                  <tr class="bg-gradient-to-r from-[#FF5C02] to-[#FF7A33] text-white">
                    <th class="text-left p-4">Description</th>
                    <th class="text-center p-4">Période</th>
                    <th class="text-right p-4">Montant HT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr class="bg-gray-50">
                    <td class="p-5">
                      <span class="font-semibold">${facture.planLabel || 'Abonnement'}</span><br>
                      <span class="text-sm text-gray-600">Abonnement annuel</span>
                    </td>
                    <td class="text-center p-5 text-gray-700">
                      ${facture.startDate ? formatDate(facture.startDate) : 'N/A'} → 
                      ${facture.endDate ? formatDate(facture.endDate) : 'N/A'}
                    </td>
                    <td class="text-right p-5 font-semibold">${formatAmount(sousTotal)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Résumé -->
            <div class="flex justify-end">
              <div class="w-96 space-y-3">
                <div class="flex justify-between"><span>Sous-total HT :</span><span>${formatAmount(sousTotal)}</span></div>
                
                <div class="border-t-2 border-gray-300 my-2"></div>
                <div class="flex justify-between text-xl font-bold text-[#FF5C02]">
                  <span>Total TTC :</span>
                  <span>${formatAmount(sousTotal)}</span>
                </div>
              </div>
            </div>

            <!-- Footer -->
            <div class="text-center text-sm text-gray-500 mt-16">
              <p>BTP © 2025 • Document généré électroniquement – Aucune signature requise</p>
            </div>
          </div>
        </div>
      </div>
    `;
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