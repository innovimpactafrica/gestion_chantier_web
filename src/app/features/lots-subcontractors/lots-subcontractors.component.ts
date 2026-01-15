import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LotService, Lot, LotsResponse, CreateLotRequest } from '../../../services/lot.service';
import { AuthService } from '../../features/auth/services/auth.service';
import { UserService } from '../../../services/user.service';

interface LotDisplay {
  id: number;
  nom: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  statut: 'En cours' | 'En attente' | 'Planifié' | 'Terminé';
  progression: number;
  soustraitant?: { nom: string; telephone: string; company?: string; };
  statutColor: string;
}

interface CurrentLot {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  realEstatePropertyId: number;
  subcontractorId: number;
  id?: number;
}

@Component({
  selector: 'app-lots-subcontractors',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './lots-subcontractors.component.html',
  styleUrls: ['./lots-subcontractors.component.css']
})
export class LotsSubcontractorsComponent implements OnInit {
  // Variables d'état
  lots: LotDisplay[] = [];
  filteredLots: LotDisplay[] = [];
  searchQuery: string = '';
  selectedStatus: string = '';
  currentPropertyId: number = 0;
  
  // Pagination
  currentPage = 0;
  pageSize = 6;
  totalElements = 0;
  totalPages = 0;
  
  // États de chargement
  isLoading = false;
  isLoadingSubcontractors = false;
  
  // Modals
  showCreateModal = false;
  showEditModal = false;
  
  // Lot en cours d'édition
  currentLot: CurrentLot = {
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    realEstatePropertyId: 0,
    subcontractorId: 0
  };
  
  // Sous-traitants
  availableSubcontractors: { id: number; name: string; company: string; phone: string }[] = [];
  filteredSubcontractors: { id: number; name: string; company: string; phone: string }[] = [];
  subcontractorSearch: string = '';
  showSubcontractorDropdown: boolean = false;
  
  // Messages
  errorMessage: string = '';
  successMessage: string = '';
  
  // Utilitaires
  Math: any;

