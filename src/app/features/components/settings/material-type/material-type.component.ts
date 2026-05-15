import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MaterialTypeService, MaterialType } from '../../../../../services/material-type.service';

@Component({
  selector: 'app-material-type',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './material-type.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MaterialTypeComponent implements OnInit, OnDestroy {
  types: MaterialType[] = [];
  filteredTypes: MaterialType[] = [];

  isLoading = false;
  isSubmitting = false;

  searchTerm = '';
  private searchSubject = new Subject<string>();

  error: string | null = null;
  successMessage: string | null = null;

  newType = { nameFr: '', nameEn: '' };
  formErrors: { [key: string]: string } = {};

  editingType: MaterialType | null = null;
  editForm = { nameFr: '', nameEn: '' };

  showDeleteModal = false;
  typeToDelete: MaterialType | null = null;

  readonly Math = Math;
  private destroy$ = new Subject<void>();

  constructor(
    private materialTypeService: MaterialTypeService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.applyFilter(term);
    });
  }

  ngOnInit(): void {
    this.loadTypes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadTypes(): void {
    this.isLoading = true;
    this.error = null;
    this.materialTypeService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.types = data;
          this.applyFilter(this.searchTerm);
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.error = 'Erreur lors du chargement des types de matériaux';
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private applyFilter(term: string): void {
    const q = term.toLowerCase().trim();
    this.filteredTypes = q
      ? this.types.filter(t => t.nameFr.toLowerCase().includes(q) || t.nameEn.toLowerCase().includes(q))
      : [...this.types];
    this.cdr.markForCheck();
  }

  onSearchChange(event: Event): void {
    this.searchTerm = (event.target as HTMLInputElement).value;
    this.searchSubject.next(this.searchTerm);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.searchSubject.next('');
  }

  ajouterType(): void {
    if (!this.validateForm(this.newType)) return;
    this.isSubmitting = true;
    this.materialTypeService.create({ nameFr: this.newType.nameFr.trim(), nameEn: this.newType.nameEn.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.newType = { nameFr: '', nameEn: '' };
          this.formErrors = {};
          this.isSubmitting = false;
          this.showSuccess('Type de matériau ajouté avec succès');
          this.loadTypes();
        },
        error: () => {
          this.error = 'Erreur lors de l\'ajout';
          this.isSubmitting = false;
          this.cdr.markForCheck();
        }
      });
  }

  modifierType(type: MaterialType): void {
    this.editingType = type;
    this.editForm = { nameFr: type.nameFr, nameEn: type.nameEn };
    this.formErrors = {};
  }

  sauvegarderModification(): void {
    if (!this.editingType || !this.validateForm(this.editForm)) return;
    this.materialTypeService.update(this.editingType.id, { nameFr: this.editForm.nameFr.trim(), nameEn: this.editForm.nameEn.trim() })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.annulerModification();
          this.showSuccess('Type mis à jour avec succès');
          this.loadTypes();
        },
        error: () => { this.error = 'Erreur lors de la mise à jour'; this.cdr.markForCheck(); }
      });
  }

  annulerModification(): void {
    this.editingType = null;
    this.editForm = { nameFr: '', nameEn: '' };
    this.formErrors = {};
  }

  supprimerType(type: MaterialType): void {
    this.typeToDelete = type;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (!this.typeToDelete) return;
    this.materialTypeService.deleteType(this.typeToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Type supprimé');
          this.closeDeleteModal();
          this.loadTypes();
        },
        error: () => {
          this.error = 'Erreur lors de la suppression';
          this.closeDeleteModal();
          this.cdr.markForCheck();
        }
      });
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.typeToDelete = null;
  }

  isEditing(type: MaterialType): boolean {
    return this.editingType?.id === type.id;
  }

  hasError(field: string): boolean { return !!this.formErrors[field]; }
  getError(field: string): string { return this.formErrors[field] || ''; }

  onFormInput(field: string): void {
    if (this.formErrors[field]) { delete this.formErrors[field]; this.cdr.markForCheck(); }
  }

  clearError(): void { this.error = null; this.cdr.markForCheck(); }

  private showSuccess(msg: string): void {
    this.successMessage = msg;
    this.cdr.markForCheck();
    setTimeout(() => { this.successMessage = null; this.cdr.markForCheck(); }, 3000);
  }

  private validateForm(data: { nameFr: string; nameEn: string }): boolean {
    this.formErrors = {};
    let valid = true;
    if (!data.nameFr?.trim()) { this.formErrors['nameFr'] = 'Le nom français est requis'; valid = false; }
    else if (data.nameFr.trim().length < 2) { this.formErrors['nameFr'] = 'Au moins 2 caractères'; valid = false; }
    if (!data.nameEn?.trim()) { this.formErrors['nameEn'] = 'Le nom anglais est requis'; valid = false; }
    else if (data.nameEn.trim().length < 2) { this.formErrors['nameEn'] = 'Au moins 2 caractères'; valid = false; }
    this.cdr.markForCheck();
    return valid;
  }

  trackByType(_: number, type: MaterialType): number { return type.id; }
  refreshTypes(): void { this.loadTypes(); }
}
