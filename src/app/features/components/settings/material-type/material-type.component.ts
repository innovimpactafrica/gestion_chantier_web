import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MaterialTypeService, MaterialType } from '../../../../../services/material-type.service';
import { environment } from '../../../../../environments/environment';

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

  // Formulaire ajout
  newType = { nameFr: '', nameEn: '' };
  newIconFile: File | null = null;
  newIconPreview: string | null = null;
  newIconBase64: string = '';
  formErrors: { [key: string]: string } = {};

  // Formulaire édition
  editingType: MaterialType | null = null;
  editForm = { nameFr: '', nameEn: '' };
  editIconFile: File | null = null;
  editIconPreview: string | null = null;
  editIconBase64: string = '';

  // Modal suppression
  showDeleteModal = false;
  typeToDelete: MaterialType | null = null;

  private destroy$ = new Subject<void>();

  constructor(
    public materialTypeService: MaterialTypeService,
    private cdr: ChangeDetectorRef
  ) {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.applyFilter(term));
  }

  ngOnInit(): void { this.loadTypes(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ─── Chargement ────────────────────────────────────────────────────────────

  loadTypes(): void {
    this.isLoading = true;
    this.error = null;
    this.materialTypeService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
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

  clearSearch(): void { this.searchTerm = ''; this.searchSubject.next(''); }

  // ─── Upload icône (ajout) ───────────────────────────────────────────────────

  onNewIconSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error = 'Veuillez sélectionner une image (PNG, JPG, SVG)';
      this.cdr.markForCheck();
      return;
    }
    this.newIconFile = file;
    this.readFileAsBase64(file).then(b64 => {
      this.newIconBase64 = b64;
      this.newIconPreview = `data:${file.type};base64,${b64}`;
      this.cdr.markForCheck();
    });
  }

  removeNewIcon(): void {
    this.newIconFile = null;
    this.newIconPreview = null;
    this.newIconBase64 = '';
    this.cdr.markForCheck();
  }

  // ─── Upload icône (édition) ─────────────────────────────────────────────────

  onEditIconSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      this.error = 'Veuillez sélectionner une image (PNG, JPG, SVG)';
      this.cdr.markForCheck();
      return;
    }
    this.editIconFile = file;
    this.readFileAsBase64(file).then(b64 => {
      this.editIconBase64 = b64;
      this.editIconPreview = `data:${file.type};base64,${b64}`;
      this.cdr.markForCheck();
    });
  }

  removeEditIcon(): void {
    this.editIconFile = null;
    this.editIconPreview = null;
    this.editIconBase64 = '';
    this.cdr.markForCheck();
  }

  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // result = "data:image/png;base64,XXXX" → on extrait juste la partie base64
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─── CRUD ──────────────────────────────────────────────────────────────────

  ajouterType(): void {
    if (!this.validateForm(this.newType)) return;
    this.isSubmitting = true;
    this.materialTypeService.create({
      nameFr: this.newType.nameFr.trim(),
      nameEn: this.newType.nameEn.trim(),
      iconFile: this.newIconBase64 || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.newType = { nameFr: '', nameEn: '' };
        this.removeNewIcon();
        this.formErrors = {};
        this.isSubmitting = false;
        this.showSuccess('Type de matériau ajouté avec succès');
        this.loadTypes();
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.error || err?.message || 'Erreur lors de l\'ajout';
        this.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  modifierType(type: MaterialType): void {
    this.editingType = type;
    this.editForm = { nameFr: type.nameFr, nameEn: type.nameEn };
    this.editIconFile = null;
    this.editIconPreview = null;
    this.editIconBase64 = '';
    this.formErrors = {};
    this.cdr.markForCheck();
  }

  sauvegarderModification(): void {
    if (!this.editingType || !this.validateForm(this.editForm)) return;
    this.isSubmitting = true;
    this.materialTypeService.update(this.editingType.id, {
      nameFr: this.editForm.nameFr.trim(),
      nameEn: this.editForm.nameEn.trim(),
      existingIconPath: this.editingType.iconPath,
      iconFile: this.editIconBase64 || undefined
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.annulerModification();
        this.showSuccess('Type mis à jour');
        this.loadTypes();
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.error || err?.message || 'Erreur lors de la mise à jour';
        this.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
        this.isSubmitting = false;
        this.cdr.markForCheck();
      }
    });
  }

  annulerModification(): void {
    this.editingType = null;
    this.editForm = { nameFr: '', nameEn: '' };
    this.editIconFile = null;
    this.editIconPreview = null;
    this.editIconBase64 = '';
    this.formErrors = {};
    this.cdr.markForCheck();
  }

  supprimerType(type: MaterialType): void { this.typeToDelete = type; this.showDeleteModal = true; }

  confirmDelete(): void {
    if (!this.typeToDelete) return;
    this.isSubmitting = true;
    this.materialTypeService.deleteType(this.typeToDelete.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.showSuccess('Type supprimé');
        this.closeDeleteModal();
        this.loadTypes();
      },
      error: (err: any) => {
        const msg = err?.error?.message || err?.error || err?.message || 'Erreur lors de la suppression';
        this.error = typeof msg === 'string' ? msg : JSON.stringify(msg);
        this.isSubmitting = false;
        this.closeDeleteModal();
        this.cdr.markForCheck();
      }
    });
  }

  closeDeleteModal(): void { this.showDeleteModal = false; this.typeToDelete = null; }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  isEditing(type: MaterialType): boolean { return this.editingType?.id === type.id; }
  hasError(field: string): boolean { return !!this.formErrors[field]; }
  getError(field: string): string { return this.formErrors[field] || ''; }
  onFormInput(field: string): void { if (this.formErrors[field]) { delete this.formErrors[field]; this.cdr.markForCheck(); } }
  clearError(): void { this.error = null; this.cdr.markForCheck(); }
  trackByType(_: number, type: MaterialType): number { return type.id; }
  refreshTypes(): void { this.loadTypes(); }

  onIconError(event: Event, type: MaterialType): void {
    const img = event.target as HTMLImageElement;
    // Try API endpoint as fallback if filebaseUrl failed
    const apiUrl = `${environment.apiBaseUrl}/api/material-types/icon/${type.iconPath}`;
    if (img.src !== apiUrl) {
      img.src = apiUrl;
    } else {
      img.style.display = 'none';
    }
  }

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
}
