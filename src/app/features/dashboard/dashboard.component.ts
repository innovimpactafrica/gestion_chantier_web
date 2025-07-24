import { CommonModule } from '@angular/common';
import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';
import { ProjectOviewComponent } from "../components/dashboard/project-oview/project-oview.component";
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
  PageableResponse 
} from '../../../services/dashboard.service';
import { forkJoin, Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

Chart.register(...registerables);

@Component({
  standalone: true,
  imports: [CommonModule, ProjectOviewComponent],
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('progressChart', { static: false }) progressChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('incidentsChart', { static: false }) incidentsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('budgetChart', { static: false }) budgetChart!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private progressChartInstance?: Chart;
  private incidentsChartInstance?: Chart;
  private budgetChartInstance?: Chart;
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
      enCours: 0,
      enRetard: 0,
      enAttente: 0,
      termines: 0,
      total: 0
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

  constructor(
    private dashboardService: DashboardService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.progressChartInstance) {
      this.progressChartInstance.destroy();
    }
    if (this.incidentsChartInstance) {
      this.incidentsChartInstance.destroy();
    }
    if (this.budgetChartInstance) {
      this.budgetChartInstance.destroy();
    }
  }

  private loadDashboardData(): void {
    this.isLoading = true;
    this.hasError = false;

    // Vérifier si l'utilisateur est connecté
    if (!this.dashboardService.isUserConnected()) {
      this.hasError = true;
      this.errorMessage = 'Utilisateur non connecté';
      this.isLoading = false;
      return;
    }

    // Chargement parallèle de toutes les données depuis le backend
    forkJoin({
      vueEnsemble: this.dashboardService.vueEnsemble().pipe(
        catchError(error => {
          console.warn('Erreur vueEnsemble:', error);
          return of({
            totalTasks: 0,
            pendingTasks: 0,
            completedTasks: 0,
            overdueTasks: 0
          } as TasksKpi);
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
        this.hasError = true;
        this.errorMessage = 'Erreur lors du chargement des données du tableau de bord';
        this.isLoading = false;
      }
    });
  }

  private processDashboardData(): void {
    try {
      // Traitement des données avec vérification de sécurité
      this.dashboardData.chantiers = this.processChantiers();
      this.dashboardData.avancement = this.processAvancement();
      this.dashboardData.budget = this.processBudget();
      this.dashboardData.materiaux = this.processMateriaux();
      this.dashboardData.phases = this.processPhases();
      this.dashboardData.incidents = this.processIncidents();
      this.dashboardData.taches = this.processTaches();
      this.dashboardData.photos = this.processPhotos();
      this.dashboardData.performances = this.processPerformances();
      this.dashboardData.annee = this.getCurrentYear();

      // Assigner aux propriétés directes pour le template
      this.stockAlertes = this.dashboardData.materiaux;
      this.tachesCritiques = this.dashboardData.taches;
      this.photosRecentes = this.dashboardData.photos;

      console.log('Données processées:', this.dashboardData);
    } catch (error) {
      console.error('Erreur lors du traitement des données:', error);
      // Garder les valeurs par défaut en cas d'erreur
    }
  }

  private processChantiers(): any {
    const vueEnsemble = this.rawData.vueEnsemble;
    
    if (!vueEnsemble) {
      return this.dashboardData.chantiers;
    }

    // Selon votre mapping:
    // completedTasks = terminé
    // overdueTasks = en retard  
    // pendingTasks = en cours
    // totalTasks - (completedTasks + overdueTasks + pendingTasks) = en attente
    
    const termines = vueEnsemble.completedTasks || 0;
    const enRetard = vueEnsemble.overdueTasks || 0;
    const enCours = vueEnsemble.pendingTasks || 0;
    const total = vueEnsemble.totalTasks || 0;
    const enAttente = Math.max(0, total - termines - enRetard - enCours);

    return {
      enCours,
      enRetard,
      enAttente,
      termines,
      total
    };
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

    return materiauxCritique.content.map((material: CriticalMaterial) => ({
      id: material.id,
      nom: material.label,
      quantite: `${material.quantity} ${material.unitName}`,
      seuil: material.criticalThreshold,
      unite: material.unitName,
      propriete: material.propertyName,
      status: material.statusLabel,
      color: material.color,
      description: `${material.quantity} ${material.unitName} / seuil: ${material.criticalThreshold} ${material.unitName}`
    }));
  }

 
  private processPhases(): any[] {
    const etatAvancement = this.rawData.etatAvancement;
    
    if (!etatAvancement || !Array.isArray(etatAvancement)) {
      return [];
    }
  
    // Définir l'ordre exact des phases (remplacez par les noms exacts de votre backend)
    const ordrePhases = [
      'GROS_OEUVRE',      // Remplacez par le nom exact
      'SECOND_OEUVRE',    // Remplacez par le nom exact  
      'FINITION'         // Remplacez par le nom exact
    ];
    
    // Créer un mapping pour l'ordre
    const phaseOrderMap = new Map(ordrePhases.map((phase, index) => [phase, index]));
    
    // Traiter les phases
    const phasesProcessed = etatAvancement.map((phase: PhaseIndicator, index: number) => ({
      nom: phase.phaseName,
      pourcentage: Math.round(phase.averageProgressPercentage || 0),
      couleur: this.generateColor(index),
      ordre: phaseOrderMap.get(phase.phaseName) ?? 999 // 999 pour les phases non trouvées
    }));
  
    // Trier par ordre défini
    return phasesProcessed.sort((a, b) => a.ordre - b.ordre);
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

    return tacheCritique.map((task: CriticalTask) => ({
      id: task.id,
      nom: task.title,
      titre: task.title,
      echeance: this.formatDateFromArray(task.endDate),
      dateEcheance: task.endDate,
      status: task.statusLabel,
      priority: this.normalizePriority(task.priority),
      couleur: task.color,
      prioriteNormalisee: this.normalizePriority(task.priority)
    }));
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
      } else if (i === 1) {
        labels.push("Hier");
      } else {
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
        labels: this.dashboardData.phases.map((phase: any) => phase.nom),
        datasets: [{
          data: this.dashboardData.phases.map((phase: any) => phase.pourcentage),
          backgroundColor: this.dashboardData.phases.map((phase: any) => phase.couleur),
          borderSkipped: false,
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
            grid: { display: false },
            ticks: { display: false }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 12 } }
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
    if (!this.isBrowser || !this.incidentsChart || !this.dashboardData.incidents?.donnees?.length) {
      return;
    }

    const ctx = this.incidentsChart.nativeElement.getContext('2d');
    if (!ctx) return;

    const maxValue = Math.max(...this.dashboardData.incidents.donnees, 6);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: this.dashboardData.incidents.labels,
        datasets: [{
          data: this.dashboardData.incidents.donnees,
          borderColor: '#FF6B35',
          backgroundColor: 'transparent',
          pointBackgroundColor: '#FF6B35',
          pointBorderColor: '#FF6B35',
          pointRadius: 4,
          tension: 0.4
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
            max: maxValue,
            grid: { display: true, color: '#F3F4F6' },
            ticks: { stepSize: 1, font: { size: 10 } }
          },
          x: {
            grid: { display: false },
            ticks: { font: { size: 10 } }
          }
        }
      }
    };

    if (this.incidentsChartInstance) {
      this.incidentsChartInstance.destroy();
    }
    this.incidentsChartInstance = new Chart(ctx, config);
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

  // Méthodes utilitaires
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