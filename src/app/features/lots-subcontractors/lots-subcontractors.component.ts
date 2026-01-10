import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LotService, Lot, LotsResponse, CreateLotRequest, Subcontractor, SubcontractorsResponse } from '../../../services/lot.service';
import { AuthService } from './../../features/auth/services/auth.service';

interface LotDisplay {
  id: number;
  nom: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  statut: 'En cours' | 'En attente' | 'Planifié' | 'Terminé';
  progression: number;
  soustraitant?: {
    nom: string;
    telephone: string;
    company?: string;
  };
  statutColor: boolean;
}
interface EditLot extends LotDisplay {
  originalId: number;
  subcontractorId: number;
}

@Component({
  selector: 'app-lots-subcontractors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lots-subcontractors.component.html',
  styleUrls: ['./lots-subcontractors.component.css']
})
export class LotsSubcontractorsComponent implements OnInit {
  lots: LotDisplay[] = [];
  filteredLots: LotDisplay[] = [];
  filtreStatut: string = '';
  recherche: string = '';
  searchQuery: string = '';
  selectedStatus: string = '';
  // Property ID (récupéré depuis les paramètres de route)
  currentPropertyId: number = 0;
  
  // Pagination
  currentPage = 0;
  pageSize = 6;
  totalElements = 0;
  totalPages = 0;
  isLoading = false;
  isLoadingSubcontractors = false;
  
