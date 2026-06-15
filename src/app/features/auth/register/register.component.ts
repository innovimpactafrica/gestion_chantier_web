import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService, CreateUserRequest } from '../../../../services/user.service';
import { LanguageService } from '../../../core/services/language.service';

interface ProfileMapping {
  value: string;
  displayName: string;
}

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {
  profileForm!: FormGroup;

  successMessage = '';
  errorMessage = '';
  validationErrors: string[] = [];
  isLoading = false;
  showLangDropdown = false;

  availableProfiles: ProfileMapping[] = [
    { value: 'PROMOTEUR', displayName: 'Promoteur' },
    { value: 'SITE_MANAGER', displayName: 'Manager' },
    { value: 'BET', displayName: 'Maître d\'Etude' },
    { value: 'MOA', displayName: 'Maître d\'Ouvrage (MOA)' },
    { value: 'SUPPLIER', displayName: 'Fournisseur' },
    { value: 'SUBCONTRACTOR', displayName: 'Sous Traitant' },
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private userService: UserService,
    public languageService: LanguageService
  ) {
    this.initializeForm();
  }

  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void { }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telephone: ['', [Validators.required, Validators.pattern(/^7[05678]\d{7}$/)]],
      profil: ['', Validators.required]
    });
  }

  onProfileChange(_event: Event): void { }

  onSubmit(): void {
    this.clearMessages();
    this.profileForm.markAllAsTouched();

    if (!this.profileForm.valid) {
      this.showValidationErrors();
      return;
    }

    this.isLoading = true;

    const userData: CreateUserRequest = {
      nom: this.profileForm.value.nom?.trim() || '',
      prenom: this.profileForm.value.prenom?.trim() || '',
      email: this.profileForm.value.email?.trim().toLowerCase() || '',
      password: this.profileForm.value.password || '',
      telephone: this.profileForm.value.telephone?.trim() || '',
      profil: this.profileForm.value.profil || ''
    };

    this.userService.createUser(userData).subscribe({
      next: (response) => this.handleRegistrationSuccess(response),
      error: (error) => this.handleRegistrationError(error)
    });
  }

  private handleRegistrationSuccess(_response: any): void {
    this.successMessage = "Compte créé avec succès ! Redirection vers la connexion...";
    this.isLoading = false;
    setTimeout(() => this.navigateToLogin(), 2000);
  }

  private handleRegistrationError(error: any): void {
    this.isLoading = false;

    if (error.userMessage) {
      this.errorMessage = error.userMessage;
    } else if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.status === 409) {
      this.errorMessage = "Cette adresse email ou ce numéro de téléphone est déjà utilisé.";
    } else if (error.status === 400) {
      this.errorMessage = "Données invalides. Veuillez vérifier vos informations.";
    } else {
      this.errorMessage = "Erreur lors de la création du compte. Veuillez réessayer.";
    }
  }

  private showValidationErrors(): void {
    this.validationErrors = [];

    Object.keys(this.profileForm.controls).forEach(key => {
      const control = this.profileForm.get(key);
      if (control && control.invalid && control.touched) {
        if (control.errors?.['required']) {
          this.validationErrors.push(`Le champ ${this.getFieldDisplayName(key)} est requis.`);
        }
        if (control.errors?.['email']) {
          this.validationErrors.push(`Format d'email invalide.`);
        }
        if (control.errors?.['minlength']) {
          const minLength = control.errors?.['minlength'].requiredLength;
          this.validationErrors.push(`${this.getFieldDisplayName(key)} doit contenir au moins ${minLength} caractères.`);
        }
        if (control.errors?.['pattern'] && key === 'telephone') {
          this.validationErrors.push(`Le numéro de téléphone doit être au format sénégalais (ex: 771234567).`);
        }
      }
    });
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'nom': 'Nom',
      'prenom': 'Prénom',
      'email': 'Email',
      'password': 'Mot de passe',
      'telephone': 'Téléphone',
      'profil': 'Profil'
    };
    return fieldNames[fieldName] || fieldName;
  }

  private clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.validationErrors = [];
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  get f() {
    return this.profileForm.controls;
  }

  get isFormValid(): boolean {
    return this.profileForm.valid;
  }
}

