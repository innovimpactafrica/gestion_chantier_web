import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { DashboardAdminService, DashboardInfos, EvolutionData, PlanDistribution, ProfilDistribution, Invoice, InvoiceResponse } from './../../../services/dashboard-admin.service';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { LanguageService } from '../../core/services/language.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-admin.component.html',
  styleUrls: ['./dashboard-admin.component.css']
})
export class DashboardAdminComponent implements OnInit, OnDestroy {
  @ViewChild('abonnementsChart') abonnementsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenusChart') revenusChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('profilsChart') profilsChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('plansChart') plansChart!: ElementRef<HTMLCanvasElement>;

  private destroy$ = new Subject<void>();
  private chartInstances: { [key: string]: Chart } = {};

  // Loading states
  isLoadingDashboard = true;
  isLoadingEvolution = true;
  isLoadingRevenu = true;
  isLoadingPlans = true;
  isLoadingProfils = true;
  isLoadingInvoices = true;

  // Statistiques principales
  dashboardInfos: DashboardInfos | null = null;

  // Années disponibles pour le filtre
  selectedYear: number = new Date().getFullYear();
  availableYears: number[] = [];

  // Pagination pour les factures
  currentPage = 0;
  pageSize = 4;
  totalPages = 0;
  totalElements = 0;

  // Données pour les graphiques
  evolutionData: EvolutionData[] = [];
  revenuData: EvolutionData[] = [];
  planDistribution: PlanDistribution[] = [];
  profilDistribution: ProfilDistribution[] = [];

  // Dernières factures
  dernieresFactures: Invoice[] = [];
  Math: any;

  constructor(
    private dashboardService: DashboardAdminService,
    public languageService: LanguageService
  ) {
    // Générer les 10 dernières années
    const currentYear = new Date().getFullYear();
    for (let i = 0; i < 10; i++) {
      this.availableYears.push(currentYear - i);
    }
  }

  t(key: string): string {
    return this.languageService.translate(key);
  }

  ngOnInit(): void {
    console.log('🚀 DashboardAdminComponent initialisé');
    this.loadAllData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.destroyAllCharts();
  }

  ngAfterViewInit(): void {
    // Les graphiques seront créés après le chargement des données
  }

  /**
   * Charge toutes les données du dashboard
   */
  loadAllData(): void {
    console.log('📊 Chargement de toutes les données du dashboard...');

    // Charger les infos principales avec l'année sélectionnée
    this.loadDashboardInfos(this.selectedYear);

    // Charger les données de l'année sélectionnée
    this.loadYearData();

    // Charger les distributions (indépendantes de l'année)
    this.loadPlanDistribution();
    this.loadProfilDistribution();

    // Charger les factures
    this.loadInvoices();
  }

