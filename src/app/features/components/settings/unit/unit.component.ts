import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { UnitParameterService, UpdateUnitParameterRequest } from '../../../../core/services/unite-parametre.service';
import { UnitParameter, PaginatedResponse } from '../../../../models/unit-parameter';

@Component({
  selector: 'app-unites-mesure',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './unit.component.html',
  styleUrls: ['./unit.component.css']
})
export class UnitComponent implements OnInit, OnDestroy {
  uniteForm!: FormGroup;
  unites: UnitParameter[] = [];
  paginatedUnits: PaginatedResponse<UnitParameter> | null = null;
  
  loading = false;
  modeEdition = false;
  uniteEnEdition: UnitParameter | null = null;
  
  private subscription: Subscription = new Subscription();

  // Pagination
  currentPage = 0;
  pageSize = 10;
  pageSizeOptions = [5, 10, 20, 50];

  // Messages
  successMessage = '';
  error = '';

  constructor(
    private fb: FormBuilder,
    private unitParameterService: UnitParameterService
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.chargerUnites();
    this.souscrireAuxUnites();
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  // ========== INITIALISATION ==========

  private initForm(): void {
    this.uniteForm = this.fb.group({
      label: ['', [Validators.required, Validators.minLength(2)]],
      code: ['', [Validators.required, Validators.minLength(1)]],
      hasStartDate: [false],
      hasEndDate: [false]
    });
  }

  // ========== CHARGEMENT DES DONNÉES ==========

  private chargerUnites(): void {
    this.loading = true;
    this.unitParameterService.getUnits({ 
      page: this.currentPage, 
      size: this.pageSize 
    });
  }

  private souscrireAuxUnites(): void {
    this.subscription.add(
      this.unitParameterService.units$.subscribe({
        next: (paginatedData) => {
          if (paginatedData) {
            this.paginatedUnits = paginatedData;
            this.unites = paginatedData.content;
          }
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des unités:', error);
          this.afficherErreur('Erreur lors du chargement des unités');
          this.loading = false;
        }
      })
    );
  }

  // ========== GESTION DU FORMULAIRE ==========

  onSubmit(): void {
    if (!this.uniteForm.valid) {
      this.uniteForm.markAllAsTouched();
      return;
    }

    if (this.modeEdition && this.uniteEnEdition) {
      this.modifierUnite();
    } else {
      this.ajouterUnite();
    }
  }

  private ajouterUnite(): void {
    this.loading = true;

    const nouvelleUnite = {
      label: this.uniteForm.value.label.trim(),
      code: this.uniteForm.value.code.trim(),
      hasStartDate: this.uniteForm.value.hasStartDate || false,
      hasEndDate: this.uniteForm.value.hasEndDate || false
    };

    this.subscription.add(
      this.unitParameterService.addUnit(nouvelleUnite).subscribe({
        next: () => {
          this.afficherSucces('Unité ajoutée avec succès');
          this.resetForm();
          this.rafraichir();
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout:', error);
          this.afficherErreur('Erreur lors de l\'ajout de l\'unité');
          this.loading = false;
        }
      })
    );
  }

  private modifierUnite(): void {
    if (!this.uniteEnEdition?.id) {
      return;
    }

    this.loading = true;

    const uniteModifiee: UpdateUnitParameterRequest = {
      label: this.uniteForm.value.label.trim(),
      code: this.uniteForm.value.code.trim(),
      hasStartDate: this.uniteForm.value.hasStartDate || false,
      hasEndDate: this.uniteForm.value.hasEndDate || false,
      type: 'UNIT'
    };

    this.subscription.add(
      this.unitParameterService.modifierParametre(this.uniteEnEdition.id, uniteModifiee).subscribe({
        next: () => {
          this.afficherSucces('Unité modifiée avec succès');
          this.annulerEdition();
        },
        error: (error) => {
          console.error('Erreur lors de la modification:', error);
          this.afficherErreur('Erreur lors de la modification de l\'unité');
          this.loading = false;
        }
      })
    );
  }

  supprimerUnite(id: string): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette unité ?')) {
      return;
    }

    this.loading = true;

    this.subscription.add(
      this.unitParameterService.supprimerParametre(id, 'UNIT').subscribe({
        next: () => {
          this.afficherSucces('Unité supprimée avec succès');
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.afficherErreur('Erreur lors de la suppression de l\'unité');
          this.loading = false;
        }
      })
    );
  }

  // ========== GESTION DE L'ÉDITION ==========

  commencerEdition(unite: UnitParameter): void {
    this.modeEdition = true;
    this.uniteEnEdition = unite;
    
    this.uniteForm.patchValue({
      label: unite.label,
      code: unite.code,
      hasStartDate: unite.hasStartDate || false,
      hasEndDate: unite.hasEndDate || false
    });

    // Scroll vers le formulaire
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  annulerEdition(): void {
    this.modeEdition = false;
    this.uniteEnEdition = null;
    this.resetForm();
  }

  private resetForm(): void {
    this.uniteForm.reset({
      label: '',
      code: '',
      hasStartDate: false,
      hasEndDate: false
    });
    this.uniteForm.markAsUntouched();
  }

  // ========== PAGINATION ==========

  changerPage(page: number): void {
    if (page < 0 || page >= this.totalPages || this.loading) {
      return;
    }
    this.currentPage = page;
    this.chargerUnites();
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
    this.chargerUnites();
  }

  rafraichir(): void {
    this.currentPage = 0;
    this.chargerUnites();
  }

  // ========== HELPERS ==========

  trackByFn(index: number, item: UnitParameter): string {
    return item.id || index.toString();
  }

  private afficherSucces(message: string): void {
    this.successMessage = message;
    this.error = '';
    setTimeout(() => {
      this.successMessage = '';
    }, 3000);
  }

  private afficherErreur(message: string): void {
    this.error = message;
    this.successMessage = '';
    setTimeout(() => {
      this.error = '';
    }, 5000);
  }

  // ========== GETTERS POUR LE TEMPLATE ==========

  get label() {
    return this.uniteForm.get('label');
  }

  get code() {
    return this.uniteForm.get('code');
  }

  get isFormValid(): boolean {
    return this.uniteForm.valid;
  }

  get submitButtonText(): string {
    if (this.loading) {
      return this.modeEdition ? 'Modification...' : 'Ajout...';
    }
    return this.modeEdition ? 'Enregistrer' : 'Ajouter';
  }

  get totalElements(): number {
    return this.paginatedUnits?.totalElements || 0;
  }

  get totalPages(): number {
    return this.paginatedUnits?.totalPages || 0;
  }

  get isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  get isLastPage(): boolean {
    return this.paginatedUnits ? this.paginatedUnits.last : true;
  }

  get paginationInfo(): string {
    if (!this.paginatedUnits) {
      return 'Aucune unité';
    }
    const start = this.currentPage * this.pageSize + 1;
    const end = Math.min(start + this.pageSize - 1, this.totalElements);
    return `${start} - ${end} sur ${this.totalElements} unité(s)`;
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