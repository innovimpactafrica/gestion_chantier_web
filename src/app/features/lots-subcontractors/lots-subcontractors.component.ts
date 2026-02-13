import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { LotService, Lot, LotsResponse, CreateLotRequest, Comment, LotDocument } from '../../../services/lot.service';
import { AuthService } from '../auth/services/auth.service';
import { UserService } from '../../../services/user.service';
import { LanguageService } from '../../core/services/language.service';

interface LotDisplay {
  id: number;
  nom: string;
  description: string;
  dateDebut: string;
  dateFin: string;
  statut: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
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
  isLoadingComments = false;

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showProgressModal = false;
  showCommentsModal = false;
  showDetailsModal = false;
  showDocumentUploadModal = false;

  // Progression et statut
  showStatusDropdown: number | null = null;
  progressInput: number = 0;
  selectedLotForProgress: number | null = null;

  // Commentaires et détails
  selectedLotId: number | null = null;
  selectedLotDetails: Lot | null = null;
  lotComments: Comment[] = [];
  newCommentText = '';

  // Fichiers
  selectedFile: File | null = null;
  selectedFileName: string = '';

  // Upload de documents
  selectedLotForDocument: number | null = null;
  uploadingFile: File | null = null;
  uploadingFileName: string = '';
  documentLibelle: string = '';
  isUploading = false;

  // Documents du lot
  lotDocuments: LotDocument[] = [];

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

  // Comment counts
  commentCounts: Map<number, number> = new Map();

  // Messages
  errorMessage: string = '';
  successMessage: string = '';

  // Statuts disponibles
  availableStatuses = [
    { value: 'PENDING', label: 'En attente', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'IN_PROGRESS', label: 'En cours', color: 'bg-blue-100 text-blue-800' },
    { value: 'COMPLETED', label: 'Terminé', color: 'bg-green-100 text-green-800' }
  ];

  constructor(
    private lotService: LotService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private userService: UserService,
    private languageService: LanguageService
  ) { }

