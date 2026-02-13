import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EtudeBetService, Etude, EtudeResponse, CreateEtudeRequest, UpdateBetRequest } from '../../../../../services/etude-bet.service';
import { UserService } from '../../../../../services/user.service';
import { AuthService } from '../../../auth/services/auth.service';
import { DemandeService } from '../../../../../services/demande.service';
import { LanguageService } from '../../../../core/services/language.service';
import { inject } from '@angular/core';

interface EtudeBET {
  id: number;
  titre: string;
  description: string;
  nomBET: string;
  dateCreation: string;
  statut: 'En attente' | 'En cours' | 'Livrée' | 'Validée' | 'Rejetée';
  propertyId: number;
  propertyName: string;
  moaId: number;
  moaName: string;
  betId: number;
  rapports?: { id: number; nom: string; taille: string; dateSubmission: string; url: string; versionNumber: number }[];
}

interface Comment {
  id: number;
  content: string;
  authorName: string;
  createdAt: number[];
}

// 1. Ajouter l'interface User et UserPageResponse
interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  profil: string;
}

interface UserPageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
  number: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-etude-bet',
  templateUrl: './etude-bet.component.html',
  styleUrls: ['./etude-bet.component.css']
})
export class EtudeBetComponent implements OnInit {
  private languageService = inject(LanguageService);

  // Translation helper
  t = (key: string, params?: any) => this.languageService.translate(key, params);

  etudes: EtudeBET[] = [];
  filteredEtudes: EtudeBET[] = [];
  searchTerm: string = '';
  isLoading = false;

  // Pagination
  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;

  // Property ID (récupéré dynamiquement depuis les paramètres de route)
  currentPropertyId!: number;

  // Popups state
  showCreateModal = false;
  showEditModal = false;
  showDetailModal = false;
  showValidateModal = false;
  showRejectModal = false;
  showEditReportModal = false;
  showCommentsModal = false;

  // Comments
  comments: Comment[] = [];
  selectedEtudeForComments: EtudeBET | null = null;
  newComment = '';

  // Forms data
  selectedEtude: EtudeBET | null = null;
  selectedReport: { id: number; nom: string; taille: string; dateSubmission: string; url: string; versionNumber: number } | null = null;

  newEtude: CreateEtudeRequest = {
    title: '',
    description: '',
    propertyId: 0,
    clientId: 1,
    betId: 0
  };

  editEtude: CreateEtudeRequest = {
    title: '',
    description: '',
    propertyId: 0,
    clientId: 1,
    betId: 0
  };

  editReport: UpdateBetRequest = {
    title: '',
    file: '',
    versionNumber: 1,
    studyRequestId: 0,
    authorId: 0
  };

  rejectReason: string = '';

  showCreateReportModal = false;
  isCreatingReport = false;
  createReportError: string | null = null;

  newReport = {
    title: '',
    version: '',
    file: null as File | null
  };

  availableBETs: User[] = [];
  loadingBETs: boolean = false;

  Math: any = Math;

  constructor(
    private etudeBetService: EtudeBetService,
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    private demandeService: DemandeService
  ) { }

