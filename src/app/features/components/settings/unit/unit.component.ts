import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup, FormControl } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { UnitParameterService, UnitParameter, PaginatedResponse, PaginationParams } from '../../../../core/services/unite-parametre.service';
import { CommonModule } from '@angular/common';
import { DeleteConfirmationModalComponent } from '../../../../shared/components/delete-confirmation-modal/delete-confirmation-modal.component';

@Component({
  selector: 'app-unites-mesure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, DeleteConfirmationModalComponent],
  templateUrl: './unit.component.html',
  styleUrls: ['./unit.component.css']
})
export class UnitComponent implements OnInit, OnDestroy {
  // Formulaire
  uniteForm: FormGroup;
  
  // État de l'application
  unites: UnitParameter[] = [];
  filteredUnites: UnitParameter[] = [];
  uniteEnEdition: UnitParameter | null = null;
  modeEdition = false;
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  
  // Modal de suppression
  showDeleteModal = false;
  uniteToDelete: string | null = null;
  
  // Recherche
  searchTerm = '';
  private searchSubject = new Subject<string>();
  
  // Pagination
  currentPage = 0;
  pageSize = 4;
  totalElements = 0;
  totalPages = 0;
  isLastPage = false;
  isFirstPage = true;
  
  readonly pageSizeOptions = [5, 10, 20, 50];
  
  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private unitParameterService: UnitParameterService
  ) {
    this.uniteForm = this.createForm();
  }

  ngOnInit(): void {
    this.initializeSearchListener();
    this.chargerUnites();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      label: new FormControl('', [Validators.required, Validators.minLength(2)]),
      code: new FormControl('', [Validators.required, Validators.minLength(1)])
    });
  }

  private initializeSearchListener(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      this.performSearch(term);
    });
  }

  chargerUnites(): void {
    this.loading = true;
    this.error = null;
    
    this.unitParameterService.getAll({ page: this.currentPage, size: this.pageSize, type: 'UNIT' })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<UnitParameter> | null) => {
          this.loading = false;
          if (response) {
            this.updatePaginationState(response);
            this.applyLocalFilter();
          }
        },
        error: (error) => {
          this.loading = false;
          this.handleError('Erreur lors du chargement des unités', error);
        }
      });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchTerm = target.value;
    this.searchSubject.next(this.searchTerm);
  }

  private performSearch(term: string): void {
    this.applyLocalFilter();
  }

  private applyLocalFilter(): void {
    if (!this.searchTerm.trim()) {
      this.filteredUnites = [...this.unites];
    } else {
      const term = this.searchTerm.toLowerCase().trim();
      this.filteredUnites = this.unites.filter(unite =>
        unite.label.toLowerCase().includes(term) ||
        unite.code.toLowerCase().includes(term)
      );
    }
  }

  onSubmit(): void {
    if (this.uniteForm.valid && !this.loading) {
      const formValue = this.uniteForm.value;
      this.loading = true;
      this.error = null;
      this.successMessage = null;

      if (this.modeEdition && this.uniteEnEdition) {
        this.modifierUnite(formValue);
      } else {
        this.ajouterUnite(formValue);
      }
    } else {
      this.markFormGroupTouched(this.uniteForm);
    }
  }

  private ajouterUnite(unite: any): void {
    const payload: UnitParameter = { ...unite, type: 'UNIT', hasStartDate: false, hasEndDate: false };
    this.unitParameterService.create(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (newUnite) => {
          console.log('✅ Unité ajoutée:', newUnite);
          this.loading = false;
          this.showSuccessMessage('Unité ajoutée avec succès');
          this.resetForm();
          this.chargerUnites();
        },
        error: (error) => {
          this.loading = false;
          this.handleError('Erreur lors de l\'ajout de l\'unité', error);
        }
      });
  }

  private modifierUnite(unite: any): void {
    if (this.uniteEnEdition?.id) {
      const { id: _id, ...restOfUnit } = this.uniteEnEdition;
      const payload: UnitParameter = { ...restOfUnit, ...unite, type: 'UNIT', hasStartDate: false, hasEndDate: false };
      this.unitParameterService.update(this.uniteEnEdition.id, payload)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Unité modifiée avec succès');
            this.loading = false;
            this.showSuccessMessage('Unité modifiée avec succès');
            this.resetForm();
            this.chargerUnites();
          },
          error: (error) => {
            this.loading = false;
            this.handleError('Erreur lors de la modification de l\'unité', error);
          }
        });
    }
  }

  commencerEdition(unite: UnitParameter): void {
    this.uniteEnEdition = unite;
    this.modeEdition = true;
    this.successMessage = null;
    this.error = null;
    
    this.uniteForm.patchValue({
      label: unite.label,
      code: unite.code
    });

    // Scroll vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  supprimerUnite(id: string): void {
    this.uniteToDelete = id;
    this.showDeleteModal = true;
  }

  confirmDelete(): void {
    if (this.uniteToDelete && !this.loading) {
      this.loading = true;
      this.error = null;
      
      this.unitParameterService.delete(this.uniteToDelete)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            console.log('✅ Unité supprimée avec succès');
            this.loading = false;
            this.showSuccessMessage('Unité supprimée avec succès');
            if (this.uniteEnEdition?.id === this.uniteToDelete) {
              this.resetForm();
            }
            this.closeDeleteModal();
            this.chargerUnites();
          },
          error: (error) => {
            this.loading = false;
            this.handleError('Erreur lors de la suppression de l\'unité', error);
            this.closeDeleteModal();
          }
        });
    }
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.uniteToDelete = null;
  }

  annulerEdition(): void {
    this.resetForm();
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = parseInt(target.value, 10);
    if (!isNaN(newSize) && newSize > 0) {
      this.pageSize = newSize;
      this.currentPage = 0;
      this.chargerUnites();
    }
  }

  changerPage(page: number): void {
    if (page >= 0 && page < this.totalPages && !this.loading) {
      this.currentPage = page;
      this.chargerUnites();
    }
  }

  pagePrecedente(): void {
    if (!this.isFirstPage) {
      this.changerPage(this.currentPage - 1);
    }
  }

  pageSuivante(): void {
    if (!this.isLastPage) {
      this.changerPage(this.currentPage + 1);
    }
  }

  rafraichir(): void {
    if (!this.loading) {
      this.searchTerm = '';
      this.currentPage = 0;
      this.chargerUnites();
    }
  }

  // === MÉTHODES UTILITAIRES ===

  private resetForm(): void {
    this.uniteForm.reset({
      label: '',
      code: ''
    });
    this.uniteForm.markAsUntouched();
    this.uniteForm.markAsPristine();
    this.uniteEnEdition = null;
    this.modeEdition = false;
    this.error = null;
  }

  private updatePaginationState(response: PaginatedResponse<UnitParameter>): void {
    this.unites = response.content;
    this.currentPage = response.number;
    this.pageSize = response.size;
    this.totalElements = response.totalElements;
    this.totalPages = response.totalPages;
    this.isFirstPage = response.first;
    this.isLastPage = response.last;
  }

  private handleError(message: string, error: any): void {
    this.error = message;
    console.error('❌ Erreur:', error);
    setTimeout(() => {
      this.error = null;
    }, 5000);
  }

  private showSuccessMessage(message: string): void {
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = null;
    }, 3000);
  }



  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
      if (control instanceof FormGroup) {
        this.markFormGroupTouched(control);
      }
    });
  }

  // === GETTERS ===

  get label() { return this.uniteForm.get('label'); }
  get code() { return this.uniteForm.get('code'); }

  get paginationInfo(): string {
    if (this.totalElements === 0) return '0 éléments';
    const debut = this.currentPage * this.pageSize + 1;
    const fin = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
    return `${debut}-${fin} sur ${this.totalElements}`;
  }

  get pagesDisponibles(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(0, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  get isFormValid(): boolean {
    return this.uniteForm.valid && !this.loading;
  }

  get submitButtonText(): string {
    if (this.loading) {
      return this.modeEdition ? 'Modification...' : 'Ajout...';
    }
    return this.modeEdition ? 'Modifier' : 'Ajouter';
  }

  trackByFn(index: number, item: UnitParameter): string {
    return item.id || index.toString();
  }
}