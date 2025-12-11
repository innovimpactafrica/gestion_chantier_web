import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User, UserPageResponse, CreateUserRequest } from '../../../services/user.service';

interface SubcontractorMember {
  id: number;
  raisonSociale: string;
  nomContact: string;
  telephone: string;
  email: string;
  status: 'active' | 'inactive';
  selected: boolean;
  originalUser?: User;
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
  successMessage = '';

  nouveauSousTraitant = {
    raisonSociale: '',
    nomContact: '',
    prenom: '',
    telephone: '',
    email: '',
    password: '',
    dateNaissance: '',
    lieuNaissance: '',
    adresse: ''
  };

  allSubcontractors: SubcontractorMember[] = [];
  displayedMembers: SubcontractorMember[] = [];
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 5;
  selectAll = false;
  totalMembers = 0;
  startIndex = 1;
  endIndex = 5;
  searchQuery: string = '';

  constructor(private userService: UserService) {}

  ngOnInit() {
    this.loadSubcontractors();
  }

  /**
   * Charge les sous-traitants depuis l'API en utilisant getUserByProfil
   */
  loadSubcontractors() {
    this.isLoading = true;
    this.errorMessage = '';

    this.userService.getUserByProfil(
      'SUBCONTRACTOR', 
      this.searchQuery || undefined,
      this.currentPage - 1, 
      this.itemsPerPage
    ).subscribe({
      next: (response: UserPageResponse) => {
        console.log('✅ Sous-traitants chargés:', response);
        
        this.allSubcontractors = response.content.map(user => this.userToSubcontractor(user));
        this.totalMembers = response.totalElements;
        this.totalPages = response.totalPages;
        this.updatePaginationData();
        this.isLoading = false;
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des sous-traitants:', error);
        this.errorMessage = error.userMessage || 'Erreur lors du chargement des sous-traitants';
        this.isLoading = false;
      }
    });
  }

