import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DemandeService, PercentageCountResponse, VolumetryResponse } from '../../../../services/demande.service';
import { AuthService } from '../../auth/services/auth.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

interface EtudeStats {
  enAttente: number;
  enCours: number;
  validees: number;
  rejetees: number;
}

interface VolumetrieData {
  projetsConcernes: number;
  demandesRecues: number;
  rapportsProduits: number;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-dashboard-fournisseur',
  templateUrl: './dashboard.component.html',
  styleUrls: []
})
export class DashboardfComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('pieChart', { static: false }) pieChartRef!: ElementRef;
  @ViewChild('barChart', { static: false }) barChartRef!: ElementRef;

  pieChart: Chart | null = null;
  barChart: Chart | null = null;

  currentYear = new Date().getFullYear();
  selectedPeriod = 'Ce-mois';
  selectedVolumePeriod = 'Ce-mois';

  stats: EtudeStats = {
    enAttente: 0,
    enCours: 0,
    validees: 0,
    rejetees: 0
  };

  volumetrieData: VolumetrieData = {
    projetsConcernes: 0,
    demandesRecues: 0,
    rapportsProduits: 0
  };

  // ID du BET (dynamique depuis l'utilisateur connecté)
  betId: number | null = null;
  loading = true;
  error: string | null = null;

  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();

  constructor(
    private demandeService: DemandeService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initializeBetId();
  }

  ngOnDestroy() {
    if (this.pieChart) {
      this.pieChart.destroy();
    }
    if (this.barChart) {
      this.barChart.destroy();
    }
    this.subscriptions.unsubscribe();
  }

  ngAfterViewInit() {
    // Les graphiques seront créés après le chargement des données
  }

  /**
   * Initialise l'ID du BET à partir de l'utilisateur connecté
   */
  private initializeBetId(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();
      
      if (user && user.id) {
        this.betId = user.id;
        this.loadKpiData();
      } else {
        // Si l'utilisateur n'a pas d'ID, on rafraîchit les données utilisateur
        const refreshSubscription = this.authService.refreshUser().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser && refreshedUser.id) {
              this.betId = refreshedUser.id;
              this.loadKpiData();
            } else {
              this.handleError('Utilisateur non trouvé ou ID manquant');
            }
          },
          error: (error) => {
            this.handleError('Erreur lors du chargement des informations utilisateur');
            console.error('Erreur refreshUser:', error);
          }
        });
        
        this.subscriptions.add(refreshSubscription);
      }
    } else {
      this.handleError('Utilisateur non authentifié');
    }
  }

  /**
   * Charge les données KPI (pourcentages et volumétrie)
   */
  private loadKpiData(): void {
    if (this.betId === null) {
      this.handleError('ID utilisateur non disponible');
      return;
    }

    this.loading = true;
    this.error = null;

    // Charger les pourcentages this.betId
    const percentageSubscription = this.demandeService.getPercentageCount(1).subscribe({
      next: (data: PercentageCountResponse) => {
        this.updateStatsFromPercentageData(data);
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des pourcentages:', error);
        this.handleError('Erreur lors du chargement des statistiques');
        this.checkLoadingComplete();
      }
    });

    // Charger la volumétrie
    const volumetrySubscription = this.demandeService.getVolumetry(1).subscribe({
      next: (data: VolumetryResponse) => {
        this.updateVolumetryData(data);
        this.checkLoadingComplete();
      },
      error: (error) => {
        console.error('Erreur lors du chargement de la volumétrie:', error);
        this.handleError('Erreur lors du chargement de la volumétrie');
        this.checkLoadingComplete();
      }
    });

    this.subscriptions.add(percentageSubscription);
    this.subscriptions.add(volumetrySubscription);
  }

  /**
   * Met à jour les statistiques à partir des données de pourcentage
   */
  private updateStatsFromPercentageData(data: PercentageCountResponse): void {
    this.stats = {
      enAttente: data.counts.PENDING,
      enCours: data.counts.IN_PROGRESS,
      validees: data.counts.VALIDATED,
      rejetees: data.counts.REJECTED
    };

    // Recréer le graphique circulaire après mise à jour des données
    setTimeout(() => {
      this.createPieChart();
    }, 0);
  }

  /**
   * Met à jour les données de volumétrie
   */
  private updateVolumetryData(data: VolumetryResponse): void {
    this.volumetrieData = {
      projetsConcernes: data.distinctPropertiesCount,
      demandesRecues: data.totalStudyRequests,
      rapportsProduits: data.totalReports
    };

    // Recréer le graphique en barres après mise à jour des données
    setTimeout(() => {
      this.createBarChart();
    }, 0);
  }

  /**
   * Vérifie si tous les chargements sont terminés
   */
  private checkLoadingComplete(): void {
    // Cette méthode peut être étendue pour gérer plusieurs appels asynchrones
    this.loading = false;
  }

  /**
   * Gère les erreurs
   */
  private handleError(message: string): void {
    console.error(message);
    this.error = message;
    this.loading = false;
  }

  createPieChart() {
    if (!this.pieChartRef?.nativeElement) return;

    // Détruire le graphique existant s'il y en a un
    if (this.pieChart) {
      this.pieChart.destroy();
    }

    const total = this.getTotal();
    
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Validées', 'En cours', 'Attente', 'Rejetées'],
        datasets: [{
          data: [
            this.stats.validees,
            this.stats.enCours,
            this.stats.enAttente,
            this.stats.rejetees
          ],
          backgroundColor: [
            '#22c55e', // green-500 pour validées
            '#3b82f6', // blue-500 pour en cours
            '#f59e0b', // amber-500 pour attente
            '#ef4444'  // red-500 pour rejetées
          ],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${percentage}%`;
              }
            }
          }
        }
      }
    };

    this.pieChart = new Chart(this.pieChartRef.nativeElement, config);
  }

  createBarChart() {
    if (!this.barChartRef?.nativeElement) return;

    // Détruire le graphique existant s'il y en a un
    if (this.barChart) {
      this.barChart.destroy();
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: ['Projets concernés', 'Demandes reçues', 'Rapports produits'],
        datasets: [{
          data: [
            this.volumetrieData.projetsConcernes,
            this.volumetrieData.demandesRecues,
            this.volumetrieData.rapportsProduits
          ],
          backgroundColor: [
            '#60a5fa', // blue-400
            '#60a5fa', // blue-400
            '#60a5fa'  // blue-400
          ],
          borderRadius: 4,
          maxBarThickness: 60
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
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: Math.ceil(Math.max(
                this.volumetrieData.projetsConcernes,
                this.volumetrieData.demandesRecues,
                this.volumetrieData.rapportsProduits
              ) / 5)
            },
            grid: {
              color: '#f3f4f6'
            }
          },
          x: {
            grid: {
              display: false
            }
          }
        }
      }
    };

    this.barChart = new Chart(this.barChartRef.nativeElement, config);
  }

  getTotal(): number {
    return this.stats.enAttente + this.stats.enCours + this.stats.validees + this.stats.rejetees;
  }

  getPercentage(value: number): string {
    const total = this.getTotal();
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    // Recharger les données selon la période sélectionnée
    this.loadKpiData();
  }

  onVolumePeriodChange(period: string) {
    this.selectedVolumePeriod = period;
    // Recharger les données de volumétrie selon la période sélectionnée
    this.loadKpiData();
  }

  /**
   * Méthode pour obtenir les pourcentages formatés pour l'affichage
   */
  getFormattedPercentages() {
    const total = this.getTotal();
    if (total === 0) {
      return {
        attente: '0.0',
        enCours: '0.0',
        validees: '0.0',
        rejetees: '0.0'
      };
    }

    return {
      attente: ((this.stats.enAttente / total) * 100).toFixed(1),
      enCours: ((this.stats.enCours / total) * 100).toFixed(1),
      validees: ((this.stats.validees / total) * 100).toFixed(1),
      rejetees: ((this.stats.rejetees / total) * 100).toFixed(1)
    };
  }

  /**
   * Méthode pour rafraîchir les données manuellement
   */
  refreshData() {
    this.loadKpiData();
  }
}



