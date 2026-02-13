import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ProjectBudgetService, Document, DocumentType, CreateDocumentRequest, DocumentsResponse, DocumentTypesResponse } from '../../../services/project-details.service';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';
import { PdfIconComponent } from '../../shared/components/pdf-icon/pdf-icon.component';

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


  constructor(
    private projectBudgetService: ProjectBudgetService,
    private route: ActivatedRoute,
    public languageService: LanguageService
  ) { }

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
          console.error('ID de propriété invalide:', idParam);
        }
      } else {
        console.error('Aucun ID de propriété dans l\'URL');
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
    this.projectBudgetService.getDocuments(this.currentPropertyId, 0, 50).subscribe({
      next: (response: DocumentsResponse) => {
        this.documents = response.content || [];
        this.transformDocumentsForDisplay();
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur chargement documents', err);
        this.isLoading = false;
      }
    });
  }

  loadDocumentTypes(): void {
    this.projectBudgetService.getDocumentsType().subscribe({
      next: (response: DocumentTypesResponse) => {
        this.documentTypes = response.content || [];
      },
      error: (err) => console.error('Erreur types documents', err)
    });
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
      error: (err) => {
        console.error('Erreur suppression document', err);
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
      error: (err) => {
        console.error('Erreur sauvegarde', err);
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
    return `${this.getBaseFile()}${fileName}`;
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