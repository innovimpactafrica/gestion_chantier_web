import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { SupplierService, DashboardInfos, OrderCountByStatus } from '../../../../services/supplier.service';
import { AuthService } from '../../auth/services/auth.service';
import { Subscription } from 'rxjs';

Chart.register(...registerables);

interface OrderStats {
  enAttente: number;
  approuvees: number;
  rejetees: number;
  enLivraison: number;
  livrees: number;
}

interface PropertyData {
  propertyId: number;
  propertyName: string;
  totalOrders: number;
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

  stats: OrderStats = {
    enAttente: 0,
    approuvees: 0,
    rejetees: 0,
    enLivraison: 0,
    livrees: 0
  };

  topProperties: PropertyData[] = [];

  // ID du fournisseur (dynamique depuis l'utilisateur connecté)
  supplierId: number | null = null;
  loading = true;
  error: string | null = null;

  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();

  constructor(
    private supplierService: SupplierService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.initializeSupplierId();
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
   * Initialise l'ID du fournisseur à partir de l'utilisateur connecté
   */
  private initializeSupplierId(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();
      console.log(user)
      if (user && user.id) {
        this.supplierId = user.id;
        this.loadDashboardData();
      } else {
        // Si l'utilisateur n'a pas d'ID, on rafraîchit les données utilisateur
        const refreshSubscription = this.authService.refreshUser().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser && refreshedUser.id) {
              this.supplierId = refreshedUser.id;
              this.loadDashboardData();
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
   * Charge les données du dashboard (statistiques et propriétés)
   */
  private loadDashboardData(): void {
    if (this.supplierId === null) {
      this.handleError('ID fournisseur non disponible');
      return;
    }

    this.loading = true;
    this.error = null;

    const dashboardSubscription = this.supplierService.getInfosDashboard(this.supplierId).subscribe({
      next: (data: DashboardInfos) => {
        this.updateStatsFromDashboardData(data);
        this.updateTopProperties(data);
        this.loading = false;
        
        // Créer les graphiques après mise à jour des données
        setTimeout(() => {
          this.createPieChart();
          this.createBarChart();
        }, 0);
      },
      error: (error) => {
        console.error('Erreur lors du chargement du dashboard:', error);
        this.handleError('Erreur lors du chargement des données du dashboard');
        this.loading = false;
      }
    });

    this.subscriptions.add(dashboardSubscription);
  }

  /**
   * Met à jour les statistiques à partir des données du dashboard
   */
  private updateStatsFromDashboardData(data: DashboardInfos): void {
    this.stats = {
      enAttente: data.orderCountByStatus.PENDING || 0,
      approuvees: data.orderCountByStatus.APPROVED || 0,
      rejetees: data.orderCountByStatus.REJECTED || 0,
      enLivraison: data.orderCountByStatus.IN_DELIVERY || 0,
      livrees: data.orderCountByStatus.DELIVERED || 0
    };
  }

  /**
   * Met à jour les données des propriétés top
   */
  private updateTopProperties(data: DashboardInfos): void {
    this.topProperties = data.topProperties || [];
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
        labels: ['Livrées', 'En livraison', 'Approuvées', 'En attente', 'Rejetées'],
        datasets: [{
          data: [
            this.stats.livrees,
            this.stats.enLivraison,
            this.stats.approuvees,
            this.stats.enAttente,
            this.stats.rejetees
          ],
          backgroundColor: [
            '#22c55e', // green-500 pour livrées
            '#3b82f6', // blue-500 pour en livraison
            '#10b981', // emerald-500 pour approuvées
            '#f59e0b', // amber-500 pour en attente
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
                const percentage = total > 0 ? ((context.parsed / total) * 100).toFixed(1) : '0.0';
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

    // Limiter à 10 propriétés maximum pour la lisibilité
    const displayProperties = this.topProperties.slice(0, 10);
    
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: displayProperties.map(p => p.propertyName),
        datasets: [{
          data: displayProperties.map(p => p.totalOrders),
          backgroundColor: '#60a5fa', // blue-400
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
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `Commandes: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
              precision: 0
            },
            grid: {
              color: '#f3f4f6'
            }
          },
          x: {
            grid: {
              display: false
            },
            ticks: {
              maxRotation: 0,
              minRotation: 0
            }
          }
        }
      }
    };

    this.barChart = new Chart(this.barChartRef.nativeElement, config);
  }

  getTotal(): number {
    return this.stats.enAttente + this.stats.approuvees + this.stats.rejetees + 
           this.stats.enLivraison + this.stats.livrees;
  }

  getPercentage(value: number): string {
    const total = this.getTotal();
    if (total === 0) return '0.0';
    return ((value / total) * 100).toFixed(1);
  }

  onPeriodChange(period: string) {
    this.selectedPeriod = period;
    // Recharger les données selon la période sélectionnée
    this.loadDashboardData();
  }

  onVolumePeriodChange(period: string) {
    this.selectedVolumePeriod = period;
    // Recharger les données selon la période sélectionnée
    this.loadDashboardData();
  }

  /**
   * Méthode pour obtenir les pourcentages formatés pour l'affichage
   */
  getFormattedPercentages() {
    const total = this.getTotal();
    if (total === 0) {
      return {
        enAttente: '0.0',
        approuvees: '0.0',
        rejetees: '0.0',
        enLivraison: '0.0',
        livrees: '0.0'
      };
    }

    return {
      enAttente: ((this.stats.enAttente / total) * 100).toFixed(1),
      approuvees: ((this.stats.approuvees / total) * 100).toFixed(1),
      rejetees: ((this.stats.rejetees / total) * 100).toFixed(1),
      enLivraison: ((this.stats.enLivraison / total) * 100).toFixed(1),
      livrees: ((this.stats.livrees / total) * 100).toFixed(1)
    };
  }

  /**
   * Méthode pour rafraîchir les données manuellement
   */
  refreshData() {
    this.loadDashboardData();
  }

  /**
   * Méthode pour obtenir le nom de l'utilisateur connecté
   */
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName();
  }

  /**
   * Méthode pour debug - afficher les informations utilisateur
   */
  debugUserInfo(): void {
    console.log('Current User:', this.authService.currentUser());
    console.log('Supplier ID:', this.supplierId);
  }
}