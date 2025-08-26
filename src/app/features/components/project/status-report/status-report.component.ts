import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProgressReportComponent } from "../../dashboard/progess-report/progess-report.component";
import { FormsModule } from '@angular/forms';
import { ProjectBudgetService, ProgressAlbum, CreateAlbumRequest, UpdateAlbumRequest } from '../../../../../services/project-details.service';

interface TableRow {
  etape: string;
  pourcentage: string;
  date: string;
  indicatorId: number;
}

@Component({
  selector: 'app-status-report',
  standalone: true,
  imports: [CommonModule, ProgressReportComponent, FormsModule],
  templateUrl: './status-report.component.html',
  styleUrl: './status-report.component.css' 
})
export class StatusReportComponent implements OnInit {
handleImageError($event: ErrorEvent,_t26: ProgressAlbum) {
throw new Error('Method not implemented.');
}
  @ViewChild(ProgressReportComponent) progressReportComponent!: ProgressReportComponent;
  
  activeTab: 'albums' | 'graphique' | 'tableau' = 'albums';
  
  projectId!: number;
  albums: ProgressAlbum[] = [];
  loading = true;
  error: string | null = null;
  updatingPhase: string | null = null;

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

  // Données du tableau avec les IDs des indicateurs
  lignes: TableRow[] = [
    { etape: 'Gros œuvre', pourcentage: '', date: '', indicatorId: 49 },
    { etape: 'Second œuvre', pourcentage: '', date: '', indicatorId: 50 },
    { etape: 'Finition', pourcentage: '', date: '', indicatorId: 51 }
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

  isUpdating(phaseName: string): boolean {
    return this.updatingPhase === phaseName;
  }

  // === MÉTHODES POUR LA GESTION DES DONNÉES ===
  
  fetchAlbumData(): void {
    this.loading = true;
    this.error = null;
    
    this.budgetService.getAlbum(this.projectId).subscribe({
      next: (data) => {
        this.albums = data;
        this.loading = false;
        console.log('Albums récupérés:', data);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des albums:', error);
        this.handleFetchError(error, "albums");
      }
    });
  }

  private handleFetchError(error: any, type: string): void {
    this.loading = false;
    
    if (error.status === 403) {
      this.error = `Accès refusé lors du chargement des ${type}. Vérifiez vos permissions.`;
    } else if (error.status === 401) {
      this.error = "Session expirée. Veuillez vous reconnecter.";
    } else {
      this.error = `Erreur lors du chargement des ${type}`;
    }
  }

  // === MÉTHODES POUR LA GESTION DES ONGLETS ===

  setActiveTab(tab: 'albums' | 'graphique' | 'tableau') {
    this.activeTab = tab;
    
    if (tab === 'tableau') {
      this.onTableTabActivated();
    }
  }

  onTableTabActivated(): void {
    setTimeout(() => {
      this.updateTableWithProgressData();
    }, 100);
  }

  updateTableWithProgressData(): void {
    if (this.progressReportComponent && this.progressReportComponent.progressData) {
      const progressData = this.progressReportComponent.progressData;
      
      this.lignes = this.lignes.map(ligne => {
        const matchingProgress = progressData.find(p => p.label === ligne.etape);
        if (matchingProgress) {
          return {
            ...ligne,
            pourcentage: `${Math.round(matchingProgress.value)}%`,
            date: matchingProgress.lastUpdated || this.getCurrentDatePrivate()
          };
        }
        return ligne;
      });
    }
  }

  refreshTableData(): void {
    if (this.progressReportComponent) {
      this.progressReportComponent.refreshData();
      setTimeout(() => {
        this.updateTableWithProgressData();
      }, 500);
    }
  }

  // === MÉTHODES POUR LA GESTION DES INDICATEURS DE PROGRÈS ===

  updatePhaseProgress(indicatorId: number, phaseName: string, newProgress: number): void {
    this.updatingPhase = phaseName;
    this.error = null;
    
    this.budgetService.updateIndicator(indicatorId, newProgress)
      .subscribe({
        next: (response) => {
          console.log(`${phaseName} mis à jour à ${newProgress}%`, response);
          this.handleProgressUpdateSuccess(phaseName, newProgress);
        },
        error: (error) => {
          console.error(`Erreur lors de la mise à jour de ${phaseName}:`, error);
          this.handleProgressUpdateError(error, phaseName);
        }
      });
  }

  private handleProgressUpdateSuccess(phaseName: string, newProgress: number): void {
    this.updatingPhase = null;
    this.updateLocalProgressData(phaseName, newProgress);
    
    setTimeout(() => {
      this.refreshTableData();
    }, 200);
  }

  private handleProgressUpdateError(error: any, phaseName: string): void {
    this.updatingPhase = null;
    
    if (error.status === 403) {
      this.error = `Vous n'avez pas les droits pour modifier ${phaseName}.`;
    } else if (error.status === 401) {
      this.error = "Session expirée. Veuillez vous reconnecter.";
    } else {
      this.error = `Erreur lors de la mise à jour de ${phaseName}`;
    }
    
    this.revertProgressChange(phaseName);
  }

  private updateLocalProgressData(phaseName: string, newProgress: number): void {
    const ligne = this.lignes.find(l => l.etape === phaseName);
    if (ligne) {
      ligne.pourcentage = `${newProgress}%`;
      ligne.date = this.getCurrentDate();
    }

    if (this.progressReportComponent && this.progressReportComponent.progressData) {
      const progressItem = this.progressReportComponent.progressData.find(p => p.label === phaseName);
      if (progressItem) {
        progressItem.value = newProgress;
        progressItem.lastUpdated = this.getCurrentDate();
      }
    }
  }

  private revertProgressChange(phaseName: string): void {
    if (this.progressReportComponent && this.progressReportComponent.progressData) {
      const progressItem = this.progressReportComponent.progressData.find(p => p.label === phaseName);
      if (progressItem) {
        const ligne = this.lignes.find(l => l.etape === phaseName);
        if (ligne) {
          ligne.pourcentage = `${Math.round(progressItem.value)}%`;
        }
      }
    }
  }

  onPercentageChange(etape: string, event: any): void {
    const selectedValue = event.target.value;
    const numericValue = parseInt(selectedValue.replace('%', ''));
    
    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      console.error('Valeur de pourcentage invalide');
      return;
    }

    const ligne = this.lignes.find(l => l.etape === etape);
    if (ligne) {
      this.updatePhaseProgress(ligne.indicatorId, etape, numericValue);
    } else {
      console.warn(`Aucune ligne trouvée pour l'étape: ${etape}`);
    }
  }

