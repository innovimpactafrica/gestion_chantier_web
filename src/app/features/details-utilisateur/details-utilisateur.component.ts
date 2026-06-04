import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserService, User } from '../../../services/user.service';
import { SubscriptionService, UserSubscription, Invoice } from '../../../services/subscription.service';

interface Abonnement {
  id: number;
  plan: string;
  label: string;
  montant: string;
  dateDebut: string;
  dateFin: string;
  statut: 'Actif' | 'Expiré';
  nombreProjets: string;
}

interface Paiement {
  id: number;
  idFacture: string;
  date: string;
  montant: string;
  createdAt:string;
  statut: string;
  methodePaiement: string;
  planLabel: string;
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

  // Historique des abonnements
  abonnements: Abonnement[] = [];
  isLoadingAbonnements: boolean = false;

  // Historique des paiements
  paiements: Paiement[] = [];
  isLoadingPaiements: boolean = false;
  currentPageFactures: number = 0;
  totalPagesFactures: number = 0;
  totalFactures: number = 0;

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
    private userService: UserService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    
    this.route.params
      .pipe(takeUntil(this.destroy$))
      .subscribe(params => {
        this.utilisateurId = +params['id'];
        
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
    

    this.userService.getUserById(this.utilisateurId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (user) => {
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

          // Charger l'historique des abonnements et factures
          this.loadAbonnements();
          this.loadFactures();
          
          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.userMessage || 'Impossible de charger les données de l\'utilisateur';
          this.isLoading = false;
        }
      });
  }

