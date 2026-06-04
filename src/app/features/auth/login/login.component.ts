import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, profil, UserProfile } from '../../../features/auth/services/auth.service';
import { SubscriptionService } from '../../../../services/subscription.service';
import { LanguageService } from '../../../core/services/language.service';

interface AlertMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  show: boolean;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
    private subscriptionService: SubscriptionService,
    public languageService: LanguageService
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

  // Helper pour la traduction
  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
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
      return this.t('auth.login.error.required');
    }
    if (emailControl.hasError('invalidFormat')) {
      return this.t('auth.login.error.invalidFormat');
    }
    return '';
  }

  get passwordErrorMessage(): string {
    const form = this.getCurrentForm();
    const passwordControl = form.get('password');

    if (!passwordControl?.touched) return '';

    if (passwordControl.hasError('required')) {
      return this.t('auth.login.error.passwordRequired');
    }
    if (passwordControl.hasError('pattern')) {
      return this.t('auth.login.error.passwordMinLength');
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
      this.showAlert('error', this.t('auth.login.error.formErrors'));
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
    this.authService.login(credentials).subscribe({
      next: (response) => {

        // Attendre un délai pour s'assurer que toutes les données sont sauvegardées
        setTimeout(() => {
          this.processLoginSuccess(response);
        }, 200);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.handleLoginError(err);
      }
    });
  }

  private processLoginSuccess(response: any): void {
    try {

      // ✅ ÉTAPE 1: Attendre que l'AuthService rafraîchisse l'utilisateur
      this.authService.refreshUser().subscribe({
        next: (user) => {

          // Vérifier que le token est bien présent
          const token = this.authService.getToken();

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

            // ✅ Lecture flexible du profil
            const profile = payload.profil || payload.profile || payload.role;
            isBET = profile === 'BET';
            isSUPPLIER = profile === 'SUPPLIER';
            isADMIN = profile === 'ADMIN';


          } catch (tokenError) {

            // 🔁 Fallback: vérifier via le service Auth
            isBET = this.authService.isBETProfile();
            isSUPPLIER = this.authService.isSUPPLIERProfile();
            isADMIN = this.authService.isADMINProfile();
}

          // ✅ Redirection basée sur l'abonnement
          this.redirectBasedOnSubscription(isBET, isSUPPLIER, isADMIN);
        },
        error: (error) => {
          this.isLoading.set(false);
          // Tenter une redirection par défaut
          this.redirectBasedOnSubscription(false, false, false);
        }
      });

    } catch (error) {
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


    // ✅ PRIORITÉ 1: Les ADMIN ont toujours accès au dashboard
    if (isADMIN) {
      this.isLoading.set(false);
      this.redirectToDashboard(isBET, isSUPPLIER, isADMIN);
      return;
    }

    // ✅ PRIORITÉ 2: Vérifier l'abonnement pour les autres profils
    const user = this.authService.currentUser();
    if (!user || !user.id) {
      this.isLoading.set(false);
      this.router.navigate(['/login']);
      return;
    }

    this.isCheckingSubscription.set(true);

    this.subscriptionService.seeActive(user.id).subscribe({
      next: (isActive: boolean) => {
        this.hasActiveSubscription.set(isActive);
        this.isCheckingSubscription.set(false);
        this.isLoading.set(false);

        if (isActive) {
          // L'utilisateur a un abonnement actif, redirection vers le dashboard
          this.redirectToDashboard(isBET, isSUPPLIER, isADMIN);
        } else {
          // Pas d'abonnement actif, redirection vers mon-compte (onglet abonnements)
          this.router.navigate(['/mon-compte'], {
            queryParams: { tab: 'abonnements' }
          }).then(success => {
            if (success) {
              this.showAlert('warning', this.t('auth.login.warning.noSubscription'));
            }
          });
        }
      },
      error: (error) => {
        this.hasActiveSubscription.set(false);
        this.isCheckingSubscription.set(false);
        this.isLoading.set(false);

        // En cas d'erreur, redirection vers mon-compte par sécurité
        this.router.navigate(['/mon-compte'], {
          queryParams: { tab: 'abonnements' }
        }).then(success => {
          if (success) {
            this.showAlert('error', this.t('auth.login.error.subscriptionCheck'));
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


    // ✅ PRIORITÉ 1: Redirection ADMIN
    if (isADMIN) {
      this.router.navigate(['/dashboard-admin']).then(success => {
        this.showAlert('success', this.t('auth.login.success.welcomeAdmin'));
        if (!success) {
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }

    // ✅ PRIORITÉ 2: Redirection BET
    if (isBET) {
      this.router.navigate(['/dashboard-etude']).then(success => {
        this.showAlert('success', this.t('auth.login.success.welcomeBET'));
        if (!success) {
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }

    // ✅ PRIORITÉ 3: Redirection SUPPLIER
    if (isSUPPLIER) {
      this.router.navigate(['/dashboardf']).then(success => {
        this.showAlert('success', this.t('auth.login.success.welcomeSupplier'));
        if (!success) {
          this.router.navigate(['/dashboard']);
        }
      });
      return;
    }

    // ✅ PRIORITÉ 4: Redirection standard
    this.router.navigate(['/dashboard']).then(success => {
      if (success) {
        this.showAlert('success', this.t('auth.login.success.welcome'));
      }
    });
  }

  private handleLoginError(err: any): void {
    let errorMessage = this.t('auth.login.error.invalidCredentials');

    if (err.status === 401) {
      errorMessage = this.t('auth.login.error.invalidCredentials');
    } else if (err.status === 0) {
      errorMessage = this.t('auth.login.error.networkError');
    } else if (err.status === 403) {
      errorMessage = this.t('auth.login.error.accessDenied');
    } else if (err.status === 500) {
      errorMessage = this.t('auth.login.error.serverError');
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