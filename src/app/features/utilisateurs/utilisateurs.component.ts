import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { UserService, User, UserPageResponse } from '../../../services/user.service';

@Component({
  selector: 'app-utilisateurs',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './utilisateurs.component.html',
  styleUrls: ['./utilisateurs.component.css']
})
export class UtilisateursComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalPages: number = 0;
  totalResults: number = 0;
  
  Math = Math;
  


  // Modals existants
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  
  // Nouveaux modals pour bloquer/débloquer
  showBlockModal: boolean = false;
  showNotification: boolean = false;
  modalAction: 'block' | 'activate' = 'block';
  notificationType: 'blocked' | 'activated' = 'blocked';
  selectedUserForAction: User | null = null;
  
  isLoading: boolean = false;
  errorMessage: string = '';
  successMessage: string = '';

  createUserForm = {
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    password: '',
    profil: '',
    adress: '',
    date: '',
    lieunaissance: ''
  };

  editUserForm = {
    id: 0,
    prenom: '',
    nom: '',
    telephone: '',
    email: '',
    profil: '',
    adress: '',
  };

  utilisateurs: User[] = [];
  filteredUtilisateurs: User[] = [];
  paginatedUtilisateurs: User[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    console.log('🚀 Initialisation du composant Utilisateurs');
    this.loadAllUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  loadAllUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    console.log('📥 Chargement de tous les utilisateurs...');
  
    // Utilisation de getAllUsers avec pagination côté serveur
    this.userService.getAllUsers(this.searchTerm, undefined, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: UserPageResponse) => {
          console.log('✅ Réponse reçue:', response);
          
          this.utilisateurs = response.content;
          this.totalResults = response.totalElements;
          this.totalPages = response.totalPages;
  
          console.log('📊 Total utilisateurs chargés:', this.totalResults);
          console.log('📊 Pages totales:', this.totalPages);
          
          // Plus besoin de filtrage local ni de pagination locale
          this.filteredUtilisateurs = [...this.utilisateurs];
          this.paginatedUtilisateurs = [...this.utilisateurs];
          
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des utilisateurs:', error);
          this.errorMessage = error.userMessage || 'Erreur lors du chargement des utilisateurs';
          this.isLoading = false;
        }
      });
  }

  searchUtilisateurs(): void {
    console.log('🔍 Recherche:', this.searchTerm);
    
    if (this.searchTerm.trim() === '') {
      this.filteredUtilisateurs = [...this.utilisateurs];
    } else {
      const term = this.searchTerm.toLowerCase();
      this.filteredUtilisateurs = this.utilisateurs.filter(user =>
        `${user.prenom} ${user.nom}`.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term) ||
        user.profil.toLowerCase().includes(term) ||
        user.telephone.toLowerCase().includes(term)
      );
    }
    
    this.currentPage = 0;
    this.totalResults = this.filteredUtilisateurs.length;
    this.totalPages = Math.ceil(this.totalResults / this.pageSize);
    this.applyPagination();
  }
 
  applyPagination(): void {
    // const start = this.currentPage * this.pageSize;
    // const end = start + this.pageSize;
    // this.paginatedUtilisateurs = this.filteredUtilisateurs.slice(start, end);
    this.loadAllUsers();
  }

  getUserStatus(user: User): 'Actif' | 'Suspendu' | 'En attente' {
    if (!user.enabled || !user.activated) return 'Suspendu';
    if (!user.accountNonLocked) return 'Suspendu';
    return user.subscription?.active ? 'Actif' : 'En attente';
  }

  getStatutPoint(user: User): 'green' | 'red' | 'yellow' {
    const status = this.getUserStatus(user);
    switch (status) {
      case 'Actif': return 'green';
      case 'Suspendu': return 'red';
      case 'En attente': return 'yellow';
      default: return 'yellow';
    }
  }

  getStatutClass(statut: string): string {
    switch (statut) {
      case 'Actif': return 'bg-green-100 text-green-700';
      case 'Suspendu': return 'bg-red-100 text-red-700';
      case 'En attente': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getPointColor(color: string): string {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'red': return 'bg-red-500';
      case 'yellow': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  }

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  openCreateModal(): void {
    this.resetCreateForm();
    this.showCreateModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  openEditModal(user: User): void {
    this.editUserForm = {
      id: user.id,
      prenom: user.prenom,
      nom: user.nom,
      telephone: user.telephone,
      email: user.email,
      profil: user.profil,
      adress: user.adress,
    };
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetCreateForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.resetEditForm();
    this.errorMessage = '';
    this.successMessage = '';
  }

  resetCreateForm(): void {
    this.createUserForm = {
      prenom: '',
      nom: '',
      telephone: '',
      email: '',
      password: '',
      profil: '',
      adress: '',
      date: '',
      lieunaissance: ''
    };
  }

  resetEditForm(): void {
    this.editUserForm = {
      id: 0,
      prenom: '',
      nom: '',
      telephone: '',
      email: '',
      profil: '',
      adress: '',
    };
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

  saveNewUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.createUserForm.prenom || !this.createUserForm.nom || 
        !this.createUserForm.email || !this.createUserForm.password || 
        !this.createUserForm.telephone || !this.createUserForm.profil) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.createUserForm.email)) {
      this.errorMessage = 'Format d\'email invalide';
      return;
    }

    const phoneRegex = /^\d{8,}$/;
    const cleanPhone = this.createUserForm.telephone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      this.errorMessage = 'Le téléphone doit contenir au moins 8 chiffres';
      return;
    }

    this.isLoading = true;

    const formattedDate = this.createUserForm.date ? 
      this.convertDateFormat(this.createUserForm.date) : '';

    const createData = {
      nom: this.createUserForm.nom.trim(),
      prenom: this.createUserForm.prenom.trim(),
      email: this.createUserForm.email.trim().toLowerCase(),
      password: this.createUserForm.password,
      telephone: cleanPhone,
      date: formattedDate,
      lieunaissance: this.createUserForm.lieunaissance.trim(),
      adress: this.createUserForm.adress.trim(),
      profil: this.createUserForm.profil
    };

    console.log('📤 Données envoyées (format exact):', {
      ...createData,
      password: '***'
    });

    this.userService.createUser(createData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          console.log('✅ Utilisateur créé:', response);
          this.successMessage = 'Utilisateur créé avec succès';
          this.isLoading = false;
          
          setTimeout(() => {
            this.closeCreateModal();
            this.loadAllUsers();
          }, 1500);
        },
        error: (error) => {
          console.error('❌ Erreur création complète:', error);
          
          let userMsg = 'Erreur lors de la création';
          if (error.status === 400) {
            userMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 409) {
            userMsg = 'Un utilisateur avec cet email existe déjà.';
          }
          
          this.errorMessage = error.userMessage || userMsg;
          this.isLoading = false;
        }
      });
  }

  saveEditedUser(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.editUserForm.prenom || !this.editUserForm.nom || 
        !this.editUserForm.email || !this.editUserForm.telephone || 
        !this.editUserForm.profil) {
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires (*)';
      return;
    }

    this.isLoading = true;

    const userData: Partial<User> = {
      prenom: this.editUserForm.prenom,
      nom: this.editUserForm.nom,
      telephone: this.editUserForm.telephone.replace(/\s/g, ''),
      email: this.editUserForm.email,
      profil: this.editUserForm.profil,
      adress: this.editUserForm.adress
    };

    this.userService.putUser(this.editUserForm.id, userData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          console.log('✅ Utilisateur mis à jour:', updatedUser);
          this.successMessage = 'Utilisateur modifié avec succès';
          this.isLoading = false;
          
          setTimeout(() => {
            this.closeEditModal();
            this.loadAllUsers();
          }, 1500);
        },
        error: (error) => {
          console.error('❌ Erreur modification:', error);
          this.errorMessage = error.userMessage || 'Erreur lors de la modification';
          this.isLoading = false;
        }
      });
  }

  viewUser(user: User): void {
    this.router.navigate(['/details-utilisateur', user.id]);
  }

  editUser(user: User): void {
    this.openEditModal(user);
  }

  // 🆕 NOUVELLES MÉTHODES POUR BLOQUER/DÉBLOQUER
  toggleUserStatus(user: User): void {
    console.log('🔄 Toggle statut utilisateur:', user);
    this.selectedUserForAction = user;
    this.modalAction = this.getUserStatus(user) === 'Actif' ? 'block' : 'activate';
    this.showBlockModal = true;
  }

  confirmBlockAction(): void {
    if (!this.selectedUserForAction) return;

    this.isLoading = true;
    
    // TODO: Remplacez cette simulation par votre vraie méthode service
    // Exemple: this.userService.toggleUserStatus(this.selectedUserForAction.id)
    //   .pipe(takeUntil(this.destroy$))
    //   .subscribe({
    //     next: (response) => {
    //       this.handleBlockSuccess();
    //     },
    //     error: (error) => {
    //       this.handleBlockError(error);
    //     }
    //   });
    
    // Simulation pour l'instant
    setTimeout(() => {
      this.notificationType = this.modalAction === 'block' ? 'blocked' : 'activated';
      this.showBlockModal = false;
      this.showNotification = true;
      this.isLoading = false;

      // Recharger les utilisateurs
      this.loadAllUsers();

      // Masquer la notification après 3 secondes
      setTimeout(() => {
        this.showNotification = false;
        this.selectedUserForAction = null;
      }, 3000);
    }, 500);
  }

  cancelBlockAction(): void {
    this.showBlockModal = false;
    this.selectedUserForAction = null;
  }

  // Méthodes utilitaires pour gérer le succès/erreur (à utiliser avec votre vrai service)
  private handleBlockSuccess(): void {
    this.notificationType = this.modalAction === 'block' ? 'blocked' : 'activated';
    this.showBlockModal = false;
    this.showNotification = true;
    this.isLoading = false;
    
    this.loadAllUsers();
    
    setTimeout(() => {
      this.showNotification = false;
      this.selectedUserForAction = null;
    }, 3000);
  }

  private handleBlockError(error: any): void {
    console.error('❌ Erreur lors du changement de statut:', error);
    this.errorMessage = error.userMessage || 'Erreur lors du changement de statut';
    this.showBlockModal = false;
    this.isLoading = false;
  }

  // Méthodes de pagination
  goToPage(page: number): void {
    this.currentPage = page;
    this.loadAllUsers(); // Recharge avec la nouvelle page
  }
  
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadAllUsers();
    }
  }
  
  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadAllUsers();
    }
  }
}