// progress-report.component.ts - Compatible SSR avec données API
import { Component, Input, AfterViewInit, ElementRef, ViewChild, PLATFORM_ID, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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

  // Couleurs prédéfinies pour chaque phase
  private phaseColors: { [key: string]: string } = {
    'Gros œuvre': '#10B981',     // Vert
    'Second œuvre': '#F59E0B',   // Orange
    'Finition': '#EF4444'        // Rouge
  };

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private dashboardService: DashboardService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
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
    
    this.dashboardService.etatAvancement().pipe(
      catchError(error => {
        console.warn('Erreur etatAvancement:', error);
        return of([] as PhaseIndicator[]);
      })
    ).subscribe({
      next: (phaseIndicators: PhaseIndicator[]) => {
        console.log('Données reçues:', phaseIndicators);
        this.processProgressData(phaseIndicators);
        this.isLoading = false;
        
        // Créer le graphique après le chargement des données (côté navigateur uniquement)
        if (this.isBrowser && this.chartCanvas) {
          setTimeout(() => this.createChart(), 100);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'état d\'avancement:', error);
        this.error = 'Erreur lors du chargement des données';
        this.isLoading = false;
        this.createDefaultData();
        
        if (this.isBrowser && this.chartCanvas) {
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

    console.log('Données processées:', this.progressData);
  }

  private createDefaultData(): void {
    this.progressData = [
      { label: 'Gros œuvre', value: 62, color: '#10B981' },
      { label: 'Second œuvre', value: 38, color: '#F59E0B' },
      { label: 'Finition', value: 5, color: '#EF4444' }
    ];
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
  
    const config: ChartConfiguration<'bar'> = {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderSkipped: false
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
      stepSize: 20, // Affiche : 0, 20, 40, ...
      callback: function (value) {
        return value.toString(); // s'assure que le label est affiché
      },
      color: '#4B5563', // facultatif : gris foncé
      font: { size: 12 }
    },
    grid: {
      display: true,
      color: '#E5E7EB' // gris clair
    }
  },
  x: {
    grid: { display: false },
    ticks: {
      font: { size: 12 },
      color: '#4B5563'
    }
  }
        }
      }
    };
  
    // Détruire l’ancien graphique s’il existe
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

  // Getter pour le pourcentage moyen
  get averageProgress(): number {
    if (this.progressData.length === 0) return 0;
    const total = this.progressData.reduce((sum, item) => sum + item.value, 0);
    return Math.round(total / this.progressData.length);
  }
}
// le html
