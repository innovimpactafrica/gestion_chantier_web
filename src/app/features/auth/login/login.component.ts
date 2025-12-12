import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, profil, UserProfile } from '../../../features/auth/services/auth.service';
import { SubscriptionService } from '../../../../services/subscription.service';

interface AlertMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  show: boolean;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule], 
})
export class LoginComponent implements OnInit {
  // Signals pour l'état du composant
  activeTab = signal<'connexion' | 'inscription'>('connexion');
  showPassword = signal(false);
  isLoading = signal(false);
  
  // Signal pour les alertes
  alert = signal<AlertMessage>({
    type: 'error',
    message: '',
    show: false
  });

  // Signals pour la gestion de l'abonnement
  private readonly hasActiveSubscription = signal<boolean>(false);
  private readonly isCheckingSubscription = signal<boolean>(false);

  // Computed signals pour le template
  readonly canAccessDashboard = computed(() => {
    // Les ADMIN ont toujours accès
    if (this.isADMINProfile()) {
      return true;
    }
    // Les autres profils doivent avoir un abonnement actif
    return this.hasActiveSubscription();
  });

  // Regex pour validation
  private readonly phoneRegex = /^7[05678]\d{7}$/;
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly passwordRegex = /^.{6,}$/;

  // Formulaires réactifs
  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private subscriptionService: SubscriptionService
  ) {
    // Formulaire de connexion - utilise un validateur personnalisé
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        this.emailOrPhoneValidator.bind(this)
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]]
    });

    // Formulaire d'inscription (pour la cohérence)
    this.registerForm = this.fb.group({
      email: ['', [
        Validators.required,
        this.emailOrPhoneValidator.bind(this)
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]]
    });
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

  ngOnInit(): void {
    // Vérifier si l'utilisateur est déjà connecté
    if (this.authService.isAuthenticated()) {
      this.redirectBasedOnSubscription();
    }
  }

  // Validateur personnalisé pour email ou téléphone
  private emailOrPhoneValidator(control: any) {
    if (!control.value) {
      return null; // Laisse le required s'occuper des champs vides
    }
    
    const value = control.value.toString().trim();
    const isValidEmail = this.emailRegex.test(value);
    const isValidPhone = this.phoneRegex.test(value);
    
    if (!isValidEmail && !isValidPhone) {
      return { invalidFormat: true };
    }
    
    return null;
  }

  // Helper pour détecter le type d'identifiant
  private getIdentifierType(value: string): 'email' | 'phone' {
    if (this.emailRegex.test(value)) {
      return 'email';
    }
    return 'phone';
  }

  // Computed signals pour les messages d'erreur
  get emailErrorMessage(): string {
    const form = this.getCurrentForm();
    const emailControl = form.get('email');
    
    if (!emailControl?.touched) return '';
    
    if (emailControl.hasError('required')) {
      return 'L\'email ou le numéro de téléphone est requis';
    }
    if (emailControl.hasError('invalidFormat')) {
      return 'Format invalide. Utilisez un email valide ou un numéro au format 7XXXXXXXX (ex: 771234567)';
    }
    return '';
  }

  get passwordErrorMessage(): string {
    const form = this.getCurrentForm();
    const passwordControl = form.get('password');
    
    if (!passwordControl?.touched) return '';
    
    if (passwordControl.hasError('required')) {
      return 'Le mot de passe est requis';
    }
    if (passwordControl.hasError('pattern')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }

  // Helper pour obtenir le formulaire actuel
  private getCurrentForm(): FormGroup {
    return this.activeTab() === 'connexion' ? this.loginForm : this.registerForm;
  }

  // Helper pour obtenir le placeholder du champ email/téléphone
  get emailPlaceholder(): string {
    return 'Email ou numéro de téléphone (ex: user@example.com ou 771234567)';
  }

  // Helper pour obtenir le label du champ
  get emailLabel(): string {
    return 'Email ou Téléphone';
  }

  navigateToHome(): void {
    this.router.navigate(['/']);
  }

  navigateToRegister(): void {
    this.router.navigateByUrl('/register');
  }

  setActiveTab(tab: 'connexion' | 'inscription'): void {
    this.activeTab.set(tab);
    this.hideAlert();
    
    // Réinitialiser les formulaires quand on change d'onglet
    this.loginForm.reset();
    this.registerForm.reset();
  }

  togglePasswordVisibility(): void {
    this.showPassword.update(current => !current);
  }

  showAlert(type: 'success' | 'error' | 'warning', message: string): void {
    this.alert.set({
      type,
      message,
      show: true
    });

    // Auto-hide après 5 secondes
    setTimeout(() => {
      this.hideAlert();
    }, 5000);
  }

  hideAlert(): void {
    this.alert.update(current => ({ ...current, show: false }));
  }

  onSubmit(): void {
    const currentForm = this.getCurrentForm();
    
    // Marquer tous les champs comme touchés pour afficher les erreurs
    currentForm.markAllAsTouched();

    if (!currentForm.valid) {
      this.showAlert('error', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    if (this.activeTab() === 'connexion') {
      this.handleLogin();
    } else {
      this.navigateToRegister();
    }
  }

  private handleLogin(): void {
    this.isLoading.set(true);
    this.hideAlert();
  
    const emailValue = this.loginForm.get('email')?.value;
    const credentials = {
      email: emailValue,
      password: this.loginForm.get('password')?.value
    };

    const identifierType = this.getIdentifierType(emailValue);
    console.log('🚀 Tentative de connexion avec:', { 
      identifier: credentials.email, 
      type: identifierType 
    });
  
    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('📥 Réponse serveur complète:', response);
        
        // Attendre un délai pour s'assurer que toutes les données sont sauvegardées
        setTimeout(() => {
          this.processLoginSuccess(response);
        }, 200);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('❌ Erreur connexion:', err);
        this.handleLoginError(err);
      }
    });
  }
  
  private processLoginSuccess(response: any): void {
    try {
      console.log('📥 Réponse serveur complète:', response);

      // ✅ ÉTAPE 1: Attendre que l'AuthService rafraîchisse l'utilisateur
      this.authService.refreshUser().subscribe({
        next: (user) => {
          console.log('✅ Utilisateur rafraîchi:', user);
          
          // Vérifier que le token est bien présent
          const token = this.authService.getToken();
          console.log('🔑 Token présent après refresh:', !!token);

          // Indicateurs de profil
          let isBET = false;
          let isSUPPLIER = false;
          let isADMIN = false;

          try {
            // ✅ Décoder le token JWT
            const tokenParts = response?.token?.split('.');
            if (!tokenParts || tokenParts.length < 2) {
              throw new Error('Token JWT invalide ou manquant');
            }

            const payload = JSON.parse(atob(tokenParts[1]));
            console.log('🔍 Payload JWT:', payload);

            // ✅ Lecture flexible du profil
            const profile = payload.profil || payload.profile || payload.role;
            isBET = profile === 'BET';
            isSUPPLIER = profile === 'SUPPLIER';
            isADMIN = profile === 'ADMIN';

            console.log('✅ Profil détecté:', profile, '| isBET:', isBET, '| isSUPPLIER:', isSUPPLIER, '| isADMIN:', isADMIN);

          } catch (tokenError) {
            console.error('❌ Impossible de lire le token, utilisation du service:', tokenError);

            // 🔁 Fallback: vérifier via le service Auth
            isBET = this.authService.isBETProfile();
            isSUPPLIER = this.authService.isSUPPLIERProfile();
            isADMIN = this.authService.isADMINProfile();
            console.log('🔄 Fallback - Vérification via service:', { 
              isBET, 
              isSUPPLIER, 
              isADMIN 
            });
          }

          // ✅ Redirection basée sur l'abonnement
          this.redirectBasedOnSubscription(isBET, isSUPPLIER, isADMIN);
        },
        error: (error) => {
          console.error('❌ Erreur lors du refresh utilisateur:', error);
          this.isLoading.set(false);
          // Tenter une redirection par défaut
          this.redirectBasedOnSubscription(false, false, false);
        }
      });

    } catch (error) {
      console.error('❌ Erreur critique lors du traitement:', error);
      this.isLoading.set(false);
      this.redirectBasedOnSubscription(false, false, false);
    }
  }

  /**
   * Vérifie l'abonnement et redirige l'utilisateur en conséquence
   */
  private redirectBasedOnSubscription(isBET?: boolean, isSUPPLIER?: boolean, isADMIN?: boolean): void {
    // 🔄 Valeurs par défaut si non définies
    if (isBET === undefined) isBET = this.authService.isBETProfile();
    if (isSUPPLIER === undefined) isSUPPLIER = this.authService.isSUPPLIERProfile();
    if (isADMIN === undefined) isADMIN = this.authService.isADMINProfile();

    console.log('🎯 Vérification redirection - isBET:', isBET, '| isSUPPLIER:', isSUPPLIER, '| isADMIN:', isADMIN);

    // ✅ PRIORITÉ 1: Les ADMIN ont toujours accès au dashboard
    if (isADMIN) {
      this.isLoading.set(false);
      this.redirectToDashboard(isBET, isSUPPLIER, isADMIN);
      return;
    }

    // ✅ PRIORITÉ 2: Vérifier l'abonnement pour les autres profils
    const user = this.authService.currentUser();
    if (!user || !user.id) {
      console.error('❌ Utilisateur non trouvé ou ID manquant');
      this.isLoading.set(false);
      this.router.navigate(['/login']);
      return;
    }

    console.log('🔍 Vérification de l\'abonnement pour userId:', user.id);
    this.isCheckingSubscription.set(true);

    this.subscriptionService.seeActive(user.id).subscribe({
      next: (isActive: boolean) => {
        console.log('✅ Statut abonnement actif:', isActive);
        this.hasActiveSubscription.set(isActive);
        this.isCheckingSubscription.set(false);
        this.isLoading.set(false);

        if (isActive) {
          // L'utilisateur a un abonnement actif, redirection vers le dashboard
          this.redirectToDashboard(isBET, isSUPPLIER, isADMIN);
        } else {
          // Pas d'abonnement actif, redirection vers mon-compte (onglet abonnements)
          console.log('⚠️ Pas d\'abonnement actif, redirection vers mon-compte');
          this.router.navigate(['/mon-compte'], { 
            queryParams: { tab: 'abonnements' }
          }).then(success => {
            if (success) {
              this.showAlert('warning', 'Veuillez souscrire à un abonnement pour accéder au dashboard.');
            }
          });
        }
      },
      error: (error) => {
        console.error('❌ Erreur vérification abonnement:', error);
        this.hasActiveSubscription.set(false);
        this.isCheckingSubscription.set(false);
        this.isLoading.set(false);
        
        // En cas d'erreur, redirection vers mon-compte par sécurité
        this.router.navigate(['/mon-compte'], { 
          queryParams: { tab: 'abonnements' }
        }).then(success => {
          if (success) {
            this.showAlert('error', 'Erreur lors de la vérification de votre abonnement. Veuillez réessayer.');
          }
        });
      }
    });
  }

  private redirectToDashboard(isBET?: boolean, isSUPPLIER?: boolean, isADMIN?: boolean): void {
    // 🔄 Valeurs par défaut si non définies
    if (isBET === undefined) isBET = this.authService.isBETProfile();
    if (isSUPPLIER === undefined) isSUPPLIER = this.authService.isSUPPLIERProfile();
    if (isADMIN === undefined) isADMIN = this.authService.isADMINProfile();

    console.log('🎯 Redirection finale - isBET:', isBET, '| isSUPPLIER:', isSUPPLIER, '| isADMIN:', isADMIN);

    // ✅ PRIORITÉ 1: Redirection ADMIN
    if (isADMIN) {
      console.log('✅ Redirection vers dashboard ADMIN');
      this.router.navigate(['/dashboard-admin']).then(success => {
        this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace administrateur.');
        if (!success) {
          console.warn('⚠️ Redirection vers dashboard-admin échouée, fallback vers dashboard');
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }

    // ✅ PRIORITÉ 2: Redirection BET
    if (isBET) {
      console.log('✅ Redirection vers dashboard BET');
      this.router.navigate(['/dashboard-etude']).then(success => {
        this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace BET.');
        if (!success) {
          console.warn('⚠️ Redirection vers dashboard-etude échouée, fallback vers dashboard');
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }
    
    // ✅ PRIORITÉ 3: Redirection SUPPLIER
    if (isSUPPLIER) {
      console.log('✅ Redirection vers dashboard fournisseur');
      this.router.navigate(['/dashboardf']).then(success => {
        this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace fournisseur.');
        if (!success) {
          console.warn('⚠️ Redirection vers dashboardf échouée, fallback vers dashboard');
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }

    // ✅ PRIORITÉ 4: Redirection standard
    console.log('✅ Redirection vers dashboard standard');
    this.router.navigate(['/dashboard']).then(success => {
      if (success) {
        this.showAlert('success', 'Connexion réussie ! Bienvenue sur votre espace.');
      }
    });
  }

  private handleLoginError(err: any): void {
    let errorMessage = 'Erreur de connexion';
    
    if (err.status === 401) {
      errorMessage = 'Email/téléphone ou mot de passe incorrect';
    } else if (err.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    } else if (err.status === 403) {
      errorMessage = 'Accès refusé. Votre compte pourrait être suspendu.';
    } else if (err.status === 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (err.error?.message) {
      errorMessage = err.error.message;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    this.showAlert('error', errorMessage);
  }

  // Getters pour utilisation dans le template
  get currentAlert() {
    return this.alert();
  }

  get currentActiveTab() {
    return this.activeTab();
  }

  get currentShowPassword() {
    return this.showPassword();
  }

  get currentIsLoading() {
    return this.isLoading();
  }

  get currentEmailError() {
    return this.emailErrorMessage;
  }

  get currentPasswordError() {
    return this.passwordErrorMessage;
  }

  get currentLoginForm() {
    return this.loginForm;
  }

  get currentRegisterForm() {
    return this.registerForm;
  }
}