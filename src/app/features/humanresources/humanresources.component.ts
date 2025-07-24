// human-resources.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurService, Worker, WorkersResponse, CreateWorkerRequest } from '../../../services/utilisateur.service';

interface TeamMember {
  id: number;
  name: string;
  phone: string;
  email: string;
  position: string;
  status: 'affecté' | 'non-affecté' | 'en mission' | 'inactive';
  selected: boolean;
  originalWorker?: Worker;
}

@Component({
  selector: 'app-humanresources',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './humanresources.component.html',
  styleUrls: ['./humanresources.component.css']
})
export class HumanResourcesComponent implements OnInit {
  allTeamMembers: TeamMember[] = [];
  displayedMembers: TeamMember[] = [];
  filteredMembers: TeamMember[] = [];
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  selectAll = false;
  totalMembers = 0;
  startIndex = 1;
  endIndex = 10;
  searchQuery: string = '';
  selectedPeriod: string = '';
  selectedStatus: string = '';
  
  // Variables pour le popup
  showCreateUserModal = false;
  isCreatingUser = false;
  createUserErrors: string[] = [];
  
  // Données du formulaire de création
  newUser: CreateWorkerRequest = {
    nom: '',
    prenom: '',
    email: '',
    password: '',
    telephone: '',
    date: '',
    lieunaissance: '',
    adress: '',
    profil: 'WORKER'
  };

  // Variables de loading
  isLoading = false;
  errorMessage = '';
userForm: any;
isSubmitting: any;

  constructor(private utilisateurService: UtilisateurService) {}

  ngOnInit() {
    this.loadTeamMembers();
  }

