import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { UserService, CreateUserRequest } from '../../../../services/user.service';
import { LanguageService } from '../../../core/services/language.service';

// Mapping des profils
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
  selectedPhoto: File | null = null;
  photoPreview: string | null = null; // Pour l'aperçu de l'image
  // Profils disponibles (seulement PROMOTEUR et MOA)
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

  // Helper pour la traduction
  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void {
    console.log('🚀 RegisterComponent initialisé');
    console.log('📋 Profils disponibles:', this.availableProfiles);
  }

  private initializeForm(): void {
    this.profileForm = this.fb.group({
      // Informations personnelles
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      telephone: ['', [Validators.required, Validators.pattern(/^7[05678]\d{7}$/)]],

      // Adresse (optionnel - champ masqué dans le formulaire)
      adress: [''],

      // Informations optionnelles
      date: [''],
      lieunaissance: [''],

      // Profil utilisateur - REQUIS
      profil: ['', Validators.required]
    });
  }

  private convertDateFormat(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    console.log('📅 Conversion date:', {
      original: dateString,
      formatted: formattedDate
    });
    return formattedDate;
  }

  // Détection du changement de profil
  onProfileChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    const selectedValue = selectElement.value;
    console.log('👤 Profil sélectionné:', selectedValue);
  }
  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      // Vérifier le type de fichier
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Veuillez sélectionner une image valide';
        return;
      }

      // Vérifier la taille (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'La taille de l\'image ne doit pas dépasser 5 MB';
        return;
      }

      this.selectedPhoto = file;

      // Créer un aperçu de l'image
      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        this.photoPreview = e.target?.result as string;
      };
      reader.readAsDataURL(file);

      this.errorMessage = '';
      console.log('📸 Photo sélectionnée:', file.name, `(${(file.size / 1024).toFixed(2)} KB)`);
    }
  }

  removePhoto(): void {
    this.selectedPhoto = null;
    this.photoPreview = null;
    // Réinitialiser l'input file
    const fileInput = document.getElementById('photo') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
    console.log('🗑️ Photo supprimée');
  }

  onSubmit(): void {
    // Réinitialiser les messages
    this.clearMessages();

    // Marquer tous les champs comme touchés pour afficher les erreurs
    this.profileForm.markAllAsTouched();

    if (!this.profileForm.valid) {
      this.showValidationErrors();
      return;
    }

    this.isLoading = true;

    // Formater la date si elle existe (format DD-MM-YYYY pour l'API)
    let formattedDate = '';
    if (this.profileForm.value.date) {
      formattedDate = this.convertDateFormat(this.profileForm.value.date);
    }

    // Préparer les données d'inscription - TOUS LES CHAMPS REQUIS + PHOTO
    const userData: CreateUserRequest = {
      nom: this.profileForm.value.nom?.trim() || '',
      prenom: this.profileForm.value.prenom?.trim() || '',
      email: this.profileForm.value.email?.trim().toLowerCase() || '',
      password: this.profileForm.value.password || '',
      telephone: this.profileForm.value.telephone?.trim() || '',
      adress: this.profileForm.value.adress?.trim() || '',
      profil: this.profileForm.value.profil || '',
      date: formattedDate,
      lieunaissance: this.profileForm.value.lieunaissance?.trim() || '',
      photo: this.selectedPhoto || undefined // Ajouter la photo
    };

    console.log('📤 Envoi des données d\'inscription:', {
      ...userData,
      password: '***', // Masquer le mot de passe dans les logs
      photo: this.selectedPhoto ? this.selectedPhoto.name : 'Aucune'
    });

    console.log('🔍 Vérification des champs:');
    console.log('  - nom:', userData.nom);
    console.log('  - prenom:', userData.prenom);
    console.log('  - email:', userData.email);
    console.log('  - password:', userData.password ? 'OK' : 'VIDE');
    console.log('  - telephone:', userData.telephone);
    console.log('  - date:', userData.date);
    console.log('  - lieunaissance:', userData.lieunaissance);
    console.log('  - adress:', userData.adress);
    console.log('  - profil:', userData.profil);
    console.log('  - photo:', this.selectedPhoto ? `${this.selectedPhoto.name} (${(this.selectedPhoto.size / 1024).toFixed(2)} KB)` : 'Aucune');

    // Appel du service UserService pour créer l'utilisateur
    this.userService.createUser(userData).subscribe({
      next: (response) => {
        this.handleRegistrationSuccess(response);
      },
      error: (error) => {
        this.handleRegistrationError(error);
      }
    });
  }

  private handleRegistrationSuccess(response: any): void {
    console.log('✅ Inscription réussie:', response);
    this.successMessage = "Compte créé avec succès ! Redirection vers la connexion...";
    this.isLoading = false;

    // Rediriger vers la page de connexion après 2 secondes
    setTimeout(() => {
      this.navigateToLogin();
    }, 2000);
  }

  private handleRegistrationError(error: any): void {
    console.error('❌ Erreur lors de l\'inscription:', error);
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
        if (control.errors?.['pattern']) {
          if (key === 'telephone') {
            this.validationErrors.push(`Le numéro de téléphone doit être au format sénégalais (ex: 771234567).`);
          }
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
      'adress': 'Adresse',
      'profil': 'Profil',
      'date': 'Date de naissance',
      'lieunaissance': 'Lieu de naissance'
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

  // Getters pour le template
  get f() {
    return this.profileForm.controls;
  }

  get isFormValid(): boolean {
    return this.profileForm.valid;
  }
}