  public t(key: string, params?: { [key: string]: string | number }): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.currentLot.realEstatePropertyId = this.currentPropertyId;
      this.checkUserPermissions();
      this.chargerSousTraitants();
      this.chargerLots();
    } else {
      this.errorMessage = this.t('lots.error.missingPropertyId');
    }
  }

  private checkUserPermissions(): void {
    const userToken = this.authService.getToken();
    if (!userToken) {
      this.errorMessage = this.t('lots.error.sessionExpired');
    }
  }

  // ========== GESTION DE L'UPLOAD DE DOCUMENTS ==========
  openDocumentUpload(lotId: number): void {
    this.selectedLotForDocument = lotId;
    this.uploadingFile = null;
    this.uploadingFileName = '';
    this.documentLibelle = '';
    this.errorMessage = '';
    this.showDocumentUploadModal = true;
  }

  closeDocumentUpload(): void {
    this.showDocumentUploadModal = false;
    this.selectedLotForDocument = null;
    this.uploadingFile = null;
    this.uploadingFileName = '';
    this.documentLibelle = '';
    this.errorMessage = '';
    this.isUploading = false;
  }

  onDocumentFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (file.size > maxSize) {
        this.errorMessage = this.t('lots.error.fileTooBig');
        return;
      }

      this.uploadingFile = file;
      this.uploadingFileName = file.name;
      this.errorMessage = '';
    }
  }

  uploadDocument(): void {
    const lotId = this.selectedLotForDocument;
    const file = this.uploadingFile;
    const libelle = this.documentLibelle.trim();

    if (!lotId || !file) {
      this.errorMessage = this.t('lots.error.noFileSelected');
      return;
    }

    if (!libelle) {
      this.errorMessage = this.t('lots.error.documentLabelRequired');
      return;
    }

    this.isUploading = true;
    this.errorMessage = '';

    this.lotService.uploadLotFile(lotId, file, libelle)
      .subscribe({
        next: (response) => {
          console.log('Document uploadé:', response);
          this.successMessage = this.t('lots.success.documentAdded');
          this.isUploading = false;

          // Recharger les documents si on est dans la modal détails
          if (this.showDetailsModal && this.selectedLotId === lotId) {
            this.loadLotDocuments(lotId);
          }

          setTimeout(() => {
            this.closeDocumentUpload();
            this.successMessage = '';
          }, 1800);
        },
        error: (err) => {
          console.error('Erreur upload document:', err);
          this.errorMessage = err.error?.message || this.t('lots.error.documentUploadFailed');
          this.isUploading = false;
        }
      });
  }

  // Charger les documents d'un lot
  loadLotDocuments(lotId: number): void {
    console.log('🔍 Chargement des documents pour le lot:', lotId);
    this.lotService.getLotFiles(lotId).subscribe({
      next: (docs) => {
        console.log('✅ Documents chargés:', docs);
        this.lotDocuments = docs || [];
        console.log('📋 Nombre de documents:', this.lotDocuments.length);
      },
      error: (err) => {
        console.error('❌ Erreur chargement documents:', err);
        this.lotDocuments = [];
      }
    });
  }

  /**
   * Supprime un document d'un lot
   */
  deleteLotDocument(fileId: number): void {
    if (!confirm(this.t('lots.confirmDeleteDocument'))) {
      return;
    }

    this.lotService.deleteLotFile(fileId).subscribe({
      next: () => {
        console.log('✅ Document supprimé');
        this.successMessage = this.t('lots.success.documentDeleted');

        // Recharger la liste des documents
        if (this.selectedLotId) {
          this.loadLotDocuments(this.selectedLotId);
        }

        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Erreur suppression document:', err);
        this.errorMessage = err.error?.message || this.t('lots.error.deleteDocumentFailed');
      }
    });
  }

  /**
   * Télécharge un document
   */
  downloadDocument(filePath: string): void {
    const url = this.lotService.getDocumentDownloadUrl(filePath);
    window.open(url, '_blank');
  }

  /**
   * Affiche un document dans un nouvel onglet
   */
  viewDocument(filePath: string): void {
    const url = this.lotService.getDocumentDownloadUrl(filePath);
    window.open(url, '_blank');
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
        this.errorMessage = this.t('lots.error.loadSubcontractors');
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
        this.loadCommentCounts();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement lots:', error);
        this.errorMessage = this.t('lots.error.loadLots');
        this.isLoading = false;
      }
    });
  }

  /**
   * Charge le nombre de commentaires pour chaque lot
   */
  loadCommentCounts(): void {
    this.lots.forEach(lot => {
      this.lotService.getCommentsForLot(lot.id).subscribe({
        next: (comments) => {
          this.commentCounts.set(lot.id, comments.length);
        },
        error: (err) => {
          console.error(`Erreur chargement commentaires lot ${lot.id}:`, err);
          this.commentCounts.set(lot.id, 0);
        }
      });
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

  formatDateFromAPI(date: any): string {
    if (Array.isArray(date) && date.length >= 3) {
      const [year, month, day] = date;
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
    else if (typeof date === 'string' && date.includes('-')) {
      const parts = date.split('-');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${day}/${month}/${year}`;
      }
    }
    return 'N/A';
  }

  mapStatus(apiStatus: string): 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' {
    const validStatuses = ['PENDING', 'IN_PROGRESS', 'COMPLETED'];
    return validStatuses.includes(apiStatus) ? (apiStatus as any) : 'PENDING';
  }

  getStatusColor(status: string): string {
    const colorMap = {
      'IN_PROGRESS': 'bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-medium',
      'PENDING': 'bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-xs font-medium',
      'COMPLETED': 'bg-green-100 text-green-800 px-3 py-1 rounded-full text-xs font-medium'
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
        lot.statut === this.selectedStatus;

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

  // ========== GESTION DE LA PROGRESSION ==========
  openProgressModal(lotId: number, currentProgress: number): void {
    this.selectedLotForProgress = lotId;
    this.progressInput = currentProgress;
    this.showProgressModal = true;
    this.errorMessage = '';
    this.successMessage = '';
  }

  closeProgressModal(): void {
    this.showProgressModal = false;
    this.selectedLotForProgress = null;
    this.progressInput = 0;
    this.errorMessage = '';
    this.successMessage = '';
  }

  updateProgress(): void {
    if (this.selectedLotForProgress === null) return;

    if (this.progressInput < 0 || this.progressInput > 100) {
      this.errorMessage = 'Le pourcentage doit être entre 0 et 100';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.lotService.updateLotProgress(this.selectedLotForProgress, this.progressInput).subscribe({
      next: (response) => {
        console.log('✅ Progression mise à jour:', response);
        this.successMessage = 'Progression mise à jour avec succès !';

        const lotIndex = this.lots.findIndex(l => l.id === this.selectedLotForProgress);
        if (lotIndex !== -1) {
          this.lots[lotIndex].progression = this.progressInput;
          this.filtrerLots();
        }

        this.isLoading = false;

        setTimeout(() => {
          this.closeProgressModal();
          this.successMessage = '';
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Erreur mise à jour progression:', err);
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors de la mise à jour de la progression';
      }
    });
  }

  // ========== GESTION DU STATUT ==========
  toggleStatusDropdown(lotId: number, event: Event): void {
    event.stopPropagation();
    this.showStatusDropdown = this.showStatusDropdown === lotId ? null : lotId;
  }

  changeStatus(lotId: number, newStatus: string, event: Event): void {
    event.stopPropagation();

    this.isLoading = true;
    this.errorMessage = '';

    this.lotService.changeStatus(lotId, newStatus).subscribe({
      next: (response) => {
        console.log('✅ Statut changé:', response);
        this.successMessage = 'Statut modifié avec succès !';

        const lotIndex = this.lots.findIndex(l => l.id === lotId);
        if (lotIndex !== -1) {
          this.lots[lotIndex].statut = this.mapStatus(newStatus);
          this.lots[lotIndex].statutColor = this.getStatusColor(this.lots[lotIndex].statut);
          this.filtrerLots();
        }

        this.showStatusDropdown = null;
        this.isLoading = false;

        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Erreur changement statut:', err);
        this.isLoading = false;
        this.errorMessage = err.error?.message || 'Erreur lors du changement de statut';
        this.showStatusDropdown = null;
      }
    });
  }

  getStatusAPIValue(displayStatus: string): string {
    return displayStatus;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event): void {
    this.showStatusDropdown = null;
  }

  // ========== GESTION DES MODALS CRÉATION/ÉDITION ==========
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
    this.selectedFile = null;
    this.selectedFileName = '';
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
      this.selectedFile = null;
      this.selectedFileName = '';
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
    if (!date) return '';

    const parts = date.split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return '';
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

  // ========== SAUVEGARDE DU LOT ==========
  saveLot(): void {
    this.errorMessage = '';
    this.successMessage = '';

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

    const formattedStartDate = this.formatDateForAPI(this.currentLot.startDate);
    const formattedEndDate = this.formatDateForAPI(this.currentLot.endDate);

    const request: CreateLotRequest = {
      name: this.currentLot.name,
      description: this.currentLot.description,
      startDate: formattedStartDate,
      endDate: formattedEndDate,
      realEstatePropertyId: this.currentPropertyId,
      subcontractorId: this.currentLot.subcontractorId,
      file: this.selectedFile || undefined
    };

    const validationErrors = this.lotService.validateLotData(request);
    if (validationErrors.length > 0) {
      this.errorMessage = validationErrors.join(', ');
      return;
    }

    this.isLoading = true;

    const operation = this.showCreateModal
      ? this.lotService.createLot(request)
      : this.lotService.updateLot(this.currentLot.id!, request);

    operation.subscribe({
      next: (response) => {
        console.log('✅ Lot sauvegardé avec succès:', response);
        this.successMessage = this.showCreateModal ? 'Lot créé avec succès !' : 'Lot modifié avec succès !';
        this.isLoading = false;

        this.chargerLots();

        setTimeout(() => {
          this.closeModal();
          this.successMessage = '';
        }, 1500);
      },
      error: (err) => {
        console.error('❌ Erreur lors de la sauvegarde:', err);
        this.isLoading = false;

        if (err.status === 0) {
          this.errorMessage = 'Erreur de connexion au serveur. Vérifiez votre connexion internet.';
        } else if (err.status === 400) {
          this.errorMessage = err.error?.message || 'Données invalides. Vérifiez les informations saisies.';
        } else if (err.status === 401) {
          this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else if (err.status === 403) {
          this.errorMessage = "Vous n'avez pas les droits pour effectuer cette action.";
        } else if (err.status === 404) {
          this.errorMessage = 'Propriété ou sous-traitant introuvable.';
        } else if (err.status === 500) {
          this.errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
        } else {
          this.errorMessage = err.error?.message || 'Une erreur est survenue lors de la sauvegarde.';
        }
      }
    });
  }

  private formatDateForAPI(date: string): string {
    if (!date) return '';

    const parts = date.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return date;
  }

  // ========== GESTION DES FICHIERS ==========
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const maxSize = 5 * 1024 * 1024;
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

  removeSelectedFile(): void {
    this.selectedFile = null;
    this.selectedFileName = '';

    const fileInput = document.getElementById('lotFile') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  }

  // ========== GESTION DES COMMENTAIRES ==========
  voirCommentaires(lotId: number): void {
    this.selectedLotId = lotId;
    this.showCommentsModal = true;
    this.newCommentText = '';
    this.errorMessage = '';
    this.successMessage = '';
    this.loadComments(lotId);
  }

  loadComments(lotId: number): void {
    this.isLoadingComments = true;
    this.errorMessage = '';

    this.lotService.getCommentsForLot(lotId).subscribe({
      next: (comments) => {
        console.log('✅ Commentaires chargés:', comments);
        this.lotComments = comments;
        this.isLoadingComments = false;
      },
      error: (err) => {
        console.error('❌ Erreur chargement commentaires:', err);
        this.errorMessage = 'Impossible de charger les commentaires';
        this.isLoadingComments = false;
        this.lotComments = [];
      }
    });
  }

  addComment(): void {
    if (!this.newCommentText.trim()) {
      this.errorMessage = 'Veuillez saisir un commentaire';
      return;
    }

    if (!this.selectedLotId) {
      this.errorMessage = 'Lot non sélectionné';
      return;
    }

    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.errorMessage = 'Utilisateur non connecté';
      return;
    }

    this.isLoadingComments = true;
    this.errorMessage = '';

    this.lotService.createCommentToLot(this.selectedLotId, userId, this.newCommentText).subscribe({
      next: (comment) => {
        console.log('✅ Commentaire ajouté:', comment);
        this.successMessage = 'Commentaire ajouté avec succès !';
        this.newCommentText = '';

        this.loadComments(this.selectedLotId!);

        // Mettre à jour le compteur de commentaires
        if (this.selectedLotId) {
          const currentCount = this.commentCounts.get(this.selectedLotId) || 0;
          this.commentCounts.set(this.selectedLotId, currentCount + 1);
        }

        setTimeout(() => {
          this.successMessage = '';
        }, 2000);
      },
      error: (err) => {
        console.error('❌ Erreur ajout commentaire:', err);
        this.errorMessage = err.error?.message || 'Erreur lors de l\'ajout du commentaire';
        this.isLoadingComments = false;
      }
    });
  }

  closeCommentsModal(): void {
    this.showCommentsModal = false;
    this.selectedLotId = null;
    this.lotComments = [];
    this.newCommentText = '';
    this.errorMessage = '';
    this.successMessage = '';
  }

  formatCommentDate(dateArray: number[]): string {
    return this.lotService.formatCommentDate(dateArray);
  }

  // ========== GESTION DES DÉTAILS DU LOT ==========
  voirDocuments(lotId: number): void {
    this.selectedLotId = lotId;
    this.showDetailsModal = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.loadLotDetails(lotId);
  }

  loadLotDetails(lotId: number): void {
    console.log('📖 Chargement des détails du lot:', lotId);
    this.isLoading = true;
    this.errorMessage = '';

    // Charger les détails du lot
    this.lotService.getLotById(lotId).subscribe({
      next: (lot) => {
        console.log('✅ Détails du lot chargés:', lot);
        this.selectedLotDetails = lot;

        // Charger les documents en parallèle
        this.loadLotDocuments(lotId);

        this.isLoading = false;
      },
      error: (err) => {
        console.error('❌ Erreur détails lot:', err);
        this.errorMessage = 'Impossible de charger les détails';
        this.isLoading = false;
      }
    });
  }

  closeDetailsModal(): void {
    this.showDetailsModal = false;
    this.selectedLotId = null;
    this.selectedLotDetails = null;
    this.lotDocuments = [];
    this.errorMessage = '';
    this.successMessage = '';
  }

  getStatusLabel(status: string): string {
    const statusMap: Record<string, string> = {
      'PENDING': 'En attente',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminé'
    };
    return statusMap[status] || status;
  }

  getStatusColorClass(status: string): string {
    return this.getStatusColor(this.mapStatus(status));
  }
}