import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UnitParameterService, UnitParameter, PaginatedResponse } from '../../../../core/services/unite-parametre.service';
import { DeleteConfirmationModalComponent } from '../../../../shared/components/delete-confirmation-modal/delete-confirmation-modal.component';


@Component({
  selector: 'app-document',
  standalone: true,
  imports: [CommonModule, FormsModule, DeleteConfirmationModalComponent],
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

  // Search functionality
  searchTerm = '';
  isSearching = false;

  // Form properties
  documentForm = {
    label: '',
    code: ''
  };

  // Edit mode
  editingDocument: UnitParameter | null = null;
  editForm = {
    label: '',
    code: ''
  };

  // Pagination
  currentPage = 0;
  pageSize = 8;
  totalElements = 0;
  totalPages = 0;
  isFirstPage = true;
  isLastPage = false;
  readonly pageSizeOptions = [5, 8, 10, 20];
  readonly Math = Math;

  // Modal de suppression
  showDeleteModal = false;
  documentToDelete: UnitParameter | null = null;

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
    this.subscription.add(
      this.unitParameterService.getAll({
        page: this.currentPage,
        size: this.pageSize,
        type: 'DOCUMENT'
      }).subscribe({
        next: (paginatedData) => {
          if (paginatedData) {
            this.paginatedDocuments = paginatedData;
            this.documents = paginatedData.content;
            this.totalElements = paginatedData.totalElements;
            this.totalPages = Math.max(1, paginatedData.totalPages);
            this.isFirstPage = paginatedData.first;
            this.isLastPage = paginatedData.last;
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des documents:', error);
          this.isLoading = false;
        }
      })
    );
  }

  // (méthode de souscription séparée n'est plus nécessaire car intégrée dans loadDocuments)
  private subscribeToDocuments(): void {}

  // ========== CRUD OPERATIONS ==========

  ajouterDocument(): void {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    
    const newDocument: UnitParameter = {
      label: this.documentForm.label.trim(),
      code: this.documentForm.code.trim(),
      type: 'DOCUMENT',
      hasStartDate: false,
      hasEndDate: false
    };

    this.subscription.add(
      this.unitParameterService.create(newDocument).subscribe({
        next: (document) => {
          this.resetForm();
          this.showSuccessMessage('Document ajouté avec succès');
          this.isSubmitting = false;
          // Recharger la première page pour voir le nouveau document
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
      code: document.code
    };
  }

  sauvegarderModification(): void {
    if (!this.editingDocument || !this.isEditFormValid()) {
      return;
    }

    const updatedDocument: UnitParameter = {
      ...this.editingDocument,
      label: this.editForm.label.trim(),
      code: this.editForm.code.trim(),
      type: 'DOCUMENT'
    };

    this.subscription.add(
      this.unitParameterService.update(this.editingDocument.id!, updatedDocument).subscribe({
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
    if (!document.id) return;
    this.documentToDelete = document;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.documentToDelete?.id) return;

    this.subscription.add(
      this.unitParameterService.delete(this.documentToDelete.id).subscribe({
        next: () => {
          this.showSuccessMessage('Document supprimé avec succès');
          this.closeDeleteModal();
          this.refreshDocuments();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.showErrorMessage('Erreur lors de la suppression du document');
          this.closeDeleteModal();
        }
      })
    );
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.documentToDelete = null;
  }

  // ========== SEARCH FUNCTIONALITY ==========

  onSearch(): void {
    if (this.searchTerm.trim().length < 2) {
      this.refreshDocuments();
      return;
    }

    this.isSearching = true;
    // Fallback à la récupération globale si le backend ne gère plus la recherche spécifique,
    // mais on passera les params searchTerm à l'API via HttpParams dans service.
    this.subscription.add(
      this.unitParameterService.getAll({ 
        page: 0, 
        size: this.pageSize,
        type: 'DOCUMENT',
        search: this.searchTerm
      } as any).subscribe({
        next: (searchResults) => {
          this.documents = searchResults.content;
          this.paginatedDocuments = searchResults;
          this.currentPage = 0;
          this.isSearching = false;
        },
        error: (error) => {
          console.error('Erreur lors de la recherche:', error);
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
    if (page >= 0 && page < this.totalPages && !this.isLoading) {
      this.currentPage = page;
      this.loadDocuments();
    }
  }

  pagePrecedente(): void { if (!this.isFirstPage) this.changerPage(this.currentPage - 1); }
  pageSuivante(): void { if (!this.isLastPage) this.changerPage(this.currentPage + 1); }

  onPageSizeChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!isNaN(val) && val > 0) { this.pageSize = val; this.currentPage = 0; this.loadDocuments(); }
  }

  get pagesDisponibles(): number[] {
    const pages = [];
    const max = 5;
    let start = Math.max(0, this.currentPage - Math.floor(max / 2));
    let end = Math.min(this.totalPages - 1, start + max - 1);
    if (end - start < max - 1) start = Math.max(0, end - max + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  get paginationInfo(): string {
    if (this.totalElements === 0) return '0 éléments';
    const debut = this.currentPage * this.pageSize + 1;
    const fin = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
    return `${debut}-${fin} sur ${this.totalElements}`;
  }

  refreshDocuments(): void {
    this.currentPage = 0;
    this.loadDocuments();
  }

  // ========== FORM HELPERS ==========

  private isFormValid(): boolean {
    return this.documentForm.label.trim().length > 0 && 
           this.documentForm.code.trim().length > 0;
  }

  private isEditFormValid(): boolean {
    return this.editForm.label.trim().length > 0 && 
           this.editForm.code.trim().length > 0;
  }

  private resetForm(): void {
    this.documentForm = {
      label: '',
      code: ''
    };
  }

  annulerModification(): void {
    this.editingDocument = null;
    this.editForm = {
      label: '',
      code: ''
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

  getStatusColor(hasDate: boolean, isRequired: boolean): string {
    if (isRequired) {
      return hasDate ? 'text-green-500' : 'text-red-500';
    }
    return hasDate ? 'text-green-500' : 'text-gray-400';
  }

  // ========== MESSAGES ==========

  private showSuccessMessage(message: string): void {
    // Ici vous pouvez implémenter votre système de notification
    // Par exemple avec un service de toast ou une notification
    console.log('✅', message);
    // Exemple: this.notificationService.showSuccess(message);
  }

  private showErrorMessage(message: string): void {
    // Ici vous pouvez implémenter votre système de notification d'erreur
    console.error('❌', message);
    // Exemple: this.notificationService.showError(message);
  }

  // ========== GETTERS FOR TEMPLATE ==========

  get totalDocuments(): number {
    return this.totalElements;
  }

  get hasDocuments(): boolean {
    return this.documents.length > 0;
  }
}