import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande, Report, Comment as DemandeComment } from './../../../services/demande.service';
import { AuthService } from './../../features/auth/services/auth.service';
import { LanguageService } from '../../core/services/language.service';
import { EtudeBetService, StudyIAReport } from '../../../services/etude-bet.service';
import { Subscription } from 'rxjs';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-demande',
  templateUrl: './demande.component.html',
  styleUrls: ['./demande.component.css']
})
export class DemandeComponent implements OnInit, OnDestroy {
  searchTerm: string = '';
  selectedPeriod: string = 'Période';
  selectedStatus: string = 'Statut';
  showModal: boolean = false;
  selectedDemande: Demande | null = null;
  comment: string = '';

  // Modals
  showCreateReportModal: boolean = false;
  showConfirmValidateModal: boolean = false;
  showConfirmRejectModal: boolean = false;
  showConfirmDeleteModal: boolean = false;
  demandeToDelete: Demande | null = null;

  // Rejection reason
  rejectionReason: string = '';

  // Nouveau rapport
  newReport: {
    title: string;
    version: string;
    file: File | null;
  } = {
      title: '',
      version: '',
      file: null
    };

  // États
  isCreatingReport: boolean = false;
  createReportError: string | null = null;
  isValidating: boolean = false;
  isRejecting: boolean = false;
  isDeleting: boolean = false;
  actionError: string | null = null;

  // Données
  demandes: Demande[] = [];
  filteredDemandes: Demande[] = [];
  loading: boolean = true;
  error: string | null = null;

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;

  // Commentaires
  comments: DemandeComment[] = [];
  loadingComments: boolean = false;

  // ID du BET
  betId: number | null = null;

  // ========== MODAL IA ==========
  showIAModal: boolean = false;
  selectedIAReport: StudyIAReport | null = null;
  isLoadingIA: boolean = false;
  iaError: string = '';

  // Subscriptions
  private subscriptions: Subscription = new Subscription();

  Math = Math;

  constructor(
    private demandeService: DemandeService,
    private authService: AuthService,
    private languageService: LanguageService,
    private etudeBetService: EtudeBetService
  ) { }

  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit() {
    this.initializeBetId();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeBetId(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();

      if (user && user.id) {
        this.betId = user.id;
        this.loadDemandes();
      } else {
        const refreshSubscription = this.authService.refreshUser().subscribe({
          next: (refreshedUser: { id: number | null; }) => {
            if (refreshedUser && refreshedUser.id) {
              this.betId = refreshedUser.id;
              this.loadDemandes();
            } else {
              this.handleUserError('Utilisateur non trouvé ou ID manquant');
            }
          },
          error: (error: any) => {
            this.handleUserError('Erreur lors du chargement des informations utilisateur');
          }
        });

        this.subscriptions.add(refreshSubscription);
      }
    } else {
      this.handleUserError('Utilisateur non authentifié');
    }
  }

  private handleUserError(message: string): void {
    this.error = message;
    this.loading = false;
  }

  private isBETUser(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    if (typeof user.profil === 'string') {
      return user.profil === 'BET';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('BET' as any);
    }

    return false;
  }