  /**
   * Convertit un User en SubcontractorMember
   */
  private userToSubcontractor(user: User): SubcontractorMember {
    return {
      id: user.id,
      raisonSociale: user.company?.nom || user.nom + ' ' + user.prenom,
      nomContact: user.nom + ' ' + user.prenom,
      telephone: user.telephone,
      email: user.email,
      status: user.activated ? 'active' : 'inactive',
      selected: false,
      originalUser: user
    };
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
   * Recherche les sous-traitants
   */
  searchProjects(): void {
    this.currentPage = 1;
    this.loadSubcontractors();
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

  /**
   * Ouvre le modal
   */
  openModal() {
    this.showModal = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.nouveauSousTraitant = {
      raisonSociale: '',
      nomContact: '',
      prenom: '',
      telephone: '',
      email: '',
      password: '',
      dateNaissance: '',
      lieuNaissance: '',
      adresse: ''
    };
  }

  /**
   * Ferme le modal
   */
  closeModal() {
    this.showModal = false;
    this.errorMessage = '';
    this.successMessage = '';
  }

  /**
   * Ajoute un nouveau sous-traitant en utilisant createUser du UserService
   */
  ajouterSousTraitant() {
    // Validation des champs obligatoires
    if (!this.nouveauSousTraitant.nomContact || 
        !this.nouveauSousTraitant.prenom ||
        !this.nouveauSousTraitant.telephone || 
        !this.nouveauSousTraitant.email ||
        !this.nouveauSousTraitant.password ||
        !this.nouveauSousTraitant.dateNaissance ||
        !this.nouveauSousTraitant.lieuNaissance ||
        !this.nouveauSousTraitant.adresse) {
      
      this.errorMessage = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    // Validation email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this.nouveauSousTraitant.email)) {
      this.errorMessage = 'Veuillez saisir une adresse email valide';
      return;
    }

    // Validation téléphone (format simple)
    if (this.nouveauSousTraitant.telephone.length < 9) {
      this.errorMessage = 'Veuillez saisir un numéro de téléphone valide';
      return;
    }

    // Validation mot de passe
    if (this.nouveauSousTraitant.password.length < 6) {
      this.errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    // Création de l'objet CreateUserRequest avec le profil SUBCONTRACTOR
    const createUserData: CreateUserRequest = {
      nom: this.nouveauSousTraitant.nomContact,
      prenom: this.nouveauSousTraitant.prenom,
      email: this.nouveauSousTraitant.email,
      password: this.nouveauSousTraitant.password,
      telephone: this.nouveauSousTraitant.telephone,
      date: this.nouveauSousTraitant.dateNaissance,
      lieunaissance: this.nouveauSousTraitant.lieuNaissance,
      adress: this.nouveauSousTraitant.adresse,
      profil: 'SUBCONTRACTOR' // Profil par défaut
    };

    console.log('📤 Création d\'un sous-traitant:', createUserData);

    this.userService.createUser(createUserData).subscribe({
      next: (response) => {
        console.log('✅ Sous-traitant créé avec succès:', response);
        this.successMessage = 'Sous-traitant ajouté avec succès !';
        
        // Recharger la liste
        this.loadSubcontractors();
        
        // Fermer le modal après 1.5 secondes
        setTimeout(() => {
          this.closeModal();
        }, 1500);
      },
      error: (error) => {
        console.error('❌ Erreur lors de la création du sous-traitant:', error);
        this.errorMessage = error.userMessage || 'Erreur lors de la création du sous-traitant';
        this.isLoading = false;
      }
    });
  }

  /**
   * Supprime les sous-traitants sélectionnés
   */
  deleteSelectedSubcontractors() {
    const selectedMembers = this.displayedMembers.filter(member => member.selected);

    if (selectedMembers.length === 0) {
      this.errorMessage = 'Veuillez sélectionner au moins un sous-traitant à supprimer';
      return;
    }

    if (!confirm(`Êtes-vous sûr de vouloir supprimer ${selectedMembers.length} sous-traitant(s) ?`)) {
      return;
    }

    this.isLoading = true;
    let deletedCount = 0;
    let errorCount = 0;

    selectedMembers.forEach((member, index) => {
      this.userService.deleteUser(member.id).subscribe({
        next: () => {
          deletedCount++;
          console.log(`✅ Sous-traitant ${member.nomContact} supprimé`);
          
          // Si c'est le dernier élément traité
          if (index === selectedMembers.length - 1) {
            this.finishDeletion(deletedCount, errorCount);
          }
        },
        error: (error) => {
          errorCount++;
          console.error(`❌ Erreur suppression ${member.nomContact}:`, error);
          
          // Si c'est le dernier élément traité
          if (index === selectedMembers.length - 1) {
            this.finishDeletion(deletedCount, errorCount);
          }
        }
      });
    });
  }

  /**
   * Finalise la suppression
   */
  private finishDeletion(deletedCount: number, errorCount: number) {
    this.isLoading = false;
    
    if (deletedCount > 0) {
      this.successMessage = `${deletedCount} sous-traitant(s) supprimé(s) avec succès`;
      this.loadSubcontractors();
    }
    
    if (errorCount > 0) {
      this.errorMessage = `${errorCount} erreur(s) lors de la suppression`;
    }

    setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
    }, 3000);
  }

  /**
   * Exporte les données des sous-traitants
   */
  exportData() {
    console.log('📊 Export des données des sous-traitants');
    
    // Créer le contenu CSV
    const headers = ['ID', 'Raison Sociale', 'Nom Contact', 'Téléphone', 'Email', 'Status'];
    const csvContent = [
      headers.join(','),
      ...this.allSubcontractors.map(sub => 
        `${sub.id},"${sub.raisonSociale}","${sub.nomContact}",${sub.telephone},${sub.email},${sub.status}`
      )
    ].join('\n');

    // Créer un blob et télécharger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `sous-traitants_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    this.successMessage = 'Export réussi !';
    setTimeout(() => this.successMessage = '', 3000);
  }
}