  // === MÉTHODES UTILITAIRES POUR LES DONNÉES ===

  getProgressValue(etape: string): number {
    const ligne = this.lignes.find(l => l.etape === etape);
    if (ligne && ligne.pourcentage && ligne.pourcentage !== '') {
      const value = parseInt(ligne.pourcentage.replace('%', ''));
      if (!isNaN(value)) {
        return value;
      }
    }

    if (this.progressReportComponent && this.progressReportComponent.progressData) {
      const progressItem = this.progressReportComponent.progressData.find(p => p.label === etape);
      return progressItem ? Math.round(progressItem.value) : 0;
    }
    
    return 0;
  }

  getProgressPercentage(etape: string): string {
    const value = this.getProgressValue(etape);
    return value > 0 ? `${value}%` : '';
  }

  getProgressDate(etape: string): string {
    const ligne = this.lignes.find(l => l.etape === etape);
    if (ligne && ligne.date) {
      return ligne.date;
    }

    if (this.progressReportComponent && this.progressReportComponent.progressData) {
      const progressItem = this.progressReportComponent.progressData.find(p => p.label === etape);
      if (progressItem && progressItem.lastUpdated) {
        return progressItem.lastUpdated;
      }
    }
    
    switch (etape) {
      case 'Gros œuvre':
        return '04/03/2025';
      case 'Second œuvre':
        return '11/05/2025';
      default:
        return '';
    }
  }

