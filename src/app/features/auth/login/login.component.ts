import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

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

  // Regex pour validation
  private readonly phoneRegex = /^7[05678]\d{7}$/;
  // MODIFICATION: Regex pour 6 caractères minimum (au lieu de 6 chiffres)
  private readonly passwordRegex = /^.{6,}$/;

  // Formulaires réactifs
  loginForm: FormGroup;
  registerForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Formulaire de connexion
    this.loginForm = this.fb.group({
      email: ['', [
        Validators.required,
        Validators.pattern(this.phoneRegex)
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
        Validators.pattern(this.phoneRegex)
      ]],
      password: ['', [
        Validators.required,
        Validators.pattern(this.passwordRegex)
      ]]
    });
  }

  ngOnInit(): void {
    // Pas besoin de synchronisation supplémentaire
  }

  // Computed signals pour les messages d'erreur
  get emailErrorMessage(): string {
    const form = this.getCurrentForm();
    const emailControl = form.get('email');
    
    if (!emailControl?.touched) return '';
    
    if (emailControl.hasError('required')) {
      return 'Le numéro de téléphone est requis';
    }
    if (emailControl.hasError('pattern')) {
      return 'Format invalide. Utilisez le format: 7XXXXXXXX (ex: 771234567)';
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
      // MODIFICATION: Message d'erreur pour 6 caractères
      return 'Le mot de passe doit contenir au moins 6 caractères';
    }
    return '';
  }

  // Helper pour obtenir le formulaire actuel
  private getCurrentForm(): FormGroup {
    return this.activeTab() === 'connexion' ? this.loginForm : this.registerForm;
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
      // Rediriger vers la page d'inscription
      this.navigateToRegister();
    }
  }

  private handleLogin(): void {
    this.isLoading.set(true);
    this.hideAlert();

    const credentials = {
      email: this.loginForm.get('email')?.value,
      password: this.loginForm.get('password')?.value
    };


    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.showAlert('success', 'Connexion réussie !');
        
        // Le token est  géré par le service AuthService
      
        
        // Redirection après un court délai
        setTimeout(() => {
          this.router.navigate(['/dashboard']);
        }, 1500);
      },
      error: (err) => {
        this.isLoading.set(false);
        const errorMessage = err.error?.message || 'Numéro de téléphone ou mot de passe incorrect';
        this.showAlert('error', errorMessage);
      }
    });
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

  // Getters pour les formulaires
  get currentLoginForm() {
    return this.loginForm;
  }

  get currentRegisterForm() {
    return this.registerForm;
  }
}