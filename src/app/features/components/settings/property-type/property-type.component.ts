import { Component, OnInit } from '@angular/core';
import { PropertyTypeService, PropertyType, PropertyTypeRequest } from '../../../../core/services/property-type.service';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-property-type',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './property-type.component.html',
  styleUrl: './property-type.component.css'
})
export class PropertyTypeComponent implements OnInit {
  propertyTypes: PropertyType[] = [];
  typeForm!: FormGroup;
  
  // États
  loading = false;
  error: string | null = null;
  successMessage: string | null = null;
  modeEdition = false;
  typeEnEdition: PropertyType | null = null;
  
  // Pagination
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  pageSizeOptions = [5, 10, 20, 50];
  
  // Modal de suppression
  showDeleteModal = false;
  typeToDelete: PropertyType | null = null;

  constructor(
    private propertyTypeService: PropertyTypeService,
    private fb: FormBuilder
  ) {
    this.initForm();
  }

  ngOnInit(): void {
    this.chargerTypes();
  }

  private initForm(): void {
    this.typeForm = this.fb.group({
      typeName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      parent: [true]
    });
  }

  // Getters pour la validation
  get typeName() {
    return this.typeForm.get('typeName');
  }

  get parent() {
    return this.typeForm.get('parent');
  }

  get isFormValid(): boolean {
    return this.typeForm.valid && !this.loading;
  }

  get submitButtonText(): string {
    if (this.loading) return 'Chargement...';
    return this.modeEdition ? 'Modifier' : 'Ajouter';
  }

  get paginationInfo(): string {
    if (this.totalElements === 0) return 'Aucun type de bien';
    const debut = this.currentPage * this.pageSize + 1;
    const fin = Math.min((this.currentPage + 1) * this.pageSize, this.totalElements);
    return `${debut} - ${fin} sur ${this.totalElements} type${this.totalElements > 1 ? 's' : ''}`;
  }

  get isFirstPage(): boolean {
    return this.currentPage === 0;
  }

  get isLastPage(): boolean {
    return this.currentPage >= this.totalPages - 1;
  }

  get pagesDisponibles(): number[] {
    const pages: number[] = [];
    const maxPages = 5;
    let debut = Math.max(0, this.currentPage - Math.floor(maxPages / 2));
    let fin = Math.min(this.totalPages, debut + maxPages);
    
    if (fin - debut < maxPages) {
      debut = Math.max(0, fin - maxPages);
    }
    
    for (let i = debut; i < fin; i++) {
      pages.push(i);
    }
    return pages;
  }

  chargerTypes(): void {
    this.loading = true;
    this.error = null;
    
    // ✅ Utiliser getAll() qui retourne tous les types sans pagination
    this.propertyTypeService.getAll().subscribe({
      next: (allTypes: PropertyType[]) => {
        // 📊 Calculer la pagination côté frontend
        this.totalElements = allTypes.length;
        this.totalPages = Math.ceil(allTypes.length / this.pageSize);
        
        // 📄 Extraire la page courante
        const startIndex = this.currentPage * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        this.propertyTypes = allTypes.slice(startIndex, endIndex);
        
        this.loading = false;
        
        console.log('✅ Types chargés:', allTypes.length, 'types au total');
        console.log('📄 Page actuelle:', this.currentPage + 1, '/', this.totalPages);
        console.log('📋 Types affichés:', this.propertyTypes.length);
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des types de biens';
        console.error('❌ Erreur:', err);
        this.loading = false;
      }
    });
  }

  onSubmit(): void {
    if (!this.isFormValid) return;

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const formData: PropertyTypeRequest = this.typeForm.value;

    if (this.modeEdition && this.typeEnEdition?.id) {
      // Mise à jour
      this.propertyTypeService.update(this.typeEnEdition.id, formData).subscribe({
        next: () => {
          this.successMessage = 'Type de bien modifié avec succès';
          this.resetForm();
          this.chargerTypes();
          this.autoHideMessages();
        },
        error: (err) => {
          this.error = 'Erreur lors de la modification du type';
          console.error('Erreur:', err);
          this.loading = false;
        }
      });
    } else {
      // Création
      this.propertyTypeService.create(formData).subscribe({
        next: () => {
          this.successMessage = 'Type de bien ajouté avec succès';
          this.resetForm();
          this.chargerTypes();
          this.autoHideMessages();
        },
        error: (err) => {
          this.error = 'Erreur lors de l\'ajout du type';
          console.error('Erreur:', err);
          this.loading = false;
        }
      });
    }
  }

  commencerEdition(type: PropertyType): void {
    this.modeEdition = true;
    this.typeEnEdition = type;
    this.typeForm.patchValue({
      typeName: type.typeName,
      parent: type.parent
    });
    this.error = null;
    this.successMessage = null;
  }

  annulerEdition(): void {
    this.resetForm();
  }

  ouvrirModalSuppression(type: PropertyType): void {
    this.typeToDelete = type;
    this.showDeleteModal = true;
  }

  fermerModalSuppression(): void {
    this.showDeleteModal = false;
    this.typeToDelete = null;
  }

  confirmerSuppression(): void {
    if (!this.typeToDelete?.id) return;

    this.loading = true;
    this.error = null;

    this.propertyTypeService.delete(this.typeToDelete.id).subscribe({
      next: () => {
        this.successMessage = 'Type de bien supprimé avec succès';
        this.fermerModalSuppression();
        this.chargerTypes();
        this.autoHideMessages();
      },
      error: (err) => {
        this.error = 'Erreur lors de la suppression du type';
        console.error('Erreur:', err);
        this.loading = false;
        this.fermerModalSuppression();
      }
    });
  }

  rafraichir(): void {
    this.currentPage = 0;
    this.chargerTypes();
  }

  changerPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.chargerTypes();
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

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.pageSize = parseInt(target.value, 10);
    this.currentPage = 0;
    this.chargerTypes();
  }

  trackByFn(index: number, item: PropertyType): number {
    return item.id || index;
  }

  private resetForm(): void {
    this.typeForm.reset({
      typeName: '',
      parent: true
    });
    this.modeEdition = false;
    this.typeEnEdition = null;
    this.loading = false;
  }

  private autoHideMessages(): void {
    setTimeout(() => {
      this.successMessage = null;
      this.error = null;
    }, 5000);
  }
}