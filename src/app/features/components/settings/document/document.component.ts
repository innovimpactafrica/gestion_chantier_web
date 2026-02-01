import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UnitParameterService, UpdateUnitParameterRequest } from '../../../../core/services/unite-parametre.service';
import { UnitParameter, PaginatedResponse } from '../../../../models/unit-parameter';

@Component({
  selector: 'app-document',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './document.component.html',
  styleUrls: ['./document.component.css']
})
export class DocumentComponent implements OnInit, OnDestroy {
  // Data properties
  documents: UnitParameter[] = [];
  paginatedDocuments: PaginatedResponse<UnitParameter> | null = null;
  private subscription: Subscription = new Subscription();
  
  // Loading and UI states
  isLoading = false;
  isSubmitting = false;
  isLoadingMore = false;
  
  // Search functionality
  searchTerm = '';
  isSearching = false;

  // Form properties
  documentForm = {
    label: '',
    code: '',
    hasStartDate: false,
    hasEndDate: false
  };

  // Edit mode
  editingDocument: UnitParameter | null = null;
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
    this.loadDocuments();
    this.subscribeToDocuments();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ========== DATA LOADING ==========
  
  private loadDocuments(): void {
    this.isLoading = true;
    this.unitParameterService.getDocuments({ 
      page: this.currentPage, 
      size: this.pageSize 
    });
  }

  private subscribeToDocuments(): void {
    this.subscription.add(
      this.unitParameterService.documents$.subscribe({
        next: (paginatedData) => {
          if (paginatedData) {
            this.paginatedDocuments = paginatedData;
            this.documents = paginatedData.content;
          }
          this.isLoading = false;
          this.isLoadingMore = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des documents:', error);
          this.showErrorMessage('Erreur lors du chargement des documents');
          this.isLoading = false;
          this.isLoadingMore = false;
        }
      })
    );
  }

  // ========== CRUD OPERATIONS ==========

  ajouterDocument(): void {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    
    const newDocument = {
      label: this.documentForm.label.trim(),
      code: this.documentForm.code.trim(),
      hasStartDate: this.documentForm.hasStartDate,
      hasEndDate: this.documentForm.hasEndDate
    };

    this.subscription.add(
      this.unitParameterService.addDocument(newDocument).subscribe({
        next: () => {
          this.resetForm();
          this.showSuccessMessage('Document ajouté avec succès');
          this.isSubmitting = false;
          this.refreshDocuments();
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du document:', error);
          this.showErrorMessage('Erreur lors de l\'ajout du document');
          this.isSubmitting = false;
        }
      })
    );
  }

  modifierDocument(document: UnitParameter): void {
    this.editingDocument = document;
    this.editForm = {
      label: document.label,
      code: document.code,
      hasStartDate: document.hasStartDate,
      hasEndDate: document.hasEndDate
    };
  }

  sauvegarderModification(): void {
    if (!this.editingDocument || !this.isEditFormValid()) {
      return;
    }

    const updatedDocument: UpdateUnitParameterRequest = {
      label: this.editForm.label.trim(),
      code: this.editForm.code.trim(),
      hasStartDate: this.editForm.hasStartDate,
      hasEndDate: this.editForm.hasEndDate,
      type: 'DOCUMENT'
    };

    this.subscription.add(
      this.unitParameterService.modifierParametre(this.editingDocument.id!, updatedDocument).subscribe({
        next: () => {
          this.showSuccessMessage('Document modifié avec succès');
          this.annulerModification();
        },
        error: (error) => {
          console.error('Erreur lors de la modification:', error);
          this.showErrorMessage('Erreur lors de la modification du document');
        }
      })
    );
  }

  supprimerDocument(document: UnitParameter): void {
    if (!document.id || !confirm('Êtes-vous sûr de vouloir supprimer ce document ?')) {
      return;
    }

    this.subscription.add(
      this.unitParameterService.supprimerParametre(document.id, 'DOCUMENT').subscribe({
        next: () => {
          this.showSuccessMessage('Document supprimé avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.showErrorMessage('Erreur lors de la suppression du document');
        }
      })
    );
  }

  // ========== SEARCH FUNCTIONALITY ==========

  onSearch(): void {
    if (this.searchTerm.trim().length < 2) {
      this.refreshDocuments();
      return;
    }

    this.isSearching = true;
    this.subscription.add(
      this.unitParameterService.searchByType('DOCUMENT', this.searchTerm, { 
        page: 0, 
        size: this.pageSize 
      }).subscribe({
        next: (searchResults) => {
          this.documents = searchResults.content;
          this.paginatedDocuments = searchResults;
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
    this.refreshDocuments();
  }

  // ========== PAGINATION ==========

  changerPage(page: number): void {
    if (page < 0 || page >= this.totalPages || this.isLoading) {
      return;
    }
    this.currentPage = page;
    this.loadDocuments();
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
    this.loadDocuments();
  }

  refreshDocuments(): void {
    this.currentPage = 0;
    this.loadDocuments();
  }

  rafraichir(): void {
    this.searchTerm = '';
    this.refreshDocuments();
  }

  // ========== FORM HELPERS ==========

  public isFormValid(): boolean {
    return this.documentForm.label.trim().length > 0 && 
           this.documentForm.code.trim().length > 0;
  }

  public isEditFormValid(): boolean {
    return this.editForm.label.trim().length > 0 && 
           this.editForm.code.trim().length > 0;
  }

  private resetForm(): void {
    this.documentForm = {
      label: '',
      code: '',
      hasStartDate: false,
      hasEndDate: false
    };
  }

  annulerModification(): void {
    this.editingDocument = null;
    this.editForm = {
      label: '',
      code: '',
      hasStartDate: false,
      hasEndDate: false
    };
  }

  // ========== UI HELPERS ==========

  isEditing(document: UnitParameter): boolean {
    return this.editingDocument?.id === document.id;
  }

  getStatusIcon(hasDate: boolean, isRequired: boolean): 'check' | 'x' | null {
    if (isRequired) {
      return hasDate ? 'check' : 'x';
    }
    return hasDate ? 'check' : null;
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

  // ========== GETTERS FOR TEMPLATE ==========

  get canLoadMore(): boolean {
    return this.paginatedDocuments ? !this.paginatedDocuments.last : false;
  }

  get totalDocuments(): number {
    return this.paginatedDocuments?.totalElements || 0;
  }

  get totalElements(): number {
    return this.paginatedDocuments?.totalElements || 0;
  }

  get totalPages(): number {
    return this.paginatedDocuments?.totalPages || 0;
  }

  get hasDocuments(): boolean {
    return this.documents.length > 0;
  }

  get isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  get isLastPage(): boolean {
    return this.paginatedDocuments ? this.paginatedDocuments.last : true;
  }

  get paginationInfo(): string {
    if (!this.paginatedDocuments) {
      return 'Aucun document';
    }
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.totalElements);
    return `${start} - ${end} sur ${this.totalElements} document(s)`;
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