import { ProjectBudgetService } from './../../../services/project-details.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// Interfaces pour les documents (à définir localement si pas dans le service)
interface DocumentType {
  id: number;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: string;
}

interface Document {
  id: number;
  title: string;
  file: string;
  description: string;
  type: DocumentType | null;
  startDate: number[];
  endDate: number[];
}

interface DocumentsResponse {
  content: Document[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  first: boolean;
  empty: boolean;
}

interface DocumentTypesResponse {
  content: DocumentType[];
}

interface CreateDocumentRequest {
  title: string;
  file: string;
  description: string;
  realEstatePropertyId: number;
  typeId: number;
  startDate: string; // format dd-MM-yyyy
  endDate: string; // format dd-MM-yyyy
}

interface Person {
  name: string;
  role: string;
  avatar: string;
}

interface FileDisplay {
  id: number;
  name: string;
  selected: boolean;
  createdBy: Person;
  size: string;
  date: string;
  lastModified: string;
  description: string;
  thumbnail: string;
}

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  currentPropertyId = 19; // Vous pouvez recevoir cet ID via les paramètres de route

  // Formulaire pour nouveau document
  newDocument: CreateDocumentRequest = {
    title: '',
    file: '',
    description: '',
    realEstatePropertyId: this.currentPropertyId,
    typeId: 0,
    startDate: '',
    endDate: ''
  };

  constructor(private projectBudgetService: ProjectBudgetService) { }

  ngOnInit(): void {
    this.loadDocuments();
    this.loadDocumentTypes();
  }

  loadDocuments(): void {
    this.isLoading = true;
    this.projectBudgetService.getDocuments(this.currentPropertyId, 0, 20).subscribe({
      next: (response: DocumentsResponse) => {
        this.documents = response.content;
        this.transformDocumentsForDisplay();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des documents:', error);
        this.isLoading = false;
      }
    });
  }

  loadDocumentTypes(): void {
    this.projectBudgetService.getDocumentsType().subscribe({
      next: (response: DocumentTypesResponse) => {
        this.documentTypes = response.content;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des types de documents:', error);
      }
    });
  }

  transformDocumentsForDisplay(): void {
    const mockPersons: Person[] = [
      { name: 'Lamine Niang', role: 'Chef de chantier', avatar: 'assets/images/av2.svg' },
      { name: 'Amine Sene', role: 'Chef de chantier', avatar: 'assets/images/av9.svg' },
      { name: 'Aziz Diop', role: 'Chef de chantier', avatar: 'assets/images/av1.svg' },
      { name: 'Alpha Dieye', role: 'Chef de chantier', avatar: 'assets/images/av3.png' }
    ];

    // Transformer les 4 premiers documents pour les activités récentes
    this.recentActivities = this.documents.slice(0, 4).map((doc, index) => ({
      id: doc.id,
      name: doc.title,
      selected: false,
      createdBy: mockPersons[index % mockPersons.length],
      size: this.getRandomSize(),
      date: this.formatDate(doc.startDate),
      lastModified: this.formatDate(doc.endDate),
      description: doc.description,
      thumbnail: this.getDocumentThumbnail(doc.file)
    }));

    // Transformer tous les documents pour la liste des fichiers
    this.recentFiles = this.documents.map((doc, index) => ({
      id: doc.id,
      name: doc.title,
      selected: false,
      createdBy: mockPersons[index % mockPersons.length],
      size: this.getRandomSize(),
      date: this.formatDate(doc.startDate),
      lastModified: this.formatDate(doc.endDate),
      description: doc.description,
      thumbnail: this.getDocumentThumbnail(doc.file)
    }));
  }

  getDocumentThumbnail(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const thumbnails = [
      'assets/images/doc1.png',
      'assets/images/doc2.png',
      'assets/images/doc3.png',
      'assets/images/doc4.png'
    ];
    
    return thumbnails[Math.floor(Math.random() * thumbnails.length)];
  }

  getRandomSize(): string {
    const sizes = ['30 MB', '45 MB', '120 MB', '675 MB', '208 MB', '18 MB'];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }

  toggleFileSelection(file: FileDisplay): void {
    file.selected = !file.selected;
  }

  openAddDocumentModal(): void {
    this.showAddDocumentModal = true;
    this.resetForm();
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
      realEstatePropertyId: this.currentPropertyId,
      typeId: 0,
      startDate: '',
      endDate: ''
    };
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      // Ici vous pouvez implémenter l'upload du fichier
      // Pour l'instant, on utilise juste le nom du fichier
      this.newDocument.file = file.name;
    }
  }

  saveDocument(): void {
    if (this.isFormValid()) {
      this.isLoading = true;
      this.projectBudgetService.saveDocument(this.newDocument).subscribe({
        next: (response: Document) => {
          console.log('Document créé avec succès:', response);
          this.loadDocuments(); // Recharger la liste
          this.closeAddDocumentModal();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la création du document:', error);
          this.isLoading = false;
        }
      });
    }
  }

  isFormValid(): boolean {
    return !!(
      this.newDocument.title.trim() &&
      this.newDocument.description.trim() &&
      this.newDocument.file &&
      this.newDocument.typeId &&
      this.newDocument.startDate &&
      this.newDocument.endDate
    );
  }
}