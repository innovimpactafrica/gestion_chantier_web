import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { EtudeBetService, Etude, EtudeResponse, CreateEtudeRequest, UpdateBetRequest } from '../../../../../services/etude-bet.service';

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
  rapports?: { id: number; nom: string; taille: string; dateSubmission: string; url: string }[];
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
  
  // Property ID (récupéré depuis les paramètres de route)
  currentPropertyId: number = 19; // Valeur par défaut, sera mise à jour
  
  // Popups state
  showCreateModal = false;
  showEditModal = false;
  showDetailModal = false;
  showValidateModal = false;
  showRejectModal = false;
  
  // Forms data
  selectedEtude: EtudeBET | null = null;
  newEtude: CreateEtudeRequest = {
    title: '',
    description: '',
    propertyId: 0,
    clientId: 1, // À adapter selon vos besoins
    betId: 0
  };
  editEtude: Partial<EtudeBET> = {};
  rejectReason: string = '';

  // Available BETs for autocomplete (à adapter selon votre API)
  availableBETs: { id: number, name: string }[] = [
    { id: 1, name: 'Sonora BET' },
    { id: 2, name: 'Alpha Dieye' },
    { id: 3, name: 'BET Structura' },
    { id: 4, name: 'ClimaTech' }
  ];
Math: any;

  constructor(
    private etudeBetService: EtudeBetService,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Récupérer le propertyId depuis les paramètres de route
    this.route.params.subscribe(params => {
      if (params['propertyId']) {
        this.currentPropertyId = +params['propertyId'];
      }
      this.newEtude.propertyId = this.currentPropertyId;
      this.loadEtudes();
    });
  }

  loadEtudes() {
    this.isLoading = true;
    this.etudeBetService.getEtude(this.currentPropertyId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: EtudeResponse) => {
          this.etudes = this.transformEtudesFromAPI(response.content);
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.onSearch(); // Appliquer le filtre de recherche
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
        url: report.fileUrl
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
  getProgressSteps(statut: string): { step: number; isCompleted: boolean; isCurrent: boolean; label: string }[] {
    const steps = [
      { step: 1, label: 'En attente de réponse', isCompleted: false, isCurrent: false },
      { step: 2, label: 'En cours d\'acceptation', isCompleted: false, isCurrent: false },
      { step: 3, label: 'En cours de livraison', isCompleted: false, isCurrent: false },
      { step: 4, label: 'Validation/Rejet', isCompleted: false, isCurrent: false }
    ];

    switch (statut) {
      case 'En attente':
        steps[0].isCurrent = true;
        break;
      case 'En cours':
        steps[0].isCompleted = true;
        steps[1].isCurrent = true;
        break;
      case 'Livrée':
        steps[0].isCompleted = true;
        steps[1].isCompleted = true;
        steps[2].isCurrent = true;
        break;
      case 'Validée':
      case 'Rejetée':
        steps[0].isCompleted = true;
        steps[1].isCompleted = true;
        steps[2].isCompleted = true;
        steps[3].isCompleted = true;
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
    this.editEtude = { ...etude };
    this.showEditModal = true;
  }

  openDetailModal(etude: EtudeBET) {
    this.selectedEtude = etude;
    this.showDetailModal = true;
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

  closeAllModals() {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDetailModal = false;
    this.showValidateModal = false;
    this.showRejectModal = false;
    this.selectedEtude = null;
    this.rejectReason = '';
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
    // Note: Vous devrez adapter cette méthode selon votre API
    // L'API actuelle ne semble pas avoir d'endpoint pour modifier une étude
    console.log('Mise à jour non implémentée dans l\'API actuelle');
    this.closeAllModals();
  }

  validateEtude() {
    if (this.selectedEtude) {
      this.isLoading = true;
      this.etudeBetService.acceptEtude(this.selectedEtude.id).subscribe({
        next: (response) => {
          console.log('Étude validée avec succès');
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la validation:', error);
          this.isLoading = false;
        }
      });
    }
  }

  rejectEtude() {
    if (this.selectedEtude && this.rejectReason.trim()) {
      this.isLoading = true;
      this.etudeBetService.rejectEtude(this.selectedEtude.id).subscribe({
        next: (response) => {
          console.log('Étude rejetée avec succès');
          this.loadEtudes();
          this.closeAllModals();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du rejet:', error);
          this.isLoading = false;
        }
      });
    }
  }

  deleteEtude(etude: EtudeBET) {
    if (confirm('Êtes-vous sûr de vouloir supprimer cette étude ?')) {
      // Note: L'API ne semble pas avoir d'endpoint pour supprimer une étude
      // Seulement pour supprimer des rapports
      console.log('Suppression non disponible dans l\'API actuelle');
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

  // Add comment
  addComment(etude: EtudeBET, comment: string) {
    if (comment.trim()) {
      console.log('Ajout de commentaire - fonctionnalité à implémenter');
      // Cette fonctionnalité devra être ajoutée à l'API
    }
  }

  // Utility method to get BET name by ID
  getBETNameById(betId: number): string {
    const bet = this.availableBETs.find(b => b.id === betId);
    return bet ? bet.name : '';
  }
}