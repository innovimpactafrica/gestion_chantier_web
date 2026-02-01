import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UnitParameterService, UpdateUnitParameterRequest } from '../../../../core/services/unite-parametre.service';
import { UnitParameter, PaginatedResponse } from '../../../../models/unit-parameter';

@Component({
  selector: 'app-material-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './material-category.component.html',
  styleUrls: ['./material-category.component.css']
})
export class MaterialCategoryComponent implements OnInit, OnDestroy {
  // Data properties
  categories: UnitParameter[] = [];
  paginatedCategories: PaginatedResponse<UnitParameter> | null = null;
  private subscription: Subscription = new Subscription();
  
  // Loading and UI states
  isLoading = false;
  isSubmitting = false;
  isLoadingMore = false;
  
  // Search functionality
  searchTerm = '';
  isSearching = false;

  // Form properties
  categoryForm = {
    label: '',
    code: '',
    hasStartDate: false,
    hasEndDate: false
  };

  // Edit mode
  editingCategory: UnitParameter | null = null;
  editForm = {
    label: '',
    code: '',
    hasStartDate: false,
    hasEndDate: false
  };

  // Pagination
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];

  // Messages
  successMessage = '';
  error = '';

  constructor(private unitParameterService: UnitParameterService) {}

  ngOnInit(): void {
    this.loadCategories();
    this.subscribeToCategories();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ========== DATA LOADING ==========
  
  private loadCategories(): void {
    this.isLoading = true;
    this.unitParameterService.getMaterialCategories({ 
      page: this.currentPage, 
      size: this.pageSize 
    });
  }

  private subscribeToCategories(): void {
    this.subscription.add(
      this.unitParameterService.materialCategories$.subscribe({
        next: (paginatedData) => {
          if (paginatedData) {
            this.paginatedCategories = paginatedData;
            this.categories = paginatedData.content;
          }
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des catégories:', error);
          this.showErrorMessage('Erreur lors du chargement des catégories');
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      })
    );
  }

  // ========== CRUD OPERATIONS ==========

  ajouterCategorie(): void {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    
    const newCategory = {
      label: this.categoryForm.label.trim(),
      code: this.categoryForm.code.trim().toUpperCase(),
      hasStartDate: this.categoryForm.hasStartDate,
      hasEndDate: this.categoryForm.hasEndDate
    };

    this.subscription.add(
      this.unitParameterService.addMaterialCategory(newCategory).subscribe({
        next: () => {
          this.resetForm();
          this.showSuccessMessage('Catégorie ajoutée avec succès');
          this.isSubmitting = false;
          this.refreshCategories();
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout de la catégorie:', error);
          this.showErrorMessage('Erreur lors de l\'ajout de la catégorie');
          this.isSubmitting = false;
        }
      })
    );
  }

  modifierCategorie(category: UnitParameter): void {
    this.editingCategory = category;
    this.editForm = {
      label: category.label,
      code: category.code,
      hasStartDate: category.hasStartDate,
      hasEndDate: category.hasEndDate
    };
  }

  sauvegarderModification(): void {
    if (!this.editingCategory || !this.isEditFormValid()) {
      return;
    }

    const updatedCategory: UpdateUnitParameterRequest = {
      label: this.editForm.label.trim(),
      code: this.editForm.code.trim().toUpperCase(),
      hasStartDate: this.editForm.hasStartDate,
      hasEndDate: this.editForm.hasEndDate,
      type: 'MATERIAL_CATEGORY'
    };

    this.subscription.add(
      this.unitParameterService.modifierParametre(this.editingCategory.id!, updatedCategory).subscribe({
        next: () => {
          this.showSuccessMessage('Catégorie modifiée avec succès');
          this.annulerModification();
        },
        error: (error) => {
          console.error('Erreur lors de la modification:', error);
          this.showErrorMessage('Erreur lors de la modification de la catégorie');
        }
      })
    );
  }

  supprimerCategorie(category: UnitParameter): void {
    if (!category.id || !confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) {
      return;
    }

    this.subscription.add(
      this.unitParameterService.supprimerParametre(category.id, 'MATERIAL_CATEGORY').subscribe({
        next: () => {
          this.showSuccessMessage('Catégorie supprimée avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.showErrorMessage('Erreur lors de la suppression de la catégorie');
        }
      })
    );
  }

  // ========== SEARCH FUNCTIONALITY ==========

  onSearch(): void {
    if (this.searchTerm.trim().length < 2) {
      this.refreshCategories();
      return;
    }

    this.isSearching = true;
    this.subscription.add(
      this.unitParameterService.searchByType('MATERIAL_CATEGORY', this.searchTerm, { 
        page: 0, 
        size: this.pageSize 
      }).subscribe({
        next: (searchResults) => {
          this.categories = searchResults.content;
          this.paginatedCategories = searchResults;
          this.currentPage = 0;
          this.isSearching = false;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche:', error);
          this.showErrorMessage('Erreur lors de la recherche');
          this.isSearching = false;
        }
      })
    );
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.refreshCategories();
  }

  // ========== PAGINATION ==========

  changerPage(page: number): void {
    if (page < 0 || page >= this.totalPages || this.isLoading) {
      return;
    }
    this.currentPage = page;
    this.loadCategories();
  }

  pagePrecedente(): void {
    if (this.currentPage > 0) {
      this.changerPage(this.currentPage - 1);
    }
  }

  pageSuivante(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.changerPage(this.currentPage + 1);
    }
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize = parseInt(target.value, 10);
    this.currentPage = 0;
    this.loadCategories();
  }

  refreshCategories(): void {
    this.currentPage = 0;
    this.loadCategories();
  }

  rafraichir(): void {
    this.searchTerm = '';
    this.refreshCategories();
  }

  // ========== FORM HELPERS ==========

  public isFormValid(): boolean {
    return this.categoryForm.label.trim().length > 0 && 
           this.categoryForm.code.trim().length > 0;
  }

  public isEditFormValid(): boolean {
    return this.editForm.label.trim().length > 0 && 
           this.editForm.code.trim().length > 0;
  }

  private resetForm(): void {
    this.categoryForm = {
      label: '',
      code: '',
      hasStartDate: false,
      hasEndDate: false
    };
  }

  annulerModification(): void {
    this.editingCategory = null;
    this.editForm = {
      label: '',
      code: '',
      hasStartDate: false,
      hasEndDate: false
    };
  }

  // ========== UI HELPERS ==========

  isEditing(category: UnitParameter): boolean {
    return this.editingCategory?.id === category.id;
  }

  trackByFn(index: number, item: UnitParameter): string {
    return item.id || index.toString();
  }

  // ========== MESSAGES ==========

  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    this.error = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  private showErrorMessage(message: string): void {
    this.error = message;
    this.successMessage = '';
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  clearError(): void {
    this.error = '';
  }

  // ========== GETTERS FOR TEMPLATE ==========

  get canLoadMore(): boolean {
    return this.paginatedCategories ? !this.paginatedCategories.last : false;
  }

  get totalCategories(): number {
    return this.paginatedCategories?.totalElements || 0;
  }

  get totalElements(): number {
    return this.paginatedCategories?.totalElements || 0;
  }

  get totalPages(): number {
    return this.paginatedCategories?.totalPages || 0;
  }

  get hasCategories(): boolean {
    return this.categories.length > 0;
  }

  get isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  get isLastPage(): boolean {
    return this.paginatedCategories ? this.paginatedCategories.last : true;
  }

  get paginationInfo(): string {
    if (!this.paginatedCategories) {
      return 'Aucune catégorie';
    }
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.totalElements);
    return `${start} - ${end} sur ${this.totalElements} catégorie(s)`;
  }

  get pagesDisponibles(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    const totalPages = this.totalPages;

    if (totalPages <= maxPagesToShow) {
      for (let i = 0; i < totalPages; i++) {
        pages.push(i);
      }
    } else {
      const startPage = Math.max(0, this.currentPage - 2);
      const endPage = Math.min(totalPages - 1, startPage + maxPagesToShow - 1);

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }

    return pages;
  }
}