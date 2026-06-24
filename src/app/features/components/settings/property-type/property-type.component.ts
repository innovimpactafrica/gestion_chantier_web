import { Component, OnInit, OnDestroy } from '@angular/core';
import { PropertyTypeService } from '../../../../core/services/property-type.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { PropertyType } from '../../../../models/property-type';
import { CommonModule } from '@angular/common';
import { Subject, takeUntil } from 'rxjs';
import { DeleteConfirmationModalComponent } from '../../../../shared/components/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-property-type',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, DeleteConfirmationModalComponent],
  templateUrl: './property-type.component.html',
  styleUrl: './property-type.component.css'
})
export class PropertyTypeComponent implements OnInit, OnDestroy {
  // Data
  propertyTypes: PropertyType[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 8;
  totalElements = 0;
  totalPages = 0;
  isFirstPage = true;
  isLastPage = false;
  readonly pageSizeOptions = [5, 8, 10, 20];
  readonly Math = Math;

  // Form
  typeForm: FormGroup;
  editingType: PropertyType | null = null;
  modeEdition = false;

  // State
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  // Modal de suppression
  showDeleteModal = false;
  typeToDelete: PropertyType | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    private propertyTypeService: PropertyTypeService,
    private fb: FormBuilder
  ) {
    this.typeForm = this.fb.group({
      typeName: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    this.loadPropertyTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPropertyTypes(): void {
    this.loading = true;
    this.error = null;
    this.propertyTypeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // Client-side pagination since the API returns all records
          this.totalElements = data.length;
          this.totalPages = Math.ceil(data.length / this.pageSize);
          this.isFirstPage = this.currentPage === 0;
          this.isLastPage = this.currentPage >= this.totalPages - 1;
          const start = this.currentPage * this.pageSize;
          this.propertyTypes = data.slice(start, start + this.pageSize);
          // Store full list for client-side pagination
          this._allTypes = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Erreur lors du chargement des types';
          this.loading = false;
        }
      });
  }

  private _allTypes: PropertyType[] = [];

  private applyPagination(): void {
    this.totalElements = this._allTypes.length;
    this.totalPages = Math.max(1, Math.ceil(this._allTypes.length / this.pageSize));
    if (this.currentPage >= this.totalPages) this.currentPage = this.totalPages - 1;
    this.isFirstPage = this.currentPage === 0;
    this.isLastPage = this.currentPage >= this.totalPages - 1;
    const start = this.currentPage * this.pageSize;
    this.propertyTypes = this._allTypes.slice(start, start + this.pageSize);
  }

  onSubmit(): void {
    if (!this.typeForm.valid || this.loading) return;
    this.loading = true;
    this.error = null;

    if (this.modeEdition && this.editingType) {
      const updated: PropertyType = { ...this.editingType, typeName: this.typeForm.value.typeName };
      this.propertyTypeService.update(updated)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.showSuccess('Type modifié avec succès');
            this.resetForm();
            this.loadPropertyTypes();
          },
          error: () => { this.loading = false; this.error = 'Erreur lors de la modification'; }
        });
    } else {
      const newType: PropertyType = { typeName: this.typeForm.value.typeName, parent: true };
      this.propertyTypeService.create(newType)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.showSuccess('Type ajouté avec succès');
            this.resetForm();
            this.loadPropertyTypes();
          },
          error: () => { this.loading = false; this.error = 'Erreur lors de l\'ajout'; }
        });
    }
  }

  startEdit(type: PropertyType): void {
    this.editingType = type;
    this.modeEdition = true;
    this.typeForm.patchValue({ typeName: type.typeName });
    this.error = null;
  }

  deletePropertyType(type: PropertyType): void {
    this.typeToDelete = type;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.typeToDelete?.id) return;
    
    this.loading = true;
    this.propertyTypeService.delete(this.typeToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.showSuccess('Type supprimé avec succès');
          // Adjust page if needed
          if (this.propertyTypes.length === 1 && this.currentPage > 0) this.currentPage--;
          this.closeDeleteModal();
          this.loadPropertyTypes();
        },
        error: () => { 
          this.loading = false; 
          this.error = 'Erreur lors de la suppression';
          this.closeDeleteModal();
        }
      });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.typeToDelete = null;
  }

  resetForm(): void {
    this.typeForm.reset({ typeName: '' });
    this.typeForm.markAsUntouched();
    this.editingType = null;
    this.modeEdition = false;
    this.error = null;
  }

  // Pagination
  changerPage(page: number): void {
    if (page >= 0 && page < this.totalPages && !this.loading) {
      this.currentPage = page;
      this.applyPagination();
    }
  }

  pagePrecedente(): void { if (!this.isFirstPage) this.changerPage(this.currentPage - 1); }
  pageSuivante(): void { if (!this.isLastPage) this.changerPage(this.currentPage + 1); }

  onPageSizeChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!isNaN(val) && val > 0) {
      this.pageSize = val;
      this.currentPage = 0;
      this.applyPagination();
    }
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

  get submitButtonText(): string {
    if (this.loading) return this.modeEdition ? 'Modification...' : 'Ajout...';
    return this.modeEdition ? 'Modifier' : 'Ajouter';
  }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    setTimeout(() => this.successMessage = null, 3000);
  }

  trackByType(index: number, type: PropertyType): number { return type.id ?? index; }
}