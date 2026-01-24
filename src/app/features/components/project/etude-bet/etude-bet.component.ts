import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EtudeBetService, Etude, EtudeResponse, CreateEtudeRequest, UpdateBetRequest } from '../../../../../services/etude-bet.service';
import { UserService } from '../../../../../services/user.service';

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

  // Available BETs for autocomplete
  // availableBETs: { id: number, name: string }[] = [
  //   { id: 1, name: 'Sonora BET' },
  //   { id: 2, name: 'Alpha Dieye' },
  //   { id: 3, name: 'BET Structura' },
  //   { id: 4, name: 'ClimaTech' }
  // ];

  availableBETs: User[] = [];
loadingBETs: boolean = false;
  
  Math: any = Math;

  constructor(
    private etudeBetService: EtudeBetService,
    private route: ActivatedRoute,
    private userService: UserService
  ) {}

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
    if (content.trim() && this.selectedEtude) {
      this.isLoading = true;
      
      const commentData = {
        content: content.trim()
      };

      // ID utilisateur - remplacez par l'ID de l'utilisateur connecté
      const userId = 1;

      this.etudeBetService.createComment(
        this.selectedEtude.id, 
        userId, 
        commentData
      ).subscribe({
        next: (response) => {
          console.log('Commentaire ajouté avec succès:', response);
          // Recharger les commentaires pour afficher le nouveau
          this.loadCommentsForDetail(this.selectedEtude!);
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du commentaire:', error);
          this.isLoading = false;
        }
      });
    }
  }

  /**
   * Ajoute un nouveau commentaire dans le modal dédié
   */
  addComment() {
    if (this.newComment.trim() && this.selectedEtudeForComments) {
      this.isLoading = true;
      
      const commentData = {
        content: this.newComment
      };

      // ID utilisateur - remplacez par l'ID de l'utilisateur connecté
      const userId = 1;

      this.etudeBetService.createComment(
        this.selectedEtudeForComments.id, 
        userId, 
        commentData
      ).subscribe({
        next: (response) => {
          console.log('Commentaire ajouté avec succès:', response);
          // Recharger les commentaires pour afficher le nouveau
          this.loadComments(this.selectedEtudeForComments!);
          this.newComment = '';
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du commentaire:', error);
          this.isLoading = false;
        }
      });
    }
  }

  // Utility method to get BET name by ID
  getBETNameById(betId: number): string {
    const bet = this.availableBETs.find(b => b.id === betId);
    return bet ? bet.nom : '';
  }
}