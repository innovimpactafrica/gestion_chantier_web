import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import {
  DashboardService,
  TasksKpi,
  GlobalIndicator,
  BudgetKpi,
  CriticalMaterial,
  PhaseIndicator,
  IncidentStatistic,
  CriticalTask,
  RecentPhoto,
  StudyKpi,
  PageableResponse,
  ProjectKpi
} from '../../../services/dashboard.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageService } from '../../core/services/language.service';

Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#7F8C8D';
Chart.register(...registerables);

@Component({
  standalone: true,
  imports: [CommonModule],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('progressChart', { static: false }) progressChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('incidentsChart', { static: false }) incidentsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('budgetChart', { static: false }) budgetChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('repartitionChart', { static: false }) repartitionChart!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private progressChartInstance?: Chart;
  private incidentsChartInstance?: Chart;
  private budgetChartInstance?: Chart;
  private repartitionChartInstance?: Chart;
  private isBrowser: boolean;

  // États de chargement et d'erreur
  isLoading = true;
  hasError = false;
  errorMessage = '';

  // Données brutes du backend
  private rawData: any = {};

  // Données structurées pour l'affichage
  dashboardData = {
    chantiers: {
      total: 0,
      inProgress: 0,
      delayed: 0,
      pending: 0
    },
    etudes: {
      total: 0,
      counts: {
        PENDING: 0,
        IN_PROGRESS: 0,
        DELIVERED: 0,
        VALIDATED: 0,
        REJECTED: 0
      },
      percentages: {
        PENDING: 0,
        IN_PROGRESS: 0,
        DELIVERED: 0,
        VALIDATED: 0,
        REJECTED: 0
      }
    },
    avancement: {
      pourcentage: 0,
      display: {
        circumference: 141.37,
        dashOffset: 141.37,
        pointX: 5,
        pointY: 50
      }
    },
    budget: {
      planifie: 0,
      consomme: 0,
      restant: 0,
      pourcentageConsomme: 0,
      pourcentageRestant: 0
    },
    materiaux: [] as any[],
    phases: [] as any[],
    incidents: {
      total: 0,
      donnees: [] as number[],
      labels: [] as string[],
      periode: 7
    },
    taches: [] as any[],
    photos: [] as any[],
    performances: {
      tauxAvancement: 0,
      budgetConsomme: 0,
      incidents: 0,
      presenceMoyenne: 0,
      tachesRetard: 0,
      materiauxAlerte: 0
    },
    annee: new Date().getFullYear()
  };

  // Propriétés pour l'accès direct dans le template
  stockAlertes: any[] = [];
  tachesCritiques: any[] = [];
  photosRecentes: any[] = [];

  // Propriétés pour le modal des photos
  selectedPhoto: any = null;
  currentImageIndex: number = 0;

  // Méthodes pour gérer le modal des photos

  /**
   * Ouvre le modal pour afficher une photo
   * @param photo - L'objet photo à afficher
   */
  openPhotoModal(photo: any): void {
    this.selectedPhoto = photo;
    this.currentImageIndex = 0;

    // Empêcher le scroll de la page quand le modal est ouvert
    document.body.style.overflow = 'hidden';
  }
  getBaseFile() {
    return environment.filebaseUrl;
  }
  /**
   * Ferme le modal des photos
   */
  closePhotoModal(): void {
    this.selectedPhoto = null;
    this.currentImageIndex = 0;

    // Réactiver le scroll de la page
    document.body.style.overflow = 'auto';
  }

  /**
   * Navigue vers l'image précédente dans le modal
   */
  previousImage(): void {
    if (!this.selectedPhoto?.images?.length) return;

    this.currentImageIndex = this.currentImageIndex > 0
      ? this.currentImageIndex - 1
      : this.selectedPhoto.images.length - 1;

    // Mettre à jour l'image source actuelle
    this.selectedPhoto.src = this.selectedPhoto.images[this.currentImageIndex];
  }

  /**
   * Navigue vers l'image suivante dans le modal
   */
  nextImage(): void {
    if (!this.selectedPhoto?.images?.length) return;

    this.currentImageIndex = this.currentImageIndex < this.selectedPhoto.images.length - 1
      ? this.currentImageIndex + 1
      : 0;

    // Mettre à jour l'image source actuelle
    this.selectedPhoto.src = this.selectedPhoto.images[this.currentImageIndex];
  }

  /**
   * Sélectionne une image spécifique par son index
   * @param index - Index de l'image à sélectionner
   */
  selectImageIndex(index: number): void {
    if (!this.selectedPhoto?.images?.length || index < 0 || index >= this.selectedPhoto.images.length) {
      return;
    }

    this.currentImageIndex = index;
    this.selectedPhoto.src = this.selectedPhoto.images[index];
  }

  // Méthode pour gérer la fermeture du modal avec la touche Escape
  // À ajouter dans ngAfterViewInit() ou ngOnInit()


  constructor(
    private dashboardService: DashboardService,
    public languageService: LanguageService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  private keydownHandler = (event: KeyboardEvent) => {
    if (this.selectedPhoto) {
      switch (event.key) {
        case 'Escape':
          this.closePhotoModal();
          break;
        case 'ArrowLeft':
          event.preventDefault();
          this.previousImage();
          break;
        case 'ArrowRight':
          event.preventDefault();
          this.nextImage();
          break;
      }
    }
  };

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      document.addEventListener('keydown', this.keydownHandler);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();

    if (this.isBrowser) {
      // Nettoyer les listeners
      document.removeEventListener('keydown', this.keydownHandler);

      // Réactiver le scroll si le modal était ouvert
      document.body.style.overflow = 'auto';
    }

    // Détruire les graphiques
    if (this.progressChartInstance) {
      this.progressChartInstance.destroy();
    }
    if (this.incidentsChartInstance) {
      this.incidentsChartInstance.destroy();
    }
    if (this.budgetChartInstance) {
      this.budgetChartInstance.destroy();
    }
    if (this.repartitionChartInstance) {
      this.repartitionChartInstance.destroy();
    }
  }




  private loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;

    // Vérifier si l'utilisateur est connecté de manière plus robuste
    if (!this.dashboardService.isUserConnected()) {
      console.warn('Utilisateur non connecté, tentative de reconnexion...');

      // Attendre un peu pour permettre à l'authentification de se stabiliser
      setTimeout(() => {
        if (this.dashboardService.isUserConnected()) {
          this.continueLoadingData();
        } else {
          this.hasError = true;
          this.errorMessage = 'Utilisateur non connecté';
          this.isLoading = false;
        }
      }, 500);

      return;
    }

    this.continueLoadingData();
  }

  private continueLoadingData(): void {
    forkJoin({
      vueEnsembleProject: this.dashboardService.vueEnsembleProject().pipe(
        catchError(error => {
          console.warn('Erreur vueEnsembleProject:', error);
          return of({
            total: 0,
            inProgress: 0,
            delayed: 0,
            pending: 0,
            pendingpending: 0
          } as ProjectKpi);
        })
      ),
      vueEnsembleEtude: this.dashboardService.getVueEnsembleAndRepartitionEtude().pipe(
        catchError(error => {
          console.warn('Erreur vueEnsembleEtude:', error);
          return of({
            total: 0,
            percentages: {
              PENDING: 0,
              IN_PROGRESS: 0,
              DELIVERED: 0,
              VALIDATED: 0,
              REJECTED: 0
            },
            counts: {
              PENDING: 0,
              IN_PROGRESS: 0,
              DELIVERED: 0,
              VALIDATED: 0,
              REJECTED: 0
            }
          } as StudyKpi);
        })
      ),
      tauxMoyenAvancement: this.dashboardService.tauxMoyenAvancement().pipe(
        catchError(error => {
          console.warn('Erreur tauxMoyenAvancement:', error);
          return of({ averageProgressPercentage: 0 } as GlobalIndicator);
        })
      ),
      budget: this.dashboardService.getBudget().pipe(
        catchError(error => {
          console.warn('Erreur budget:', error);
          return of({
            totalPlanned: 0,
            totalConsumed: 0,
            totalRemaining: 0,
            consumedPercentage: 0,
            remainingPercentage: 0
          } as BudgetKpi);
        })
      ),
      materiauxCritique: this.dashboardService.materiauxCritique(0, 20).pipe(
        catchError(error => {
          console.warn('Erreur materiauxCritique:', error);
          return of({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
            first: true,
            last: true,
            empty: true
          } as unknown as PageableResponse<CriticalMaterial>);
        })
      ),
      etatAvancement: this.dashboardService.etatAvancement().pipe(
        catchError(error => {
          console.warn('Erreur etatAvancement:', error);
          return of([] as PhaseIndicator[]);
        })
      ),
      statistiqueSignalement: this.dashboardService.statistiqueDeSignalement().pipe(
        catchError(error => {
          console.warn('Erreur statistiqueSignalement:', error);
          return of([] as IncidentStatistic[]);
        })
      ),
      tacheCritique: this.dashboardService.tacheCritique().pipe(
        catchError(error => {
          console.warn('Erreur tacheCritique:', error);
          return of([] as CriticalTask[]);
        })
      ),
      photoRecent: this.dashboardService.photoRecent(0, 8).pipe(
        catchError(error => {
          console.warn('Erreur photoRecent:', error);
          return of({
            content: [],
            totalElements: 0,
            totalPages: 0,
            size: 0,
            number: 0,
            first: true,
            last: true,
            empty: true
          } as unknown as PageableResponse<RecentPhoto>);
        })
      ),
      tacheEnRetard: this.dashboardService.tacheEnRetard().pipe(
        catchError(error => {
          console.warn('Erreur tacheEnRetard:', error);
          return of(0);
        })
      ),
      incidents: this.dashboardService.incidents().pipe(
        catchError(error => {
          console.warn('Erreur incidents:', error);
          return of(0);
        })
      ),
      presenceMoyenne: this.dashboardService.presenceMoyenne().pipe(
        catchError(error => {
          console.warn('Erreur presenceMoyenne:', error);
          return of(0);
        })
      )
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (data) => {
        console.log('Données reçues:', data);
        this.rawData = data;
        this.processDashboardData();
        this.isLoading = false;

        // Créer les graphiques après le chargement des données
        setTimeout(() => {
          this.createCharts();
        }, 100);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données:', error);

        // Gestion spécifique des erreurs d'authentification
        if (error.status === 401 || error.message?.includes('non connecté')) {
          this.hasError = true;
          this.errorMessage = 'Session expirée. Veuillez vous reconnecter.';
        } else {
          this.hasError = true;
          this.errorMessage = 'Erreur lors du chargement des données du tableau de bord';
        }

        this.isLoading = false;
      }
    });
  }
  private processDashboardData(): void {
    try {
      // Traitement des données avec vérification de sécurité
      this.dashboardData.chantiers = this.processChantiers();
      this.dashboardData.etudes = this.processEtudes();
      this.dashboardData.avancement = this.processAvancement();
      this.dashboardData.budget = this.processBudget();
      this.dashboardData.materiaux = this.processMateriaux();
      this.dashboardData.phases = this.processPhases();
      this.dashboardData.incidents = this.processIncidents();
      this.dashboardData.taches = this.processTaches();
      this.dashboardData.photos = this.processPhotos();
      this.dashboardData.performances = this.processPerformances();
      this.dashboardData.annee = this.getCurrentYear();

      // Assigner aux propriétés directes pour le template (getters utilisés automatiquement)
      this.stockAlertes = this.dashboardData.materiaux;
      this.tachesCritiques = this.dashboardData.taches;
      this.photosRecentes = this.dashboardData.photos;

    } catch (error) {
      console.error('Erreur lors du traitement des données:', error);
      // Garder les valeurs par défaut en cas d'erreur
    }
  }

  private processChantiers(): any {
    const projectKpi = this.rawData.vueEnsembleProject;

    if (!projectKpi) {
      return {
        total: 0,
        inProgress: 0,
        delayed: 0,
        pending: 0
      };
    }

    return {
      total: projectKpi.total || 0,
      inProgress: projectKpi.inProgress || 0,
      delayed: projectKpi.delayed || 0,
      pending: projectKpi.pending || 0
    };
  }

  private processEtudes(): any {
    const studyKpi = this.rawData.vueEnsembleEtude;

    if (!studyKpi) {
      return {
        total: 0,
        counts: {
          PENDING: 0,
          IN_PROGRESS: 0,
          DELIVERED: 0,
          VALIDATED: 0,
          REJECTED: 0
        },
        percentages: {
          PENDING: 0,
          IN_PROGRESS: 0,
          DELIVERED: 0,
          VALIDATED: 0,
          REJECTED: 0
        }
      };
    }

    return {
      total: studyKpi.total || 0,
      counts: {
        PENDING: studyKpi.counts?.PENDING || 0,
        IN_PROGRESS: studyKpi.counts?.IN_PROGRESS || 0,
        DELIVERED: studyKpi.counts?.DELIVERED || 0,
        VALIDATED: studyKpi.counts?.VALIDATED || 0,
        REJECTED: studyKpi.counts?.REJECTED || 0
      },
      percentages: {
        PENDING: studyKpi.percentages?.PENDING || 0,
        IN_PROGRESS: studyKpi.percentages?.IN_PROGRESS || 0,
        DELIVERED: studyKpi.percentages?.DELIVERED || 0,
        VALIDATED: studyKpi.percentages?.VALIDATED || 0,
        REJECTED: studyKpi.percentages?.REJECTED || 0
      }
    };

  }
  // pour gerer la charte de repartition 
  private createRepartitionChart(): void {
    if (!this.isBrowser || !this.repartitionChart) {
      return;
    }

    const ctx = this.repartitionChart.nativeElement.getContext('2d');
    if (!ctx) return;
    const percentages = this.dashboardData.etudes.percentages;

    // Données dynamiques basées sur les valeurs réelles de l'API
    const data = [
      percentages.VALIDATED,
      percentages.IN_PROGRESS,  // En cours (orange)
      percentages.DELIVERED,   // Livrées (bleu)
      percentages.PENDING      // En attente (rouge)
    ];
    // Données mockées pour la répartition des études
    // const data = [40, 35, 15, 10]; 
    const labels = ['Complétées', 'En cours', 'Initiées', 'Non initiées'];
    const colors = ['#10B981', '#FB923C', '#3B82F6', '#EF4444']; // Vert, Orange, Bleu, Rouge

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors,
          borderWidth: 0,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        cutout: '60%', // Trou au centre pour le style donut
        plugins: {
          legend: {
            display: false // Légende affichée en bas dans le template
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: 'white',
            bodyColor: 'white',
            borderColor: '#e5e7eb',
            borderWidth: 1,
            cornerRadius: 6,
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        },
        animation: {
          animateRotate: true,
          animateScale: false
        }
      }
    };

    // Détruire le graphique existant s'il existe
    if (this.repartitionChartInstance) {
      this.repartitionChartInstance.destroy();
    }

    // Créer le nouveau graphique
    this.repartitionChartInstance = new Chart(ctx, config);
  }

  private processAvancement(): any {
    const tauxMoyenAvancement = this.rawData.tauxMoyenAvancement;

    if (!tauxMoyenAvancement || tauxMoyenAvancement.averageProgressPercentage === undefined) {
      return this.dashboardData.avancement;
    }

    const pourcentage = Math.round(tauxMoyenAvancement.averageProgressPercentage || 0);
    const circumference = 141.37; // π * 45
    const progression = pourcentage / 100;
    const dashOffset = circumference * (1 - progression);

    // Calcul de la position du point sur l'arc
    const angle = Math.PI * progression;
    const pointX = 50 + 45 * Math.cos(Math.PI - angle);
    const pointY = 50 - 45 * Math.sin(Math.PI - angle);

    return {
      pourcentage,
      display: {
        circumference,
        dashOffset,
        pointX,
        pointY
      }
    };
  }

  private processBudget(): any {
    const budget = this.rawData.budget;

    if (!budget) {
      return this.dashboardData.budget;
    }

    return {
      planifie: budget.totalPlanned || 0,
      consomme: budget.totalConsumed || 0,
      restant: budget.totalRemaining || 0,
      pourcentageConsomme: Math.round(budget.consumedPercentage || 0),
      pourcentageRestant: Math.round(budget.remainingPercentage || 0)
    };
  }

  private processMateriaux(): any[] {
    const materiauxCritique = this.rawData.materiauxCritique;

    if (!materiauxCritique || !Array.isArray(materiauxCritique.content)) {
      return [];
    }

    return materiauxCritique.content.map((material: CriticalMaterial) => {
      const ratio = material.criticalThreshold > 0 ? material.quantity / material.criticalThreshold : 100;
      let statusClass = 'bg-green-500';
      let textClass = 'text-green-500';
      let statusLabel = material.statusLabel;

      // Logique personnalisée : Rouge si proche du seuil (<= 110%) ou en dessous
      if (ratio <= 1.1) {
        statusClass = 'bg-red-500';
        textClass = 'text-red-600';
        // Force le label si nécessaire, ou garde l'original s'il est déjà explicite
        if (!statusLabel.includes('Critique')) {
          // Optionnel: on pourrait changer le label ici, mais on garde celui du back pour l'instant
          // sauf pour la couleur qui est forcée.
        }
      } else if (ratio <= 1.5) {
        statusClass = 'bg-orange-500';
        textClass = 'text-orange-500';
      }

      return {
        id: material.id,
        nom: material.label,
        quantiteActuelle: material.quantity,
        seuil: material.criticalThreshold,
        unite: material.unitName,
        propriete: material.propertyName,
        status: statusLabel,
        color: material.color,
        pourcentage: this.calculateMaterialPercentage(material.quantity, material.criticalThreshold),
        statusClass: statusClass,
        textClass: textClass
      };
    });
  }

  private calculateMaterialPercentage(current: number, threshold: number): number {
    if (!threshold || threshold === 0) return 0;
    return Math.min(100, Math.max(0, (current / threshold) * 100));
  }

  private processPhases(): any[] {
    const etatAvancement = this.rawData.etatAvancement;

    if (!etatAvancement || !Array.isArray(etatAvancement)) {
      return [];
    }

    // Définir l'ordre exact des phases avec leurs couleurs spécifiques et libellés lisibles
    const phasesConfig = [
      { id: 'GROS_OEUVRE', nom: 'Gros œuvre', couleur: '#2ECC71' },    // Vert
      { id: 'SECOND_OEUVRE', nom: 'Second œuvre', couleur: '#F39C12' }, // Orange
      { id: 'FINITION', nom: 'Finition', couleur: '#EBECF0' }        // Gris clair
    ];

    // Créer un mapping pour l'ordre et les couleurs
    const phaseConfigMap = new Map(phasesConfig.map(phase => [phase.id, phase]));

    // Traiter les phases
    const phasesProcessed = etatAvancement.map((phase: PhaseIndicator) => {
      const config = phaseConfigMap.get(phase.phaseName) || { nom: phase.phaseName, couleur: this.generateColor(0) };
      return {
        nom: config.nom,
        pourcentage: Math.round(phase.averageProgressPercentage || 0),
        couleur: config.couleur,
        ordre: phasesConfig.findIndex(p => p.id === phase.phaseName)
      };
    });

    // Trier par ordre défini et filtrer les phases non reconnues
    return phasesProcessed
      .filter(phase => phase.ordre !== -1)
      .sort((a, b) => a.ordre - b.ordre);
  }

  private processIncidents(): any {
    const statistiqueSignalement = this.rawData.statistiqueSignalement;
    const totalIncidents = this.rawData.incidents || 0;

    if (!statistiqueSignalement || !Array.isArray(statistiqueSignalement)) {
      return {
        total: totalIncidents,
        donnees: [0, 0, 0, 0, 0, 0, 0],
        labels: ["J-6", "J-5", "J-4", "J-3", "J-2", "Hier", "Aujourd'hui"],
        periode: 7
      };
    }

    // Créer les données pour les 7 derniers jours
    const donneesGraphique = this.createLast7DaysData(statistiqueSignalement);

    return {
      total: totalIncidents,
      donnees: donneesGraphique.data,
      labels: donneesGraphique.labels,
      periode: 7,
      statistiques: statistiqueSignalement
    };
  }

  private processTaches(): any[] {
    const tacheCritique = this.rawData.tacheCritique;

    if (!tacheCritique || !Array.isArray(tacheCritique)) {
      return [];
    }

    return tacheCritique.map((task: CriticalTask) => {
      // Normaliser le statut pour correspondre à nos besoins d'affichage
      let status: 'En retard' | 'Urgent' | 'À jour' = 'À jour';
      if (task.statusLabel?.includes('retard') || task.statusLabel?.includes('overdue')) {
        status = 'En retard';
      } else if (task.priority === 'HIGH' || task.statusLabel?.includes('urgent')) {
        status = 'Urgent';
      }

      return {
        id: task.id,
        nom: task.title,
        echeance: this.formatDateFromArray(task.endDate),
        dateEcheance: task.endDate,
        status: status,
        joursRestants: this.calculateRemainingDays(task.endDate),
        priority: this.normalizePriority(task.priority)
      };
    }).sort((a, b) => {
      // Trier d'abord par statut (retard > urgent > à jour)
      const priorityOrder = {
        'En retard': 0,
        'Urgent': 1,
        'À jour': 2
      };

      // Vérification de type pour éviter l'erreur TS
      const aPriority = priorityOrder[a.status as keyof typeof priorityOrder] || 2;
      const bPriority = priorityOrder[b.status as keyof typeof priorityOrder] || 2;

      return aPriority - bPriority;
    });
  }

  private calculateRemainingDays(dateArray: number[]): number | null {
    if (!dateArray || dateArray.length < 3) return null;

    const [year, month, day] = dateArray;
    const endDate = new Date(year, month - 1, day);
    const today = new Date();
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  private processPhotos(): any[] {
    const photoRecent = this.rawData.photoRecent;

    if (!photoRecent || !Array.isArray(photoRecent.content)) {
      return [];
    }

    return photoRecent.content.map((photo: RecentPhoto) => ({
      id: photo.id,
      src: photo.pictures && photo.pictures.length > 0 ? photo.pictures[0] : '',
      images: photo.pictures || [],
      alt: photo.phaseName || 'Photo de chantier',
      phase: photo.phaseName,
      description: photo.description,
      date: this.formatDateFromArray(photo.lastUpdated),
      dateArray: photo.lastUpdated,
      estEntree: photo.entrance
    }));
  }

  private processPerformances(): any {
    return {
      tauxAvancement: this.dashboardData.avancement?.pourcentage || 0,
      budgetConsomme: this.dashboardData.budget?.pourcentageConsomme || 0,
      incidents: this.rawData.incidents || 0,
      presenceMoyenne: Math.round(this.rawData.presenceMoyenne || 0),
      tachesRetard: this.rawData.tacheEnRetard || 0,
      materiauxAlerte: this.dashboardData.materiaux?.length || 0
    };
  }

  private createLast7DaysData(incidents: IncidentStatistic[]): { data: number[], labels: string[] } {
    const today = new Date();
    const labels: string[] = [];
    const data: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const incident = incidents.find(inc => inc.date === dateStr);

      if (i === 0) {
        labels.push("Aujourd'hui");
      } else {
        // Figma mockup uses J-6, J-5, etc.
        labels.push(`J-${i}`);
      }

      data.push(incident ? incident.count : 0);
    }

    return { data, labels };
  }

  private createCharts(): void {
    this.createProgressChart();
    this.createIncidentsChart();
    this.createBudgetChart();
    this.createRepartitionChart();
  }

  private createProgressChart(): void {
    if (!this.isBrowser || !this.progressChart || !this.dashboardData.phases?.length) {
      return;
    }

    const ctx = this.progressChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels: this.dashboardData.phases.map(p => p.nom),
        datasets: [{
          data: this.dashboardData.phases.map(p => p.pourcentage),
          backgroundColor: this.dashboardData.phases.map(p => p.couleur),

          borderRadius: 0,          // 🔥 coins carrés
          barThickness: 65          // 🔥 barres plus larges
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              stepSize: 20   // chiffres visibles (0,20,40…)
            },
            grid: {
              display: true,
              color: '#E5E7EB'
            },
            border: {
              display: false
            }
          },
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            }
          }
        }
      }
    };

    if (this.progressChartInstance) {
      this.progressChartInstance.destroy();
    }

    this.progressChartInstance = new Chart(ctx, config);
  }


  private createIncidentsChart(): void {
    if (!this.isBrowser || !this.incidentsChart) return;

    const ctx = this.incidentsChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.dashboardData.incidents.labels,
        datasets: [{
          data: this.dashboardData.incidents.donnees,
          borderColor: '#FF6B35',
          backgroundColor: 'rgba(255, 107, 53, 0.12)',
          fill: true,

          tension: 0, // 🔥 ligne droite

          pointRadius: 5,
          pointHoverRadius: 6,
          pointBackgroundColor: '#FFFFFF', // 🔥 points blancs
          pointBorderColor: '#FF6B35',
          pointBorderWidth: 2,

          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            displayColors: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              color: '#6B7280',
              font: { size: 12 }
            },
            grid: {
              color: '#E5E7EB'
            }
          },
          x: {
            ticks: {
              color: '#6B7280',
              font: { size: 12 }
            },
            grid: {
              display: false
            }
          }
        }
      }
    };

    if (this.incidentsChartInstance) {
      this.incidentsChartInstance.destroy();
    }
    this.incidentsChartInstance = new Chart(ctx, config);
  }


  // Méthode pour mettre à jour les données du graphique des incidents
  updateIncidentsChart(): void {
    if (this.incidentsChartInstance && this.dashboardData.incidents) {
      this.incidentsChartInstance.data.labels = this.dashboardData.incidents.labels;
      this.incidentsChartInstance.data.datasets[0].data = this.dashboardData.incidents.donnees;

      // Recalculer l'échelle Y
      const maxValue = Math.max(...this.dashboardData.incidents.donnees, 5);
      const yMaxValue = Math.ceil(maxValue * 1.2);

      if (this.incidentsChartInstance.options.scales?.['y']) {
        this.incidentsChartInstance.options.scales['y'].max = yMaxValue;
      }

      this.incidentsChartInstance.update();
    }
  }

  private createBudgetChart(): void {
    if (!this.isBrowser || !this.budgetChart) {
      return;
    }

    const ctx = this.budgetChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Couleurs conformes à la capture d'écran
    const consumedColor = '#FF6B35'; // Orange pour la partie consommée
    const remainingColor = '#F5F5F5'; // Gris très clair pour la partie restante

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [
            this.dashboardData.budget.pourcentageConsomme,
            this.dashboardData.budget.pourcentageRestant
          ],
          backgroundColor: [consumedColor, remainingColor],
          borderWidth: 0,
          borderRadius: 0, // Pas de coins arrondis
          spacing: 0 // Pas d'espacement entre les segments
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true, // Changé pour maintenir le ratio
        cutout: '65%', // Trou au centre
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        },
        // Désactive les animations pour un rendu plus fluide
        animation: {
          animateRotate: false,
          animateScale: false
        }
      }
    };

    // Détruire le graphique existant s'il existe
    if (this.budgetChartInstance) {
      this.budgetChartInstance.destroy();
    }

    // Créer le nouveau graphique
    this.budgetChartInstance = new Chart(ctx, config);
  }

  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  private generateColor(index: number): string {
    const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316', '#EC4899'];
    return colors[index % colors.length];
  }

  private normalizePriority(priority: string): 'high' | 'medium' | 'low' {
    if (!priority) return 'low';

    const priorityLower = priority.toLowerCase();
    if (priorityLower.includes('high') || priorityLower.includes('élevé') || priorityLower.includes('urgent')) {
      return 'high';
    }
    if (priorityLower.includes('medium') || priorityLower.includes('moyen')) {
      return 'medium';
    }
    return 'low';
  }

  private formatDateFromArray(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) {
      return new Date().toLocaleDateString('fr-FR');
    }

    const [year, month, day] = dateArray;
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('fr-FR');
  }

  // Méthodes publiques pour les classes CSS (utilisées dans le template)
  getStatusClass(status: string): string {
    if (!status) return 'text-gray-600 bg-gray-100';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('faible') || statusLower.includes('low')) {
      return 'text-orange-600 bg-orange-100';
    }
    if (statusLower.includes('normal') || statusLower.includes('good') || statusLower.includes('bon')) {
      return 'text-green-600 bg-green-100';
    }
    if (statusLower.includes('critique') || statusLower.includes('critical') || statusLower.includes('atteint')) {
      return 'text-red-600 bg-red-100';
    }
    return 'text-gray-600 bg-gray-100';
  }

  getPriorityClass(priority: string): string {
    const normalizedPriority = this.normalizePriority(priority);
    switch (normalizedPriority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-orange-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  }

  getPriorityBadge(status: string): string {
    if (!status) return 'bg-gray-100 text-gray-800';

    const statusLower = status.toLowerCase();
    if (statusLower.includes('retard') || statusLower.includes('overdue')) {
      return 'bg-red-100 text-red-800';
    }
    if (statusLower.includes('urgent')) {
      return 'bg-orange-100 text-orange-800';
    }
    if (statusLower.includes('jour') || statusLower.includes('time') || statusLower.includes('completed') || statusLower.includes('terminé')) {
      return 'bg-green-100 text-green-800';
    }
    return 'bg-gray-100 text-gray-800';
  }

  formatCurrency(amount: number): string {
    if (!amount && amount !== 0) return '0 FCFA';

    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'XOF',
      minimumFractionDigits: 0
    }).format(amount);
  }

  formatNumber(value: number): string {
    if (!value && value !== 0) return '0';
    return new Intl.NumberFormat('fr-FR').format(value);
  }

  formatPercentage(value: number): string {
    if (!value && value !== 0) return '0%';
    return `${Math.round(value)}%`;
  }

  // Méthode pour recharger les données
  refreshDashboard(): void {
    this.loadDashboardData();
  }

  // Getters pour accéder aux données dans le template
  get chantiers() {
    return this.dashboardData.chantiers;
  }

  get etudes() {
    return this.dashboardData.etudes;
  }

  get avancement() {
    return this.dashboardData.avancement;
  }

  get budget() {
    return this.dashboardData.budget;
  }

  get performances() {
    return this.dashboardData.performances;
  }

  get incidents() {
    return this.dashboardData.incidents;
  }
}