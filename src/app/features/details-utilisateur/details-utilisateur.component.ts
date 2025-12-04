import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserService, User } from '../../../services/user.service';

interface Abonnement {
  plan: string;
  montant: string;
  dateDebut: string;
  dateFin: string;
  statut: 'Actif' | 'Expiré';
}

interface Paiement {
  idFacture: string;
  date: string;
  montant: string;
  statut: 'Payé';
}

@Component({
  selector: 'app-details-utilisateur',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './details-utilisateur.component.html',
  styleUrls: ['./details-utilisateur.component.css']
})
export class DetailsUtilisateurComponent implements OnInit, OnDestroy {
  utilisateurId: number = 0;
  utilisateur: User | null = null;
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';
  showSuccessModal: boolean = false;
  deletedUserName: string = ''; // AJOUTÉ pour stocker le nom
  
  // Historique des abonnements (à extraire de utilisateur.subscription)
  abonnements: Abonnement[] = [];

  // Historique des paiements (si disponible dans votre API)
  paiements: Paiement[] = [];

  // Modales
  showEditModal: boolean = false;
  showSuspendModal: boolean = false;
  showDeleteModal: boolean = false;

  // Formulaire de modification
  userForm = {
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    profil: '',
    adress: ''
  };

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private userService: UserService
  ) { }

  ngOnInit(): void {
    console.log('🚀 Initialisation du composant Détails Utilisateur');

    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.utilisateurId = +params['id'];
        console.log('👤 ID utilisateur:', this.utilisateurId);

        if (this.utilisateurId) {
          this.loadUserData();
        } else {
          this.errorMessage = 'ID utilisateur invalide';
        }
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les données de l'utilisateur depuis l'API
   */
  loadUserData(): void {
    this.isLoading = true;
    this.errorMessage = '';

    console.log('📥 Chargement des données utilisateur:', this.utilisateurId);

    this.userService.getUserById(this.utilisateurId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
          console.log('✅ Utilisateur chargé:', user);
          this.utilisateur = user;

          // Initialiser le formulaire avec les données
          this.userForm = {
            prenom: user.prenom,
            nom: user.nom,
            telephone: user.telephone,
            email: user.email,
            profil: user.profil,
            adress: user.adress
          };

          // Charger l'historique des abonnements
          this.loadAbonnements();

          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement utilisateur:', error);
          this.errorMessage = error.userMessage || 'Impossible de charger les données de l\'utilisateur';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charge l'historique des abonnements
   */
  loadAbonnements(): void {
    if (!this.utilisateur?.subscription) {
      console.log('ℹ️ Pas d\'abonnement pour cet utilisateur');
      return;
    }

    const sub = this.utilisateur.subscription;

    this.abonnements = [{
      plan: sub.subscriptionPlan.name || 'N/A',
      montant: `${sub.subscriptionPlan.totalCost} FCFA`,
      dateDebut: this.formatDate(sub.startDate),
      dateFin: this.formatDate(sub.endDate),
      statut: sub.active ? 'Actif' : 'Expiré'
    }];

    // Créer un paiement factice basé sur l'abonnement
    if (sub.dateInvoice) {
      this.paiements = [{
        idFacture: `INV-${sub.id}`,
        date: this.formatDate(sub.dateInvoice),
        montant: `${sub.paidAmount} FCFA`,
        statut: 'Payé'
      }];
    }

    console.log('📋 Abonnements chargés:', this.abonnements.length);
    console.log('💰 Paiements chargés:', this.paiements.length);
  }

  /**
   * Formate une date au format JJ/MM/AAAA
   */
  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }

  /**
   * Obtient le statut de l'utilisateur
   */
  getUserStatus(): 'Actif' | 'Suspendu' | 'En attente' {
    if (!this.utilisateur) return 'En attente';

    if (!this.utilisateur.enabled || !this.utilisateur.activated) return 'Suspendu';
    if (!this.utilisateur.accountNonLocked) return 'Suspendu';
    return this.utilisateur.subscription?.active ? 'Actif' : 'En attente';
  }

  /**
   * Obtient l'avatar basé sur le profil
   */
  getUserAvatar(): string {
    if (!this.utilisateur) return '👤';

    const avatarMap: { [key: string]: string } = {
      'PROMOTEUR': '👨🏾‍💼',
      'BET': '👷',
      'MOA': '🏗️',
      'ADMIN': '👨‍💻',
      'SITE_MANAGER': '👨‍🔧',
      'NOTAIRE': '⚖️',
      'BANK': '🏦',
      'AGENCY': '🏢'
    };

    return avatarMap[this.utilisateur.profil] || '👤';
  }

  goBack(): void {
    this.router.navigate(['/utilisateurs']);
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Actif':
        return 'bg-green-100 text-green-700';
      case 'Suspendu':
        return 'bg-red-100 text-red-700';
      case 'En attente':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  }

  getStatutAbonnementClass(statut: string): string {
    return statut === 'Actif'
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  }

  openEditModal(): void {
    if (!this.utilisateur) return;

    this.userForm = {
      prenom: this.utilisateur.prenom,
      nom: this.utilisateur.nom,
      telephone: this.utilisateur.telephone,
      email: this.utilisateur.email,
      profil: this.utilisateur.profil,
      adress: this.utilisateur.adress
    };

    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  saveUser(): void {
    if (!this.utilisateur) return;

    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    const userData: Partial<User> = {
      prenom: this.userForm.prenom,
      nom: this.userForm.nom,
      telephone: this.userForm.telephone,
      email: this.userForm.email,
      profil: this.userForm.profil,
      adress: this.userForm.adress
    };

    console.log('💾 Sauvegarde des modifications:', userData);

    this.userService.putUser(this.utilisateur.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          console.log('✅ Utilisateur mis à jour:', updatedUser);
          this.successMessage = 'Utilisateur modifié avec succès';
          this.utilisateur = updatedUser;
          this.isLoading = false;

          setTimeout(() => {
            this.closeEditModal();
          }, 1500);
        },
        error: (error) => {
          console.error('❌ Erreur modification:', error);
          this.errorMessage = error.userMessage || 'Erreur lors de la modification';
          this.isLoading = false;
        }
      });
  }

  openSuspendModal(): void {
    this.showSuspendModal = true;
  }

  closeSuspendModal(): void {
    this.showSuspendModal = false;
  }

  confirmSuspension(): void {
    if (!this.utilisateur) return;

    console.log('🔒 Suspension de l\'utilisateur:', this.utilisateur.id);

    // Implémenter la logique de suspension via l'API
    // Pour l'instant, on simule juste
    this.successMessage = 'Utilisateur suspendu avec succès';

    setTimeout(() => {
      this.closeSuspendModal();
      this.loadUserData();
    }, 1500);
  }

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  /**
   * Supprime l'utilisateur - CORRIGÉ
   */
  deleteUser(): void {
    if (!this.utilisateur) return;

    this.isLoading = true;
    this.errorMessage = '';

    // IMPORTANT: Sauvegarder le nom avant la suppression
    this.deletedUserName = `${this.utilisateur.prenom} ${this.utilisateur.nom}`;

    console.log('🗑️ Suppression de l\'utilisateur:', this.utilisateur.id);

    this.userService.deleteUser(this.utilisateur.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Utilisateur supprimé avec succès');
          
          // Fermer le modal de confirmation
          this.closeDeleteModal();
          this.isLoading = false;
          
          // Afficher le modal de succès
          this.showSuccessModal = true;

          // Après 2 secondes, rediriger vers la liste
          setTimeout(() => {
            this.showSuccessModal = false;
            this.goBack();
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Erreur suppression:', error);
          this.errorMessage = error.userMessage || 'Erreur lors de la suppression';
          this.isLoading = false;
          this.closeDeleteModal();
        }
      });
  }

  downloadFacture(paiement: Paiement): void {
    console.log('📄 Télécharger facture:', paiement.idFacture);
    // Implémenter le téléchargement de facture
  }
}