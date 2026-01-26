import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande, Report, Comment as DemandeComment } from './../../../services/demande.service';
import { AuthService } from './../../features/auth/services/auth.service';
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
  
  // Subscriptions
  private subscriptions: Subscription = new Subscription();
  
  Math = Math;

  constructor(
    private demandeService: DemandeService,
    private authService: AuthService
  ) {}

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
            console.error('Erreur refreshUser:', error);
          }
        });
        
        this.subscriptions.add(refreshSubscription);
      }
    } else {
      this.handleUserError('Utilisateur non authentifié');
    }
  }

  private handleUserError(message: string): void {
    console.error(message);
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
    
    // ✅ CORRECTION : Vérifier que currentUser() n'est pas null
    const userId = this.authService.currentUser();
    
    if (!userId || !userId.id) {
      console.error('❌ Utilisateur non connecté ou ID manquant');
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
        console.error('Erreur lors du chargement des demandes:', err);
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
        return 'En attente';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'DELIVERED':
        return 'Livrée';
      case 'VALIDATED':
        return 'Validée';
      case 'REJECTED':
        return 'Rejetée';
      default:
        return status;
    }
  }

  getStatusClass(status: string): string {
    const frenchStatus = this.mapStatusToFrench(status);
    switch (frenchStatus) {
      case 'En attente':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'En cours':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Livrée':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Validée':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejetée':
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
        console.log('✅ Demande validée avec succès:', updatedDemande);
        
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
        console.error('❌ Erreur lors de la validation:', error);
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
        console.log('✅ Demande rejetée avec succès:', updatedDemande);
        
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
        console.error('❌ Erreur lors du rejet:', error);
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
        console.log('✅ Demande supprimée avec succès');
        
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
        console.error('❌ Erreur lors de la suppression:', error);
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
        console.error('Erreur lors du chargement des commentaires:', error);
        this.loadingComments = false;
      }
    });

    this.subscriptions.add(commentsSubscription);
  }

  sendComment() {
    if (!this.comment.trim() || !this.selectedDemande) return;

    const user = this.authService.currentUser();
    const authorName = user ? this.authService.getUserDisplayName() : 'Utilisateur';

    const commentData = {
      text: this.comment.trim(),
      author: authorName,
      studyRequestId: this.selectedDemande.id
    };

    const commentSubscription = this.demandeService.createComment(commentData).subscribe({
      next: (newComment) => {
        this.comments.push(newComment);
        this.comment = '';
      },
      error: (error) => {
        console.error('Erreur lors de l\'ajout du commentaire:', error);
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
        console.log('✅ Rapport créé avec succès:', response);
        
        if (this.selectedDemande) {
          if (!this.selectedDemande.reports) {
            this.selectedDemande.reports = [];
          }
          this.selectedDemande.reports.push(response);
        }
        
        this.closeCreateReportModal();
      },
      error: (error: any) => {
        console.error('❌ Erreur lors de la création du rapport:', error);
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

  canAcceptOrReject(): boolean {
    return this.selectedDemande?.status === 'PENDING';
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }
}