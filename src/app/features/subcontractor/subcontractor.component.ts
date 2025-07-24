import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurService, Worker, WorkersResponse } from '../../../services/utilisateur.service'; // Ajustez le chemin

interface SubcontractorMember {
  id: number;
  raisonSociale: string;
  nomContact: string;
  telephone: string;
  email: string;
  status: 'active' | 'inactive';
  selected: boolean;
  originalWorker?: Worker;
}

@Component({
  selector: 'app-subcontractor',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './subcontractor.component.html',
  styleUrl: './subcontractor.component.css'
})
export class SubcontractorComponent implements OnInit {
  showModal = false;
  searchTerm = '';
  isLoading = false;
  errorMessage = '';

  nouveauSousTraitant = {
    raisonSociale: '',
    nomContact: '',
    telephone: '',
    email: ''
  };

  allSubcontractors: SubcontractorMember[] = [];
  displayedMembers: SubcontractorMember[] = [];
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  selectAll = false;
  totalMembers = 0;
  startIndex = 1;
  endIndex = 10;
  searchQuery: string = '';

  constructor(private utilisateurService: UtilisateurService) {}

  ngOnInit() {
    this.loadSubcontractors();
  }

  /**
   * Charge les sous-traitants depuis l'API
   */
  loadSubcontractors() {
    this.isLoading = true;
    this.errorMessage = '';

    this.utilisateurService.getSubcontractors(this.currentPage - 1, this.itemsPerPage)
      .subscribe({
        next: (response: WorkersResponse) => {
          this.allSubcontractors = response.content.map(worker => 
            UtilisateurService.workerToSubcontractor(worker)
          );
          this.totalMembers = response.totalElements;
          this.totalPages = response.totalPages;
          this.updatePaginationData();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des sous-traitants:', error);
          this.errorMessage = 'Erreur lors du chargement des sous-traitants';
          this.isLoading = false;
        }
      });
  }

  /**
   * Met à jour les données de pagination
   */
  updatePaginationData() {
    this.displayedMembers = this.allSubcontractors;
    this.startIndex = this.allSubcontractors.length > 0 ? 
      ((this.currentPage - 1) * this.itemsPerPage) + 1 : 0;
    this.endIndex = Math.min(
      this.startIndex + this.allSubcontractors.length - 1,
      this.totalMembers
    );
    this.updateSelectAllState();
  }

  /**
   * Filtre les sous-traitants affichés selon le terme de recherche
   */
  filterDisplayedMembers() {
    if (!this.searchQuery.trim()) {
      this.displayedMembers = this.allSubcontractors;
    } else {
      const query = this.searchQuery.toLowerCase();
      this.displayedMembers = this.allSubcontractors.filter(member =>
        member.nomContact.toLowerCase().includes(query) ||
        member.raisonSociale.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.telephone.includes(query)
      );
    }
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.displayedMembers.forEach(member => member.selected = this.selectAll);
  }

  toggleMemberSelection(member: SubcontractorMember) {
    member.selected = !member.selected;
    this.updateSelectAllState();
  }

  updateSelectAllState() {
    this.selectAll = this.displayedMembers.length > 0 && 
      this.displayedMembers.every(member => member.selected);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'text-green-500';
      case 'inactive': return 'text-red-500';
      default: return 'text-gray-500';
    }
  }

  getStatusDot(status: string): string {
    return status === 'active' ? 'bg-green-500' : 'bg-red-500';
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadSubcontractors();
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = startPage + maxVisiblePages - 1;
      
      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // Recherche 
  searchProjects(): void {
    this.filterDisplayedMembers();
  }

  // Ouvrir le modal
  openModal() {
    this.showModal = true;
    this.nouveauSousTraitant = {
      raisonSociale: '',
      nomContact: '',
      telephone: '',
      email: ''
    };
  }

  // Fermer le modal
  closeModal() {
    this.showModal = false;
  }

  // Ajouter un nouveau sous-traitant
  ajouterSousTraitant() {
    if (this.nouveauSousTraitant.raisonSociale && 
        this.nouveauSousTraitant.nomContact && 
        this.nouveauSousTraitant.telephone && 
        this.nouveauSousTraitant.email) {
      
      // TODO: Implémenter l'appel API pour créer un nouveau sous-traitant
      // Pour l'instant, on simule l'ajout local
      const nouveauMembre: SubcontractorMember = {
        id: Date.now(), // ID temporaire
        raisonSociale: this.nouveauSousTraitant.raisonSociale,
        nomContact: this.nouveauSousTraitant.nomContact,
        telephone: this.nouveauSousTraitant.telephone,
        email: this.nouveauSousTraitant.email,
        status: 'active',
        selected: false
      };

      this.allSubcontractors.push(nouveauMembre);
      this.totalMembers++;
      this.filterDisplayedMembers();
      this.closeModal();
      
      console.log('Sous-traitant ajouté avec succès !');
    } else {
      console.log('Veuillez remplir tous les champs obligatoires');
    }
  }

  /**
   * Supprime les sous-traitants sélectionnés
   */
  deleteSelectedSubcontractors() {
    const selectedIds = this.displayedMembers
      .filter(member => member.selected)
      .map(member => member.id);

    if (selectedIds.length > 0) {
      // TODO: Implémenter l'appel API pour supprimer
      this.allSubcontractors = this.allSubcontractors.filter(
        member => !selectedIds.includes(member.id)
      );
      this.totalMembers = this.allSubcontractors.length;
      this.filterDisplayedMembers();
      console.log(`${selectedIds.length} sous-traitant(s) supprimé(s)`);
    }
  }

  /**
   * Exporte les données des sous-traitants
   */
  exportData() {
    // TODO: Implémenter l'export (CSV, Excel, etc.)
    console.log('Export des données des sous-traitants');
  }
}
// le html 
