import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';

interface AlertMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  show: boolean;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './resetpassword.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
})
export class ResetpasswordComponent implements OnInit {
  // Signals pour l'état du composant
  currentStep = signal<'request' | 'verify' | 'reset'>('request');
  showNewPassword = signal(false);
  showConfirmPassword = signal(false);
  isLoading = signal(false);
  
  // Signal pour les alertes
  alert = signal<AlertMessage>({
    type: 'error',
    message: '',
    show: false
  });

  // Regex pour validation
  private readonly phoneRegex = /^7[05678]\d{7}$/;
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private readonly passwordRegex = /^.{6,}$/;

  // Formulaires réactifs pour chaque étape
  requestForm: FormGroup;
  verifyForm: FormGroup;
  resetForm: FormGroup;

  // Stocker l'email/téléphone pour les étapes suivantes
  private userIdentifier: string = '';

  // URLs de l'API (à adapter selon votre backend)
  private readonly apiRequestUrl = 'http://localhost:8080/api/auth/password/forgot';
  private readonly apiVerifyUrl = 'http://localhost:8080/api/auth/password/verify-code';
  private readonly apiResetUrl = 'http://localhost:8080/api/auth/password/reset';

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private http: HttpClient
  ) {
    // Étape 1 : Demander l'email/téléphone
    this.requestForm = this.fb.group({
      email: ['', [
        Validators.required,
        this.emailOrPhoneValidator.bind(this)
      ]]
    });

    // Étape 2 : Vérifier le code OTP
    this.verifyForm = this.fb.group({
      code: ['', [
        Validators.required,
        Validators.pattern(/^\d{4,6}$/) // Code de 4 à 6 chiffres
      ]]
    });

    // Étape 3 : Définir le nouveau mot de passe
    this.resetForm = this.fb.group({
      newPassword: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]],
      confirmPassword: ['', [
        Validators.required
      ]]
    }, { validators: this.passwordMatchValidator });
  }

  ngOnInit(): void {
    // Initialisation
  }

  // Validateur personnalisé pour email ou téléphone
  private emailOrPhoneValidator(control: any) {
    if (!control.value) {
      return null;
    }
    
    const value = control.value.toString().trim();
    const isValidEmail = this.emailRegex.test(value);
    const isValidPhone = this.phoneRegex.test(value);
    
    if (!isValidEmail && !isValidPhone) {
      return { invalidFormat: true };
    }
    
    return null;
  }

  // Validateur pour vérifier que les mots de passe correspondent
  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword && confirmPassword && newPassword !== confirmPassword) {
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Messages d'erreur - Étape 1
  get emailErrorMessage(): string {
    const emailControl = this.requestForm.get('email');
    
    if (!emailControl?.touched) return '';
    
    if (emailControl.hasError('required')) {
      return 'L\'email ou le numéro de téléphone est requis';
    }
    if (emailControl.hasError('invalidFormat')) {
      return 'Format invalide. Utilisez un email valide ou un numéro au format 7XXXXXXXX (ex: 771234567)';
    }
    return '';
  }

  // Messages d'erreur - Étape 2
  get codeErrorMessage(): string {
    const codeControl = this.verifyForm.get('code');
    
    if (!codeControl?.touched) return '';
    
    if (codeControl.hasError('required')) {
      return 'Le code de vérification est requis';
    }
    if (codeControl.hasError('pattern')) {
      return 'Le code doit contenir entre 4 et 6 chiffres';
    }
    return '';
  }

  // Messages d'erreur - Étape 3
  get newPasswordErrorMessage(): string {
    const newPasswordControl = this.resetForm.get('newPassword');
    
    if (!newPasswordControl?.touched) return '';
    
    if (newPasswordControl.hasError('required')) {
      return 'Le nouveau mot de passe est requis';
    }
    if (newPasswordControl.hasError('pattern')) {
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }

  get confirmPasswordErrorMessage(): string {
    const confirmPasswordControl = this.resetForm.get('confirmPassword');
    
    if (!confirmPasswordControl?.touched) return '';
    
    if (confirmPasswordControl.hasError('required')) {
      return 'Veuillez confirmer le mot de passe';
    }
    if (this.resetForm.hasError('passwordMismatch') && confirmPasswordControl.touched) {
      return 'Les mots de passe ne correspondent pas';
    }
    return '';
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  togglePasswordVisibility(field: 'newPassword' | 'confirmPassword'): void {
    if (field === 'newPassword') {
      this.showNewPassword.update(current => !current);
    } else {
      this.showConfirmPassword.update(current => !current);
    }
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

  // Étape 1 : Demander le code de réinitialisation
  onRequestCode(): void {
    this.requestForm.markAllAsTouched();

    if (!this.requestForm.valid) {
      this.showAlert('error', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.isLoading.set(true);
    this.hideAlert();

    this.userIdentifier = this.requestForm.get('email')?.value;

    const requestData = {
      email: this.userIdentifier
    };

    console.log('📧 Demande de code de réinitialisation pour:', this.userIdentifier);

    // Ajouter les headers pour s'assurer que l'API comprend qu'on attend du JSON
    this.http.post(this.apiRequestUrl, requestData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Code envoyé:', response);
        this.isLoading.set(false);
        this.showAlert('success', `Un code de vérification a été envoyé à ${this.userIdentifier}`);
        
        // Passer à l'étape 2
        setTimeout(() => {
          this.currentStep.set('verify');
          this.hideAlert();
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('❌ Erreur lors de l\'envoi du code:', err);
        this.handleError(err, 'Impossible d\'envoyer le code de vérification');
      }
    });
  }

  // Étape 2 : Vérifier le code OTP
  onVerifyCode(): void {
    this.verifyForm.markAllAsTouched();

    if (!this.verifyForm.valid) {
      this.showAlert('error', 'Veuillez entrer un code valide');
      return;
    }

    this.isLoading.set(true);
    this.hideAlert();

    const verifyData = {
      email: this.userIdentifier,
      code: this.verifyForm.get('code')?.value
    };

    console.log('🔍 Vérification du code:', verifyData.code);

    this.http.post(this.apiVerifyUrl, verifyData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Code vérifié:', response);
        this.isLoading.set(false);
        this.showAlert('success', 'Code vérifié avec succès !');
        
        // Passer à l'étape 3
        setTimeout(() => {
          this.currentStep.set('reset');
          this.hideAlert();
        }, 1500);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('❌ Erreur lors de la vérification:', err);
        this.handleError(err, 'Code invalide ou expiré');
      }
    });
  }

  // Étape 3 : Réinitialiser le mot de passe
  onResetPassword(): void {
    this.resetForm.markAllAsTouched();

    if (!this.resetForm.valid) {
      this.showAlert('error', 'Veuillez corriger les erreurs dans le formulaire');
      return;
    }

    this.isLoading.set(true);
    this.hideAlert();

    const resetData = {
      email: this.userIdentifier,
      code: this.verifyForm.get('code')?.value,
      newPassword: this.resetForm.get('newPassword')?.value
    };

    console.log('🔄 Réinitialisation du mot de passe');

    this.http.post(this.apiResetUrl, resetData, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }).subscribe({
      next: (response: any) => {
        console.log('✅ Mot de passe réinitialisé:', response);
        this.isLoading.set(false);
        this.showAlert('success', 'Mot de passe modifié avec succès ! Redirection vers la connexion...');
        
        // Rediriger vers la page de connexion après 2 secondes
        setTimeout(() => {
          this.navigateToLogin();
        }, 2000);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('❌ Erreur lors de la réinitialisation:', err);
        this.handleError(err, 'Impossible de réinitialiser le mot de passe');
      }
    });
  }

  // Renvoyer le code
  resendCode(): void {
    this.showAlert('warning', 'Envoi d\'un nouveau code...');
    this.onRequestCode();
  }

  // Gestion générique des erreurs
  private handleError(err: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;
    
    console.error('❌ Erreur complète:', err);
    console.error('❌ Status:', err.status);
    console.error('❌ Error body:', err.error);
    
    // Vérifier si c'est une erreur de parsing JSON (page HTML retournée)
    if (err.error instanceof ProgressEvent) {
      errorMessage = 'L\'API n\'est pas accessible ou retourne un format invalide. Vérifiez l\'URL de l\'API.';
    } else if (err.status === 404) {
      errorMessage = 'Service non trouvé. Vérifiez que l\'API de réinitialisation est bien configurée.';
    } else if (err.status === 400) {
      errorMessage = err.error?.message || 'Données invalides';
    } else if (err.status === 401) {
      errorMessage = 'Code invalide ou expiré';
    } else if (err.status === 0) {
      errorMessage = 'Impossible de se connecter au serveur. Vérifiez que l\'API est démarrée.';
    } else if (err.status === 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard';
    } else if (err.error?.message) {
      errorMessage = err.error.message;
    }
    
    this.showAlert('error', errorMessage);
  }

  // Getters pour utilisation dans le template
  get currentAlert() {
    return this.alert();
  }

  get currentStepValue() {
    return this.currentStep();
  }

  get currentShowNewPassword() {
    return this.showNewPassword();
  }

  get currentShowConfirmPassword() {
    return this.showConfirmPassword();
  }

  get currentIsLoading() {
    return this.isLoading();
  }

  get currentRequestForm() {
    return this.requestForm;
  }

  get currentVerifyForm() {
    return this.verifyForm;
  }

  get currentResetForm() {
    return this.resetForm;
  }

  get currentEmailError() {
    return this.emailErrorMessage;
  }

  get currentCodeError() {
    return this.codeErrorMessage;
  }

  get currentNewPasswordError() {
    return this.newPasswordErrorMessage;
  }

  get currentConfirmPasswordError() {
    return this.confirmPasswordErrorMessage;
  }
}