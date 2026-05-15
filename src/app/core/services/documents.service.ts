import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
// import { UnitParameterService, UnitParameter } from './unit-parameter.service';
import { UnitParameter,UnitParameterService } from './unite-parametre.service';

export interface DocumentModel {
  id?: string;
  libelle: string;
  exigeDateDebut: boolean;
  exigeDateFin: boolean;
  dateDebut?: Date | string;
  dateFin?: Date | string;
}

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  
  constructor(private unitParameterService: UnitParameterService) {}

  /**
   * Récupère tous les documents
   */
  // getDocuments(): Observable<DocumentModel[]> {
  //   return this.unitParameterService.documents$.pipe(
  //     map(unitParameters => this.mapToDocumentModels(unitParameters))
  //   );
  // }

  /**
   * Ajoute un nouveau document
   */
  addDocument(document: Omit<DocumentModel, 'id'>): void {
    const unitParameter: Omit<UnitParameter, 'id' | 'type'> = {
      label: document.libelle,
      code: this.generateCode(document.libelle),
      hasStartDate: document.exigeDateDebut,
      hasEndDate: document.exigeDateFin
    };

    // this.unitParameterService.addDocument(unitParameter);
  }

  /**
   * Met à jour un document existant
   */
  updateDocument(id: string, document: Partial<DocumentModel>): void {
    const updateData: Partial<UnitParameter> = {};
    
    if (document.libelle !== undefined) {
      updateData.label = document.libelle;
      updateData.code = this.generateCode(document.libelle);
    }
    
    if (document.exigeDateDebut !== undefined) {
      updateData.hasStartDate = document.exigeDateDebut;
    }
    
    if (document.exigeDateFin !== undefined) {
      updateData.hasEndDate = document.exigeDateFin;
    }

    // this.unitParameterService.updateDocument(id, updateData);
  }

  /**
   * Supprime un document
   */
  deleteDocument(id: string): void {
    // this.unitParameterService.deleteDocument(id);
  }

  /**
   * Récupère un document par son ID
   */
  // getDocumentById(id: string): Observable<DocumentModel | undefined> {
  //   return this.getDocuments().pipe(
  //     map(documents => documents.find(doc => doc.id === id))
  //   );
  // }

  /**
   * Convertit les UnitParameter en DocumentModel
   */
  private mapToDocumentModels(unitParameters: UnitParameter[]): DocumentModel[] {
    return unitParameters.map(param => ({
      id: param.id,
      libelle: param.label,
      exigeDateDebut: param.hasStartDate,
      exigeDateFin: param.hasEndDate,
      // Les dates seront gérées plus tard si nécessaire
      dateDebut: undefined,
      dateFin: undefined
    }));
  }

  /**
   * Génère un code à partir du libellé
   */
  private generateCode(libelle: string): string {
    return libelle
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .toUpperCase();
  }

  /**
   * Vérifie si un document existe déjà avec le même libellé
   */
  // documentExists(libelle: string, excludeId?: string): Observable<boolean> {
  //   return this.getDocuments().pipe(
  //     map(documents => 
  //       documents.some(doc => 
  //         doc.libelle.toLowerCase() === libelle.toLowerCase() && 
  //         doc.id !== excludeId
  //       )
  //     )
  //   );
  // }

  /**
   * Recherche des documents par libellé
   */
  // searchDocuments(searchTerm: string): Observable<DocumentModel[]> {
  //   return this.getDocuments().pipe(
  //     map(documents => 
  //       documents.filter(doc => 
  //         doc.libelle.toLowerCase().includes(searchTerm.toLowerCase())
  //       )
  //     )
  //   );
  // }
}