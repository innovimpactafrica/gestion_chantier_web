import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { UserService, User, UserPageResponse, CreateUserRequest } from '../../../services/user.service';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/services/auth.service';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { LanguageService } from '../../core/services/language.service';
import { ExportService } from '../../core/services/export.service';

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
  selectedProfile: string = ''; // Filter by profile

  Math = Math;
  editPhotoFile: File | null = null;
  editPhotoPreview: string | null = null;

  // Modals existants
  showCreateModal: boolean = false;
  showEditModal: boolean = false;
  createPhotoFile: File | null = null;
  createPhotoPreview: string | null = null;

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

  editUserForm: {
    id: number;
    prenom: string;
    nom: string;
    email: string;
    telephone: string;
    profil: string;
    adress: string;
    date: string;
    lieunaissance: string;
    photo?: string;
  } = {
      id: 0,
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      profil: '',
      adress: '',
      date: '',
      lieunaissance: '',
      photo: ''
    };

  utilisateurs: User[] = [];
  filteredUtilisateurs: User[] = [];
  paginatedUtilisateurs: User[] = [];

  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    private userService: UserService,
    private authService: AuthService,
    private utilisateurService: UtilisateurService,
    public languageService: LanguageService,
    private exportService: ExportService
  ) { }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnInit(): void {
    this.loadAllUsers();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadAllUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';

    // Use selectedProfile if set, otherwise undefined
    const profileFilter = this.selectedProfile || undefined;

    this.userService.getAllUsers(this.searchTerm, profileFilter, this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: UserPageResponse) => {

          this.utilisateurs = response.content;
          this.totalResults = response.totalElements;
          this.totalPages = response.totalPages;


          this.filteredUtilisateurs = [...this.utilisateurs];
          this.paginatedUtilisateurs = [...this.utilisateurs];

          this.isLoading = false;
        },
        error: (error) => {
          this.errorMessage = error.userMessage || 'Erreur lors du chargement des utilisateurs';
          this.isLoading = false;
        }
      });
  }

  filterByProfile(): void {
    this.currentPage = 0;
    this.loadAllUsers();
  }

  clearProfileFilter(): void {
    this.selectedProfile = '';
    this.currentPage = 0;
    this.loadAllUsers();
  }

  searchUtilisateurs(): void {
    this.currentPage = 0;
    this.loadAllUsers();
  }

  applyPagination(): void {
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
      adress: user.adress || '',
      date: this.convertToInputDate(user.date),
      lieunaissance: user.lieunaissance || '',
      photo: user.photo || ''
    };
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.createPhotoFile = null;
    this.createPhotoPreview = null;
    this.errorMessage = '';
    this.successMessage = '';

    this.createUserForm = {
      prenom: '',
      nom: '',
      email: '',
      password: '',
      telephone: '',
      date: '',
      lieunaissance: '',
      adress: '',
      profil: ''
    };
  }

  onCreatePhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Format invalide. Utilisez JPG, PNG ou GIF.';
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.errorMessage = 'La photo est trop volumineuse (max 5MB).';
        return;
      }

      this.createPhotoFile = file;
      this.errorMessage = '';

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.createPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.editPhotoFile = null;
    this.editPhotoPreview = null;

    this.editUserForm = {
      id: 0,
      prenom: '',
      nom: '',
      email: '',
      telephone: '',
      profil: '',
      adress: '',
      date: '',
      lieunaissance: '',
      photo: ''
    };

    this.errorMessage = '';
    this.successMessage = '';
  }

  getFileBaseUrl() {
    return `${environment.filebaseUrl}`;
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
      date: '',
      lieunaissance: '',
      photo: ''
    };
  }

  private convertDateFormat(dateString: string): string {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    const formattedDate = `${day}-${month}-${year}`;
    return formattedDate;
  }

  private convertToInputDate(dateString: string): string {
    if (!dateString) return '';
    const [day, month, year] = dateString.split('-');
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
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

    const createData: CreateUserRequest = {
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

    if (this.createPhotoFile) {
      createData.photo = this.createPhotoFile;
    }


    this.userService.createUser(createData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.successMessage = 'Utilisateur créé avec succès';
          this.isLoading = false;

          this.createPhotoFile = null;
          this.createPhotoPreview = null;

          setTimeout(() => {
            this.closeCreateModal();
            this.loadAllUsers();
          }, 1500);
        },
        error: (error) => {

          let userMsg = 'Erreur lors de la création';
          if (error.status === 400) {
            userMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 409) {
            userMsg = 'Un utilisateur avec cet email existe déjà.';
          } else if (error.status === 413) {
            userMsg = 'La photo est trop volumineuse.';
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.editUserForm.email)) {
      this.errorMessage = 'Format d\'email invalide';
      return;
    }

    const phoneRegex = /^\d{8,}$/;
    const cleanPhone = this.editUserForm.telephone.replace(/\s/g, '');
    if (!phoneRegex.test(cleanPhone)) {
      this.errorMessage = 'Le téléphone doit contenir au moins 8 chiffres';
      return;
    }

    this.isLoading = true;

    const formData = new FormData();

    formData.append('nom', this.editUserForm.nom.trim());
    formData.append('prenom', this.editUserForm.prenom.trim());
    formData.append('email', this.editUserForm.email.trim().toLowerCase());
    formData.append('telephone', cleanPhone);
    formData.append('profil', this.editUserForm.profil);
    formData.append('adress', this.editUserForm.adress.trim());
    formData.append('lieunaissance', this.editUserForm.lieunaissance.trim());

    if (this.editUserForm.date) {
      const formattedDate = this.convertDateFormat(this.editUserForm.date);
      formData.append('date', formattedDate);
    }

    if (this.editPhotoFile) {
      formData.append('photo', this.editPhotoFile, this.editPhotoFile.name);
    }


    // ✅ CORRECTION: Utiliser UserService au lieu de AuthService
    this.authService.updateAnyUserWithFormData(this.editUserForm.id, formData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedUser) => {
          this.successMessage = 'Utilisateur modifié avec succès';
          this.isLoading = false;

          this.editPhotoFile = null;
          this.editPhotoPreview = null;

          setTimeout(() => {
            this.closeEditModal();
            this.loadAllUsers();
          }, 1500);
        },
        error: (error) => {
          let userMsg = 'Erreur lors de la modification';
          if (error.status === 400) {
            userMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 409) {
            userMsg = 'Un utilisateur avec cet email existe déjà.';
          } else if (error.status === 413) {
            userMsg = 'La photo est trop volumineuse.';
          }
          this.errorMessage = error.userMessage || userMsg;
          this.isLoading = false;
        }
      });
  }

  onEditPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = 'Format de fichier non valide. Utilisez JPG, PNG ou GIF.';
        return;
      }

      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.errorMessage = 'La photo est trop volumineuse (max 5MB).';
        return;
      }

      this.editPhotoFile = file;

      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.editPhotoPreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  viewUser(user: User): void {
    this.router.navigate(['/details-utilisateur', user.id]);
  }

  editUser(user: User): void {
    this.openEditModal(user);
  }

  toggleUserStatus(user: User): void {
    this.selectedUserForAction = user;
    this.modalAction = user.activated ? 'block' : 'activate';
    this.showBlockModal = true;
  }

  confirmBlockAction(): void {
    if (!this.selectedUserForAction) return;

    this.isLoading = true;

    // ✅ Déterminer l'état à envoyer (inverse du statut actuel)
    const shouldActivate = this.modalAction === 'activate';


    // ✅ Appeler le service pour bloquer/débloquer
    this.utilisateurService.blockUser(this.selectedUserForAction.id, shouldActivate)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.handleBlockSuccess();
        },
        error: (error) => {
          this.handleBlockError(error);
        }
      });
  }

  cancelBlockAction(): void {
    this.showBlockModal = false;
    this.selectedUserForAction = null;
  }

  private handleBlockSuccess(): void {
    this.notificationType = this.modalAction === 'block' ? 'blocked' : 'activated';
    this.showBlockModal = false;
    this.showNotification = true;
    this.isLoading = false;

    // ✅ Recharger la liste des utilisateurs
    this.loadAllUsers();

    setTimeout(() => {
      this.showNotification = false;
      this.selectedUserForAction = null;
    }, 3000);
  }

  private handleBlockError(error: any): void {
    this.errorMessage = error.userMessage || 'Erreur lors du changement de statut';
    this.showBlockModal = false;
    this.isLoading = false;
  }

  goToPage(page: number): void {
    this.currentPage = page;
    this.loadAllUsers();
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
  exportUsers(): void {
    const data = this.utilisateurs.map(user => ({
      Prénom: user.prenom,
      Nom: user.nom,
      Email: user.email,
      Téléphone: user.telephone,
      Profil: user.profil,
      Adresse: user.adress,
      Date: this.formatDate(user.date as any),
      Statut: this.getUserStatus(user)
    }));

    this.exportService.exportToExcel(data, 'utilisateurs', 'Utilisateurs');
  }
}