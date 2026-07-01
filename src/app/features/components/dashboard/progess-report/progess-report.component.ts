// progress-report.component.ts - Compatible SSR avec données API
import { Component, Input, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Chart, ChartConfiguration, registerables } from 'chart.js/auto';
import { DashboardService, PhaseIndicator } from '../../../../../services/dashboard.service';
import { Subject } from 'rxjs';
import { takeUntil, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

// Enregistrer tous les composants Chart.js
Chart.register(...registerables);

interface ProgressItem {
  label: string;
  value: number;
  lastUpdated?: string;
  color?: string;
}

@Component({
  selector: 'app-progess-report',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './progess-report.component.html',
  styleUrl: './progess-report.component.css'
})
export class ProgressReportComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() title: string = 'État d\'avancement';
  @Input() percentage: number = 0;
  @Input() iconName: string = '';
  @Input() chartId: string = 'progressChart';
  @ViewChild('barChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | undefined;
  private isBrowser: boolean;
  private destroy$ = new Subject<void>();
  /** ID du chantier courant (lu depuis la route /detailprojet/:id), pour scoper l'avancement à ce seul chantier */
  private projectId: number | null = null;

  // États de chargement et d'erreur
  isLoading: boolean = true;
  error: string | null = null;

  progressData: ProgressItem[] = [];

  // Mapping des noms de phases pour l'affichage
  private phaseDisplayNames: { [key: string]: string } = {
    'GROS_OEUVRE': 'Gros œuvre',
    'SECOND_OEUVRE': 'Second œuvre',
    'FINITION': 'Finition',
    'Gros œuvre': 'Gros œuvre',
    'Second œuvre': 'Second œuvre',
    'Finition': 'Finition'
  };

// Couleurs prédéfinies pour chaque phase - MODIFIÉES
private phaseColors: { [key: string]: string } = {
  'Gros œuvre': '#2ECC71',     // Vert modifié
  'Second œuvre': '#F39C12',   // Orange modifié
  'Finition': '#EBECF0'        // Gris clair modifié
};

// Méthode createDefaultData() avec les nouvelles couleurs
private createDefaultData(): void {
  this.progressData = [
    { label: 'Gros œuvre', value: 62, color: '#2ECC71' },
    { label: 'Second œuvre', value: 38, color: '#F39C12' },
    { label: 'Finition', value: 5, color: '#EBECF0' }
  ];
}

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private dashboardService: DashboardService,
    private route: ActivatedRoute
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    this.projectId = idFromUrl ? +idFromUrl : null;
    this.loadProgressData();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private loadProgressData(): void {
    this.isLoading = true;
    this.error = null;
    
    // Vérifier si l'utilisateur est connecté
    if (!this.dashboardService.isUserConnected()) {
      this.error = 'Utilisateur non connecté';
      this.isLoading = false;
      this.createDefaultData();
      return;
    }
    
    this.dashboardService.etatAvancement(this.projectId ?? undefined).pipe(
      catchError(error => {
        return of([] as PhaseIndicator[]);
      })
    ).subscribe({
      next: (phaseIndicators: PhaseIndicator[]) => {
        this.processProgressData(phaseIndicators);
        this.isLoading = false;
        
        // Créer le graphique après le chargement des données (côté navigateur uniquement)
        // Note : ne pas conditionner sur `this.chartCanvas` ici — le canvas est dans un
        // bloc *ngIf affiché seulement une fois `isLoading` à false, donc la référence
        // ViewChild n'existe pas encore à ce tick. Le setTimeout laisse le temps au DOM
        // de se mettre à jour ; createChart() vérifie déjà chartCanvas en interne.
        if (this.isBrowser) {
          setTimeout(() => this.createChart(), 100);
        }
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des données';
        this.isLoading = false;
        this.createDefaultData();
        
        // Note : ne pas conditionner sur `this.chartCanvas` ici — le canvas est dans un
        // bloc *ngIf affiché seulement une fois `isLoading` à false, donc la référence
        // ViewChild n'existe pas encore à ce tick. Le setTimeout laisse le temps au DOM
        // de se mettre à jour ; createChart() vérifie déjà chartCanvas en interne.
        if (this.isBrowser) {
          setTimeout(() => this.createChart(), 100);
        }
      }
    });
  }

  private processProgressData(phaseIndicators: PhaseIndicator[]): void {
    if (!phaseIndicators || phaseIndicators.length === 0) {
      this.createDefaultData();
      return;
    }

    // Transformation des données API en format utilisable par le graphique
    this.progressData = phaseIndicators.map(indicator => {
      const displayName = this.phaseDisplayNames[indicator.phaseName] || indicator.phaseName;
      const color = this.phaseColors[displayName] || this.generateColorForPhase(displayName);
      
      return {
        label: displayName,
        value: Math.round((indicator.averageProgressPercentage || 0) * 100) / 100, // Arrondir à 2 décimales
        color: color
      };
    });

    // Trier les phases dans l'ordre logique si possible
    this.progressData.sort((a, b) => {
      const order = ['Gros œuvre', 'Second œuvre', 'Finition'];
      const indexA = order.indexOf(a.label);
      const indexB = order.indexOf(b.label);
      
      if (indexA !== -1 && indexB !== -1) {
        return indexA - indexB;
      }
      return a.label.localeCompare(b.label);
    });

  }


  private generateColorForPhase(phaseName: string): string {
    // Générer une couleur basée sur le nom de la phase
    const colors = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    const hash = phaseName.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0);
      return a & a;
    }, 0);
    return colors[Math.abs(hash) % colors.length];
  }

  private createChart(): void {
    if (!this.isBrowser || !this.chartCanvas || !this.progressData.length) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.progressData.map(p => p.label);
    const data = this.progressData.map(p => p.value);
    const colors = this.progressData.map(p => p.color);

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#FFFFFF',
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          // Légende native désactivée : on affiche une légende personnalisée
          // (couleur + libellé + pourcentage) dans le template, alignée sur le design system.
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${this.formatPercentage(context.parsed)}`
            }
          }
        }
      }
    };

    // Détruire l'ancien graphique s'il existe
    if (this.chart) this.chart.destroy();

    this.chart = new Chart(ctx, config);
  }
  

  // Méthode pour rafraîchir les données
  refreshData(): void {
    this.loadProgressData();
  }

  // Méthode pour formater les pourcentages
  formatPercentage(value: number): string {
    if (!value && value !== 0) return '0%';
    return `${Math.round(value)}%`;
  }

  // Getter pour vérifier si on a des données
  get hasData(): boolean {
    return this.progressData.length > 0 && this.progressData.some(item => item.value > 0);
  }
}
// le html
