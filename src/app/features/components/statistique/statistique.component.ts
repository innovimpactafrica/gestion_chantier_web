import { CommonModule } from '@angular/common';
import { Component, OnInit, AfterViewInit, ViewChild, ElementRef, OnDestroy, TrackByFunction } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, ChartType } from 'chart.js/auto';
import { StatistiqueService, EvolutionData, ConsommationData, RepartitionData } from '../../../../services/statistique.service';
import { MaterialsService } from '../../../../services/materials.service';
import { HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';

interface StatsData {
  materialsUsed: number;
  ordersPlaced: number;
  deliveriesReceived: number;
  alertsTriggered: number;
}

interface CategoryData {
  label: string;
  percentage: number;
  color: string;
}

interface MaterialData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

@Component({
  selector: 'app-statistique',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './statistique.component.html',
  styleUrl: './statistique.component.css'
})
export class StatistiqueComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('categoryChart', { static: false }) categoryChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('evolutionChart', { static: false }) evolutionChartRef!: ElementRef<HTMLCanvasElement>;

  categoryChart!: Chart;
  evolutionChart!: Chart;
  selectedPeriod = 'current';
  propertyId: number | null = null;

  statsData: StatsData = {
    materialsUsed: 0,
    ordersPlaced: 0,
    deliveriesReceived: 0,
    alertsTriggered: 0
  };

  categoryData: CategoryData[] = [];
  topMaterials: MaterialData[] = [];
  monthlyEvolutionData = {
    labels: [] as string[],
    data: [] as number[]
  };

  // Couleurs prédéfinies pour les graphiques
  private colors = [
    '#4285F4', '#34A853', '#FBBC04', '#4ECDC4', '#9E9E9E',
    '#9C88FF', '#FF6B9D', '#FFD93D', '#6BCF7F', '#FF6B47'
  ];
trackByCategory: TrackByFunction<CategoryData> | undefined;

  constructor(
    private statistiqueService: StatistiqueService,
    private materialsService: MaterialsService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void { 
    this.getPropertyIdFromRoute();
  }

  private getPropertyIdFromRoute(): void {
    this.route.paramMap.subscribe(params => {
      const idFromUrl = params.get('id');
      if (idFromUrl) {
        this.propertyId = +idFromUrl;
        console.log('Property ID récupéré depuis l\'URL:', this.propertyId);
        this.loadAllData();
        this.loadStatsData();
      } else {
        console.error("ID de propriété non trouvé dans l'URL.");
      }
    });
  }

  private loadStatsData(): void {
    if (this.propertyId === null) return;

    forkJoin({
      materials: this.materialsService.getStock(this.propertyId),
      orders: this.materialsService.getCommand(this.propertyId),
      deliveries: this.materialsService.getLivraison(this.propertyId)
    }).subscribe({
      next: (results) => {
        this.statsData.materialsUsed = results.materials.content.length;
        this.statsData.ordersPlaced = results.orders.content.length;
        this.statsData.deliveriesReceived = results.deliveries.content.length;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des données statistiques:', error);
      }
    });
  }

  ngAfterViewInit(): void {
    // Les graphiques seront initialisés après le chargement des données
  }

  private loadAllData(): void {
    if (this.propertyId !== null) {
      this.loadEvolution();
      this.loadConsommation();
      this.loadRepartition();
    } else {
      console.error('Impossible de charger les données: propertyId est null');
    }
  }

  private loadEvolution(): void {
    if (this.propertyId === null) return;
    
    this.statistiqueService.getEvolution(this.propertyId).subscribe({
      next: (data: EvolutionData[]) => {
        this.processEvolutionData(data);
        if (this.evolutionChartRef) {
          this.initEvolutionChart();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'évolution:', error);
      }
    });
  }

  private loadConsommation(): void {
    if (this.propertyId === null) return;
    
    this.statistiqueService.getConsommation(this.propertyId).subscribe({
      next: (data: ConsommationData[]) => {
        this.processConsommationData(data);
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la consommation:', error);
      }
    });
  }

  private loadRepartition(): void {
    if (this.propertyId === null) return;
    
    this.statistiqueService.getRepartition(this.propertyId).subscribe({
      next: (data: RepartitionData) => {
        this.processRepartitionData(data);
        if (this.categoryChartRef) {
          this.initCategoryChart();
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la répartition:', error);
      }
    });
  }

  private processEvolutionData(data: EvolutionData[]): void {
    this.monthlyEvolutionData.labels = data.map(item => item.date);
    this.monthlyEvolutionData.data = data.map(item => item.totalExits);
  }

  private processConsommationData(data: ConsommationData[]): void {
    const maxValue = Math.max(...data.map(item => item.totalUsedQuantity));
    
    this.topMaterials = data.slice(0, 5).map((item, index) => ({
      name: item.materialLabel,
      value: item.totalUsedQuantity,
      percentage: maxValue > 0 ? (item.totalUsedQuantity / maxValue) * 100 : 0,
      color: this.colors[index % this.colors.length]
    }));
  }
  // Modifications à apporter dans votre fichier TypeScript

// 1. Modifier la méthode initCategoryChart() pour créer un pie chart au lieu d'un doughnut
private initCategoryChart(): void {
  if (!this.categoryChartRef?.nativeElement) return;
  
  const ctx = this.categoryChartRef.nativeElement.getContext('2d');
  if (!ctx) return;

  if (this.categoryChart) {
    this.categoryChart.destroy();
  }

  const config: ChartConfiguration = {
    type: 'pie' as ChartType, // Changé de 'doughnut' à 'pie'
    data: {
      labels: this.categoryData.map(item => item.label),
      datasets: [{
        data: this.categoryData.map(item => item.percentage),
        backgroundColor: this.categoryData.map(item => item.color),
        borderWidth: 2,
        borderColor: '#ffffff', // Bordure blanche entre les secteurs
        hoverBorderWidth: 3,
        hoverBorderColor: '#ffffff'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false // Garder false car vous avez votre propre légende
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              return `${context.label}: ${context.parsed.toFixed(1)}%`;
            }
          },
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          cornerRadius: 4
        }
      },
      layout: {
        padding: 10
      },
      // Animation pour un effet plus fluide
      animation: {
        // animateRotate: true,
        // animateScale: true
      },
      // Interaction au survol
      interaction: {
        intersect: false
      }
    }
  };

  this.categoryChart = new Chart(ctx, config);
}



// 3. Améliorer la méthode processRepartitionData pour un meilleur formatage
private processRepartitionData(data: RepartitionData): void {
  const entries = Object.entries(data);
  const total = entries.reduce((sum, [, value]) => sum + value, 0);
  
  this.categoryData = entries.map(([label, value], index) => ({
    label,
    percentage: total > 0 ? Math.round((value / total) * 100 * 10) / 10 : 0, // Arrondi à 1 décimale
    color: this.colors[index % this.colors.length]
  }));
}

  // private processRepartitionData(data: RepartitionData): void {
  //   const entries = Object.entries(data);
    
  //   this.categoryData = entries.map(([label, percentage], index) => ({
  //     label,
  //     percentage: Math.round(percentage * 100) / 100,
  //     color: this.colors[index % this.colors.length]
  //   }));
  // }

  // private initCategoryChart(): void {
  //   if (!this.categoryChartRef?.nativeElement) return;
    
  //   const ctx = this.categoryChartRef.nativeElement.getContext('2d');
  //   if (!ctx) return;

  //   if (this.categoryChart) {
  //     this.categoryChart.destroy();
  //   }

  //   const config: ChartConfiguration = {
  //     type: 'doughnut' as ChartType,
  //     data: {
  //       labels: this.categoryData.map(item => item.label),
  //       datasets: [{
  //         data: this.categoryData.map(item => item.percentage),
  //         backgroundColor: this.categoryData.map(item => item.color),
  //         borderWidth: 0,
  //       }]
  //     },
  //     options: {
  //       responsive: true,
  //       maintainAspectRatio: false,
  //       plugins: {
  //         legend: {
  //           display: false
  //         },
  //         tooltip: {
  //           callbacks: {
  //             label: (context) => {
  //               return `${context.label}: ${context.parsed.toFixed(2)}%`;
  //             }
  //           }
  //         }
  //       }
  //     }
  //   };

  //   this.categoryChart = new Chart(ctx, config);
  // }

  private initEvolutionChart(): void {
    if (!this.evolutionChartRef?.nativeElement) return;
    
    const ctx = this.evolutionChartRef.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'line' as ChartType,
      data: {
        labels: this.monthlyEvolutionData.labels,
        datasets: [{
          data: this.monthlyEvolutionData.data,
          borderColor: '#FF6B47',
          backgroundColor: 'rgba(255, 107, 71, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#FF6B47',
          pointBorderColor: '#FF6B47',
          pointRadius: 4,
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            }
          },
          y: {
            beginAtZero: false,
            grid: {
              color: '#f0f0f0'
            },
            border: {
              display: false
            },
            ticks: {
              stepSize: 10
            }
          }
        },
        elements: {
          point: {
            hoverRadius: 8
          }
        }
      }
    };

    this.evolutionChart = new Chart(ctx, config);
  }

  onPeriodChange(): void {
    console.log('Période sélectionnée:', this.selectedPeriod);
    this.loadAllData();
  }

  private updateCharts(): void {
    if (this.categoryChart) {
      this.categoryChart.update();
    }
    if (this.evolutionChart) {
      this.evolutionChart.update();
    }
  }

  ngOnDestroy(): void {
    if (this.categoryChart) {
      this.categoryChart.destroy();
    }
    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }
  }
}