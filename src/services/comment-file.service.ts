import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../src/environments/environment';

// Interface pour la réponse de joinFile()
export interface JoinFileResponse {
  id: number;
  libelle: string;
  filePath: string;
}

// Interface pour Type de document
export interface DocumentType {
  id: number;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: string;
  hibernateLazyInitializer?: any;
}

// Interface pour un document/commentaire
export interface Document {
  id: number;
  title: string;
  file: string;
  description: string;
  type: DocumentType;
  startDate: number[];
  endDate: number[];
}

// Interface pour Pageable (pagination)
export interface Pageable {
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
}

// Interface pour la réponse paginée de getComment()
export interface DocumentsResponse {
  content: Document[];
  pageable: Pageable;
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

// Interface pour l'ajout d'un document
export interface AddDocumentRequest {
  title: string;
  file: File;
  description: string;
  realEstatePropertyId: number;
  typeId: number;
  startDate?: string; // format: dd-MM-yyyy
  endDate?: string;   // format: dd-MM-yyyy
}

@Injectable({
  providedIn: 'root'
})
export class CommentFileService {
  private apiUrl = `${environment.apiUrl}`;

  constructor(private http: HttpClient) { }

  /**
   * Joindre un fichier à une tâche
   * @param taskId ID de la tâche
   * @param libelle Libellé du fichier
   * @param file Fichier à uploader
   */
  joinFile(taskId: number, libelle: string, file: File): Observable<JoinFileResponse> {
    const formData = new FormData();
    formData.append('libelle', libelle);
    formData.append('file', file);

    return this.http.post<JoinFileResponse>(
      `${this.apiUrl}/tasks/${taskId}/documents`,
      formData
    );
  }

  /**
   * Récupérer les documents d'une propriété
   * @param propertyId ID de la propriété
   * @param page Numéro de page (optionnel, par défaut 0)
   * @param size Taille de la page (optionnel, par défaut 10)
   */
  getComment(propertyId: number, page: number = 0, size: number = 10): Observable<DocumentsResponse> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    return this.http.get<DocumentsResponse>(
      `${this.apiUrl}/documents/property/${propertyId}`,
      { params }
    );
  }

  /**
   * Ajouter un nouveau document/commentaire
   * @param documentData Données du document à ajouter
   */
  addComment(documentData: AddDocumentRequest): Observable<Document> {
    const formData = new FormData();
    
    // Ajouter les champs obligatoires
    formData.append('title', documentData.title);
    formData.append('file', documentData.file);
    formData.append('description', documentData.description);
    formData.append('realEstatePropertyId', documentData.realEstatePropertyId.toString());
    formData.append('typeId', documentData.typeId.toString());
    
    // Ajouter les dates optionnelles si présentes
    if (documentData.startDate) {
      formData.append('startDate', documentData.startDate);
    }
    
    if (documentData.endDate) {
      formData.append('endDate', documentData.endDate);
    }

    return this.http.post<Document>(
      `${this.apiUrl}/documents/add`,
      formData
    );
  }

  /**
   * Récupérer l'URL complète d'un fichier pour l'affichage/téléchargement
   * @param fileName Nom du fichier
   */
  getFileUrl(fileName: string): string {
    return `${this.apiUrl}/files/${fileName}`;
  }
}