  calculateAverageProgress(): number {
    const validPercentages = this.lignes
      .filter(ligne => ligne.pourcentage && ligne.pourcentage !== '')
      .map(ligne => parseInt(ligne.pourcentage.replace('%', '')))
      .filter(val => !isNaN(val));
    
    if (validPercentages.length === 0) return 0;
    
    const sum = validPercentages.reduce((acc, val) => acc + val, 0);
    return Math.round(sum / validPercentages.length);
  }

  public getCurrentDate(): string {
    const now = new Date();
    const day = now.getDate().toString().padStart(2, '0');
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private getCurrentDatePrivate(): string {
    return this.getCurrentDate();
  }

  // === MÉTHODES POUR LA GESTION DES ALBUMS ===

  private validateAlbumForm(): boolean {
    if (!this.albumForm.name.trim()) {
      this.error = 'Le nom de l\'album est requis';
      return false;
    }

    if (!this.projectId || this.projectId <= 0) {
      this.error = 'ID du projet invalide';
      return false;
    }

    if (this.albumForm.pictures.some(pic => !pic.startsWith('data:image/'))) {
      this.error = 'Toutes les images doivent être au format base64 valide';
      return false;
    }

    return true;
  }

  // === GESTION DES MODALS ===

  onAddClick(): void {
    this.resetForm();
    this.showCreateModal = true;
  }

  onEditAlbum(album: ProgressAlbum): void {
    this.currentAlbum = album;
    this.albumForm = {
      name: album.phaseName,
      description: album.description,
      pictures: [...album.pictures]
    };
    this.showEditModal = true;
  }

  onDeleteAlbum(album: ProgressAlbum): void {
    this.albumToDelete = album;
    this.showDeleteModal = true;
  }

  // === OPÉRATIONS CRUD ALBUMS ===

  createAlbum(): void {
    if (!this.validateAlbumForm()) return;

    const newAlbum: CreateAlbumRequest = {
      realEstatePropertyId: this.projectId,
      name: this.albumForm.name.trim(),
      description: this.albumForm.description.trim(),
      pictures: this.albumForm.pictures
    };

    console.log('Création d\'album avec les données:', {
      ...newAlbum,
      pictures: `${newAlbum.pictures.length} images`
    });

    this.loading = true;
    this.error = null;

    this.budgetService.saveAlbum(newAlbum).subscribe({
      next: (response) => {
        console.log('Album créé avec succès:', response);
        this.handleAlbumOperationSuccess('Album créé avec succès');
        this.closeCreateModal();
      },
      error: (error) => {
        console.error('Erreur détaillée lors de la création:', error);
        this.handleAlbumOperationError(error, 'création');
      }
    });
  }

  updateAlbum(): void {
    if (!this.currentAlbum) return;
    if (!this.validateAlbumForm()) return;

    const updatedAlbum: UpdateAlbumRequest = {
      name: this.albumForm.name.trim(),
      description: this.albumForm.description.trim(),
      pictures: this.albumForm.pictures
    };

    console.log('Mise à jour album:', updatedAlbum);

    this.loading = true;
    this.error = null;

    this.budgetService.updateAlbum(this.currentAlbum.id, updatedAlbum).subscribe({
      next: (response) => {
        console.log('Album modifié avec succès:', response);
        this.handleAlbumOperationSuccess('Album modifié avec succès');
        this.closeEditModal();
      },
      error: (error) => {
        console.error('Erreur lors de la modification:', error);
        this.handleAlbumOperationError(error, 'modification');
      }
    });
  }

  confirmDelete(): void {
    if (!this.albumToDelete) return;

    this.loading = true;
    this.error = null;

    this.budgetService.deleteAlbum(this.albumToDelete.id).subscribe({
      next: () => {
        this.handleAlbumOperationSuccess('Album supprimé avec succès');
        this.closeDeleteModal();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression:', error);
        this.handleAlbumOperationError(error, 'suppression');
      }
    });
  }

  private handleAlbumOperationSuccess(message: string): void {
    this.loading = false;
    this.showSuccessMessage = true;
    this.successMessage = message;
    this.fetchAlbumData();
    this.hideSuccessMessage();
  }

  private handleAlbumOperationError(error: any, operation: string): void {
    this.loading = false;
    
    if (error.status === 403) {
      this.error = `Vous n'avez pas les droits pour cette ${operation}. Vérifiez vos permissions.`;
    } else if (error.status === 401) {
      this.error = "Session expirée. Veuillez vous reconnecter.";
    } else if (error.status === 400) {
      this.error = "Données invalides. Vérifiez les informations saisies.";
    } else if (error.status === 404) {
      this.error = "Album introuvable.";
    } else {
      this.error = `Erreur lors de la ${operation} de l'album. Veuillez réessayer.`;
    }
  }

  // === GESTION DES FICHIERS ===

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      this.error = null;
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        if (file.size > 5 * 1024 * 1024) {
          this.error = `Le fichier ${file.name} dépasse la taille maximale de 5MB`;
          continue;
        }
        
        if (!file.type.startsWith('image/')) {
          this.error = `Le fichier ${file.name} n'est pas une image valide`;
          continue;
        }
        
        this.convertToBase64(file);
      }
    }
    
    event.target.value = '';
  }

  private convertToBase64(file: File): void {
    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      const base64String = e.target.result;
      
      if (base64String && base64String.startsWith('data:image/')) {
        this.albumForm.pictures.push(base64String);
        console.log('Image ajoutée:', file.name, 'Taille base64:', base64String.length);
      } else {
        console.error('Erreur: format base64 invalide pour', file.name);
        this.error = `Erreur lors de la conversion de ${file.name}`;
      }
    };
    
    reader.onerror = (error) => {
      console.error('Erreur lors de la lecture du fichier:', error);
      this.error = `Erreur lors de la lecture du fichier ${file.name}`;
    };
    
    reader.readAsDataURL(file);
  }

  removePicture(index: number): void {
    this.albumForm.pictures.splice(index, 1);
  }

  // === GESTION DES MODALS ===

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

  resetForm(): void {
    this.albumForm = {
      name: '',
      description: '',
      pictures: []
    };
    this.error = null;
    this.currentAlbum = null;
  }

  hideSuccessMessage(): void {
    setTimeout(() => {
      this.showSuccessMessage = false;
    }, 3000);
  }

  // === MÉTHODES UTILITAIRES ===

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
        break;
    }
  }

  formatDate(dateInput: string | number[]): string {
    if (Array.isArray(dateInput)) {
      const [year, month, day] = dateInput;
      return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
    }
    return dateInput;
  }

  getPhotoCount(pictures: string[]): number {
    return pictures ? pictures.length : 0;
  }

  // === MÉTHODES DE DEBUG (à supprimer en production) ===

  debugAuthToken(): void {
    console.log('=== DEBUG AUTHENTIFICATION ===');
    
    // Vérifier tous les possibles noms de clés dans le localStorage
    console.log('Toutes les clés localStorage:', Object.keys(localStorage));
    console.log('Toutes les clés sessionStorage:', Object.keys(sessionStorage));
    
    // Vérifier différentes variations possibles du nom de la clé
    const possibleKeys = ['authToken', 'auth_token', 'token', 'accessToken', 'access_token', 'jwt', 'bearerToken'];
    
    console.log('=== VÉRIFICATION DES CLÉS POSSIBLES ===');
    possibleKeys.forEach(key => {
      const localValue = localStorage.getItem(key);
      const sessionValue = sessionStorage.getItem(key);
      
      if (localValue) {
        console.log(`localStorage.${key}:`, localValue.substring(0, 50) + '...');
      }
      if (sessionValue) {
        console.log(`sessionStorage.${key}:`, sessionValue.substring(0, 50) + '...');
      }
    });
    
    console.log('===============================');
  }

  debugAlbumCreation(): void {
    console.log('=== DEBUG ALBUM CREATION ===');
    console.log('ProjectId:', this.projectId);
    console.log('Album form:', this.albumForm);
    console.log('Pictures count:', this.albumForm.pictures.length);
    
    this.debugAuthToken();
    
    this.albumForm.pictures.forEach((pic, index) => {
      console.log(`Image ${index + 1}:`, pic.substring(0, 50) + '...');
    });
    console.log('=== FIN DEBUG ===');
  }
}