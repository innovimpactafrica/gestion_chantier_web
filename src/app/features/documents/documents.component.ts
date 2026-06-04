import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProjectBudgetService, Document, DocumentType, CreateDocumentRequest, DocumentsResponse, DocumentTypesResponse } from '../../../services/project-details.service';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import { ToastService } from '../../core/services/toast.service';
import { PdfIconComponent } from '../../shared/components/pdf-icon/pdf-icon.component';
import { FileDownloadService } from '../../../services/file-download.service';

interface FileDisplay {
  id: number;
  name: string;
  selected: boolean;
  createdBy: { name: string; role: string; avatar: string }; // On garde la structure mais sans avatars réels
  size: string;
  date: string;
  lastModified: string;
  description: string;
  thumbnail: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule, PdfIconComponent],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {
  documents: Document[] = [];
  documentTypes: DocumentType[] = [];
  recentActivities: FileDisplay[] = [];
  recentFiles: FileDisplay[] = [];

  isLoading = false;
  showAddDocumentModal = false;

  searchQuery: string = '';
  selectedStatus: string = '';
  selectedTypeFilter: number = 0; // Filter by document type

  // Pagination
  currentPage: number = 0;
  pageSize: number = 3;
  totalElements: number = 0;
  totalPages: number = 0;

  currentPropertyId: number | null = null;
  selectedFile: File | null = null;

  newDocument: CreateDocumentRequest = {
    title: '',
    file: '',
    description: '',
    realEstatePropertyId: 0,
    typeId: 0,
    startDate: '',
    endDate: ''
  };

  documentToDelete: number | null = null;
  showDeleteConfirmModal = false;

  // Type de document sélectionné pour affichage conditionnel des dates
  selectedDocumentType: DocumentType | null = null;

  // Pour le select personnalisé des types de documents
  showTypeDropdown: boolean = false;
  typeSearchQuery: string = '';
  maxVisibleTypes: number = 4;


  constructor(
    private projectBudgetService: ProjectBudgetService,
    private route: ActivatedRoute,
    public languageService: LanguageService,
    private fileDownloadService: FileDownloadService,
    private toastService: ToastService
  ) { }

  // Make Math available to template
  Math = Math;

  t(key: string, params?: { [key: string]: string | number }): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      if (idParam) {
        const id = +idParam;
        if (!isNaN(id) && id > 0) {
          this.currentPropertyId = id;
          this.newDocument.realEstatePropertyId = id;
          this.loadDocuments();
          this.loadDocumentTypes();
        } else {
        }
      } else {
      }
    });
  }
  openDeleteConfirmModal(docId: number): void {
    this.documentToDelete = docId;
    this.showDeleteConfirmModal = true;
  }

  closeDeleteConfirmModal(): void {
    this.showDeleteConfirmModal = false;
    this.documentToDelete = null;
  }

  // ────────────────────────────────────────────────
  // CHARGEMENT DES DONNÉES
  // ────────────────────────────────────────────────

  loadDocuments(): void {
    if (!this.currentPropertyId) return;

    this.isLoading = true;
    this.projectBudgetService.getDocuments(this.currentPropertyId, this.currentPage, this.pageSize).subscribe({
      next: (response: DocumentsResponse) => {
        this.documents = response.content || [];
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.transformDocumentsForDisplay();
        this.isLoading = false;
      },
      error: (_err) => {
        this.isLoading = false;
      }
    });
  }

  // Pagination methods
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadDocuments();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadDocuments();
    }
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadDocuments();
    }
  }

  onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.pageSize = parseInt(select.value, 10);
    this.currentPage = 0;
    this.loadDocuments();
  }

  getDocPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(0, this.currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(this.totalPages, start + maxVisible);
    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible);
    }
    for (let i = start; i < end; i++) {
      pages.push(i);
    }
    return pages;
  }

  goToPageInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const page = parseInt(input.value, 10) - 1;
    if (page >= 0 && page < this.totalPages) {
      this.goToPage(page);
    }
  }

  // Filter methods
  onSearchChange(): void {
    this.currentPage = 0;
    this.loadDocuments();
  }

  onTypeFilterChange(): void {
    this.currentPage = 0;
    this.loadDocuments();
  }

  loadDocumentTypes(): void {
    this.projectBudgetService.getDocumentsType().subscribe({
      next: (response: DocumentTypesResponse) => {
        this.documentTypes = response.content || [];
      },
      error: (_err) => { }
    });
  }

  /**
   * Gère le changement de type de document pour affichage conditionnel des dates
   */
  onDocumentTypeChange(): void {
    // Convertir typeId en nombre si c'est une string
    const typeId = typeof this.newDocument.typeId === 'string'
      ? parseInt(this.newDocument.typeId, 10)
      : this.newDocument.typeId;


    if (typeId && typeId > 0) {
      this.selectedDocumentType = this.documentTypes.find(t => t.id === typeId) || null;


      // Réinitialiser les dates si le type ne les supporte pas
      if (this.selectedDocumentType) {
        if (!this.selectedDocumentType.hasStartDate) {
          this.newDocument.startDate = '';
        }
        if (!this.selectedDocumentType.hasEndDate) {
          this.newDocument.endDate = '';
        }
      }
    } else {
      this.selectedDocumentType = null;
    }
  }

  /**
   * Vérifie si le champ "Date début" doit être affiché
   */
  shouldShowStartDate(): boolean {
    const result = this.selectedDocumentType?.hasStartDate === true;
    return result;
  }

  /**
   * Vérifie si le champ "Date fin" doit être affiché
   */
  shouldShowEndDate(): boolean {
    const result = this.selectedDocumentType?.hasEndDate === true;
    return result;
  }

  /**
   * Filtre les types de documents selon la recherche
   */
  getFilteredDocumentTypes(): DocumentType[] {
    if (!this.typeSearchQuery) {
      return this.documentTypes;
    }
    return this.documentTypes.filter(t =>
      t.label.toLowerCase().includes(this.typeSearchQuery.toLowerCase())
    );
  }

  /**
   * Sélectionne un type de document
   */
  selectDocumentType(type: DocumentType): void {
    this.newDocument.typeId = type.id;
    this.showTypeDropdown = false;
    this.typeSearchQuery = '';
    this.onDocumentTypeChange();
  }

  /**
   * Récupère le nom du type sélectionné
   */
  getSelectedTypeName(): string {
    if (!this.newDocument.typeId || this.newDocument.typeId === 0) {
      return this.t('documents.chooseType');
    }
    const type = this.documentTypes.find(t => t.id === this.newDocument.typeId);
    return type ? type.label : this.t('documents.chooseType');
  }

  /**
   * Bascule l'affichage du dropdown
   */
  toggleTypeDropdown(): void {
    this.showTypeDropdown = !this.showTypeDropdown;
  }

  /**
   * Ferme le dropdown des types
   */
  closeTypeDropdown(): void {
    this.showTypeDropdown = false;
  }

  // ────────────────────────────────────────────────
  // TRANSFORMATION POUR AFFICHAGE (Activités + Fichiers récents)
  // ────────────────────────────────────────────────

  private transformDocumentsForDisplay(): void {
    // Pour les activités récentes : on prend les 4 derniers documents
    this.recentActivities = this.documents.slice(0, 4).map(doc => ({
      id: doc.id,
      name: doc.title,
      selected: false,
      createdBy: { name: 'Utilisateur', role: 'Projet', avatar: 'assets/images/default-avatar.png' }, // fallback
      size: '—', // pas dans l'API → à implémenter si backend renvoie la taille
      date: this.formatDate(doc.startDate),
      lastModified: this.formatDate(doc.endDate || doc.startDate),
      description: doc.description,
      thumbnail: this.getFileUrl(doc.file) // on utilise l'image réelle si c'est une image, sinon icône
    }));

    // Pour la liste complète des fichiers récents
    this.recentFiles = this.documents.map(doc => ({
      id: doc.id,
      name: doc.title,
      selected: false,
      createdBy: { name: 'Utilisateur', role: 'Projet', avatar: 'assets/images/default-avatar.png' },
      size: '—',
      date: this.formatDate(doc.startDate),
      lastModified: this.formatDate(doc.endDate || doc.startDate),
      description: doc.description,
      thumbnail: this.getFileUrl(doc.file)
    }));
  }

  confirmDelete(): void {
    if (!this.documentToDelete) return;

    this.isLoading = true;
    this.projectBudgetService.deleteDocument(this.documentToDelete).subscribe({
      next: () => {
        this.loadDocuments();
        this.closeDeleteConfirmModal();
        this.isLoading = false;
      },
      error: (_err) => {
        alert('Erreur lors de la suppression');
        this.isLoading = false;
        this.closeDeleteConfirmModal();
      }
    });
  }

  // ────────────────────────────────────────────────
  // FORMATAGE DATES
  // ────────────────────────────────────────────────

  formatDate(dateArray: number[] | undefined): string {
    if (!dateArray || dateArray.length < 3) return '—';
    try {
      const [year, month, day] = dateArray;
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    } catch {
      return '—';
    }
  }

  // ────────────────────────────────────────────────
  // GESTION FICHIER UPLOAD
  // ────────────────────────────────────────────────

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      const file = input.files[0];
      this.selectedFile = file;
      this.newDocument.file = file.name;
    }
  }

  triggerFileInput(): void {
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    fileInput?.click();
  }

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.newDocument.file = '';
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  }

  getFileSize(file: File | null): string {
    if (!file) return '—';
    const bytes = file.size;
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ────────────────────────────────────────────────
  // VALIDATION & SAUVEGARDE
  // ────────────────────────────────────────────────

  isFormValid(): boolean {
    return !!(
      this.newDocument.title?.trim() &&
      this.newDocument.description?.trim() &&
      this.newDocument.typeId > 0 &&
      this.newDocument.startDate &&
      this.newDocument.endDate &&
      this.selectedFile
    );
  }

  saveDocument(): void {
    if (!this.isFormValid() || !this.currentPropertyId) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    this.isLoading = true;

    const formData = new FormData();
    formData.append('title', this.newDocument.title.trim());
    formData.append('description', this.newDocument.description.trim());
    formData.append('realEstatePropertyId', this.currentPropertyId.toString());
    formData.append('typeId', this.newDocument.typeId.toString());
    formData.append('startDate', this.formatDateForBackend(this.newDocument.startDate));
    formData.append('endDate', this.formatDateForBackend(this.newDocument.endDate));

    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }

    this.projectBudgetService.saveDocument(formData).subscribe({
      next: () => {
        this.loadDocuments();
        this.closeAddDocumentModal();
        this.isLoading = false;
      },
      error: (_err) => {
        alert('Erreur lors de l\'enregistrement');
        this.isLoading = false;
      }
    });
  }

  private formatDateForBackend(date: string): string {
    if (!date) return '';
    const [year, month, day] = date.split('-');
    return `${day}-${month}-${year}`;
  }

  // ────────────────────────────────────────────────
  // TABLEAU SÉLECTION
  // ────────────────────────────────────────────────

  toggleFileSelection(file: FileDisplay): void {
    file.selected = !file.selected;
  }

  // ────────────────────────────────────────────────
  // MODAL
  // ────────────────────────────────────────────────

  openAddDocumentModal(): void {
    if (!this.currentPropertyId) {
      alert('Aucun projet sélectionné');
      return;
    }
    this.resetForm();
    this.showAddDocumentModal = true;
  }
  // Dans DocumentsComponent.ts

  getAvatarUrl(avatar: string | undefined): string {
    // Si avatar existe et n'est pas vide → on l'utilise
    if (avatar && avatar.trim() !== '') {
      return avatar;
    }
    // Sinon → image par défaut
    return 'assets/images/profil.png';
  }
  closeAddDocumentModal(): void {
    this.showAddDocumentModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.newDocument = {
      title: '',
      file: '',
      description: '',
      realEstatePropertyId: this.currentPropertyId || 0,
      typeId: 0,
      startDate: '',
      endDate: ''
    };
    this.selectedFile = null;
  }

  // ────────────────────────────────────────────────
  // URL + ICÔNES
  // ────────────────────────────────────────────────

  getBaseFile(): string {
    return environment.filebaseUrl;
  }

  getFileUrl(fileName: string): string {
    return this.fileDownloadService.buildUrl(fileName);
  }

  /**
   * Télécharge un document directement sur l'appareil via fetch+blob.
   * Ne redirige pas l'utilisateur et n'expose pas l'URL publique.
   */
  downloadDocument(doc: Document): void {
    if (!doc?.file) return;
    const safeName = doc.title
      ? doc.title.replace(/[^a-z0-9_\-\.]/gi, '_') + '.' + (doc.file.split('.').pop() || 'bin')
      : doc.file;
    this.fileDownloadService.downloadFile(doc.file, safeName);
  }

  getDocumentIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    const icons: Record<string, string> = {
      pdf: 'assets/icons/pdf.svg',
      doc: 'assets/icons/word.svg',
      docx: 'assets/icons/word.svg',
      xls: 'assets/icons/excel.svg',
      xlsx: 'assets/icons/excel.svg',
      jpg: 'assets/icons/image.svg',
      jpeg: 'assets/icons/image.svg',
      png: 'assets/icons/image.svg',
      gif: 'assets/icons/image.svg'
    };
    return icons[ext] || 'assets/icons/file.svg';
  }

  // Helper methods for file type detection
  isPDF(filename: string): boolean {
    if (!filename) return false;
    const extension = filename.toLowerCase().split('.').pop();
    return extension === 'pdf';
  }

  isImage(filename: string): boolean {
    if (!filename) return false;
    const extension = filename.toLowerCase().split('.').pop();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(extension || '');
  }
}