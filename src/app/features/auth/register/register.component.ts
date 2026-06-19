import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService, CreateUserRequest } from '../../../../services/user.service';
import { LanguageService } from '../../../core/services/language.service';

interface ProfileMapping {
  value: string;
  displayName: string;
}

interface Country {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
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
  showCountryDropdown = false;
  countrySearch = '';

  countries: Country[] = [
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳', dialCode: '+221' },
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮', dialCode: '+225' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱', dialCode: '+223' },
    { code: 'GN', name: 'Guinée', flag: '🇬🇳', dialCode: '+224' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫', dialCode: '+226' },
    { code: 'BJ', name: 'Bénin', flag: '🇧🇯', dialCode: '+229' },
    { code: 'TG', name: 'Togo', flag: '🇹🇬', dialCode: '+228' },
    { code: 'NE', name: 'Niger', flag: '🇳🇪', dialCode: '+227' },
    { code: 'CM', name: 'Cameroun', flag: '🇨🇲', dialCode: '+237' },
    { code: 'GA', name: 'Gabon', flag: '🇬🇦', dialCode: '+241' },
    { code: 'CG', name: 'Congo', flag: '🇨🇬', dialCode: '+242' },
    { code: 'MG', name: 'Madagascar', flag: '🇲🇬', dialCode: '+261' },
    { code: 'MA', name: 'Maroc', flag: '🇲🇦', dialCode: '+212' },
    { code: 'TN', name: 'Tunisie', flag: '🇹🇳', dialCode: '+216' },
    { code: 'DZ', name: 'Algérie', flag: '🇩🇿', dialCode: '+213' },
    { code: 'GH', name: 'Ghana', flag: '🇬🇭', dialCode: '+233' },
    { code: 'NG', name: 'Nigéria', flag: '🇳🇬', dialCode: '+234' },
    { code: 'FR', name: 'France', flag: '🇫🇷', dialCode: '+33' },
    { code: 'US', name: 'États-Unis', flag: '🇺🇸', dialCode: '+1' },
    { code: 'GB', name: 'Royaume-Uni', flag: '🇬🇧', dialCode: '+44' },
    { code: 'ES', name: 'Espagne', flag: '🇪🇸', dialCode: '+34' },
    { code: 'PT', name: 'Portugal', flag: '🇵🇹', dialCode: '+351' },
    { code: 'DE', name: 'Allemagne', flag: '🇩🇪', dialCode: '+49' },
    { code: 'IT', name: 'Italie', flag: '🇮🇹', dialCode: '+39' },
    { code: 'BE', name: 'Belgique', flag: '🇧🇪', dialCode: '+32' },
    { code: 'CH', name: 'Suisse', flag: '🇨🇭', dialCode: '+41' },
  ];

  selectedCountry: Country = this.countries[0];

  get filteredCountries(): Country[] {
    if (!this.countrySearch.trim()) return this.countries;
    const q = this.countrySearch.toLowerCase();
    return this.countries.filter(c =>
      c.name.toLowerCase().includes(q) || c.dialCode.includes(q) || c.code.toLowerCase().includes(q)
    );
  }

  availableProfiles: ProfileMapping[] = [
    { value: 'PROMOTEUR', displayName: 'Promoteur' },
    { value: 'MOA', displayName: 'Maître d\'Ouvrage' },
    { value: 'SITE_MANAGER', displayName: 'Chef de projet' },
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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.phone-picker-wrapper')) {
      this.showCountryDropdown = false;
    }
  }

  toggleCountryDropdown(): void {
    this.showCountryDropdown = !this.showCountryDropdown;
    if (this.showCountryDropdown) {
      this.countrySearch = '';
    }
  }

  selectCountry(country: Country): void {
    this.selectedCountry = country;
    this.showCountryDropdown = false;
    this.countrySearch = '';
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telephone: ['', [Validators.required, Validators.minLength(6), Validators.pattern(/^[0-9\s\-]+$/)]],
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

    const localNumber = this.profileForm.value.telephone?.trim().replace(/\s/g, '') || '';
    const fullPhone = `${this.selectedCountry.dialCode}${localNumber}`;

    const userData: CreateUserRequest = {
      nom: this.profileForm.value.nom?.trim() || '',
      prenom: this.profileForm.value.prenom?.trim() || '',
      email: this.profileForm.value.email?.trim().toLowerCase() || '',
      password: this.profileForm.value.password || '',
      telephone: fullPhone,
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
          this.validationErrors.push(`Le numéro de téléphone ne doit contenir que des chiffres.`);
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
