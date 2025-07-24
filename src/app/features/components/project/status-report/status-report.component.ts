import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProgressReportComponent } from "../../dashboard/progess-report/progess-report.component";
import { FormsModule } from '@angular/forms';
import { ProjectBudgetService, ProgressAlbum, CreateAlbumRequest, UpdateAlbumRequest } from '../../../../../services/project-details.service';

@Component({
  selector: 'app-status-report',
  standalone: true,
  imports: [CommonModule, ProgressReportComponent, FormsModule],
  templateUrl: './status-report.component.html',
  styleUrl: './status-report.component.css'
})
export class StatusReportComponent implements OnInit {
  activeTab: 'albums' | 'graphique' | 'tableau' = 'albums';
  
  projectId!: number;
  albums: ProgressAlbum[] = [];
  loading = true;
  error: string | null = null;

  // Variables pour les popups
  showCreateModal = false;
  showEditModal = false;
  showDeleteModal = false;
  showSuccessMessage = false;
  successMessage = '';
  
  // Album en cours de modification/suppression
  currentAlbum: ProgressAlbum | null = null;
  albumToDelete: ProgressAlbum | null = null;

  // Formulaire pour créer/modifier un album
  albumForm = {
    name: '',
    description: '',
    pictures: [] as string[]
  };

  pourcentages: string[] = ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '66%', '70%', '80%', '90%', '100%'];

  lignes = [
    { etape: 'Gros œuvre', pourcentage: '66%', date: '04/03/2025' },
    { etape: 'Second œuvre', pourcentage: '60%', date: '11/05/2025' },
    { etape: 'Finition', pourcentage: '', date: '' }
  ];

  constructor(
    private route: ActivatedRoute,
    private budgetService: ProjectBudgetService
  ) {}

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.projectId = +idFromUrl;
      this.fetchAlbumData();
    } else {
      this.error = 'Projet introuvable';
      this.loading = false;
    }
  }

  fetchAlbumData(): void {
    this.loading = true;
    this.budgetService.getAlbum(this.projectId).subscribe({
      next: (data) => {
        this.albums = data;
        this.loading = false;
      },
      error: () => {
        this.error = "Erreur lors du chargement des albums";
        this.loading = false;
      }
    });
  }

  setActiveTab(tab: 'albums' | 'graphique' | 'tableau') {
    this.activeTab = tab;
  }

  // Ouvrir le modal de création
  onAddClick(): void {
    this.resetForm();
    this.showCreateModal = true;
  }

  // Ouvrir le modal de modification
  onEditAlbum(album: ProgressAlbum): void {
    this.currentAlbum = album;
    this.albumForm = {
      name: album.phaseName,
      description: album.description,
      pictures: [...album.pictures]
    };
    this.showEditModal = true;
  }

  // Ouvrir le modal de suppression
  onDeleteAlbum(album: ProgressAlbum): void {
    this.albumToDelete = album;
    this.showDeleteModal = true;
  }

  // Confirmer la suppression
  confirmDelete(): void {
    if (this.albumToDelete) {
      this.budgetService.deleteAlbum(this.albumToDelete.id).subscribe({
        next: () => {
          this.showSuccessMessage = true;
          this.successMessage = 'Album supprimé avec succès';
          this.fetchAlbumData(); // Recharger les données
          this.closeDeleteModal();
          this.hideSuccessMessage();
        },
        error: (error) => {
          console.error('Erreur lors de la suppression:', error);
          this.error = 'Erreur lors de la suppression de l\'album';
        }
      });
    }
  }

  // Créer un nouvel album
  createAlbum(): void {
    if (!this.albumForm.name.trim()) {
      this.error = 'Le nom de l\'album est requis';
      return;
    }

    const newAlbum: CreateAlbumRequest = {
      realEstatePropertyId: this.projectId,
      name: this.albumForm.name,
      description: this.albumForm.description,
      pictures: this.albumForm.pictures
    };

    this.budgetService.saveAlbum(newAlbum).subscribe({
      next: () => {
        this.showSuccessMessage = true;
        this.successMessage = 'Album créé avec succès';
        this.fetchAlbumData(); // Recharger les données
        this.closeCreateModal();
        this.hideSuccessMessage();
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.error = 'Erreur lors de la création de l\'album';
      }
    });
  }

  // Modifier un album
  updateAlbum(): void {
    if (!this.currentAlbum || !this.albumForm.name.trim()) {
      this.error = 'Le nom de l\'album est requis';
      return;
    }

    const updatedAlbum: UpdateAlbumRequest = {
      name: this.albumForm.name,
      description: this.albumForm.description,
      pictures: this.albumForm.pictures
    };

    this.budgetService.updateAlbum(this.currentAlbum.id, updatedAlbum).subscribe({
      next: () => {
        this.showSuccessMessage = true;
        this.successMessage = 'Album modifié avec succès';
        this.fetchAlbumData(); // Recharger les données
        this.closeEditModal();
        this.hideSuccessMessage();
      },
      error: (error) => {
        console.error('Erreur lors de la modification:', error);
        this.error = 'Erreur lors de la modification de l\'album';
      }
    });
  }

  // Fermer les modals
  closeCreateModal(): void {
    this.showCreateModal = false;
    this.resetForm();
  }

  closeEditModal(): void {
    this.showEditModal = false;
    this.currentAlbum = null;
    this.resetForm();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.albumToDelete = null;
  }

  // Réinitialiser le formulaire
  resetForm(): void {
    this.albumForm = {
      name: '',
      description: '',
      pictures: []
    };
    this.error = null;
  }

  // Masquer le message de succès après 3 secondes
  hideSuccessMessage(): void {
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 3000);
  }

  // Actions des albums (pour compatibilité avec votre code existant)
  onAlbumAction(action: string, id: number) {
    const album = this.albums.find(a => a.id === id);
    if (!album) return;

    switch(action) {
      case 'edit':
        this.onEditAlbum(album);
        break;
      case 'delete':
        this.onDeleteAlbum(album);
        break;
      case 'view':
        console.log('Voir album:', id);
        // Implémenter la logique de visualisation
        break;
    }
  }

  // Méthode pour formater la date
  formatDate(dateInput: string | number[]): string {
    if (Array.isArray(dateInput)) {
      // Format [2025, 6, 24, ...] -> "24/06/2025"
      const [year, month, day] = dateInput;
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
    // Si c'est déjà une string, la retourner telle quelle
    return dateInput;
  }

  // Méthode pour obtenir le nombre de photos
  getPhotoCount(pictures: string[]): number {
    return pictures ? pictures.length : 0;
  }
}