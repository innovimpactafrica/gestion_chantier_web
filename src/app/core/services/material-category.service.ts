import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { UnitParameter,UnitParameterService } from './unite-parametre.service';

export interface MaterialCategory {
  id?: string;
  libelle: string;
  createdAt?: Date;
  updatedAt?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class MaterialCategoryService {
  
  constructor(private unitParameterService: UnitParameterService) {}

  /**
   * Récupère toutes les catégories de matériaux
   */
  // getCategories(): Observable<MaterialCategory[]> {
  //   return this.unitParameterService.materialCategories$.pipe(
  //     map(unitParameters => this.mapToMaterialCategories(unitParameters))
  //   );
  // }

  /**
   * Ajoute une nouvelle catégorie de matériau
   */
  addCategory(category: Omit<MaterialCategory, 'id' | 'createdAt' | 'updatedAt'>): void {
    const unitParameter: Omit<UnitParameter, 'id' | 'type'> = {
      label: category.libelle,
      code: this.generateCode(category.libelle),
      hasStartDate: false, // Les catégories de matériaux n'ont pas de dates par défaut
      hasEndDate: false
    };

    // this.unitParameterService.addMaterialCategory(unitParameter);
  }

  /**
   * Met à jour une catégorie de matériau existante
   */
  updateCategory(id: string, category: Partial<MaterialCategory>): void {
    const updateData: Partial<UnitParameter> = {};
    
    if (category.libelle !== undefined) {
      updateData.label = category.libelle;
      updateData.code = this.generateCode(category.libelle);
    }

    // this.unitParameterService.updateMaterialCategory(id, updateData);
  }

  /**
   * Supprime une catégorie de matériau
   */
  deleteCategory(id: string): void {
    // this.unitParameterService.deleteMaterialCategory(id);
  }

  /**
   * Récupère une catégorie par son ID
   */
  // getCategoryById(id: string): Observable<MaterialCategory | undefined> {
  //   return this.getCategories().pipe(
  //     map(categories => categories.find(cat => cat.id === id))
  //   );
  // }

  /**
   * Convertit les UnitParameter en MaterialCategory
   */
  private mapToMaterialCategories(unitParameters: UnitParameter[]): MaterialCategory[] {
    return unitParameters.map(param => ({
      id: param.id,
      libelle: param.label,
      // Les dates seront gérées par l'API backend
      createdAt: undefined,
      updatedAt: undefined
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
   * Vérifie si une catégorie existe déjà avec le même libellé
   */
  // categoryExists(libelle: string, excludeId?: string): Observable<boolean> {
  //   return this.getCategories().pipe(
  //     map(categories => 
  //       categories.some(cat => 
  //         cat.libelle.toLowerCase() === libelle.toLowerCase() && 
  //         cat.id !== excludeId
  //       )
  //     )
  //   );
  // }

  /**
   * Recherche des catégories par libellé
   */
  // searchCategories(searchTerm: string): Observable<MaterialCategory[]> {
  //   return this.getCategories().pipe(
  //     map(categories => 
  //       categories.filter(cat => 
  //         cat.libelle.toLowerCase().includes(searchTerm.toLowerCase())
  //       )
  //     )
  //   );
  // }

  /**
   * Récupère les catégories triées par libellé
   */
  // getCategoriesSorted(): Observable<MaterialCategory[]> {
  //   return this.getCategories().pipe(
  //     map(categories => 
  //       [...categories].sort((a, b) => a.libelle.localeCompare(b.libelle))
  //     )
  //   );
  // }
}