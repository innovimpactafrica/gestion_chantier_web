import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, UserPageResponse, CreateUserRequest, User } from '../../../services/user.service';
import { LanguageService } from '../../core/services/language.service';

interface Worker {
  id: number;
  name: string;
  phone: string;
  email: string;
  position: string;
  status: string;
  selected: boolean;
  originalUser?: User;
}

@Component({
  selector: 'app-supplier',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './supplier.component.html',
  styleUrls: ['./supplier.component.css']
})
export class SupplierComponent implements OnInit {
  nouveauWorker = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    date: '',
    lieunaissance: '',
    adress: '',
    profil: 'SUPPLIER'
  };

  allWorkers: Worker[] = [];
  displayedWorkers: Worker[] = [];
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  selectAll = false;
  totalWorkers = 0;
  startIndex = 1;
  endIndex = 10;
  searchQuery: string = '';

  showModal = false;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private userService: UserService,
    private languageService: LanguageService
  ) { }

  ngOnInit() {
    this.loadSuppliers();
  }

  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  /**
   * Charge les fournisseurs depuis l'API
   */
  loadSuppliers() {
    this.isLoading = true;
    this.errorMessage = '';

    this.userService.getUserByProfil(
      'SUPPLIER',
      this.searchQuery || undefined,
      this.currentPage - 1,
      this.itemsPerPage
    ).subscribe({
      next: (response: UserPageResponse) => {

        this.allWorkers = response.content.map(user => this.userToWorker(user));
        this.displayedWorkers = [...this.allWorkers];
        this.totalWorkers = response.totalElements;
        this.totalPages = response.totalPages;
        this.updatePaginationData();
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = error.userMessage || this.t('stock.errors.loadStock'); // Fallback generic or create specific
        this.isLoading = false;
      }
    });
  }

  /**
   * Convertit un User en Worker
   */
  private userToWorker(user: User): Worker {
    return {
      id: user.id,
      name: `${user.prenom} ${user.nom}`,
      phone: user.telephone,
      email: user.email,
      position: user.profil || 'SUPPLIER',
      status: user.activated ? 'active' : 'inactive',
      selected: false,
      originalUser: user
    };
  }

  /**
   * Met à jour les données de pagination
   */
  updatePaginationData() {
    this.startIndex = this.displayedWorkers.length > 0 ?
      ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
    this.endIndex = Math.min(
      this.startIndex + this.displayedWorkers.length - 1,
      this.totalWorkers
    );
    this.updateSelectAllState();
  }

  /**
   * Recherche les fournisseurs
   */
  searchWorkers() {
    this.currentPage = 1;
    this.loadSuppliers();
  }

  /**
   * Crée un nouveau fournisseur
   */
  createWorker() {
    // Validation des champs obligatoires
    if (!this.nouveauWorker.nom ||
      !this.nouveauWorker.prenom ||
      !this.nouveauWorker.telephone ||
      !this.nouveauWorker.email ||
      !this.nouveauWorker.password ||
      !this.nouveauWorker.date ||
      !this.nouveauWorker.lieunaissance ||
      !this.nouveauWorker.adress) {
      this.errorMessage = this.t('supplier.validation.required');
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.nouveauWorker.email)) {
      this.errorMessage = this.t('supplier.validation.email');
      return;
    }

    // Validation téléphone
    const cleanPhone = this.nouveauWorker.telephone.replace(/\s/g, '');
    if (cleanPhone.length < 8) {
      this.errorMessage = this.t('supplier.validation.phone');
      return;
    }

    // Validation mot de passe
    if (this.nouveauWorker.password.length < 6) {
      this.errorMessage = this.t('supplier.validation.password');
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Création de l'objet CreateUserRequest
    const createUserData: CreateUserRequest = {
      nom: this.nouveauWorker.nom.trim(),
      prenom: this.nouveauWorker.prenom.trim(),
      email: this.nouveauWorker.email.trim().toLowerCase(),
      password: this.nouveauWorker.password,
      telephone: cleanPhone,
      date: this.nouveauWorker.date,
      lieunaissance: this.nouveauWorker.lieunaissance.trim(),
      adress: this.nouveauWorker.adress.trim(),
      profil: 'SUPPLIER'
    };


    this.userService.createUser(createUserData).subscribe({
      next: (response) => {
        this.successMessage = this.t('supplier.success.add');
        this.isLoading = false;

        // Recharger la liste
        this.loadSuppliers();

        // Fermer le modal après 1.5 secondes
        setTimeout(() => {
          this.closeModal();
          this.successMessage = '';
        }, 1500);
      },
      error: (error) => {

        let userMsg = this.t('supplier.error.add');
        // Simple error handling enhancement if needed

        this.errorMessage = error.userMessage || userMsg;
        this.isLoading = false;
      }
    });
  }

  /**
   * Supprime les fournisseurs sélectionnés
   */
  deleteSelectedWorkers() {
    const selectedWorkers = this.displayedWorkers.filter(worker => worker.selected);

    if (selectedWorkers.length === 0) {
      this.errorMessage = this.t('supplier.validation.selection');
      setTimeout(() => this.errorMessage = '', 3000);
      return;
    }

    if (!confirm(this.t('supplier.confirmDelete', { count: selectedWorkers.length }))) {
      return;
    }

    this.isLoading = true;
    let deletedCount = 0;
    let errorCount = 0;

    selectedWorkers.forEach((worker, index) => {
      this.userService.deleteUser(worker.id).subscribe({
        next: () => {
          deletedCount++;

          if (index === selectedWorkers.length - 1) {
            this.finishDeletion(deletedCount, errorCount);
          }
        },
        error: (error) => {
          errorCount++;

          if (index === selectedWorkers.length - 1) {
            this.finishDeletion(deletedCount, errorCount);
          }
        }
      });
    });
  }

  /**
   * Finalise la suppression
   */
  private finishDeletion(deletedCount: number, errorCount: number) {
    this.isLoading = false;

    if (deletedCount > 0) {
      this.successMessage = this.t('supplier.success.delete', { count: deletedCount });
      this.loadSuppliers();
    }

    if (errorCount > 0) {
      this.errorMessage = this.t('supplier.error.delete', { count: errorCount });
    }

    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.displayedWorkers.forEach(worker => worker.selected = this.selectAll);
  }

  toggleWorkerSelection(worker: Worker) {
    worker.selected = !worker.selected;
    this.updateSelectAllState();
  }

  updateSelectAllState() {
    this.selectAll = this.displayedWorkers.length > 0 &&
      this.displayedWorkers.every(worker => worker.selected);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active':
        return 'text-green-500';
      case 'inactive':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  getStatusDot(status: string): string {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'inactive':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadSuppliers();
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;

    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;

      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }

  openModal() {
    this.showModal = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.nouveauWorker = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      password: '',
      date: '',
      lieunaissance: '',
      adress: '',
      profil: 'SUPPLIER'
    };
  }

  closeModal() {
    this.showModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  onSubmit() {
    this.createWorker();
  }
}