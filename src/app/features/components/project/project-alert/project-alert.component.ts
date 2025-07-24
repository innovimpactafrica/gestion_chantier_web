import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectBudgetService, Signalement, SignalementResponse, CreateSignalementRequest } from '../../../../../services/project-details.service';

@Component({
  selector: 'app-project-alert',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-alert.component.html',
  styleUrl: './project-alert.component.css'
})
export class ProjectAlertComponent implements OnInit {
  signalements: Signalement[] = [];
  filteredSignalements: Signalement[] = [];
  searchTerm: string = '';
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  loading: boolean = false;
  propertyId: number = 17;

  // Ajout de confirmation suppression
  showDeleteConfirmModal: boolean = false;
  signalementIdToDelete: number | null = null;

  // Ajout modal
  showAddModal: boolean = false;
  newSignalement: CreateSignalementRequest = {
    title: '',
    description: '',
    propertyId: 17,
    pictures: []
  };

  Math: any = Math;

  constructor(private projectBudgetService: ProjectBudgetService) {}

  ngOnInit(): void {
    this.loadSignalements();
  }

  loadSignalements(): void {
    this.loading = true;
    this.projectBudgetService.getSignalement(this.propertyId, this.currentPage, this.pageSize)
      .subscribe({
        next: (response: SignalementResponse) => {
          this.signalements = response.content;
          this.filteredSignalements = [...this.signalements];
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des signalements:', error);
          this.loading = false;
        }
      });
  }

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
    return date.toLocaleDateString('fr-FR');
  }

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredSignalements = [...this.signalements];
    } else {
      this.filteredSignalements = this.signalements.filter(signalement =>
        signalement.title.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        signalement.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    }
  }

  openAddModal(): void {
    this.showAddModal = true;
    this.newSignalement = {
      title: '',
      description: '',
      propertyId: this.propertyId,
      pictures: []
    };
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  addSignalement(): void {
    if (!this.newSignalement.title.trim() || !this.newSignalement.description.trim()) {
      return; // pas d'alerte, tu peux gérer une erreur visuelle si tu veux
    }

    this.loading = true;
    this.projectBudgetService.saveSignalement(this.newSignalement)
      .subscribe({
        next: () => {
          this.loadSignalements();
          this.closeAddModal();
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du signalement:', error);
          this.loading = false;
        }
      });
  }

  // Méthodes de confirmation suppression
  openDeleteConfirmModal(id: number): void {
    this.signalementIdToDelete = id;
    this.showDeleteConfirmModal = true;
  }

  cancelDelete(): void {
    this.signalementIdToDelete = null;
    this.showDeleteConfirmModal = false;
  }

  confirmDelete(): void {
    if (this.signalementIdToDelete !== null) {
      this.loading = true;
      this.projectBudgetService.deleteSignalement(this.signalementIdToDelete).subscribe({
        next: () => {
          this.loadSignalements();
          this.showDeleteConfirmModal = false;
          this.signalementIdToDelete = null;
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors de la suppression :', error);
          this.loading = false;
          this.showDeleteConfirmModal = false;
        }
      });
    }
  }

  editSignalement(signalement: Signalement): void {
    console.log('Édition du signalement:', signalement);
    // À implémenter plus tard
  }

  // Pagination
  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadSignalements();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadSignalements();
    }
  }
}
