import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService, User } from '../auth/services/auth.service';

interface Abonnement {
  [x: string]: any;
  id: string;
  pack: string;
  dateDebut: string;
  dateFin: string;
  statut: 'Actif' | 'Expiré';
}

interface Facture {
  id: string;
  reference: string;
  echeance: string;
  montant: string;
  statut: 'Payée' | 'En attente';
}

@Component({
  selector: 'app-compte',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './compte.component.html',
  styleUrls: ['./compte.component.css']
})
export class CompteComponent implements OnInit {
  activeTab = signal<'informations' | 'abonnements' | 'factures'>('informations');
  userForm!: FormGroup;
  currentUser = signal<User | null>(null);
  isLoading = signal(false);
  isSaving = signal(false);
  
  // Messages de notification
  successMessage = signal<string | null>(null);
  errorMessage = signal<string | null>(null);
  infoMessage = signal<string | null>(null);

  // Données fixes pour les abonnements
  abonnements: Abonnement[] = [
    {
      id: '1',
      pack: 'Pro',
      dateDebut: '05/07/2025',
      dateFin: '05/08/2025',
      statut: 'Expiré'
    },
    {
      id: '2',
      pack: 'Pro',
      dateDebut: '05/06/2025',
      dateFin: '05/07/2025',
      statut: 'Actif'
    },
    {
      id: '3',
      pack: 'Pro',
      dateDebut: '05/05/2025',
      dateFin: '05/06/2025',
      statut: 'Actif'
    },
    {
      id: '4',
      pack: 'Pro Plus',
      dateDebut: '05/04/2025',
      dateFin: '05/03/2025',
      statut: 'Actif'
    }
  ];

  // Données fixes pour les factures
  factures: Facture[] = [
    {
      id: '1',
      reference: 'FAC-2025-07',
      echeance: '05/07/2025',
      montant: '250 000 F cfa',
      statut: 'En attente'
    },
    {
      id: '2',
      reference: 'FAC-2025-06',
      echeance: '05/06/2025',
      montant: '250 000 F cfa',
      statut: 'Payée'
    },
    {
      id: '3',
      reference: 'FAC-2025-05',
      echeance: '05/05/2025',
      montant: '250 000 F cfa',
      statut: 'Payée'
    },
    {
      id: '4',
      reference: 'FAC-2025-04',
      echeance: '05/04/2025',
      montant: '250 000 F cfa',
      statut: 'Payée'
    }
  ];

  // Filtres et recherche
  searchTerm = signal('');
  statusFilter = signal<'all' | 'Actif' | 'Expiré' | 'Payée' | 'En attente'>('all');

  // Injection avec inject() au lieu du constructor
  private fb = inject(FormBuilder);
  public authService = inject(AuthService);

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
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
      this.isLoading.set(false);
    } else {
      // Récupérer l'utilisateur depuis l'API
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          if (user) {
            this.currentUser.set(user);
            this.populateForm(user);
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
  }

  getPageTitle(): string {
    const titles = {
      'informations': 'Informations personnelles',
      'abonnements': 'Abonnements',
      'factures': 'Factures'
    };
    return titles[this.activeTab()];
  }

  getUserInitials(): string {
    const user = this.currentUser();
    if (!user) return 'U';
    
    const firstInitial = user.prenom?.charAt(0)?.toUpperCase() || '';
    const lastInitial = user.nom?.charAt(0)?.toUpperCase() || '';
    return `${firstInitial}${lastInitial}`;
  }

  getUserFullName(): string {
    const user = this.currentUser();
    if (!user) return 'Utilisateur';
    return `${user.prenom} ${user.nom}`;
  }

  getUserProfile(): string {
    const user = this.currentUser();
    if (!user) return 'Utilisateur';
    
    // Gérer le cas où profil est un array ou une string
    if (Array.isArray(user.profil) && user.profil.length > 0) {
      return this.formatProfileName(user.profil[0]);
    } else if (typeof user.profils === 'string') {
      return this.formatProfileName(user.profils);
    }
    
    return 'Utilisateur';
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

  getUserPhotoUrl(): string {
    const user = this.currentUser();
    if (user && user.photo) {
      return this.authService.getUserPhotoUrl(user.id);
    }
    return '';
  }

  hasUserPhoto(): boolean {
    const user = this.currentUser();
    return user?.photo !== null && user?.photo !== undefined;
  }

  // Méthodes pour les abonnements
  getFilteredAbonnements(): Abonnement[] {
    let filtered = this.abonnements;
    
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(a => a.statut === this.statusFilter());
    }
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(a => 
        a.pack.toLowerCase().includes(term) ||
        a['reference'].toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }

  renouvelerAbonnement(id: string): void {
    this.showInfo('Renouvellement en cours...');
    // Logique de renouvellement à implémenter
  }

  telechargerAbonnement(id: string): void {
    this.showInfo('Téléchargement en cours...');
    // Logique de téléchargement à implémenter
  }

  // Méthodes pour les factures
  getFilteredFactures(): Facture[] {
    let filtered = this.factures;
    
    if (this.statusFilter() !== 'all') {
      filtered = filtered.filter(f => f.statut === this.statusFilter());
    }
    
    if (this.searchTerm()) {
      const term = this.searchTerm().toLowerCase();
      filtered = filtered.filter(f => 
        f.reference.toLowerCase().includes(term) ||
        f.montant.toLowerCase().includes(term)
      );
    }
    
    return filtered;
  }

  payerFacture(id: string): void {
    this.showInfo('Redirection vers le paiement...');
    // Logique de paiement à implémenter
  }

  telechargerFacture(id: string): void {
    this.showInfo('Téléchargement en cours...');
    // Logique de téléchargement à implémenter
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

  // Méthodes pour afficher les messages
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