  ngOnInit() {
    this.getPropertyIdFromRoute();
    this.loadBETUsers();
  }
  // 4. Ajouter la méthode pour charger les utilisateurs BET
  private loadBETUsers(): void {
    this.loadingBETs = true;

    // Assurez-vous d'injecter UserService dans le constructor
    this.userService.getUserByProfil('BET', '', 0, 100).subscribe({
      next: (response: UserPageResponse) => {
        this.availableBETs = response.content;
        this.loadingBETs = false;
        console.log('BETs chargés:', this.availableBETs);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des BETs:', error);
        this.loadingBETs = false;
      }
    });
  }
  private getPropertyIdFromRoute(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.newEtude.propertyId = this.currentPropertyId;
      this.loadEtudes();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
      // Vous pouvez gérer l'erreur ou rediriger vers une page d'erreur
    }
  }

  loadEtudes() {
    this.isLoading = true;
    this.etudeBetService.getEtude(this.currentPropertyId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: EtudeResponse) => {
          this.etudes = this.transformEtudesFromAPI(response.content);
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.onSearch();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des études:', error);
          this.isLoading = false;
        }
      });
  }

  transformEtudesFromAPI(apiEtudes: Etude[]): EtudeBET[] {
    return apiEtudes.map(etude => ({
      id: etude.id,
      titre: etude.title,
      description: etude.description,
      nomBET: etude.betName,
      dateCreation: this.formatDate(etude.createdAt),
      statut: this.mapStatus(etude.status),
      propertyId: etude.propertyId,
      propertyName: etude.propertyName,
      moaId: etude.moaId,
      moaName: etude.moaName,
      betId: etude.betId,
      rapports: etude.reports?.map(report => ({
        id: report.id,
        nom: report.title,
        taille: this.getRandomSize(),
        dateSubmission: this.formatDate(report.submittedAt),
        url: report.fileUrl,
        versionNumber: report.versionNumber
      })) || []
    }));
  }

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Formate la date d'un commentaire avec heures et minutes
   */
  formatCommentDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';

    const date = new Date(
      dateArray[0],
      dateArray[1] - 1,
      dateArray[2],
      dateArray[3] || 0,
      dateArray[4] || 0,
      dateArray[5] || 0
    );

    return date.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  mapStatus(apiStatus: string): 'En attente' | 'En cours' | 'Livrée' | 'Validée' | 'Rejetée' {
    const statusMap: { [key: string]: any } = {
      'PENDING': 'En attente',
      'IN_PROGRESS': 'En cours',
      'DELIVERED': 'Livrée',
      'VALIDATED': 'Validée',
      'REJECTED': 'Rejetée'
    };
    return statusMap[apiStatus] || 'En attente';
  }

  getRandomSize(): string {
    const sizes = ['30 KB', '45 KB', '120 KB', '675 KB', '208 KB', '18 KB'];
    return sizes[Math.floor(Math.random() * sizes.length)];
  }

  // Search functionality
  onSearch() {
    if (!this.searchTerm.trim()) {
      this.filteredEtudes = [...this.etudes];
      return;
    }

    this.filteredEtudes = this.etudes.filter(etude =>
      etude.titre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      etude.description.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
      etude.nomBET.toLowerCase().includes(this.searchTerm.toLowerCase())
    );
  }

  // Pagination
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadEtudes();
    }
  }

  nextPage() {
    this.goToPage(this.currentPage + 1);
  }

  previousPage() {
    this.goToPage(this.currentPage - 1);
  }

  getPageNumbers(): number[] {
    const pages = [];
    for (let i = 0; i < this.totalPages; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Status styling
  getStatusClass(statut: string): string {
    switch (statut) {
      case 'En attente': return 'bg-gray-100 text-gray-800';
      case 'En cours': return 'bg-yellow-100 text-yellow-800';
      case 'Livrée': return 'bg-blue-100 text-blue-800';
      case 'Validée': return 'bg-green-100 text-green-800';
      case 'Rejetée': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  // Progress bar for detail view
  // 5. Modifier la méthode getProgressSteps pour gérer les icônes
  getProgressSteps(statut: string): {
    step: number;
    isCompleted: boolean;
    isCurrent: boolean;
    label: string;
    showCheck: boolean;
  }[] {
    const steps = [
      { step: 1, label: 'En attente de réponse', isCompleted: false, isCurrent: false, showCheck: false },
      { step: 2, label: 'En cours d\'acceptation', isCompleted: false, isCurrent: false, showCheck: false },
      { step: 3, label: 'En cours de livraison', isCompleted: false, isCurrent: false, showCheck: false },
      { step: 4, label: 'Validation/Rejet', isCompleted: false, isCurrent: false, showCheck: false }
    ];

    switch (statut) {
      case 'En attente':
        steps[0].isCurrent = true;
        break;
      case 'En cours':
        steps[0].isCompleted = true;
        steps[0].showCheck = true;
        steps[1].isCurrent = true;
        break;
      case 'Livrée':
        steps[0].isCompleted = true;
        steps[0].showCheck = true;
        steps[1].isCompleted = true;
        steps[1].showCheck = true;
        steps[2].isCurrent = true;
        break;
      case 'Validée':
        steps[0].isCompleted = true;
        steps[0].showCheck = true;
        steps[1].isCompleted = true;
        steps[1].showCheck = true;
        steps[2].isCompleted = true;
        steps[2].showCheck = true;
        steps[3].isCompleted = true;
        steps[3].showCheck = true;
        break;
      case 'Rejetée':
        steps[0].isCompleted = true;
        steps[0].showCheck = true;
        steps[1].isCompleted = true;
        steps[1].showCheck = true;
        steps[2].isCompleted = true;
        steps[2].showCheck = true;
        steps[3].isCompleted = true;
        steps[3].showCheck = true;
        break;
    }

    return steps;
  }



  // Modal actions
  openCreateModal() {
    this.newEtude = {
      title: '',
      description: '',
      propertyId: this.currentPropertyId,
      clientId: 1,
      betId: 0
    };
    this.showCreateModal = true;
  }

  openEditModal(etude: EtudeBET) {
    this.editEtude = {
      title: etude.titre,
      description: etude.description,
      propertyId: etude.propertyId,
      clientId: 1,
      betId: etude.betId
    };
    this.selectedEtude = etude;
    this.showEditModal = true;
  }

  /**
   * Ouvre le modal de détail et charge les commentaires
   */
  openDetailModal(etude: EtudeBET) {
    this.selectedEtude = etude;
    this.showDetailModal = true;
    this.loadCommentsForDetail(etude);
  }

  /**
   * Charge les commentaires pour l'affichage dans le modal de détail
   */
  private loadCommentsForDetail(etude: EtudeBET) {
    this.isLoading = true;

    this.etudeBetService.getComment(etude.id).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commentaires:', error);
        this.comments = [];
        this.isLoading = false;
      }
    });
  }

  /**
   * Charge les commentaires dans le modal dédié
   */
  loadComments(etude: EtudeBET) {
    this.selectedEtudeForComments = etude;
    this.isLoading = true;

    this.etudeBetService.getComment(etude.id).subscribe({
      next: (comments) => {
        this.comments = comments;
        this.showCommentsModal = true;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commentaires:', error);
        this.comments = [];
        this.showCommentsModal = true;
        this.isLoading = false;
      }
    });
  }

  openValidateModal(etude: EtudeBET) {
    this.selectedEtude = etude;
    this.showValidateModal = true;
  }

  openRejectModal(etude: EtudeBET) {
    this.selectedEtude = etude;
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  openEditReportModal(rapport: { id: number; nom: string; taille: string; dateSubmission: string; url: string; versionNumber: number }, etude: EtudeBET) {
    this.selectedReport = rapport;
    this.selectedEtude = etude;

    this.editReport = {
      title: rapport.nom,
      file: '',
      versionNumber: rapport.versionNumber + 1,
      studyRequestId: etude.id,
      authorId: this.currentPropertyId
    };

    this.showEditReportModal = true;
  }

  closeAllModals() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDetailModal = false;
    this.showValidateModal = false;
    this.showRejectModal = false;
    this.showEditReportModal = false;
    this.showCommentsModal = false;
    this.selectedEtude = null;
    this.selectedReport = null;
    this.selectedEtudeForComments = null;
    this.rejectReason = '';
    this.newComment = '';
    this.comments = [];
  }

  // CRUD operations
  createEtude() {
    if (this.newEtude.title && this.newEtude.description && this.newEtude.betId) {
      this.isLoading = true;
      this.etudeBetService.createEtude(this.newEtude).subscribe({
        next: (response) => {
          console.log('Étude créée avec succès:', response);
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la création de l\'étude:', error);
          this.isLoading = false;
        }
      });
    }
  }

  updateEtude() {
    if (this.selectedEtude && this.editEtude.title && this.editEtude.description && this.editEtude.betId) {
      this.isLoading = true;

      const updateRequest: CreateEtudeRequest = {
        title: this.editEtude.title,
        description: this.editEtude.description,
        propertyId: this.editEtude.propertyId,
        clientId: this.editEtude.clientId,
        betId: this.editEtude.betId
      };

      this.etudeBetService.updateEtude(this.selectedEtude.id, updateRequest).subscribe({
        next: (response) => {
          console.log('Étude mise à jour avec succès:', response);
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour de l\'étude:', error);
          this.isLoading = false;
        }
      });
    }
  }

  updateReport() {
    if (this.selectedReport && this.editReport.title && this.editReport.studyRequestId) {
      this.isLoading = true;

      this.editReport.authorId = this.currentPropertyId;

      this.etudeBetService.updateReport(this.selectedReport.id, this.editReport).subscribe({
        next: (response) => {
          console.log('Rapport mis à jour avec succès:', response);
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du rapport:', error);
          this.isLoading = false;
        }
      });
    }
  }

  deleteReport(rapport: { id: number; nom: string }, etude: EtudeBET) {
    if (confirm(`Êtes-vous sûr de vouloir supprimer le rapport "${rapport.nom}" ?`)) {
      this.isLoading = true;
      this.etudeBetService.deleteReport(rapport.id).subscribe({
        next: (response) => {
          console.log('Rapport supprimé avec succès');
          this.loadEtudes();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du rapport:', error);
          this.isLoading = false;
        }
      });
    }
  }

  validateEtude() {
    if (this.selectedEtude) {
      this.isLoading = true;
      this.etudeBetService.acceptEtude(this.selectedEtude.id).subscribe({
        next: (response) => {
          console.log('✅ Étude validée avec succès');
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors de la validation:', error);
          this.isLoading = false;
        }
      });
    }
  }

  rejectEtude() {
    if (this.selectedEtude) {
      this.isLoading = true;
      this.etudeBetService.rejectEtude(this.selectedEtude.id).subscribe({
        next: (response) => {
          console.log('✅ Étude rejetée avec succès');
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du rejet:', error);
          this.isLoading = false;
        }
      });
    }
  }

  deleteEtude(etude: EtudeBET) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette étude ?')) {
      console.log('Suppression d\'étude non disponible dans l\'API actuelle');
    }
  }

  // Actions based on status
  canEdit(statut: string): boolean {
    return ['En attente', 'En cours'].includes(statut);
  }

  canValidateOrReject(statut: string): boolean {
    return statut === 'Livrée';
  }


  // Download report
  downloadReport(rapport: { id: number; nom: string; url: string }) {
    if (rapport.url) {
      window.open(rapport.url, '_blank');
    } else {
      console.log('URL de téléchargement non disponible pour:', rapport.nom);
    }
  }

  /**
   * Ajoute un commentaire depuis le modal de détail
   */
  addCommentDetail(content: string) {
    // Validation du contenu
    if (!content?.trim()) {
      console.warn('⚠️ Contenu du commentaire vide');
      return;
    }

    // Validation de l'étude sélectionnée
    if (!this.selectedEtude || !this.selectedEtude.id) {
      console.error('❌ Aucune étude sélectionnée');
      return;
    }

    // Récupération de l'utilisateur connecté
    const currentUser = this.authService.currentUser();

    // Validation de l'utilisateur
    if (!currentUser) {
      console.error('❌ Utilisateur non connecté');
      alert('Vous devez être connecté pour ajouter un commentaire');
      return;
    }

    if (!currentUser.id) {
      console.error('❌ ID utilisateur manquant');
      alert('Erreur d\'authentification. Veuillez vous reconnecter.');
      return;
    }

    this.isLoading = true;

    const commentData = {
      content: content.trim()
    };

    // ✅ CORRECTION : Utiliser demandeService avec la bonne structure d'URL
    this.demandeService.createComment(
      this.selectedEtude.id,
      currentUser.id,
      commentData
    ).subscribe({
      next: (response) => {
        console.log('✅ Commentaire ajouté avec succès:', response);

        // Recharger les commentaires pour afficher le nouveau
        if (this.selectedEtude) {
          this.loadCommentsForDetail(this.selectedEtude);
        }

        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de l\'ajout du commentaire:', error);

        // Message d'erreur plus précis selon le type d'erreur
        if (error.status === 401) {
          alert('Session expirée. Veuillez vous reconnecter.');
        } else if (error.status === 403) {
          alert('Vous n\'avez pas les permissions pour ajouter un commentaire.');
        } else if (error.status === 404) {
          alert('L\'étude n\'existe plus.');
        } else {
          alert('Erreur lors de l\'ajout du commentaire. Veuillez réessayer.');
        }

        this.isLoading = false;
      }
    });
  }

  /**
   * Ajoute un nouveau commentaire dans le modal dédié
   */
  // addComment() {
  //   if (this.newComment.trim() && this.selectedEtudeForComments) {
  //     this.isLoading = true;

  //     const commentData = {
  //       content: this.newComment
  //     };

  //     // ID utilisateur - remplacez par l'ID de l'utilisateur connecté
  //     const userId = this.authService.getConnectedUserId();

  //     this.etudeBetService.createComment(
  //       this.selectedEtudeForComments.id, 
  //       userId, 
  //       commentData
  //     ).subscribe({
  //       next: (response) => {
  //         console.log('Commentaire ajouté avec succès:', response);
  //         // Recharger les commentaires pour afficher le nouveau
  //         this.loadComments(this.selectedEtudeForComments!);
  //         this.newComment = '';
  //       },
  //       error: (error) => {
  //         console.error('Erreur lors de l\'ajout du commentaire:', error);
  //         this.isLoading = false;
  //       }
  //     });
  //   }
  // }

  // Utility method to get BET name by ID
  getBETNameById(betId: number): string {
    const bet = this.availableBETs.find(b => b.id === betId);
    return bet ? bet.nom : '';
  }
  // 2. AJOUTER CES MÉTHODES

  /**
   * Ouvre le modal de création de rapport
   */
  openCreateReportModal(): void {
    if (!this.selectedEtude) {
      console.error('❌ Aucune étude sélectionnée');
      return;
    }

    this.newReport = {
      title: '',
      version: '',
      file: null
    };
    this.createReportError = null;
    this.showCreateReportModal = true;

    console.log('📄 Ouverture modal création rapport pour étude:', this.selectedEtude.titre);
  }

  /**
   * Ferme le modal de création de rapport
   */
  closeCreateReportModal(): void {
    this.showCreateReportModal = false;
    this.isCreatingReport = false;
    this.createReportError = null;
    this.newReport = {
      title: '',
      version: '1',
      file: null
    };
  }

  /**
   * Gère la sélection du fichier
   */
  onReportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newReport.file = input.files[0];
      console.log('📎 Fichier sélectionné:', this.newReport.file.name);
    }
  }

  /**
   * Valide le formulaire de création de rapport
   */
  private isCreateReportFormValid(): boolean {
    return !!(
      this.newReport.title?.trim() &&
      this.newReport.version?.trim() &&
      this.newReport.file
    );
  }

  /**
   * Récupère le nom du fichier sélectionné
   */
  getReportFileName(): string {
    return this.newReport.file ? this.newReport.file.name : 'Aucun fichier choisi';
  }

  /**
   * Vérifie si un fichier est sélectionné
   */
  hasReportFileSelected(): boolean {
    return !!this.newReport.file;
  }

  /**
   * Crée un nouveau rapport
   */
  createReport(): void {
    // Validation du formulaire
    if (!this.isCreateReportFormValid()) {
      this.createReportError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    // Validation de l'étude sélectionnée
    if (!this.selectedEtude) {
      this.createReportError = 'Aucune étude sélectionnée';
      return;
    }

    // Validation du fichier
    if (!this.newReport.file) {
      this.createReportError = 'Veuillez sélectionner un fichier';
      return;
    }

    // Récupération de l'utilisateur connecté
    const currentUser = this.authService?.currentUser();

    if (!currentUser || !currentUser.id) {
      this.createReportError = 'Utilisateur non connecté. Veuillez vous reconnecter.';
      return;
    }

    this.isCreatingReport = true;
    this.createReportError = null;

    // Préparation des données du rapport
    const reportData = {
      title: this.newReport.title.trim(),
      versionNumber: parseInt(this.newReport.version),
      studyRequestId: this.selectedEtude.id,
      authorId: currentUser.id
    };

    console.log('📤 Création du rapport:', {
      ...reportData,
      fileName: this.newReport.file.name,
      fileSize: this.newReport.file.size
    });

    // Appel du service pour créer le rapport
    const createSubscription = this.demandeService.createReport(reportData, this.newReport.file).subscribe({
      next: (response) => {
        console.log('✅ Rapport créé avec succès:', response);

        // Mise à jour de l'étude sélectionnée avec le nouveau rapport
        if (this.selectedEtude) {
          if (!this.selectedEtude.rapports) {
            this.selectedEtude.rapports = [];
          }

          // Ajouter le nouveau rapport à la liste
          this.selectedEtude.rapports.push({
            id: response.id,
            nom: response.title || this.newReport.title,
            taille: this.formatFileSize(this.newReport.file!.size),
            dateSubmission: this.getCurrentDateFormatted(),
            url: response.fileUrl || '',
            versionNumber: response.versionNumber || parseInt(this.newReport.version)
          });
        }

        // Recharger les études pour avoir les données à jour
        this.loadEtudes();

        // Fermer le modal
        this.closeCreateReportModal();

        this.isCreatingReport = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du rapport:', error);

        // Gestion des erreurs spécifiques
        if (error.status === 401) {
          this.createReportError = 'Session expirée. Veuillez vous reconnecter.';
        } else if (error.status === 403) {
          this.createReportError = 'Vous n\'avez pas les permissions pour créer un rapport.';
        } else if (error.status === 413) {
          this.createReportError = 'Le fichier est trop volumineux.';
        } else {
          this.createReportError = 'Erreur lors de la création du rapport. Veuillez réessayer.';
        }

        this.isCreatingReport = false;
      }
    });
  }
  /**
   * Retourne la date actuelle formatée en string (jj-mm-aaaa)
   */
  private getCurrentDateFormatted(): string {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();

    return `${day}-${month}-${year}`;  // ✅ Format jj-mm-aaaa avec tirets
  }

  /**
   * Annule la création du rapport
   */
  cancelCreateReport(): void {
    this.closeCreateReportModal();
  }

  /**
   * Formate la taille du fichier
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Formate une date en string
   */
  // private formatDate(date: Date): string {
  //   return date.toLocaleDateString('fr-FR', {
  //     day: '2-digit',
  //     month: '2-digit',
  //     year: 'numeric'
  //   });
  // }
}