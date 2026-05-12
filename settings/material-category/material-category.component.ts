import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UnitParameter } from '../../../../core/services/unite-parametre.service';
import { UnitParameterService } from '../../../../core/services/unite-parametre.service';

@Component({
  selector: 'app-material-category',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './material-category.component.html',
  styleUrls: ['./material-category.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialCategoryComponent implements OnInit, OnDestroy {
  // Data
  categories: UnitParameter[] = [];

  // Pagination
  currentPage = 0;
  pageSize = 8;
  totalElements = 0;
  totalPages = 0;
  isFirstPage = true;
  isLastPage = false;
  readonly pageSizeOptions = [5, 8, 10, 20];
  readonly Math = Math;

  // Loading states
  isLoading = false;
  isSubmitting = false;

  // Search
  searchTerm = '';
  private searchSubject = new Subject<string>();

  // Error / success
  error: string | null = null;
  successMessage: string | null = null;

  // Form
  nouvelleCategorie = { label: '', code: '' };
  formErrors: { [key: string]: string } = {};

  // Edit mode
  editingCategory: UnitParameter | null = null;
  editForm = { label: '', code: '' };

  private destroy$ = new Subject<void>();

  constructor(
    private unitParameterService: UnitParameterService,
    private cdr: ChangeDetectorRef
  ) {
    this.setupSearch();
  }

  ngOnInit(): void {
    this.loadCategories();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.currentPage = 0;
      this.loadCategories();
    });
  }

  loadCategories(): void {
    this.isLoading = true;
    this.error = null;

    this.unitParameterService.getAll({ page: this.currentPage, size: this.pageSize, type: 'MATERIAL_CATEGORY' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (paginatedData) => {
          this.categories = paginatedData.content;
          this.totalElements = paginatedData.totalElements;
          this.totalPages = Math.max(1, paginatedData.totalPages);
          this.isFirstPage = paginatedData.first;
          this.isLastPage = paginatedData.last;
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.error = 'Erreur lors du chargement des catégories';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  onSearchChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.searchTerm);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  ajouterCategorie(): void {
    if (!this.validateForm(this.nouvelleCategorie)) return;
    this.isSubmitting = true;

    const payload: UnitParameter = {
      label: this.nouvelleCategorie.label.trim(),
      code: this.nouvelleCategorie.code.trim().toUpperCase(),
      type: 'MATERIAL_CATEGORY',
      hasStartDate: false,
      hasEndDate: false
    };

    this.unitParameterService.create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.resetForm();
          this.isSubmitting = false;
          this.showSuccess('Catégorie ajoutée avec succès');
          this.loadCategories();
        },
        error: () => {
          this.error = 'Erreur lors de l\'ajout';
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }

  supprimerCategorie(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette catégorie ?')) return;
    this.unitParameterService.delete(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Catégorie supprimée');
          if (this.categories.length === 1 && this.currentPage > 0) this.currentPage--;
          this.loadCategories();
        },
        error: () => { this.error = 'Erreur lors de la suppression'; this.cdr.markForCheck(); }
      });
  }

  modifierCategorie(category: UnitParameter): void {
    this.editingCategory = category;
    this.editForm = { label: category.label, code: category.code };
    this.formErrors = {};
  }

  sauvegarderModification(): void {
    if (!this.editingCategory || !this.validateForm(this.editForm)) return;

    const payload: UnitParameter = {
      ...this.editingCategory,
      label: this.editForm.label.trim(),
      code: this.editForm.code.trim().toUpperCase(),
      type: 'MATERIAL_CATEGORY'
    };

    this.unitParameterService.update(this.editingCategory.id!, payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.annulerModification();
          this.showSuccess('Catégorie mise à jour');
          this.loadCategories();
        },
        error: () => { this.error = 'Erreur lors de la mise à jour'; this.cdr.markForCheck(); }
      });
  }

  annulerModification(): void {
    this.editingCategory = null;
    this.editForm = { label: '', code: '' };
    this.formErrors = {};
  }

  // Pagination
  changerPage(page: number): void {
    if (page >= 0 && page < this.totalPages && !this.isLoading) {
      this.currentPage = page;
      this.loadCategories();
    }
  }

  pagePrecedente(): void { if (!this.isFirstPage) this.changerPage(this.currentPage - 1); }
  pageSuivante(): void { if (!this.isLastPage) this.changerPage(this.currentPage + 1); }

  onPageSizeChange(event: Event): void {
    const val = parseInt((event.target as HTMLSelectElement).value, 10);
    if (!isNaN(val) && val > 0) {
      this.pageSize = val;
      this.currentPage = 0;
      this.loadCategories();
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

  // Validation
  private validateForm(formData: { label: string; code: string }): boolean {
    this.formErrors = {};
    let isValid = true;
    if (!formData.label?.trim()) { this.formErrors['label'] = 'Le libellé est requis'; isValid = false; }
    else if (formData.label.trim().length < 2) { this.formErrors['label'] = 'Au moins 2 caractères'; isValid = false; }
    if (!formData.code?.trim()) { this.formErrors['code'] = 'Le code est requis'; isValid = false; }
    else if (!/^[A-Za-z0-9_]+$/.test(formData.code.trim())) { this.formErrors['code'] = 'Lettres, chiffres et _ uniquement'; isValid = false; }
    else {
      const codeUpper = formData.code.trim().toUpperCase();
      const exists = this.categories.some(c => c.code.toUpperCase() === codeUpper && (!this.editingCategory || c.id !== this.editingCategory.id));
      if (exists) { this.formErrors['code'] = 'Ce code existe déjà'; isValid = false; }
    }
    this.cdr.markForCheck();
    return isValid;
  }

  isEditing(category: UnitParameter): boolean { return this.editingCategory?.id === category.id; }
  hasError(field: string): boolean { return !!this.formErrors[field]; }
  getError(field: string): string { return this.formErrors[field] || ''; }

  private resetForm(): void {
    this.nouvelleCategorie = { label: '', code: '' };
    this.formErrors = {};
  }

  onFormInput(field: string): void {
    if (this.formErrors[field]) { delete this.formErrors[field]; this.cdr.markForCheck(); }
  }

  clearError(): void { this.error = null; this.cdr.markForCheck(); }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => { this.successMessage = null; this.cdr.markForCheck(); }, 3000);
  }

  onKeyDown(event: KeyboardEvent, action: 'save' | 'cancel' | 'add'): void {
    if (event.key === 'Enter' && action === 'add') this.ajouterCategorie();
    else if (event.key === 'Enter' && action === 'save') this.sauvegarderModification();
    else if (event.key === 'Escape' && action === 'cancel') this.annulerModification();
  }

  trackByCategory(index: number, category: UnitParameter): string { return category.id || index.toString(); }

  refreshCategories(): void { this.currentPage = 0; this.loadCategories(); }
}