  loadDemandes(page: number = 0) {
    if (this.betId === null) {
      this.error = 'ID utilisateur non disponible';
      this.loading = false;
      return;
    }

    if (!this.isBETUser()) {
      this.error = 'Accès réservé aux utilisateurs BET';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    const userId = this.authService.currentUser();

    if (!userId || !userId.id) {
      this.error = 'Utilisateur non connecté';
      this.loading = false;
      return;
    }

    this.demandeService.getDemande(userId.id, page, this.pageSize).subscribe({
      next: (response) => {
        this.demandes = response.content;
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;

        this.filterDemandes();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Erreur lors du chargement des demandes';
        this.loading = false;
      }
    });
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = +target.value;

    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadDemandes();
  }

  filterDemandes() {
    this.filteredDemandes = this.demandes.filter(demande => {
      const matchesSearch = demande.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        demande.description.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchesPeriod = this.selectedPeriod === 'Période' || this.matchesPeriodFilter(demande);
      const matchesStatus = this.selectedStatus === 'Statut' || this.mapStatusToFrench(demande.status) === this.selectedStatus;

      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }

  private matchesPeriodFilter(demande: Demande): boolean {
    const createdDate = this.arrayToDate(demande.createdAt);
    const now = new Date();

    switch (this.selectedPeriod) {
      case 'Cette semaine':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return createdDate >= weekAgo;
      case 'Ce mois':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return createdDate >= monthAgo;
      case 'Ce trimestre':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return createdDate >= quarterAgo;
      default:
        return true;
    }
  }

  onSearchChange() {
    this.filterDemandes();
  }

  onPeriodChange() {
    this.filterDemandes();
  }

  onStatusChange() {
    this.filterDemandes();
  }

  arrayToDate(dateArray: number[]): Date {
    if (dateArray && dateArray.length >= 3) {
      return new Date(dateArray[0], dateArray[1] - 1, dateArray[2],
        dateArray[3] || 0, dateArray[4] || 0, dateArray[5] || 0);
    }
    return new Date();
  }

  formatDate(dateArray: number[]): string {
    const date = this.arrayToDate(dateArray);
    return date.toLocaleDateString('fr-FR');
  }

  mapStatusToFrench(status: string): string {
    switch (status) {
      case 'PENDING':
        return this.t('demande.status.PENDING');
      case 'IN_PROGRESS':
        return this.t('demande.status.IN_PROGRESS');
      case 'DELIVERED':
        return this.t('demande.status.DELIVERED');
      case 'VALIDATED':
        return this.t('demande.status.VALIDATED');
      case 'REJECTED':
        return this.t('demande.status.REJECTED');
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    // ✅ Use original status value, not translated - fixes color bug when changing language
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'IN_PROGRESS':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'DELIVERED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'VALIDATED':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'REJECTED':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  // ========== GESTION DU MODAL DÉTAILS ==========

  openDetails(demande: Demande) {
    this.selectedDemande = demande;
    this.showModal = true;
    this.comment = '';
    this.loadComments(demande.id);
  }

  closeModal() {
    this.showModal = false;
    this.selectedDemande = null;
    this.comment = '';
    this.comments = [];
  }

  // ========== ACTIONS VALIDER/REJETER AVEC CONFIRMATION ==========

  openValidateConfirmation() {
    this.showConfirmValidateModal = true;
    this.actionError = null;
  }

  closeValidateConfirmation() {
    this.showConfirmValidateModal = false;
    this.isValidating = false;
    this.actionError = null;
  }

  confirmValidate() {
    if (!this.selectedDemande) return;

    this.isValidating = true;
    this.actionError = null;

    const validateSubscription = this.demandeService.validateDemande(this.selectedDemande.id).subscribe({
      next: (updatedDemande: Demande) => {

        // Mettre à jour la demande locale
        this.selectedDemande = updatedDemande;

        // Mettre à jour dans la liste
        const index = this.demandes.findIndex(d => d.id === updatedDemande.id);
        if (index !== -1) {
          this.demandes[index] = updatedDemande;
        }

        this.filterDemandes();
        this.closeValidateConfirmation();
      },
      error: (error) => {
        this.actionError = 'Erreur lors de la validation de la demande';
        this.isValidating = false;
      }
    });

    this.subscriptions.add(validateSubscription);
  }

  openRejectConfirmation() {
    this.showConfirmRejectModal = true;
    this.rejectionReason = '';
    this.actionError = null;
  }

  closeRejectConfirmation() {
    this.showConfirmRejectModal = false;
    this.rejectionReason = '';
    this.isRejecting = false;
    this.actionError = null;
  }

  confirmReject() {
    if (!this.selectedDemande) return;

    this.isRejecting = true;
    this.actionError = null;

    const rejectSubscription = this.demandeService.rejectDemande(
      this.selectedDemande.id,
      this.rejectionReason.trim() || undefined
    ).subscribe({
      next: (updatedDemande: Demande) => {

        // Mettre à jour la demande locale
        this.selectedDemande = updatedDemande;

        // Mettre à jour dans la liste
        const index = this.demandes.findIndex(d => d.id === updatedDemande.id);
        if (index !== -1) {
          this.demandes[index] = updatedDemande;
        }

        this.filterDemandes();
        this.closeRejectConfirmation();
      },
      error: (error) => {
        this.actionError = 'Erreur lors du rejet de la demande';
        this.isRejecting = false;
      }
    });

    this.subscriptions.add(rejectSubscription);
  }

  // ========== ACTIONS RAPIDES (DEPUIS LA TABLE) ==========

  quickValidate(demande: Demande) {
    this.selectedDemande = demande;
    this.openValidateConfirmation();
  }

  quickReject(demande: Demande) {
    this.selectedDemande = demande;
    this.openRejectConfirmation();
  }

  // ========== SUPPRESSION ==========

  openDeleteConfirmation(demande: Demande) {
    this.demandeToDelete = demande;
    this.showConfirmDeleteModal = true;
    this.actionError = null;
  }

  closeDeleteConfirmation() {
    this.showConfirmDeleteModal = false;
    this.demandeToDelete = null;
    this.isDeleting = false;
    this.actionError = null;
  }

  confirmDelete() {
    if (!this.demandeToDelete) return;

    this.isDeleting = true;
    this.actionError = null;

    const deleteSubscription = this.demandeService.deleteDemande(this.demandeToDelete.id).subscribe({
      next: () => {

        // Retirer de la liste
        this.demandes = this.demandes.filter(d => d.id !== this.demandeToDelete!.id);
        this.filterDemandes();

        this.closeDeleteConfirmation();

        // Recharger si la liste est vide
        if (this.demandes.length === 0 && this.currentPage > 0) {
          this.loadDemandes(this.currentPage - 1);
        }
      },
      error: (error) => {
        this.actionError = 'Erreur lors de la suppression de la demande';
        this.isDeleting = false;
      }
    });

    this.subscriptions.add(deleteSubscription);
  }

  // ========== GESTION DES COMMENTAIRES ==========

  private loadComments(demandeId: number) {
    this.loadingComments = true;
    this.comments = [];

    const commentsSubscription = this.demandeService.getComments(demandeId).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.loadingComments = false;
      },
      error: (error) => {
        this.loadingComments = false;
      }
    });

    this.subscriptions.add(commentsSubscription);
  }

  sendComment() {
    if (!this.comment.trim() || !this.selectedDemande || !this.betId) {
      return;
    }

    const user = this.authService.currentUser();
    const authorName = user ? this.authService.getUserDisplayName() : 'Utilisateur';

    // ✅ CORRECTION : Utiliser seulement content dans le body
    const commentData = {
      content: this.comment.trim()
    };

    // ✅ Les IDs sont passés en query params via l'URL
    const commentSubscription = this.demandeService.createComment(
      this.selectedDemande.id,
      this.betId,
      commentData
    ).subscribe({
      next: (newComment) => {
        this.comments.push(newComment);
        this.comment = '';
      },
      error: (error) => {
      }
    });

    this.subscriptions.add(commentSubscription);
  }

  // ========== GESTION DES RAPPORTS ==========

  openCreateReportModal(): void {
    this.showCreateReportModal = true;
    this.resetNewReportForm();
    this.createReportError = null;
  }

  closeCreateReportModal(): void {
    this.showCreateReportModal = false;
    this.resetNewReportForm();
    this.createReportError = null;
    this.isCreatingReport = false;
  }

  private resetNewReportForm(): void {
    this.newReport = {
      title: '',
      version: '',
      file: null
    };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newReport.file = input.files[0];
    }
  }

  private isCreateReportFormValid(): boolean {
    return !!(
      this.newReport.title.trim() &&
      this.newReport.version.trim() &&
      this.newReport.file
    );
  }

  createReport(): void {
    if (!this.isCreateReportFormValid()) {
      this.createReportError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (!this.selectedDemande) {
      this.createReportError = 'Aucune demande sélectionnée';
      return;
    }

    if (!this.newReport.file) {
      this.createReportError = 'Veuillez sélectionner un fichier';
      return;
    }

    if (!this.betId) {
      this.createReportError = 'ID utilisateur non disponible';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.createReportError = 'Session expirée. Veuillez vous reconnecter.';
      return;
    }

    this.isCreatingReport = true;
    this.createReportError = null;

    const reportData = {
      title: this.newReport.title.trim(),
      versionNumber: parseInt(this.newReport.version),
      studyRequestId: this.selectedDemande.id,
      authorId: this.betId
    };

    const createSubscription = this.demandeService.createReport(reportData, this.newReport.file).subscribe({
      next: (response: Report) => {

        if (this.selectedDemande) {
          if (!this.selectedDemande.reports) {
            this.selectedDemande.reports = [];
          }
          this.selectedDemande.reports.push(response);
        }

        this.closeCreateReportModal();
      },
      error: (error: any) => {
        this.createReportError = 'Erreur lors de la création du rapport. Veuillez réessayer.';
        this.isCreatingReport = false;
      }
    });

    this.subscriptions.add(createSubscription);
  }

  cancelCreateReport(): void {
    this.closeCreateReportModal();
  }

  getFileName(): string {
    return this.newReport.file ? this.newReport.file.name : 'Aucun fichier choisi';
  }

  hasFileSelected(): boolean {
    return !!this.newReport.file;
  }

  // ========== PAGINATION ==========

  previousPage() {
    if (this.currentPage > 0) {
      this.loadDemandes(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.loadDemandes(this.currentPage + 1);
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.loadDemandes(page);
    }
  }

  // ========== UTILITAIRES ==========

  canAccept(): boolean {
    return this.selectedDemande?.status === 'PENDING';
  }

  canMarkAsDelivered(): boolean {
    return this.selectedDemande?.status === 'IN_PROGRESS';
  }

  canValidateOrReject(): boolean {
    return this.selectedDemande?.status === 'DELIVERED';
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  // ========== PROGRESS STEPPER ==========

  getProgressSteps(statut: string): {
    step: number;
    isCompleted: boolean;
    isCurrent: boolean;
    label: string;
    showCheck: boolean;
  }[] {
    const steps = [
      { step: 1, label: this.t('demande.steps.pendingDetails'), isCompleted: false, isCurrent: false, showCheck: false },
      { step: 2, label: this.t('demande.steps.inProgress'), isCompleted: false, isCurrent: false, showCheck: false },
      { step: 3, label: this.t('demande.steps.delivered'), isCompleted: false, isCurrent: false, showCheck: false },
      { step: 4, label: this.t('demande.steps.validation'), isCompleted: false, isCurrent: false, showCheck: false }
    ];

    switch (statut) {
      case 'PENDING':
        steps[0].isCurrent = true;
        break;
      case 'IN_PROGRESS':
        steps[0].isCompleted = true;
        steps[0].showCheck = true;
        steps[1].isCurrent = true;
        break;
      case 'DELIVERED':
        steps[0].isCompleted = true;
        steps[0].showCheck = true;
        steps[1].isCompleted = true;
        steps[1].showCheck = true;
        steps[2].isCurrent = true;
        break;
      case 'VALIDATED':
      case 'REJECTED':
        steps.forEach(step => {
          step.isCompleted = true;
          step.showCheck = true;
        });
        break;
    }

    return steps;
  }

  // ========== ACTIONS SELON STATUT ==========

  acceptDemande(): void {
    if (!this.selectedDemande) return;

    this.isValidating = true;
    this.actionError = null;

    const acceptSubscription = this.demandeService.acceptDemande(this.selectedDemande.id).subscribe({
      next: (updatedDemande: Demande) => {

        this.selectedDemande = updatedDemande;

        const index = this.demandes.findIndex(d => d.id === updatedDemande.id);
        if (index !== -1) {
          this.demandes[index] = updatedDemande;
        }

        this.filterDemandes();
        this.isValidating = false;
      },
      error: (error) => {
        this.actionError = 'Erreur lors de l\'acceptation de la demande';
        this.isValidating = false;
      }
    });

    this.subscriptions.add(acceptSubscription);
  }

  markAsDelivered(): void {
    if (!this.selectedDemande) return;

    this.isValidating = true;
    this.actionError = null;

    const deliverSubscription = this.demandeService.deliverDemande(this.selectedDemande.id).subscribe({
      next: (updatedDemande: Demande) => {

        this.selectedDemande = updatedDemande;

        const index = this.demandes.findIndex(d => d.id === updatedDemande.id);
        if (index !== -1) {
          this.demandes[index] = updatedDemande;
        }

        this.filterDemandes();
        this.isValidating = false;
      },
      error: (error) => {
        this.actionError = 'Erreur lors de la livraison de la demande';
        this.isValidating = false;
      }
    });

    this.subscriptions.add(deliverSubscription);
  }

  // ========== MODAL IA ==========

  openIAModal(demande: Demande): void {
    this.showIAModal = true;
    this.isLoadingIA = true;
    this.iaError = '';
    this.selectedIAReport = null;

    this.etudeBetService.getDetailsFromIA(demande.id).subscribe({
      next: (report) => {
        this.selectedIAReport = report;
        this.isLoadingIA = false;
      },
      error: (err) => {
        this.iaError = 'Rapport IA non disponible pour cette étude.';
        this.isLoadingIA = false;
      }
    });
  }

  closeIAModal(): void {
    this.showIAModal = false;
    this.selectedIAReport = null;
    this.iaError = '';
  }

  getSeverityClass(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-800 border border-red-200';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'LOW': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-blue-100 text-blue-800 border border-blue-200';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'Élevée';
      case 'MEDIUM': return 'Moyenne';
      case 'LOW': return 'Faible';
      default: return severity || 'Info';
    }
  }

  getStudyTypeLabel(type: string): string {
    const map: Record<string, string> = {
      STRUCTURAL_ANALYSIS:      'Analyse structurelle',
      FOUNDATION_RECALCULATION: 'Recalcul de fondation',
      CRACK_ANALYSIS:           'Analyse de fissures',
      SOIL_ANALYSIS:            'Analyse de sol',
      LOAD_VERIFICATION:        'Vérification des charges',
      STRUCTURAL_REINFORCEMENT: 'Renforcement structurel',
      OTHER:                    'Autre',
    };
    return map[type] || type;
  }
}