  // Modal state
  showCreateModal = false;
  newLot: CreateLotRequest = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    realEstatePropertyId: 0,
    subcontractorId: 0
  };
  showEditModal = false;
  editLot: LotDisplay & { 
    originalId: number;
    subcontractorId: number;
  } = {
    id: 0,
    originalId: 0,
    nom: '',
    description: '',
    dateDebut: '',
    dateFin: '',
    statut: 'En attente',
    progression: 0,
    statutColor: false,
    subcontractorId: 0
  };

  // Available subcontractors
  availableSubcontractors: { id: number, name: string, company: string, phone: string }[] = [];

  // Messages d'état
  errorMessage: string = '';
  successMessage: string = '';

  Math: any;

  constructor(
    private lotService: LotService,
    private authService: AuthService,
    private route: ActivatedRoute
  ) {
    this.Math = Math;
  }
  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.newLot.realEstatePropertyId = this.currentPropertyId;
      this.checkUserPermissions(); // Ajouter cette ligne
      this.initializeData();
    } else {
      this.errorMessage = 'ID de propriété manquant';
    }
  }
  private checkUserPermissions(): void {
    // Vérifiez si l'utilisateur a les bonnes permissions
    const userToken = this.authService.getToken();
    
    console.log('Token utilisateur:', userToken ? 'Présent' : 'Absent');
    
    if (!userToken) {
      this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
    }
  }
  private initializeData(): void {
    this.chargerLots();
    this.chargerSousTraitants();
  }

  chargerSousTraitants(): void {
    this.isLoadingSubcontractors = true;
    this.errorMessage = '';
    
    this.lotService.getSubcontractors(0, 100).subscribe({
      next: (response: SubcontractorsResponse) => {
        this.availableSubcontractors = response.content.map(sub => ({
          id: sub.id,
          name: `${sub.prenom} ${sub.nom}`,
          company: sub.company?.name || 'Indépendant',
          phone: sub.telephone
        }));
        this.isLoadingSubcontractors = false;
        console.log('Sous-traitants chargés:', this.availableSubcontractors);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des sous-traitants:', error);
        this.errorMessage = 'Erreur lors du chargement des sous-traitants';
        this.isLoadingSubcontractors = false;
        this.availableSubcontractors = [];
      }
    });
  }

  chargerLots(): void {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.lotService.getLotsByProperty(this.currentPropertyId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: LotsResponse) => {
          this.lots = this.transformLotsFromAPI(response.content);
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.filtrerLots();
          this.isLoading = false;
          console.log('Lots chargés:', this.lots);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des lots:', error);
          this.errorMessage = 'Erreur lors du chargement des lots';
          this.isLoading = false;
        }
      });
  }

  transformLotsFromAPI(apiLots: Lot[]): LotDisplay[] {
    return apiLots.map(lot => {
      const statut = this.mapStatus(lot.status);
      return {
        id: lot.id,
        nom: lot.name,
        statutColor: lot.statutColor,
        description: lot.description,
        dateDebut: this.formatDateFromAPI(lot.startDate),
        dateFin: this.formatDateFromAPI(lot.endDate),
        statut: statut,
        progression: lot.progressPercentage || 0,
        soustraitant: lot.subcontractor ? {
          nom: `${lot.subcontractor.prenom} ${lot.subcontractor.nom}`,
          telephone: lot.subcontractor.telephone
        } : undefined
      };
    });
  }

  formatDateFromAPI(dateArray: any): string {
    try {
      // Si c'est un tableau [jour, mois, année]
      if (Array.isArray(dateArray) && dateArray.length >= 3) {
        const [day, month, year] = dateArray;
        return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
      }
      
      // Si c'est une string au format "JJ-MM-AAAA"
      if (typeof dateArray === 'string' && dateArray.includes('-')) {
        const parts = dateArray.split('-');
        if (parts.length === 3) {
          const [day, month, year] = parts;
          return `${day.padStart(2, '0')}-${month.padStart(2, '0')}-${year}`;
        }
      }
      
      // Si c'est une string au format ISO (YYYY-MM-DD)
      if (typeof dateArray === 'string' && dateArray.includes('T')) {
        const date = new Date(dateArray);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
      }
      
      return 'N/A';
    } catch (error) {
      console.error('Erreur de formatage de date:', error, dateArray);
      return 'N/A';
    }
  }

  mapStatus(apiStatus: string): 'En cours' | 'En attente' | 'Planifié' | 'Terminé' {
    const statusMap: { [key: string]: any } = {
      'PENDING': 'En attente',
      'IN_PROGRESS': 'En cours',
      'PLANNED': 'Planifié',
      'COMPLETED': 'Terminé'
    };
    return statusMap[apiStatus] || 'En attente';
  }

  getStatusColor(status: string): string {
    const colorMap: { [key: string]: string } = {
      'En cours': 'bg-blue-100 text-blue-800',
      'En attente': 'bg-yellow-100 text-yellow-800',
      'Planifié': 'bg-purple-100 text-purple-800',
      'Terminé': 'bg-green-100 text-green-800'
    };
    return colorMap[status] || 'bg-gray-100 text-gray-800';
  }

  getProgressColor(progression: number): string {
    if (progression >= 100) return 'bg-green-500';
    if (progression >= 75) return 'bg-blue-500';
    if (progression >= 50) return 'bg-yellow-500';
    if (progression >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  }

  filtrerLots(): void {
    this.filteredLots = this.lots.filter(lot => {
      const matchRecherche = this.recherche === '' || 
        lot.nom.toLowerCase().includes(this.recherche.toLowerCase()) ||
        lot.description.toLowerCase().includes(this.recherche.toLowerCase()) ||
        (lot.soustraitant && 
          (lot.soustraitant.nom.toLowerCase().includes(this.recherche.toLowerCase()) || 
           lot.soustraitant.telephone.toLowerCase().includes(this.recherche.toLowerCase())));
      
      const matchStatut = this.filtreStatut === '' || lot.statut === this.filtreStatut;
      
      return matchRecherche && matchStatut;
    });
  }

  onSearchChange(): void {
    this.filtrerLots();
  }

  onStatusFilterChange(): void {
    this.filtrerLots();
  }

  // Pagination
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.chargerLots();
    }
  }

  nextPage(): void {
    this.goToPage(this.currentPage + 1);
  }

  previousPage(): void {
    this.goToPage(this.currentPage - 1);
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 0; i < this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(0, this.currentPage - 2);
      let endPage = Math.min(this.totalPages - 1, startPage + maxPagesToShow - 1);
      
      if (endPage - startPage < maxPagesToShow - 1) {
        startPage = Math.max(0, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // Modal actions
  openCreateModal(): void {
    this.resetForm();
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  private resetForm(): void {
    const today = new Date();
    const nextMonth = new Date();
    nextMonth.setMonth(today.getMonth() + 1);
    
    this.newLot = {
      name: '',
      description: '',
      startDate: this.formatDateToInput(today),
      endDate: this.formatDateToInput(nextMonth),
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: 0
    };
    this.errorMessage = '';
    this.successMessage = '';
  }
  
  private formatDateToInput(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  createLot(): void {
    this.errorMessage = '';
    this.successMessage = '';
  
    // Validation côté client
    if (!this.newLot.name.trim()) {
      this.errorMessage = 'Le nom du lot est requis';
      return;
    }
  
    if (!this.newLot.description.trim()) {
      this.errorMessage = 'La description est requise';
      return;
    }
  
    if (!this.newLot.startDate) {
      this.errorMessage = 'La date de début est requise';
      return;
    }
  
    if (!this.newLot.endDate) {
      this.errorMessage = 'La date de fin est requise';
      return;
    }
  
    if (new Date(this.newLot.startDate) >= new Date(this.newLot.endDate)) {
      this.errorMessage = 'La date de fin doit être postérieure à la date de début';
      return;
    }
  
    // Formater les dates au format JJ-MM-AAAA
    const formattedRequest: CreateLotRequest = {
      name: this.newLot.name.trim(),
      description: this.newLot.description.trim(),
      startDate: this.formatDateToDDMMYYYY(this.newLot.startDate),
      endDate: this.formatDateToDDMMYYYY(this.newLot.endDate),
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: this.newLot.subcontractorId || 0
    };
  
    console.log('Données envoyées à l\'API:', formattedRequest);
  
    this.isLoading = true;
    
    this.lotService.createLot(formattedRequest).subscribe({
      next: (response) => {
        console.log('Lot créé avec succès:', response);
        this.successMessage = 'Lot créé avec succès !';
        this.chargerLots();
        setTimeout(() => {
          this.closeCreateModal();
        }, 1500);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la création du lot:', error);
        if (error.status === 403) {
          this.errorMessage = 'Accès refusé. Vérifiez vos permissions.';
        } else {
          this.errorMessage = error.error?.message || 'Erreur lors de la création du lot';
        }
        this.isLoading = false;
      }
    });
  }
  
  // Méthode pour formater la date en JJ-MM-AAAA
  private formatDateToDDMMYYYY(dateString: string): string {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  }

  openEditModal(lot: LotDisplay): void {
    const subcontractorId = this.findSubcontractorId(lot);
  
    this.editLot = {
      ...lot, // Copie toutes les propriétés de LotDisplay
      originalId: lot.id,
      // Convertir les dates du format DD-MM-YYYY vers YYYY-MM-DD pour les inputs
      dateDebut: this.convertToInputFormat(lot.dateDebut),
      dateFin: this.convertToInputFormat(lot.dateFin),
      subcontractorId: subcontractorId
    };
    
    this.showEditModal = true;
    this.errorMessage = '';
    this.successMessage = '';
    
    console.log('Données du lot à éditer:', this.editLot);
  }
  
  // 3. Nouvelle méthode pour convertir les dates DD-MM-YYYY vers YYYY-MM-DD
  private convertToInputFormat(dateString: string): string {
    if (!dateString || dateString === 'N/A') return '';
    
    try {
      // Si la date est au format DD-MM-YYYY
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        // Convertir vers YYYY-MM-DD pour l'input HTML
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return '';
    } catch (error) {
      console.error('Erreur de conversion de date:', error);
      return '';
    }
  }

  updateLot(): void {
    this.errorMessage = '';
    this.successMessage = '';
  
    // Validation côté client identique à createLot
    if (!this.editLot.nom.trim()) {
      this.errorMessage = 'Le nom du lot est requis';
      return;
    }
  
    if (!this.editLot.description.trim()) {
      this.errorMessage = 'La description est requise';
      return;
    }
  
    if (!this.editLot.dateDebut) {
      this.errorMessage = 'La date de début est requise';
      return;
    }
  
    if (!this.editLot.dateFin) {
      this.errorMessage = 'La date de fin est requise';
      return;
    }
  
    if (new Date(this.editLot.dateDebut) >= new Date(this.editLot.dateFin)) {
      this.errorMessage = 'La date de fin doit être postérieure à la date de début';
      return;
    }
  
    // Formatage identique à la création
    const formattedRequest: CreateLotRequest = {
      name: this.editLot.nom.trim(),
      description: this.editLot.description.trim(),
      startDate: this.formatDateToDDMMYYYY(this.editLot.dateDebut),
      endDate: this.formatDateToDDMMYYYY(this.editLot.dateFin),
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: this.editLot.subcontractorId || 0
    };
  
    console.log('Données envoyées pour la modification:', formattedRequest);
    console.log('ID du lot à modifier:', this.editLot.originalId);
  
    this.isLoading = true;
    
    this.lotService.updateLot(this.editLot.originalId, formattedRequest).subscribe({
      next: (response) => {
        console.log('Lot modifié avec succès:', response);
        this.successMessage = 'Lot modifié avec succès !';
        this.chargerLots(); // Recharger les données
        setTimeout(() => {
          this.closeEditModal();
        }, 1500);
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors de la modification du lot:', error);
        this.isLoading = false;
        
        // Gestion d'erreur améliorée
        if (error.status === 403) {
          this.errorMessage = 'Accès refusé. Vous n\'avez pas les permissions nécessaires.';
        } else if (error.status === 401) {
          this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 404) {
          this.errorMessage = 'Ce lot n\'existe plus ou n\'a pas été trouvé.';
        } else if (error.status === 400) {
          this.errorMessage = error.error?.message || 'Données invalides. Vérifiez vos informations.';
        } else {
          this.errorMessage = error.error?.message || 'Erreur lors de la modification du lot';
        }
      }
    });
  }
  
  // 5. Amélioration de la méthode findSubcontractorId
  private findSubcontractorId(lot: LotDisplay): number {
    if (!lot.soustraitant) return 0;
    
    // Recherche par nom et téléphone (plus précise)
    const subcontractor = this.availableSubcontractors.find(sub => 
      sub.name === lot.soustraitant!.nom && sub.phone === lot.soustraitant!.telephone
    );
    
    if (subcontractor) {
      console.log('Sous-traitant trouvé:', subcontractor);
      return subcontractor.id;
    }
    
    // Fallback: recherche par nom uniquement
    const fallbackSub = this.availableSubcontractors.find(sub => 
      sub.name === lot.soustraitant!.nom
    );
    
    if (fallbackSub) {
      console.log('Sous-traitant trouvé (fallback):', fallbackSub);
      return fallbackSub.id;
    }
    
    console.warn('Aucun sous-traitant trouvé pour:', lot.soustraitant);
    return 0;
  }
  
  
  

  // Méthode pour fermer le modal d'édition
  closeEditModal(): void {
    this.showEditModal = false;
    this.editLot = {
      id: 0,
      originalId: 0,
      nom: '',
      description: '',
      dateDebut: '',
      dateFin: '',
      statut: 'En attente',
      progression: 0,
      statutColor: false,
      subcontractorId: 0
    };
  }

  // Méthode pour modifier un lot
  modifierLot(id: number): void {
    const lotToEdit = this.lots.find(lot => lot.id === id);
    if (lotToEdit) {
      this.openEditModal(lotToEdit);
    }
  }

  voirDocuments(id: number): void {
    console.log(`Voir les documents du lot ${id}`);
    // TODO: Implémenter la navigation vers les documents
  }

  voirCommentaires(id: number): void {
    console.log(`Voir les commentaires du lot ${id}`);
    // TODO: Implémenter la navigation vers les commentaires
  }

  // Méthodes utilitaires
  clearMessages(): void {
    this.errorMessage = '';
    this.successMessage = '';
  }

  refreshData(): void {
    this.clearMessages();
    this.initializeData();
  }
}