import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ProgressReportComponent } from "../../dashboard/progess-report/progess-report.component";
import { FormsModule } from '@angular/forms';
import {
  ProjectBudgetService,
  ProgressAlbum,
  CreateAlbumRequest,
  UpdateAlbumRequest,
  ProgressIndicator  // AJOUT
} from '../../../../../services/project-details.service';
import { environment } from '../../../../../environments/environment';
import { CommonModule } from '@angular/common';

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
  showViewModal = false;
  showSuccessMessage = false;
  successMessage = '';

  // Album en cours
  currentAlbum: ProgressAlbum | null = null;
  albumToDelete: ProgressAlbum | null = null;

  // Variables pour la visionneuse d'images
  selectedImage: string | null = null;
  currentImageIndex: number = 0;
  currentAlbumImages: string[] = [];

  // Formulaire
  albumForm = {
    name: '',
    description: '',
    pictures: [] as string[]
  };

  pourcentages: string[] = ['0%', '10%', '20%', '30%', '40%', '50%', '60%', '70%', '80%', '90%', '100%'];

  // MODIFICATION: Tableau vide au départ, sera rempli dynamiquement
  lignes: TableRow[] = [];

  // AJOUT: Stocker les indicateurs récupérés
  indicators: ProgressIndicator[] = [];

  constructor(
    private route: ActivatedRoute,
    private budgetService: ProjectBudgetService
  ) { }

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.projectId = +idFromUrl;
      this.fetchIndicators(); // AJOUT: Charger les indicateurs d'abord
      this.fetchAlbumData();
    } else {
      this.error = 'Projet introuvable';
      this.loading = false;
    }
  }

  // === NOUVELLE MÉTHODE: Récupérer les indicateurs ===
  fetchIndicators(): void {
    this.loading = true;
    this.error = null;

    console.log('📊 Chargement des indicateurs du projet', this.projectId);

    this.budgetService.getIndicatorsByProperty(this.projectId).subscribe({
      next: (data) => {
        console.log('✅ Indicateurs récupérés:', data);
        this.indicators = data;
        this.initializeTableRows();
        this.loading = false;
      },
      error: (error) => {
        console.error('❌ Erreur chargement indicateurs:', error);
        this.handleFetchError(error, "indicateurs");
        // Initialiser avec des valeurs par défaut en cas d'erreur
        this.initializeDefaultRows();
      }
    });
  }

  // === NOUVELLE MÉTHODE: Initialiser le tableau avec les données réelles ===
  private initializeTableRows(): void {
    this.lignes = this.indicators.map(indicator => ({
      etape: this.budgetService.formatPhaseName(indicator.phaseName),
      pourcentage: `${indicator.progressPercentage}%`,
      date: this.budgetService.formatIndicatorDate(indicator.lastUpdated),
      indicatorId: indicator.id
    }));

    console.log('📋 Tableau initialisé:', this.lignes);
  }

  // === NOUVELLE MÉTHODE: Initialiser avec des valeurs par défaut ===
  private initializeDefaultRows(): void {
    this.lignes = [
      { etape: 'Gros œuvre', pourcentage: '0%', date: '', indicatorId: 0 },
      { etape: 'Second œuvre', pourcentage: '0%', date: '', indicatorId: 0 },
      { etape: 'Finition', pourcentage: '0%', date: '', indicatorId: 0 }
    ];
  }

  isUpdating(phaseName: string): boolean {
    return this.updatingPhase === phaseName;
  }

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

  onViewAlbum(album: ProgressAlbum): void {
    this.currentAlbum = album;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.currentAlbum = null;
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

  updateAlbum(): void {
    if (!this.currentAlbum) {
      this.error = 'Aucun album sélectionné pour modification';
      return;
    }

    if (!this.validateAlbumForm()) return;

    const updatedAlbum: UpdateAlbumRequest = {
      name: this.albumForm.name.trim(),
      description: this.albumForm.description.trim(),
      pictures: this.albumForm.pictures
    };

    this.loading = true;
    this.error = null;

    this.budgetService.updateAlbum(this.currentAlbum.id, updatedAlbum).subscribe({
      next: (response) => {
        console.log('✓ Album modifié avec succès:', response);
        this.handleAlbumOperationSuccess('Album modifié avec succès');
        this.closeEditModal();
      },
      error: (error) => {
        console.error('✗ Erreur modification album:', error);
        this.handleAlbumOperationError(error, 'modification');
      }
    });
  }

  updateTableWithProgressData(): void {
    if (this.progressReportComponent && this.progressReportComponent.progressData) {
      const progressData = this.progressReportComponent.progressData;

      console.log('Mise à jour tableau avec données:', progressData);

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

      console.log('Tableau mis à jour:', this.lignes);
    }
  }

  refreshTableData(): void {
    // MODIFICATION: Recharger les indicateurs depuis le serveur
    this.fetchIndicators();

    if (this.progressReportComponent) {
      this.progressReportComponent.refreshData();
      setTimeout(() => {
        this.updateTableWithProgressData();
      }, 500);
    }
  }

  // === MODIFICATION: updatePhaseProgress ===
  updatePhaseProgress(indicatorId: number, phaseName: string, newProgress: number): void {
    if (indicatorId === 0) {
      this.error = 'Indicateur non trouvé. Veuillez recharger la page.';
      return;
    }

    this.updatingPhase = phaseName;
    this.error = null;

    console.log(`📊 Mise à jour de l'indicateur ${indicatorId} (${phaseName}) à ${newProgress}%`);

    this.budgetService.updateIndicator(indicatorId, newProgress)
      .subscribe({
        next: (response) => {
          console.log(`✅ ${phaseName} mis à jour:`, response);
          this.updatingPhase = null;

          // MODIFICATION: Mettre à jour avec les données de la réponse
          this.updateLocalProgressDataFromResponse(phaseName, response);

          // Message de succès
          this.showSuccessMessage = true;
          this.successMessage = `${phaseName} mis à jour à ${newProgress}%`;
          this.hideSuccessMessage();
        },
        error: (error) => {
          console.error(`❌ Erreur mise à jour ${phaseName}:`, error);
          this.handleProgressUpdateError(error, phaseName);
        }
      });
  }

  // === NOUVELLE MÉTHODE: Mettre à jour depuis la réponse API ===
  private updateLocalProgressDataFromResponse(phaseName: string, response: ProgressIndicator): void {
    const ligne = this.lignes.find(l => l.etape === phaseName);
    if (ligne) {
      ligne.pourcentage = `${response.progressPercentage}%`;
      ligne.date = this.budgetService.formatIndicatorDate(response.lastUpdated);
      console.log(`✅ Ligne mise à jour localement:`, ligne);
    }

    // Mettre à jour aussi dans indicators
    const indicatorIndex = this.indicators.findIndex(i => i.id === response.id);
    if (indicatorIndex !== -1) {
      this.indicators[indicatorIndex] = response;
    }
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

    if (!selectedValue || selectedValue === '') {
      console.warn('Aucune valeur sélectionnée');
      return;
    }

    const numericValue = parseInt(selectedValue.replace('%', ''));

    if (isNaN(numericValue) || numericValue < 0 || numericValue > 100) {
      console.error('Valeur de pourcentage invalide:', selectedValue);
      this.error = 'Valeur de pourcentage invalide';
      return;
    }

    const currentValue = this.getProgressValue(etape);
    if (currentValue === numericValue) {
      console.log(`${etape} a déjà la valeur ${numericValue}%`);
      return;
    }

    console.log(`🔄 Changement de ${etape}: ${currentValue}% → ${numericValue}%`);

    const ligne = this.lignes.find(l => l.etape === etape);
    if (ligne && ligne.indicatorId > 0) {
      // Mettre à jour immédiatement l'affichage local
      ligne.pourcentage = `${numericValue}%`;
      ligne.date = this.getCurrentDate();

      // Envoyer la mise à jour au serveur
      this.updatePhaseProgress(ligne.indicatorId, etape, numericValue);
    } else {
      console.warn(`Indicateur non trouvé pour l'étape: ${etape}`);
      this.error = `Indicateur non trouvé pour "${etape}". Rechargez la page.`;
    }
  }

  // === MODIFICATION: getProgressValue ===
  getProgressValue(etape: string): number {
    const ligne = this.lignes.find(l => l.etape === etape);
    if (ligne && ligne.pourcentage && ligne.pourcentage !== '') {
      const value = parseInt(ligne.pourcentage.replace('%', ''));
      if (!isNaN(value)) {
        return value;
      }
    }

    // Chercher dans indicators
    const phaseNameMap: Record<string, string> = {
      'Gros œuvre': 'GROS_OEUVRE',
      'Second œuvre': 'SECOND_OEUVRE',
      'Finition': 'FINITION'
    };

    const phaseName = phaseNameMap[etape];
    if (phaseName) {
      const indicator = this.indicators.find(i => i.phaseName === phaseName);
      if (indicator) {
        return indicator.progressPercentage;
      }
    }

    return 0;
  }

  onEditFileSelected(event: any): void {
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

  getProgressPercentage(etape: string): string {
    const value = this.getProgressValue(etape);
    return value > 0 ? `${value}%` : '';
  }

  getProgressDate(etape: string): string {
    const ligne = this.lignes.find(l => l.etape === etape);
    if (ligne && ligne.date) {
      return ligne.date;
    }

    // Chercher dans indicators
    const phaseNameMap: Record<string, string> = {
      'Gros œuvre': 'GROS_OEUVRE',
      'Second œuvre': 'SECOND_OEUVRE',
      'Finition': 'FINITION'
    };

    const phaseName = phaseNameMap[etape];
    if (phaseName) {
      const indicator = this.indicators.find(i => i.phaseName === phaseName);
      if (indicator && indicator.lastUpdated) {
        return this.budgetService.formatIndicatorDate(indicator.lastUpdated);
      }
    }

    return this.getCurrentDate();
  }

  calculateAverageProgress(): number {
    if (this.indicators.length === 0) return 0;

    const sum = this.indicators.reduce((acc, ind) => acc + ind.progressPercentage, 0);
    return Math.round(sum / this.indicators.length);
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

  // ... (le reste des méthodes reste identique)

  private validateAlbumForm(): boolean {
    if (!this.albumForm.name.trim()) {
      this.error = 'Le nom de l\'album est requis';
      return false;
    }

    if (!this.projectId || this.projectId <= 0) {
      this.error = 'ID du projet invalide';
      return false;
    }

    const hasInvalidPictures = this.albumForm.pictures.some(pic => {
      const isValidUrl = pic.startsWith('http://') || pic.startsWith('https://');
      const isValidBase64 = pic.startsWith('data:image/');
      return !isValidUrl && !isValidBase64;
    });

    if (hasInvalidPictures) {
      this.error = 'Toutes les images doivent être au format base64 ou URL valide';
      return false;
    }

    return true;
  }

  onAddClick(): void {
    this.resetForm();
    this.showCreateModal = true;
  }

  onEditAlbum(album: ProgressAlbum): void {
    this.currentAlbum = album;

    this.albumForm = {
      name: album.phaseName,
      description: album.description || '',
      pictures: album.pictures ? [...album.pictures] : []
    };

    this.showEditModal = true;
  }

  onDeleteAlbum(album: ProgressAlbum): void {
    this.albumToDelete = album;
    this.showDeleteModal = true;
  }

  createAlbum(): void {
    if (!this.validateAlbumForm()) return;

    const newAlbum: CreateAlbumRequest = {
      realEstatePropertyId: this.projectId,
      name: this.albumForm.name.trim(),
      description: this.albumForm.description.trim(),
      pictures: this.albumForm.pictures
    };

    this.loading = true;
    this.error = null;

    this.budgetService.saveAlbum(newAlbum).subscribe({
      next: (response) => {
        console.log('Album créé avec succès:', response);
        this.handleAlbumOperationSuccess('Album créé avec succès');
        this.closeCreateModal();
      },
      error: (error) => {
        console.error('Erreur lors de la création:', error);
        this.handleAlbumOperationError(error, 'création');
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
      } else {
        this.error = `Erreur lors de la conversion de ${file.name}`;
      }
    };

    reader.onerror = (error) => {
      this.error = `Erreur lors de la lecture du fichier ${file.name}`;
    };

    reader.readAsDataURL(file);
  }

  removePicture(index: number): void {
    this.albumForm.pictures.splice(index, 1);
  }

  getBaseFile() {
    return environment.filebaseUrl;
  }

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

  onAlbumAction(action: string, id: number) {
    const album = this.albums.find(a => a.id === id);
    if (!album) return;

    switch (action) {
      case 'edit':
        this.onEditAlbum(album);
        break;
      case 'delete':
        this.onDeleteAlbum(album);
        break;
      case 'view':
        this.onViewAlbum(album);
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

  handleImageError(event: ErrorEvent, album: ProgressAlbum) {
    console.error('Erreur chargement image:', event);
  }

  // === MÉTHODES POUR LA VISIONNEUSE D'IMAGES ===
  openImageViewer(picture: string, allPictures: string[]): void {
    this.selectedImage = picture;
    this.currentAlbumImages = allPictures;
    this.currentImageIndex = allPictures.indexOf(picture);
  }

  closeImageViewer(): void {
    this.selectedImage = null;
    this.currentAlbumImages = [];
    this.currentImageIndex = 0;
  }

  nextImage(): void {
    if (this.currentImageIndex < this.currentAlbumImages.length - 1) {
      this.currentImageIndex++;
      this.selectedImage = this.currentAlbumImages[this.currentImageIndex];
    }
  }

  previousImage(): void {
    if (this.currentImageIndex > 0) {
      this.currentImageIndex--;
      this.selectedImage = this.currentAlbumImages[this.currentImageIndex];
    }
  }

  selectImageIndex(index: number): void {
    this.currentImageIndex = index;
    this.selectedImage = this.currentAlbumImages[index];
  }
}