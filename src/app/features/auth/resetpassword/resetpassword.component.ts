import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../../../core/services/language.service';

interface AlertMessage {
  type: 'success' | 'error' | 'warning';
  message: string;
  show: boolean;
}

@Component({
  selector: 'app-reset-password',
  templateUrl: './resetpassword.component.html',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
})
export class ResetpasswordComponent implements OnInit {
  // Signals pour l'état du composant
  isLoading = signal(false);

  // Signal pour les alertes
  alert = signal<AlertMessage>({
    type: 'error',
    message: '',
    show: false
  });

  // Regex pour validation email
  private readonly emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  // Formulaire pour l'email
  requestForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    public languageService: LanguageService
  ) {
    // Formulaire avec validation email
    this.requestForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(this.emailRegex)
      ]]
    });
  }

  // Helper pour la traduction
  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void {
    // Initialisation
  }

  // Message d'erreur pour l'email
  get emailErrorMessage(): string {
    const emailControl = this.requestForm.get('email');

    if (!emailControl?.touched) return '';

    if (emailControl.hasError('required')) {
      return 'L\'email est requis';
    }
    if (emailControl.hasError('email') || emailControl.hasError('pattern')) {
      return 'Veuillez entrer un email valide';
    }
    return '';
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
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

  // Envoyer la demande de réinitialisation
  onRequestCode(): void {
    this.requestForm.markAllAsTouched();

    if (!this.requestForm.valid) {
      this.showAlert('error', 'Veuillez entrer un email valide');
      return;
    }

    this.isLoading.set(true);
    this.hideAlert();

    const email = this.requestForm.get('email')?.value;
    const credentials = { email };

    console.log('📧 Demande de réinitialisation pour:', email);

    this.authService.resetPassword(credentials).subscribe({
      next: (response: any) => {
        console.log('✅ Email envoyé:', response);
        this.isLoading.set(false);
        this.showAlert('success', `Un email de réinitialisation a été envoyé à ${email}. Veuillez vérifier votre boîte de réception.`);

        // Réinitialiser le formulaire après succès
        setTimeout(() => {
          this.requestForm.reset();
          this.hideAlert();
        }, 5000);
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('❌ Erreur lors de l\'envoi:', err);
        this.handleError(err, 'Impossible d\'envoyer l\'email de réinitialisation');
      }
    });
  }

  // Gestion générique des erreurs
  private handleError(err: any, defaultMessage: string): void {
    let errorMessage = defaultMessage;

    console.error('❌ Erreur complète:', err);
    console.error('❌ Status:', err.status);
    console.error('❌ Error body:', err.error);

    if (err.error instanceof ProgressEvent) {
      errorMessage = 'L\'API n\'est pas accessible ou retourne un format invalide. Vérifiez l\'URL de l\'API.';
    } else if (err.status === 404) {
      errorMessage = 'Email non trouvé. Vérifiez votre adresse email.';
    } else if (err.status === 400) {
      errorMessage = err.error?.message || 'Données invalides';
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

  get currentIsLoading() {
    return this.isLoading();
  }

  get currentRequestForm() {
    return this.requestForm;
  }

  get currentEmailError() {
    return this.emailErrorMessage;
  }
}