import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService, profil, ProfileConfig, RegistrationData ,User} from '../services/auth.service';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink,FormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent implements OnInit {


  user: User = {} as User;
  profils = Object.values(profil); // ['SITE_MANAGER', 'SUBCONTRACTOR', 'SUPPLIER']
  successMessage = '';
  errorMessage = '';
  validationErrors: string[] = [];
  isLoading = false;

  profileForm!: FormGroup;
  currentStep: number = 1;
  selectedImage: string | null = null;
  imageFile: File | null = null;
  
  // Profils disponibles pour l'inscription
  availableProfiles: ProfileConfig[] = [];
  selectedProfile: profil | null = null;
  
  // Liste des postes pour le menu déroulant (optionnel selon le profil)
  jobTitles: string[] = [
    'Directeur de projet',
    'Chef de chantier',
    'Architecte',
    'Ingénieur',
    'Conducteur de travaux',
    'Ouvrier qualifié',
    'Entrepreneur',
    'Responsable sécurité',
    'Administrateur',
    'Autre'
  ];

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.initializeForm();
  }

  ngOnInit(): void {
    this.loadAvailableProfiles();
    
    this.authService.getCurrentUser().subscribe(currentUser => {
      if (currentUser) {
        this.user = currentUser;
      }
    });
  
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      // Informations personnelles
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      telephone: ['', [Validators.required, Validators.pattern(/^[0-9+\-\s]+$/)]],
      
      // Adresse
      adress: ['', Validators.required],
      
      // Informations optionnelles (selon le contexte métier)
      date: [''], // Date de naissance
      lieunaissance: [''], // Lieu de naissance
      
      // Profil utilisateur - REQUIS
      // profil: ['', Validators.required],
      profil: [null, Validators.required],

      
      // Informations spécifiques selon le profil
      company: [''], // Pour les fournisseurs et sous-traitants
      jobTitle: [''], // Poste occupé
      technicalSheet: [''] // Fiche technique
    }, { 
      validators: this.passwordMatchValidator 
    });
  }

  private loadAvailableProfiles(): void {
    this.availableProfiles = this.authService.getRegistrationProfiles();
  }

  // Validateur personnalisé pour la confirmation du mot de passe
  passwordMatchValidator(group: FormGroup) {
    const password = group.get('password');
    const confirmPassword = group.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    
    return null;
  }

  // Méthode pour sélectionner un profil
  selectProfile(profile: profil): void {
    this.selectedProfile = profile;
    this.profileForm.patchValue({ profil: profile });
    
    // Adapter les validateurs selon le profil sélectionné
    this.updateValidatorsForProfile(profile);
    
    // Passer à l'étape suivante après sélection du profil
    if (this.currentStep === 1) {
      this.currentStep = 2;
    }
  }

  // Mettre à jour les validateurs selon le profil
  private updateValidatorsForProfile(profile: profil): void {
    const companyControl = this.profileForm.get('company');
    
    // Pour les fournisseurs et sous-traitants, l'entreprise peut être requise
    if (profile === profil.SUBCONTRACTOR) {
      companyControl?.setValidators([Validators.required]);
    } else {
      companyControl?.clearValidators();
    }
    
    companyControl?.updateValueAndValidity();
  }

  // Obtenir la configuration du profil sélectionné
  getSelectedProfileConfig(): ProfileConfig | undefined {
    return this.selectedProfile ? this.authService.getProfileConfig(this.selectedProfile) : undefined;
  }

  // Vérifier si un profil nécessite des informations d'entreprise
  requiresCompanyInfo(): boolean {
    return this.selectedProfile === profil.SUBCONTRACTOR;
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.selectedProfile) {
      this.currentStep = 2;
    } else if (this.currentStep === 2 && this.isStep2Valid()) {
      this.currentStep = 3;
    }
  }

  previousStep(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Vérifier si l'étape 2 est valide
  private isStep2Valid(): boolean {
    const requiredFields = ['nom', 'prenom', 'email', 'password', 'confirmPassword', 'telephone', 'adress'];
    
    if (this.requiresCompanyInfo()) {
      requiredFields.push('company');
    }
    
    return requiredFields.every(field => {
      const control = this.profileForm.get(field);
      return control && control.valid && control.value?.trim();
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.imageFile = input.files[0];
      
      // Vérifier le type et la taille du fichier
      if (!this.imageFile.type.startsWith('image/')) {
        this.errorMessage = 'Veuillez sélectionner un fichier image valide.';
        return;
      }
      
      if (this.imageFile.size > 5 * 1024 * 1024) { // 5MB max
        this.errorMessage = 'La taille de l\'image ne doit pas dépasser 5MB.';
        return;
      }
      
      // Création d'une URL pour l'aperçu de l'image
      const reader = new FileReader();
      reader.onload = () => {
        this.selectedImage = reader.result as string;
      };
      reader.readAsDataURL(this.imageFile);
      
      // Effacer les messages d'erreur
      this.errorMessage = '';
    }
  }

  onSubmit(): void {
    // Réinitialiser les messages
    this.clearMessages();
    
    if (!this.profileForm.valid || !this.selectedProfile) {
      this.showValidationErrors();
      return;
    }

    this.isLoading = true;
    
    // Préparer les données d'inscription
    const registrationData: RegistrationData = {
      nom: this.profileForm.value.nom.trim(),
      prenom: this.profileForm.value.prenom.trim(),
      email: this.profileForm.value.email.trim().toLowerCase(),
      password: this.profileForm.value.password,
      telephone: this.profileForm.value.telephone.trim(),
      adress: this.profileForm.value.adress.trim(),
      profil: this.selectedProfile
    };

    // Ajouter les informations optionnelles si présentes
    if (this.profileForm.value.company?.trim()) {
      registrationData.company = this.profileForm.value.company.trim();
    }

    // Valider les données côté client
    const validationErrors = this.authService.validateRegistrationData(registrationData);
    if (validationErrors.length > 0) {
      this.validationErrors = validationErrors;
      this.isLoading = false;
      return;
    }

    // Si on a une image, utiliser FormData, sinon utiliser l'objet directement
    if (this.imageFile) {
      this.submitWithFormData(registrationData);
    } else {
      this.submitWithJson(registrationData);
    }
  }

  private submitWithFormData(data: RegistrationData): void {
    const formData = new FormData();
    
    // Ajouter toutes les données du formulaire
    Object.entries(data).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        formData.append(key, value.toString());
      }
    });
    
    // Ajouter l'image si présente
    if (this.imageFile) {
      formData.append('photo', this.imageFile);
    }
    
    // Ajouter les champs optionnels
    const optionalFields = ['date', 'lieunaissance', 'jobTitle', 'technicalSheet'];
    optionalFields.forEach(field => {
      const value = this.profileForm.value[field];
      if (value?.trim()) {
        formData.append(field, value.trim());
      }
    });

    this.authService.registerWithFormData(formData).subscribe({
      next: (response) => {
        this.handleRegistrationSuccess(response);
      },
      error: (error) => {
        this.handleRegistrationError(error);
      }
    });
  }

  private submitWithJson(data: RegistrationData): void {
    this.authService.register(data).subscribe({
      next: (response) => {
        this.handleRegistrationSuccess(response);
      },
      error: (error) => {
        this.handleRegistrationError(error);
      }
    });
  }

  private handleRegistrationSuccess(response: any): void {
    console.log('Inscription réussie:', response);
    this.successMessage = "Compte créé avec succès ! Vous pouvez maintenant vous connecter.";
    this.isLoading = false;
    
    // Réinitialiser le formulaire après un délai
    setTimeout(() => {
      this.profileForm.reset();
      this.currentStep = 1;
      this.selectedProfile = null;
      this.selectedImage = null;
      this.imageFile = null;
      
      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        this.navigateToLogin();
      }, 2000);
    }, 1000);
  }

  private handleRegistrationError(error: any): void {
    console.error('Erreur lors de l\'inscription:', error);
    this.isLoading = false;
    
    if (error.error?.message) {
      this.errorMessage = error.error.message;
    } else if (error.status === 409) {
      this.errorMessage = "Cette adresse email est déjà utilisée.";
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
      if (control && control.invalid) {
        if (control.errors?.['required']) {
          this.validationErrors.push(`Le champ ${this.getFieldDisplayName(key)} est requis.`);
        }
        if (control.errors?.['email']) {
          this.validationErrors.push(`Format d'email invalide.`);
        }
        if (control.errors?.['minlength']) {
          this.validationErrors.push(`${this.getFieldDisplayName(key)} trop court.`);
        }
        if (control.errors?.['passwordMismatch']) {
          this.validationErrors.push(`Les mots de passe ne correspondent pas.`);
        }
      }
    });
    
    if (!this.selectedProfile) {
      this.validationErrors.push('Veuillez sélectionner un profil utilisateur.');
    }
  }

  private getFieldDisplayName(fieldName: string): string {
    const fieldNames: { [key: string]: string } = {
      'nom': 'Nom',
      'prenom': 'Prénom',
      'email': 'Email',
      'password': 'Mot de passe',
      'confirmPassword': 'Confirmation du mot de passe',
      'telephone': 'Téléphone',
      'adress': 'Adresse',
      'company': 'Entreprise',
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

  // Méthodes utilitaires pour le template
  get isStep1() { return this.currentStep === 1; }
  get isStep2() { return this.currentStep === 2; }
  get isStep3() { return this.currentStep === 3; }
  
  get canProceedToStep2() { 
    return this.selectedProfile !== null; 
  }
  
  get canProceedToStep3() { 
    return this.isStep2Valid(); 
  }

  get showCompanyField() {
    return this.requiresCompanyInfo();
  }

  // Getter pour accéder aux contrôles du formulaire dans le template
  get f() { 
    return this.profileForm.controls; 
  }
}