  /**
   * Charge les informations principales du dashboard pour une année donnée
   */
  loadDashboardInfos(year?: number): void {
    this.isLoadingDashboard = true;

    this.dashboardService.getInfosDashboard(year)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (infos) => {
          console.log('✅ Infos dashboard chargées:', infos);
          this.dashboardInfos = infos;
          this.isLoadingDashboard = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des infos dashboard:', error);
          this.isLoadingDashboard = false;
        }
      });
  }

  /**
   * Charge les données de l'année (évolution abonnements et revenus)
   */
  loadYearData(): void {
    this.isLoadingEvolution = true;
    this.isLoadingRevenu = true;

    // Charger évolution des abonnements et revenus en parallèle
    forkJoin({
      evolution: this.dashboardService.getEvolution(this.selectedYear),
      revenu: this.dashboardService.getRevenuEvolution(this.selectedYear)
    }).pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (results) => {
          console.log('✅ Données de l\'année chargées:', results);

          this.evolutionData = results.evolution;
          this.revenuData = results.revenu;

          this.isLoadingEvolution = false;
          this.isLoadingRevenu = false;

          // Créer ou mettre à jour les graphiques
          setTimeout(() => {
            this.updateAbonnementsChart();
            this.updateRevenusChart();
          }, 100);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des données de l\'année:', error);
          this.isLoadingEvolution = false;
          this.isLoadingRevenu = false;
        }
      });
  }

  /**
   * Charge la distribution des plans
   */
  loadPlanDistribution(): void {
    this.isLoadingPlans = true;

    this.dashboardService.getDistributionsPlan()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (distribution) => {
          console.log('✅ Distribution des plans chargée:', distribution);
          this.planDistribution = distribution;
          this.isLoadingPlans = false;

          setTimeout(() => {
            this.updatePlansChart();
          }, 100);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement de la distribution des plans:', error);
          this.isLoadingPlans = false;
        }
      });
  }

  /**
   * Charge la répartition des profils
   */
  loadProfilDistribution(): void {
    this.isLoadingProfils = true;

    this.dashboardService.getRepartitionProfil()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (distribution) => {
          console.log('✅ Répartition des profils chargée:', distribution);
          this.profilDistribution = distribution;
          this.isLoadingProfils = false;

          setTimeout(() => {
            this.updateProfilsChart();
          }, 100);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement de la répartition des profils:', error);
          this.isLoadingProfils = false;
        }
      });
  }

  /**
   * Charge les dernières factures avec pagination
   */
  loadInvoices(): void {
    this.isLoadingInvoices = true;

    this.dashboardService.getLastInvoices(this.currentPage, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: InvoiceResponse) => {
          console.log('✅ Factures chargées:', response);
          this.dernieresFactures = response.content;
          this.totalPages = response.totalPages;
          this.totalElements = response.totalElements;
          this.isLoadingInvoices = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des factures:', error);
          this.isLoadingInvoices = false;
        }
      });
  }

  /**
   * Appelé quand l'année change
   */
  onYearChange(): void {
    console.log('📅 Année changée:', this.selectedYear);
    // Reload dashboard cards with new year
    this.loadDashboardInfos(this.selectedYear);
    // Reload year-specific charts
    this.loadYearData();
  }

  /**
   * Navigation pagination
   */
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadInvoices();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.goToPage(this.currentPage + 1);
    }
  }

  /**
   * Détruit tous les graphiques
   */
  private destroyAllCharts(): void {
    Object.values(this.chartInstances).forEach(chart => {
      if (chart) {
        chart.destroy();
      }
    });
    this.chartInstances = {};
  }

  /**
    * Crée ou met à jour le graphique d'évolution des abonnements
    */
  updateAbonnementsChart(): void {
    if (!this.abonnementsChart?.nativeElement) return;

    const ctx = this.abonnementsChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Détruire l'ancien graphique
    if (this.chartInstances['abonnements']) {
      this.chartInstances['abonnements'].destroy();
    }

    // Map complet des mois → abréviations
    const monthMap: Record<string, string> = {
      "January": "Jan",
      "February": "Fév",
      "March": "Mar",
      "April": "Avr",
      "May": "Mai",
      "June": "Juin",
      "July": "Juil",
      "August": "Août",
      "September": "Sept",
      "October": "Oct",
      "November": "Nov",
      "December": "Déc",

      // Mois en français
      "Janvier": "Jan",
      "Février": "Fév",
      "Mars": "Mar",
      "Avril": "Avr",
      "Mai": "Mai",
      "Juin": "Juin",
      "Juillet": "Juil",
      "Août": "Août",
      "Septembre": "Sept",
      "Octobre": "Oct",
      "Novembre": "Nov",
      "Décembre": "Déc"
    };

    const labels = this.evolutionData.map(d => monthMap[d.month] || d.month);
    const data = this.evolutionData.map(d => d.total);

    this.chartInstances['abonnements'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Abonnements',
          data: data,
          backgroundColor: '#FF5C01'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            cornerRadius: 8
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#E5E7EB' },
            ticks: {
              color: '#6B7280',
              font: { size: 12 }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#6B7280',
              font: { size: 12 },

              // 🚀 Correction PC : labels horizontaux
              maxRotation: 0,
              minRotation: 0
            }
          }
        }
      }
    });
  }


  /**
   * Crée ou met à jour le graphique d'évolution des revenus
   */
  updateRevenusChart(): void {
    if (!this.revenusChart?.nativeElement) return;

    const ctx = this.revenusChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Détruire l'ancien graphique s'il existe
    if (this.chartInstances['revenus']) {
      this.chartInstances['revenus'].destroy();
    }

    // Map des mois → abréviations (FR + EN)
    const monthMap: Record<string, string> = {
      "January": "Jan",
      "February": "Fév",
      "March": "Mar",
      "April": "Avr",
      "May": "Mai",
      "June": "Juin",
      "July": "Juil",
      "August": "Août",
      "September": "Sept",
      "October": "Oct",
      "November": "Nov",
      "December": "Déc",

      "Janvier": "Jan",
      "Février": "Fév",
      "Mars": "Mar",
      "Avril": "Avr",
      "Mai": "Mai",
      "Juin": "Juin",
      "Juillet": "Juil",
      "Août": "Août",
      "Septembre": "Sept",
      "Octobre": "Oct",
      "Novembre": "Nov",
      "Décembre": "Déc"
    };

    const labels = this.revenuData.map(d => monthMap[d.month] || d.month);
    const data = this.revenuData.map(d => d.total);

    this.chartInstances['revenus'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Revenus (F CFA)',
          data: data,
          backgroundColor: '#0D47A1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 12,
            callbacks: {
              label: (context) => {
                return `${(context.parsed.y ?? 0).toLocaleString('fr-FR')} F CFA`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: '#E5E7EB' },
            ticks: {
              color: '#6B7280',
              font: { size: 12 },
              callback: (value) => {
                return `${value.toLocaleString('fr-FR')}`;
              }
            }
          },
          x: {
            grid: { display: false },
            ticks: {
              color: '#6B7280',
              font: { size: 12 },

              // 🚀 Garde les labels horizontaux sur PC
              maxRotation: 0,
              minRotation: 0
            }
          }
        }
      }
    });
  }

  /**
   * Crée ou met à jour le graphique de répartition des profils (barres horizontales)
   */
  updateProfilsChart(): void {
    if (!this.profilsChart?.nativeElement) return;

    const ctx = this.profilsChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Détruire l'ancien graphique s'il existe
    if (this.chartInstances['profils']) {
      this.chartInstances['profils'].destroy();
    }

    // Filtrer uniquement les profils à afficher
    const profilsToShow = ['PROMOTEUR', 'SITE_MANAGER', 'SUPPLIER', 'SUBCONTRACTOR', 'MOA', 'BET', 'WORKER'];
    const filteredData = this.profilDistribution.filter(d => profilsToShow.includes(d.profil));

    const labels = filteredData.map(d => d.profil);
    const data = filteredData.map(d => d.count);

    this.chartInstances['profils'] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nombre d\'utilisateurs',
          data: data,
          backgroundColor: '#FF5C01',

        }]
      },
      options: {
        indexAxis: 'y', // Barres horizontales
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: '#1E293B',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 8,
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: {
              color: '#E5E7EB',
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 14
              }
            }
          },
          y: {
            grid: {
              display: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                size: 12
              }
            }
          }
        }
      }
    });
  }

  /**
   * Crée ou met à jour le graphique de distribution des plans
   */
  updatePlansChart(): void {
    if (!this.plansChart?.nativeElement) return;

    const ctx = this.plansChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Détruire l'ancien graphique s'il existe
    if (this.chartInstances['plans']) {
      this.chartInstances['plans'].destroy();
    }

    const labels = this.planDistribution.map(d => d.planName);
    const data = this.planDistribution.map(d => d.percentage);
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    this.chartInstances['plans'] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
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
            backgroundColor: '#1E293B',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 8,
            callbacks: {
              label: (context) => {
                return `${context.label}: ${context.parsed}%`;
              }
            }
          }
        }
      }
    });
  }

  /**
   * Formatte le montant en F CFA
   */
  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F CFA`;
  }

  /**
   * Formatte la date
   */
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Retourne la couleur pour un plan donné
   */
  getPlanColor(index: number): string {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
    return colors[index % colors.length];
  }
}