import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';

// Interface pour les données du projet
export interface ProjectData {
  name?: string;
  number?: string;
  address?: string;
  price?: number;
  numberOfRooms?: number;
  area?: number;
  latitude?: string;
  longitude?: string;
  description?: string;
  numberOfLots?: number;
  promoterId?: number;
  moaId?: number;
  managerId?: number;
  propertyTypeId?: number;
  plan?: File;
  hasHall?: boolean;
  hasParking?: boolean;
  hasElevator?: boolean;
  hasSwimmingPool?: boolean;
  hasGym?: boolean;
  hasPlayground?: boolean;
  hasSecurityService?: boolean;
  hasGarden?: boolean;
  hasSharedTerrace?: boolean;
  hasBicycleStorage?: boolean;
  hasLaundryRoom?: boolean;
  hasStorageRooms?: boolean;
  hasWasteDisposalArea?: boolean;
  mezzanine?: boolean;
  startDate?: string; // Format MM-DD-YYYY
  endDate?: string;   // Format MM-DD-YYYY
}

// Interface pour la réponse de l'API
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message: string;
  error?: string;
}

// Interface pour la validation
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private readonly baseURL = 'https://wakana.online';
  private readonly endpoint = '/api/realestate/save';

  constructor(
    private http: HttpClient,
    private authService: AuthService // Injectez AuthService
  ) {}

  /**
   * Crée un nouveau projet immobilier
   */
  createProject(projectData: ProjectData): Observable<ApiResponse> {
    // Validation des données avant envoi
    const validation = this.validateProjectData(projectData);
    if (!validation.isValid) {
      return throwError(() => new Error(`Erreurs de validation: ${validation.errors.join(', ')}`));
    }

    // Création du FormData
    const formData = this.buildFormData(projectData);

    // Récupérer les headers d'authentification
    const headers = this.authService.getAuthHeaders();

    return this.http.post<any>(`${this.baseURL}${this.endpoint}`, formData, { headers })
      .pipe(
        map(response => ({
          success: true,
          data: response,
          message: 'Projet créé avec succès'
        } as ApiResponse)),
        catchError(this.handleError)
      );
  }


  /**
   * Construit le FormData à partir des données du projet
   * @param projectData - Les données du projet
   * @returns FormData - Données formatées pour l'API
   */
  private buildFormData(projectData: ProjectData): FormData {
    const formData = new FormData();

    // Liste de tous les champs possibles
    const stringFields = ['name', 'number', 'address', 'latitude', 'longitude', 'description', 'startDate', 'endDate'];
    const numberFields = ['price', 'numberOfRooms', 'area', 'numberOfLots', 'promoterId', 'moaId', 'managerId', 'propertyTypeId'];
    const booleanFields = [
      'hasHall', 'hasParking', 'hasElevator', 'hasSwimmingPool', 'hasGym', 'hasPlayground',
      'hasSecurityService', 'hasGarden', 'hasSharedTerrace', 'hasBicycleStorage', 'hasLaundryRoom',
      'hasStorageRooms', 'hasWasteDisposalArea', 'mezzanine'
    ];

    // Ajouter les champs string
    stringFields.forEach(field => {
      const value = (projectData as any)[field];
      if (value !== undefined && value !== null && value !== '') {
        formData.append(field, value.toString());
      }
    });

    // Ajouter les champs number
    numberFields.forEach(field => {
      const value = (projectData as any)[field];
      if (value !== undefined && value !== null) {
        formData.append(field, value.toString());
      }
    });

    // Ajouter les champs boolean
    booleanFields.forEach(field => {
      const value = (projectData as any)[field];
      if (value !== undefined && value !== null) {
        formData.append(field, value.toString());
      }
    });

    // Traitement spécial pour le fichier plan
    if (projectData.plan && projectData.plan instanceof File) {
      formData.append('plan', projectData.plan, projectData.plan.name);
    }

    return formData;
  }

  /**
   * Valide les données du projet
   * @param projectData - Les données à valider
   * @returns ValidationResult - Résultat de la validation
   */
  validateProjectData(projectData: ProjectData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validation des champs requis
    if (!projectData.name || projectData.name.trim() === '') {
      errors.push('Le nom du projet est requis');
    }

    if (!projectData.address || projectData.address.trim() === '') {
      errors.push('L\'adresse du projet est requise');
    }

    // Validation des valeurs numériques
    if (projectData.price !== undefined && projectData.price < 0) {
      errors.push('Le prix ne peut pas être négatif');
    }

    if (projectData.numberOfRooms !== undefined && projectData.numberOfRooms < 0) {
      errors.push('Le nombre de pièces ne peut pas être négatif');
    }

    if (projectData.area !== undefined && projectData.area <= 0) {
      errors.push('La surface doit être positive');
    }

    if (projectData.numberOfLots !== undefined && projectData.numberOfLots <= 0) {
      errors.push('Le nombre de lots doit être positif');
    }

    // Validation du format des dates (MM-DD-YYYY)
    const dateRegex = /^\d{2}-\d{2}-\d{4}$/;
    if (projectData.startDate && !dateRegex.test(projectData.startDate)) {
      errors.push('La date de début doit être au format MM-DD-YYYY');
    }

    if (projectData.endDate && !dateRegex.test(projectData.endDate)) {
      errors.push('La date de fin doit être au format MM-DD-YYYY');
    }

    // Validation logique des dates
    if (projectData.startDate && projectData.endDate) {
      const start = new Date(projectData.startDate);
      const end = new Date(projectData.endDate);
      if (end <= start) {
        errors.push('La date de fin doit être postérieure à la date de début');
      }
    }

    // Validation des IDs
    const idFields = ['promoterId', 'moaId', 'managerId', 'propertyTypeId'];
    idFields.forEach(field => {
      const value = (projectData as any)[field];
      if (value !== undefined && (!Number.isInteger(value) || value <= 0)) {
        errors.push(`${field} doit être un entier positif`);
      }
    });

    // Validation du fichier plan
    if (projectData.plan) {
      if (!(projectData.plan instanceof File)) {
        errors.push('Le plan doit être un fichier valide');
      } else {
        // Vérification de la taille du fichier (par exemple, max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (projectData.plan.size > maxSize) {
          warnings.push('Le fichier plan est très volumineux (>10MB)');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Formate une date au format MM-DD-YYYY
   * @param date - Date à formater
   * @returns string - Date formatée
   */
  formatDate(date: Date): string {
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  }

  /**
   * Parse une date au format MM-DD-YYYY
   * @param dateString - Chaîne de date à parser
   * @returns Date - Date parsée
   */
  parseDate(dateString: string): Date {
    const [month, day, year] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  /**
   * Gère les erreurs HTTP
   * @param error - Erreur HTTP
   * @returns Observable - Erreur formatée
   */
  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur inconnue s\'est produite';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur client: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Erreur serveur: ${error.status} - ${error.message}`;
      
      // Essayer d'extraire le message d'erreur du serveur
      if (error.error && typeof error.error === 'object') {
        if (error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error.error) {
          errorMessage = error.error.error;
        }
      }
    }

    console.error('Erreur dans ProjectService:', errorMessage);
    
    return throwError(() => ({
      success: false,
      error: errorMessage,
      message: 'Échec de la création du projet'
    } as ApiResponse));
  };

  /**
   * Crée un projet avec des données d'exemple
   * @returns Observable<ApiResponse> - Réponse de l'API
   */
  createSampleProject(): Observable<ApiResponse> {
    const sampleData: ProjectData = {
      name: "Résidence Les Jardins",
      number: "PRJ001",
      address: "123 Avenue des Champs, Dakar",
      price: 75000000,
      numberOfRooms: 3,
      area: 85.5,
      latitude: "14.6937",
      longitude: "-17.4441",
      description: "Magnifique résidence avec vue sur mer",
      numberOfLots: 50,
      promoterId: 1,
      moaId: 1,
      managerId: 1,
      propertyTypeId: 1,
      hasHall: true,
      hasParking: true,
      hasElevator: true,
      hasSwimmingPool: false,
      hasGym: true,
      hasPlayground: true,
      hasSecurityService: true,
      hasGarden: true,
      hasSharedTerrace: false,
      hasBicycleStorage: true,
      hasLaundryRoom: true,
      hasStorageRooms: true,
      hasWasteDisposalArea: true,
      mezzanine: false,
      startDate: this.formatDate(new Date('2024-01-15')),
      endDate: this.formatDate(new Date('2025-12-31'))
    };

    return this.createProject(sampleData);
  }
}