  /**
   * Charge l'historique des abonnements depuis l'API
   */
  loadAbonnements(): void {
    this.isLoadingAbonnements = true;

    this.subscriptionService.getSubscriptionByUser(this.utilisateurId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (subscription: UserSubscription) => {
          
          if (subscription && subscription.subscriptionPlan) {
            const plan = subscription.subscriptionPlan;
            const isActive = this.isSubscriptionActive(subscription.endDate);
            
            this.abonnements = [{
              id: subscription.id,
              plan: plan.name || 'N/A',
              label: plan.label || 'N/A',
              montant: `${plan.totalCost.toLocaleString('fr-FR')} FCFA`,
              dateDebut: this.formatDateFromString(subscription.startDate),
              dateFin: this.formatDateFromString(subscription.endDate),
              statut: isActive ? 'Actif' : 'Expiré',
              nombreProjets: plan.unlimitedProjects 
                ? 'Illimité' 
                : `${plan.projectLimit} projet(s)`
            }];
            
          } else {
            this.abonnements = [];
          }
          
          this.isLoadingAbonnements = false;
        },
        error: (error) => {
          this.abonnements = [];
          this.isLoadingAbonnements = false;
          
          // Ne pas afficher d'erreur si c'est juste une 404 (pas d'abonnement)
          if (error.status !== 404) {
          }
        }
      });
  }

  /**
   * Charge l'historique des factures depuis l'API
   */
  loadFactures(page: number = 0): void {
    this.isLoadingPaiements = true;

    this.subscriptionService.getFactures(this.utilisateurId, page, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          
          this.paiements = response.content.map((invoice: Invoice) => ({
            id: invoice.id,
            idFacture: invoice.invoiceNumber || `INV-${invoice.id}`,
            date: this.formatDateFromString(invoice.createdAt),
            montant: `${invoice.amount.toLocaleString('fr-FR')} FCFA`,
            statut: invoice.paid ? 'Payé' : 'En attente',
            methodePaiement: invoice.paymentMethod || 'N/A',
            planLabel: invoice.planLabel || 'N/A',
            createdAt:invoice.createdAt
          }));
          
          this.currentPageFactures = response.number;
          this.totalPagesFactures = response.totalPages;
          this.totalFactures = response.totalElements;
          
          this.isLoadingPaiements = false;
        },
        error: (error) => {
          this.paiements = [];
          this.isLoadingPaiements = false;
          
          // Ne pas afficher d'erreur si c'est juste une 404 (pas de factures)
          if (error.status !== 404) {
          }
        }
      });
  }

  /**
   * Vérifie si un abonnement est actif
   */
  private isSubscriptionActive(endDate: string): boolean {
    if (!endDate) return false;
    const end = new Date(endDate);
    const now = new Date();
    return end > now;
  }

  /**
   * Formate une date ISO au format JJ/MM/AAAA
   */
  private formatDateFromString(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch (error) {
      return 'N/A';
    }
  }

  /**
   * Formate une date au format JJ/MM/AAAA (pour les dates en array)
   */
  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }

  /**
   * Navigation pagination factures
   */
  goToPageFactures(page: number): void {
    if (page >= 0 && page < this.totalPagesFactures) {
      this.loadFactures(page);
    }
  }

  previousPageFactures(): void {
    if (this.currentPageFactures > 0) {
      this.goToPageFactures(this.currentPageFactures - 1);
    }
  }

  nextPageFactures(): void {
    if (this.currentPageFactures < this.totalPagesFactures - 1) {
      this.goToPageFactures(this.currentPageFactures + 1);
    }
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

  getStatutPaiementClass(statut: string): string {
    return statut === 'Payé' 
      ? 'bg-green-100 text-green-700' 
      : 'bg-yellow-100 text-yellow-700';
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

  openSuspendModal(): void {
    this.showSuspendModal = true;
  }

  closeSuspendModal(): void {
    this.showSuspendModal = false;
  }

  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  /**
   * Supprime l'utilisateur
   */
  deleteUser(): void {
    if (!this.utilisateur) return;
    
    this.isLoading = true;
    this.errorMessage = '';

    this.userService.deleteUser(this.utilisateur.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.successMessage = 'Utilisateur supprimé avec succès';
          this.isLoading = false;
          this.closeDeleteModal();
          
          setTimeout(() => {
            this.router.navigate(['/utilisateurs']);
          }, 500);
        },
        error: (error) => {
          this.errorMessage = error.userMessage || 'Erreur lors de la suppression';
          this.isLoading = false;
          this.closeDeleteModal();
        }
      });
  }

  /**
   * Sauvegarde les modifications de l'utilisateur
   */
  saveUser(): void {
    if (!this.utilisateur) return;
    
    if (!this.userForm.prenom?.trim() || !this.userForm.nom?.trim() || 
        !this.userForm.email?.trim() || !this.userForm.telephone?.trim() || 
        !this.userForm.profil) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.userForm.email.trim())) {
      this.errorMessage = 'Format d\'email invalide';
      return;
    }

    const phoneRegex = /^\d{8,}$/;
    const cleanPhone = this.userForm.telephone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      this.errorMessage = 'Le téléphone doit contenir au moins 8 chiffres';
      return;
    }
    
    this.errorMessage = '';
    this.successMessage = '';
    this.isLoading = true;

    const userData = this.userService.formatUpdateUserData(
      this.userForm.nom.trim(),
      this.userForm.prenom.trim(),
      this.userForm.email.trim().toLowerCase(),
      cleanPhone,
      this.userForm.adress?.trim() || '',
      this.userForm.profil
    );

    this.userService.putUser(this.utilisateur.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.successMessage = 'Utilisateur modifié avec succès';
          this.utilisateur = updatedUser;
          this.isLoading = false;
          
          setTimeout(() => {
            this.closeEditModal();
            this.loadUserData();
          }, 1500);
        },
        error: (error) => {
          
          let userMsg = 'Erreur lors de la modification';
          if (error.status === 400) {
            userMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 409) {
            userMsg = 'Un utilisateur avec cet email existe déjà.';
          } else if (error.status === 404) {
            userMsg = 'Utilisateur introuvable.';
          }
          
          this.errorMessage = error.userMessage || userMsg;
          this.isLoading = false;
        }
      });
  }

  /**
   * Suspend ou active l'utilisateur
   */
  confirmSuspension(): void {
    if (!this.utilisateur) return;
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const currentStatus = this.getUserStatus();
    const action = currentStatus === 'Actif' ? 'suspension' : 'activation';
    
    
    setTimeout(() => {
      this.successMessage = currentStatus === 'Actif' 
        ? 'Utilisateur suspendu avec succès' 
        : 'Utilisateur activé avec succès';
      this.isLoading = false;
      
      setTimeout(() => {
        this.closeSuspendModal();
        this.loadUserData();
      }, 1500);
    }, 500);
  }

  downloadFacture(paiement: Paiement): void {
    // TODO: Implémenter le téléchargement de facture
  }
}