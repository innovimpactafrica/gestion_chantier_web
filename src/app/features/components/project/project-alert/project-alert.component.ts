import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../../../core/services/language.service';
import { ProjectBudgetService, Signalement, SignalementResponse, CreateSignalementRequest } from '../../../../../services/project-details.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-project-alert',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-alert.component.html',
  styleUrl: './project-alert.component.css'
})
export class ProjectAlertComponent implements OnInit {
  signalements: Signalement[] = [];
  filteredSignalements: Signalement[] = [];
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 5;
  totalElements: number = 0;
  totalPages: number = 0;
  loading: boolean = false;
  propertyId!: number;

  baseUrl = environment.filebaseUrl; // ✨ Base URL for images

  // Ajout de confirmation suppression
  showDeleteConfirmModal: boolean = false;
  signalementIdToDelete: number | null = null;

  // Ajout modal photo
  showPhotoModal: boolean = false;
  selectedSignalementForPhotos: Signalement | null = null;

  // Ajout modal ajout
  showAddModal: boolean = false;
  newSignalement: CreateSignalementRequest = {
    title: '',
    description: '',
    propertyId: 0,
    pictures: []
  };

  Math: any = Math;

  constructor(
    private projectBudgetService: ProjectBudgetService,
    private route: ActivatedRoute,
    public languageService: LanguageService
  ) { }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnInit(): void {
    this.getPropertyIdFromRoute();
  }

  // ... (existing code)

  openPhotoModal(signalement: Signalement) {
    this.selectedSignalementForPhotos = signalement;
    this.showPhotoModal = true;
  }

  closePhotoModal() {
    this.showPhotoModal = false;
    this.selectedSignalementForPhotos = null;
  }

  private getPropertyIdFromRoute(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.propertyId = +idFromUrl;
      this.newSignalement.propertyId = this.propertyId;
      this.loadSignalements();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
      // Gérer l'erreur ou rediriger
    }
  }

  loadSignalements(): void {
    this.loading = true;
    this.projectBudgetService.getSignalement(this.propertyId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: SignalementResponse) => {
          this.signalements = response.content;
          this.filteredSignalements = [...this.signalements];
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des signalements:', error);
          this.loading = false;
        }
      });
  }

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
    return date.toLocaleDateString('fr-FR');
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredSignalements = [...this.signalements];
    } else {
      this.filteredSignalements = this.signalements.filter(signalement =>
        signalement.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (signalement.description && signalement.description.toLowerCase().includes(this.searchTerm.toLowerCase()))
      );
    }
  }

  // Gestion des fichiers
  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            this.newSignalement.pictures.push(e.target.result);
          };
          reader.readAsDataURL(file);
        }
      });
    }
  }

  removeImage(index: number): void {
    this.newSignalement.pictures.splice(index, 1);
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.newSignalement = {
      title: '',
      description: '',
      propertyId: this.propertyId,
      pictures: []
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  addSignalement(): void {
    if (!this.newSignalement.title.trim() || !this.newSignalement.description.trim()) {
      return;
    }

    this.loading = true;

    const formData = new FormData();
    formData.append('title', this.newSignalement.title.trim());
    formData.append('description', this.newSignalement.description.trim());
    formData.append('propertyId', this.newSignalement.propertyId.toString());

    if (this.newSignalement.pictures.length > 0) {
      this.newSignalement.pictures.forEach((picture: string, index: number) => {
        if (picture.startsWith('data:image/')) {
          try {
            const base64Data = picture.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteNumbers = new Array(byteCharacters.length);

            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }

            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray]);

            const mimeType = picture.match(/data:(.*);base64/)?.[1] || 'image/png';
            const fileExtension = mimeType.split('/')[1] || 'png';

            const file = new File([blob], `signalement_${Date.now()}_${index}.${fileExtension}`, {
              type: mimeType
            });

            formData.append('pictures', file);
          } catch (error) {
            console.error('Erreur conversion image:', error);
            formData.append('pictures', picture);
          }
        } else {
          formData.append('pictures', picture);
        }
      });
    } else {
      formData.append('pictures', '');
    }

    this.projectBudgetService.saveSignalementWithFormData(formData)
      .subscribe({
        next: () => {
          this.loadSignalements();
          this.closeAddModal();
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur:', error);
          this.loading = false;
          this.showError('Erreur lors de l\'ajout du signalement');
        }
      });
  }

  showError(message: string): void {
    // Implémentez votre système de notification
    alert(message);
  }

  // Méthodes de pagination améliorées
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadSignalements();
    }
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadSignalements();
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;

    let startPage = Math.max(0, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);

    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(0, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadSignalements();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadSignalements();
    }
  }

  // Méthodes de confirmation suppression
  openDeleteConfirmModal(id: number): void {
    this.signalementIdToDelete = id;
    this.showDeleteConfirmModal = true;
  }

  cancelDelete(): void {
    this.signalementIdToDelete = null;
    this.showDeleteConfirmModal = false;
  }

  confirmDelete(): void {
    if (this.signalementIdToDelete !== null) {
      this.loading = true;
      this.projectBudgetService.deleteSignalement(this.signalementIdToDelete).subscribe({
        next: () => {
          this.loadSignalements();
          this.showDeleteConfirmModal = false;
          this.signalementIdToDelete = null;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression :', error);
          this.loading = false;
          this.showDeleteConfirmModal = false;
        }
      });
    }
  }

  editSignalement(signalement: Signalement): void {
    console.log('Édition du signalement:', signalement);
  }
}