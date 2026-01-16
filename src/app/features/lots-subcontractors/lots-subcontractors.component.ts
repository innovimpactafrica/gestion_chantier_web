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
  soustraitant?: { nom: string; telephone: string; company?: string };
  statutColor: string;
}

interface CurrentLot {
  id?: number;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  realEstatePropertyId: number;
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
  selectedFile: File | null = null;
  selectedFileName: string = '';
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

  constructor(
    private lotService: LotService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.currentLot.realEstatePropertyId = this.currentPropertyId;
      this.checkUserPermissions();
      this.chargerSousTraitants();
      this.chargerLots();
    } else {
      this.errorMessage = 'ID de propriété manquant dans l\'URL';
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

    this.userService.getUserByProfil('SUBCONTRACTOR', undefined, 0, 100).subscribe({
      next: (response: any) => {
        console.log('✅ Sous-traitants chargés:', response);
        this.availableSubcontractors = (response.content || []).map((user: any) => ({
          id: user.id,
          name: `${user.prenom || ''} ${user.nom || ''}`.trim(),
          company: user.company?.name || 'Indépendant',
          phone: user.telephone || 'N/A'
        }));
        this.filteredSubcontractors = [...this.availableSubcontractors];
        this.isLoadingSubcontractors = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement sous-traitants:', error);
        this.errorMessage = 'Impossible de charger les sous-traitants';
        this.isLoadingSubcontractors = false;
      }
    });
  }

  chargerLots(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.lotService.getLotsByProperty(this.currentPropertyId, this.currentPage, this.pageSize).subscribe({
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
        this.errorMessage = 'Impossible de charger les lots';
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
        company = typeof lot.subcontractor.company === 'string' ? lot.subcontractor.company : undefined;
      }

      return {
        id: lot.id,
        nom: lot.name,
        description: lot.description || 'Aucune description',
        dateDebut: this.formatDateFromAPI(lot.startDate),
        dateFin: this.formatDateFromAPI(lot.endDate),
        statut,
        progression: lot.progressPercentage || 0,
        soustraitant: lot.subcontractor
          ? {
              nom: `${lot.subcontractor.prenom || ''} ${lot.subcontractor.nom || ''}`.trim(),
              telephone: lot.subcontractor.telephone || 'N/A',
              company
            }
          : undefined,
        statutColor: this.getStatusColor(statut)
      };
    });
  }

  private formatDateFromAPI(date: any): string {
    if (Array.isArray(date) && date.length >= 3) {
      const [year, month, day] = date;
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
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
  
    // Validation basique
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
  
    // Formater les dates au format dd-MM-yyyy
    const formattedStartDate = this.formatDateForAPI(this.currentLot.startDate);
    const formattedEndDate = this.formatDateForAPI(this.currentLot.endDate);
  
    console.log('Dates formatées:', {
      start: formattedStartDate,
      end: formattedEndDate
    });
  
    const request: CreateLotRequest = {
      name: this.currentLot.name,
      description: this.currentLot.description,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: this.currentLot.subcontractorId,
      file: this.selectedFile || undefined
    };
  
    this.isLoading = true;
  
    const operation = this.showCreateModal
      ? this.lotService.createLot(request)
      : this.lotService.updateLot(this.currentLot.id!, request);
  
    operation.subscribe({
      next: (response) => {
        console.log('✅ Lot sauvegardé:', response);
        this.successMessage = this.showCreateModal ? 'Lot créé avec succès !' : 'Lot modifié avec succès !';
        this.chargerLots();
        setTimeout(() => {
          this.closeModal();
          this.successMessage = '';
        }, 1500);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur sauvegarde lot:', err);
        
        // Gestion détaillée des erreurs
        if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Données invalides. Vérifiez les dates.';
        } else if (err.status === 403) {
          this.errorMessage = "Vous n'avez pas les droits pour cette action";
        } else if (err.status === 404) {
          this.errorMessage = 'Propriété ou sous-traitant introuvable';
        } else {
          this.errorMessage = err.error?.message || 'Erreur lors de la sauvegarde du lot';
        }
        
        this.isLoading = false;
      }
    });
  }

  private formatDateForAPI(date: string): string {
    // date est au format yyyy-MM-dd (depuis l'input HTML)
    const parts = date.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      // Retourner au format dd-MM-yyyy pour l'API
      return `${day}-${month}-${year}`;
    }
    return date;
  }
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      
      // Validation du fichier
      const maxSize = 5 * 1024 * 1024; // 5MB
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      
      if (file.size > maxSize) {
        this.errorMessage = "Le fichier ne doit pas dépasser 5MB";
        this.selectedFile = null;
        this.selectedFileName = '';
        input.value = '';
        return;
      }
      
      if (!allowedTypes.includes(file.type)) {
        this.errorMessage = "Format non supporté. Utilisez PDF, JPG ou PNG";
        this.selectedFile = null;
        this.selectedFileName = '';
        input.value = '';
        return;
      }
      
      this.selectedFile = file;
      this.selectedFileName = file.name;
      this.errorMessage = '';
    }
  }
  
  // 5. Méthode pour supprimer le fichier sélectionné
  removeSelectedFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';
    
    const fileInput = document.getElementById('lotFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }
  // 6. Modifier la méthode formatDateForAPI (déjà existante mais vérifier)


  // ========== AUTRES ACTIONS ==========
  voirDocuments(id: number): void {
    console.log('Voir documents pour lot:', id);
  }

  voirCommentaires(id: number): void {
    console.log('Voir commentaires pour lot:', id);
  }
}