  constructor(
    private lotService: LotService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {
    this.Math = Math;
  }

  // ========== INITIALISATION ==========
  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.currentLot.realEstatePropertyId = this.currentPropertyId;
      this.checkUserPermissions();
      this.chargerSousTraitants();
      this.chargerLots();
    } else {
      this.errorMessage = 'ID de propriété manquant';
    }
  }

  private checkUserPermissions(): void {
    const userToken = this.authService.getToken();
    if (!userToken) {
      this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
    }
  }

  // ========== CHARGEMENT DES DONNÉES ==========
  chargerSousTraitants(): void {
    this.isLoadingSubcontractors = true;
    this.errorMessage = '';

    this.userService.getUserByProfil(
      'SUBCONTRACTOR',
      undefined,
      0,
      100
    ).subscribe({
      next: (response: any) => {
        console.log('✅ Sous-traitants chargés:', response);
        
        this.availableSubcontractors = response.content.map((user: any) => ({
          id: user.id,
          name: `${user.prenom} ${user.nom}`,
          company: user.company?.name || 'Indépendant',
          phone: user.telephone
        }));
        
        this.filteredSubcontractors = [...this.availableSubcontractors];
        this.isLoadingSubcontractors = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement sous-traitants:', error);
        this.errorMessage = 'Erreur lors du chargement des sous-traitants';
        this.isLoadingSubcontractors = false;
      }
    });
  }

  chargerLots(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.lotService.getLotsByProperty(
      this.currentPropertyId,
      this.currentPage,
      this.pageSize
    ).subscribe({
      next: (response: LotsResponse) => {
        console.log('✅ Lots chargés:', response);
        
        this.lots = this.transformLotsFromAPI(response.content);
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.filtrerLots();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement lots:', error);
        this.errorMessage = 'Erreur lors du chargement des lots';
        this.isLoading = false;
      }
    });
  }

  // ========== TRANSFORMATION DES DONNÉES ==========
  transformLotsFromAPI(apiLots: Lot[]): LotDisplay[] {
    return apiLots.map(lot => {
      const statut = this.mapStatus(lot.status);
  
      let company: string | undefined;
      if (lot.subcontractor?.company?.name) {
        company = lot.subcontractor.company.name;
      } else if (lot.subcontractor?.company) {
        company = typeof lot.subcontractor.company === 'string'
          ? lot.subcontractor.company
          : undefined;
      }
  
      return {
        id: lot.id,
        nom: lot.name,
        description: lot.description,
        dateDebut: this.formatDateFromAPI(lot.startDate),
        dateFin: this.formatDateFromAPI(lot.endDate),
        statut,
        progression: lot.progressPercentage || 0,
        soustraitant: lot.subcontractor
          ? {
              nom: `${lot.subcontractor.prenom} ${lot.subcontractor.nom}`,
              telephone: lot.subcontractor.telephone,
              company,
            }
          : undefined,
        statutColor: this.getStatusColor(statut)
      };
    });
  }

  private formatDateFromAPI(date: any): string {
    if (Array.isArray(date) && date.length >= 3) {
      return `${date[2].toString().padStart(2, '0')}/${date[1].toString().padStart(2, '0')}/${date[0]}`;
    } else if (typeof date === 'string') {
      const parts = date.split('-');
      return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : 'N/A';
    }
    return 'N/A';
  }

  mapStatus(apiStatus: string): 'En cours' | 'En attente' | 'Planifié' | 'Terminé' {
    const statusMap: Record<string, 'En cours' | 'En attente' | 'Planifié' | 'Terminé'> = {
      'PENDING': 'En attente',
      'IN_PROGRESS': 'En cours',
      'PLANNED': 'Planifié',
      'COMPLETED': 'Terminé'
    };
    return statusMap[apiStatus] ?? 'En attente';
  }

  getStatusColor(status: string): string {
    const colorMap = {
      'En cours': 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium',
      'En attente': 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium',
      'Planifié': 'bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-xs font-medium',
      'Terminé': 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium'
    };
    return colorMap[status as keyof typeof colorMap] || 'bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-xs font-medium';
  }

  // ========== FILTRAGE ET RECHERCHE ==========
  filtrerLots(): void {
    this.filteredLots = this.lots.filter(lot => {
      const matchSearch = !this.searchQuery || 
        lot.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        lot.description.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        (lot.soustraitant && (
          lot.soustraitant.nom.toLowerCase().includes(this.searchQuery.toLowerCase()) || 
          lot.soustraitant.telephone.includes(this.searchQuery)
        ));
      
      const matchStatus = !this.selectedStatus || 
        lot.statut.toLowerCase() === this.selectedStatus.toLowerCase().replace('-', ' ');
      
      return matchSearch && matchStatus;
    });
  }

  onSearchChange(): void {
    this.filtrerLots();
  }

  onStatusChange(): void {
    this.filtrerLots();
  }

  filterSubcontractors(): void {
    if (!this.subcontractorSearch.trim()) {
      this.filteredSubcontractors = [...this.availableSubcontractors];
      this.showSubcontractorDropdown = true;
      return;
    }
    
    const searchLower = this.subcontractorSearch.toLowerCase();
    this.filteredSubcontractors = this.availableSubcontractors.filter(sub =>
      sub.name.toLowerCase().includes(searchLower) ||
      sub.company.toLowerCase().includes(searchLower) ||
      sub.phone.includes(this.subcontractorSearch)
    );
    this.showSubcontractorDropdown = this.filteredSubcontractors.length > 0;
  }

  // ========== PAGINATION ==========
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.chargerLots();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  getPageNumbers(): number[] {
    const pages = [];
    const maxPages = 5;
    let start = Math.max(0, this.currentPage - 2);
    let end = Math.min(this.totalPages - 1, start + maxPages - 1);
    
    if (end - start < maxPages - 1) {
      start = Math.max(0, end - maxPages + 1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // ========== GESTION DES MODALS ==========
  openCreateModal(): void {
    this.currentLot = {
      name: '',
      description: '',
      startDate: '',
      endDate: '',
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: 0
    };
    this.subcontractorSearch = '';
    this.filteredSubcontractors = [...this.availableSubcontractors];
    this.showSubcontractorDropdown = false;
    this.errorMessage = '';
    this.successMessage = '';
    this.showCreateModal = true;
    this.showEditModal = false;
  }

  modifierLot(id: number): void {
    const lot = this.lots.find(l => l.id === id);
    if (lot) {
      this.currentLot = {
        id: lot.id,
        name: lot.nom,
        description: lot.description,
        startDate: this.convertToInputFormat(lot.dateDebut),
        endDate: this.convertToInputFormat(lot.dateFin),
        realEstatePropertyId: this.currentPropertyId,
        subcontractorId: this.findSubcontractorId(lot)
      };
      this.subcontractorSearch = lot.soustraitant?.nom || '';
      this.filteredSubcontractors = [...this.availableSubcontractors];
      this.showSubcontractorDropdown = false;
      this.errorMessage = '';
      this.successMessage = '';
      this.showEditModal = true;
      this.showCreateModal = false;
    }
  }

  closeModal(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.subcontractorSearch = '';
    this.showSubcontractorDropdown = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  private convertToInputFormat(date: string): string {
    const parts = date.split('/');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : '';
  }

  selectSubcontractor(sub: { id: number; name: string; company: string; phone: string }): void {
    this.currentLot.subcontractorId = sub.id;
    this.subcontractorSearch = sub.name;
    this.showSubcontractorDropdown = false;
  }

  private findSubcontractorId(lot: LotDisplay): number {
    if (!lot.soustraitant) return 0;
    const sub = this.availableSubcontractors.find(s => 
      s.name === lot.soustraitant!.nom && s.phone === lot.soustraitant!.telephone
    );
    return sub ? sub.id : 0;
  }

  // ========== SAUVEGARDE ==========
  saveLot(): void {
    this.errorMessage = '';
    this.successMessage = '';
    
    // Validation
    if (!this.currentLot.name?.trim()) {
      this.errorMessage = 'Le nom du lot est requis';
      return;
    }
    
    if (!this.currentLot.description?.trim()) {
      this.errorMessage = 'La description est requise';
      return;
    }
    
    if (!this.currentLot.startDate) {
      this.errorMessage = 'La date de début est requise';
      return;
    }
    
    if (!this.currentLot.endDate) {
      this.errorMessage = 'La date de fin est requise';
      return;
    }
    
    if (new Date(this.currentLot.startDate) >= new Date(this.currentLot.endDate)) {
      this.errorMessage = 'La date de fin doit être après la date de début';
      return;
    }
    
    if (!this.currentLot.subcontractorId) {
      this.errorMessage = 'Veuillez sélectionner un sous-traitant';
      return;
    }
    
    const request: CreateLotRequest = {
      name: this.currentLot.name,
      description: this.currentLot.description,
      startDate: this.formatDateForAPI(this.currentLot.startDate),
      endDate: this.formatDateForAPI(this.currentLot.endDate),
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: this.currentLot.subcontractorId
    };
    
    this.isLoading = true;
    
    if (this.showCreateModal) {
      this.lotService.createLot(request).subscribe({
        next: () => {
          this.successMessage = 'Lot créé avec succès !';
          this.chargerLots();
          setTimeout(() => {
            this.closeModal();
            this.successMessage = '';
          }, 1500);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Erreur création lot:', err);
          this.errorMessage = err.error?.message || 'Erreur lors de la création du lot';
          this.isLoading = false;
        }
      });
    } else {
      this.lotService.updateLot(this.currentLot.id!, request).subscribe({
        next: () => {
          this.successMessage = 'Lot modifié avec succès !';
          this.chargerLots();
          setTimeout(() => {
            this.closeModal();
            this.successMessage = '';
          }, 1500);
          this.isLoading = false;
        },
        error: (err) => {
          console.error('❌ Erreur modification lot:', err);
          this.errorMessage = err.error?.message || 'Erreur lors de la modification du lot';
          this.isLoading = false;
        }
      });
    }
  }

  private formatDateForAPI(date: string): string {
    // Format attendu: DD-MM-YYYY
    const parts = date.split('-');
    return parts.length === 3 ? `${parts[2]}-${parts[1]}-${parts[0]}` : date;
  }

  // ========== AUTRES ACTIONS ==========
  voirDocuments(id: number): void {
    console.log('Voir documents pour lot:', id);
    // TODO: Navigation vers page documents
  }

  voirCommentaires(id: number): void {
    console.log('Voir commentaires pour lot:', id);
    // TODO: Navigation vers page commentaires
  }
}