  loadTeamMembers() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.utilisateurService.listUsers(this.currentPage - 1, this.itemsPerPage)
      .subscribe({
        next: (response: WorkersResponse) => {
          this.allTeamMembers = response.content.map(worker => 
            UtilisateurService.workerToTeamMember(worker)
          );
          this.totalMembers = response.totalElements;
          this.totalPages = response.totalPages;
          this.applyFilters();
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des utilisateurs:', error);
          this.errorMessage = 'Erreur lors du chargement des données';
          this.isLoading = false;
          // Fallback avec des données de test en cas d'erreur
          this.loadTestData();
        }
      });
  }

  // Données de test en cas d'erreur de chargement
  loadTestData() {
    this.allTeamMembers = [
      { id: 1, name: 'Aziz Ndiaye', phone: '+221-70-986-45-43', email: 'azizndiaye@gmail.com', position: 'Gestionnaire de Projet', status: 'affecté', selected: false },
      { id: 2, name: 'Abdoul Cisse', phone: '+221-70-986-45-43', email: 'abdoulcisse@gmail.com', position: 'Ouvrier', status: 'affecté', selected: false },
      { id: 3, name: 'Ndeye Sine', phone: '+221-70-986-45-43', email: 'ndeyesine@gmail.com', position: 'Ouvrier', status: 'non-affecté', selected: false },
    ];
    this.totalMembers = this.allTeamMembers.length;
    this.totalPages = Math.ceil(this.totalMembers / this.itemsPerPage);
    this.applyFilters();
  }

  applyFilters() {
    let filtered = [...this.allTeamMembers];

    // Filtre par recherche
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      filtered = filtered.filter(member => 
        member.name.toLowerCase().includes(query) ||
        member.email.toLowerCase().includes(query) ||
        member.phone.includes(query)
      );
    }

    // Filtre par statut
    if (this.selectedStatus && this.selectedStatus !== '') {
      filtered = filtered.filter(member => member.status === this.selectedStatus);
    }

    this.filteredMembers = filtered;
    this.totalMembers = filtered.length;
    this.calculateTotalPages();
    this.currentPage = 1; // Reset à la première page
    this.paginateData();
  }

  calculateTotalPages() {
    this.totalPages = Math.ceil(this.filteredMembers.length / this.itemsPerPage);
  }

  paginateData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    
    this.displayedMembers = this.filteredMembers.slice(start, end);
    
    this.startIndex = this.filteredMembers.length > 0 ? start + 1 : 0;
    this.endIndex = Math.min(end, this.filteredMembers.length);
    
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.displayedMembers.forEach(member => member.selected = this.selectAll);
    
    // Update the selection state in the filtered array too
    const start = (this.currentPage - 1) * this.itemsPerPage;
    for (let i = 0; i < this.displayedMembers.length; i++) {
      const filteredIndex = start + i;
      if (filteredIndex < this.filteredMembers.length) {
        this.filteredMembers[filteredIndex].selected = this.selectAll;
      }
    }
  }

  toggleMemberSelection(member: TeamMember) {
    member.selected = !member.selected;
    this.updateSelectAllState();
  }

  updateSelectAllState() {
    this.selectAll = this.displayedMembers.length > 0 && this.displayedMembers.every(member => member.selected);
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'affecté': return 'text-green-500';
      case 'non-affecté': return 'text-red-500';
      case 'en mission': return 'text-blue-500';
      case 'inactive': return 'text-gray-500';
      default: return '';
    }
  }

  getStatusDot(status: string): string {
    return status === 'affecté' ? 'bg-green-500' : 
           status === 'non-affecté' ? 'bg-red-500' : 
           status === 'en mission' ? 'bg-blue-500' : 
           'bg-gray-500';
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.paginateData();
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

  // Méthodes de filtrage
  filterByPeriod(period: string): void {
    this.selectedPeriod = period;
    // TODO: Implémenter la logique de filtrage par période
    this.applyFilters();
  }

  filterByStatus(status: string): void {
    this.selectedStatus = status;
    this.applyFilters();
  }

  searchProjects(): void {
    this.applyFilters();
  }

  // Méthodes pour le popup de création d'utilisateur
  openCreateUserModal() {
    this.showCreateUserModal = true;
    this.resetCreateUserForm();
  }

  closeCreateUserModal() {
    this.showCreateUserModal = false;
    this.resetCreateUserForm();
  }

  resetCreateUserForm() {
    this.newUser = {
      nom: '',
      prenom: '',
      email: '',
      password: '',
      telephone: '',
      date: '',
      lieunaissance: '',
      adress: '',
      profil: 'WORKER'
    };
    this.createUserErrors = [];
    this.isCreatingUser = false;
  }

  createUser() {
    // Validation
    this.createUserErrors = UtilisateurService.validateWorkerData(this.newUser);
    
    if (this.createUserErrors.length > 0) {
      return;
    }

    this.isCreatingUser = true;
    
    this.utilisateurService.createUser(this.newUser)
      .subscribe({
        next: (response: Worker) => {
          console.log('Utilisateur créé avec succès:', response);
          this.isCreatingUser = false;
          this.closeCreateUserModal();
          // Recharger la liste des utilisateurs
          this.loadTeamMembers();
        },
        error: (error) => {
          console.error('Erreur lors de la création de l\'utilisateur:', error);
          this.createUserErrors = ['Erreur lors de la création de l\'utilisateur. Veuillez réessayer.'];
          this.isCreatingUser = false;
        }
      });
  }

  // Méthodes utilitaires pour le filtrage par statut
  getStatusOptions() {
    return [
      { value: '', label: 'Tous les statuts' },
      { value: 'affecté', label: 'Affecté' },
      { value: 'non-affecté', label: 'Non-affecté' },
      { value: 'en mission', label: 'En mission' },
      { value: 'inactive', label: 'Inactive' }
    ];
  }

  // Méthode pour supprimer les utilisateurs sélectionnés
  deleteSelectedUsers() {
    const selectedMembers = this.displayedMembers.filter(member => member.selected);
    if (selectedMembers.length === 0) {
      alert('Aucun utilisateur sélectionné');
      return;
    }

    if (confirm(`Êtes-vous sûr de vouloir supprimer ${selectedMembers.length} utilisateur(s) ?`)) {
      // TODO: Implémenter la suppression via l'API
      console.log('Suppression des utilisateurs:', selectedMembers);
    }
  }

  // Méthode pour exporter les données
  exportData() {
    // TODO: Implémenter l'export des données
    console.log('Export des données');
  }
}