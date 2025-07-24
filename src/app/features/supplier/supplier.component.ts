import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UtilisateurService } from '../../../services/utilisateur.service';
import { finalize } from 'rxjs';

interface Worker {
  id: number;
  name: string;
  phone: string;
  email: string;
  position: string;
  status: string;
  selected: boolean;
}

@Component({
  selector: 'app-supplier',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './supplier.component.html',
  styleUrls: ['./supplier.component.css']
})
export class SupplierComponent implements OnInit {
  nouveauWorker = {
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    password: '',
    date: '',
    lieunaissance: '',
    adress: '',
    profil: 'WORKER' // Profil par défaut pour les workers
  };

  allWorkers: Worker[] = [];
  displayedWorkers: Worker[] = [];
  currentPage = 1;
  totalPages = 1;
  itemsPerPage = 10;
  selectAll = false;
  totalWorkers = 0;
  startIndex = 1;
  endIndex = 10;
  searchQuery: string = '';
  
  showModal = false;
  isLoading = false;
  errorMessage = '';

  constructor(private utilisateurService: UtilisateurService) {}

  ngOnInit() {
    this.loadWorkers();
  }

  loadWorkers() {
    this.isLoading = true;
    this.utilisateurService.listUsers(this.currentPage - 1, this.itemsPerPage)
      .pipe(
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          // Correction : utiliser directement la classe UtilisateurService
          this.allWorkers = response.content.map(worker => 
            UtilisateurService.workerToTeamMember(worker)
          );
          this.totalWorkers = response.totalElements;
          this.totalPages = response.totalPages;
          this.paginateData();
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors du chargement des workers';
          console.error(err);
        }
      });
  }

  createWorker() {
    // Correction : utiliser directement la classe UtilisateurService
    const validationErrors = UtilisateurService.validateWorkerData(this.nouveauWorker);
    
    if (validationErrors.length > 0) {
      this.errorMessage = validationErrors.join(', ');
      return;
    }

    this.isLoading = true;
    this.utilisateurService.createUser(this.nouveauWorker)
      .pipe(
        finalize(() => {
          this.isLoading = false;
          this.closeModal();
        })
      )
      .subscribe({
        next: () => {
          this.loadWorkers(); // Recharger la liste après création
        },
        error: (err) => {
          this.errorMessage = 'Erreur lors de la création du worker';
          console.error(err);
        }
      });
  }

  paginateData() {
    const start = (this.currentPage - 1) * this.itemsPerPage;
    const end = start + this.itemsPerPage;
    
    this.displayedWorkers = this.allWorkers.slice(start, end);
    
    this.startIndex = start + 1;
    this.endIndex = Math.min(end, this.totalWorkers);
    
    this.updateSelectAllState();
  }

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    this.displayedWorkers.forEach(worker => worker.selected = this.selectAll);
    
    const start = (this.currentPage - 1) * this.itemsPerPage;
    for (let i = 0; i < this.displayedWorkers.length; i++) {
      this.allWorkers[start + i].selected = this.selectAll;
    }
  }

  toggleWorkerSelection(worker: Worker) {
    const displayedIndex = this.displayedWorkers.findIndex(w => w.id === worker.id);
    if (displayedIndex >= 0) {
      this.displayedWorkers[displayedIndex].selected = !this.displayedWorkers[displayedIndex].selected;
    }
    
    const mainIndex = this.allWorkers.findIndex(w => w.id === worker.id);
    if (mainIndex >= 0) {
      this.allWorkers[mainIndex].selected = !this.allWorkers[mainIndex].selected;
    }
    
    this.updateSelectAllState();
  }

  updateSelectAllState() {
    this.selectAll = this.displayedWorkers.length > 0 && 
      this.displayedWorkers.every(worker => worker.selected);
  }

  getStatusColor(status: string): string {
    switch(status) {
      case 'affecté':
        return 'text-green-500';
      case 'en mission':
        return 'text-blue-500';
      case 'non-affecté':
        return 'text-yellow-500';
      case 'inactive':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  }

  getStatusDot(status: string): string {
    switch(status) {
      case 'affecté':
        return 'bg-green-500';
      case 'en mission':
        return 'bg-blue-500';
      case 'non-affecté':
        return 'bg-yellow-500';
      case 'inactive':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.loadWorkers();
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

  searchWorkers() {
    // Implémentation basique - idéalement à faire côté serveur
    if (this.searchQuery) {
      this.displayedWorkers = this.allWorkers.filter(worker =>
        worker.name.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        worker.email.toLowerCase().includes(this.searchQuery.toLowerCase())
      );
    } else {
      this.paginateData();
    }
  }

  openModal() {
    this.showModal = true;
    this.errorMessage = '';
    this.nouveauWorker = {
      nom: '',
      prenom: '',
      email: '',
      telephone: '',
      password: '',
      date: '',
      lieunaissance: '',
      adress: '',
      profil: 'WORKER'
    };
  }

  closeModal() {
    this.showModal = false;
  }

  onSubmit() {
    this.createWorker();
  }
}