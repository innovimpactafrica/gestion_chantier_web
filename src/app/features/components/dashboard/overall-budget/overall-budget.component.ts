import {
  Component,
  Input,
  AfterViewInit,
  ElementRef,
  ViewChild,
  Inject,
  PLATFORM_ID,
  OnInit,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { Chart } from 'chart.js/auto';
import { DahsboardService, BudgetKpiResponse } from '../../../../core/services/dahsboard.service';
import { AuthService } from '../../../auth/services/auth.service';

interface BudgetData {
  consomme: number;
  total: number;
  pourcentage: number;
}

@Component({
  selector: 'app-overall-budget',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './overall-budget.component.html',
  styleUrl: './overall-budget.component.css'
})
export class OverallBudgetComponent implements OnInit, AfterViewInit, OnChanges {
  @Input() budgetData: BudgetData = {
    consomme: 42000000,
    total: 60000000,
    pourcentage: 70
  };

  @Input() promoterId!: number;
  @Input() properties: { id: number; name: string }[] = [];


  @Input() propertyId?: number;
  @Input() additionalParams?: { [key: string]: string | number };
  @Input() useApiData: boolean = true;

  currentUserId!: number;
selectedPropertyId!: number;


  kpiData: BudgetKpiResponse | null = null;
  loading = false;
  error: string | null = null;

  @Input() chartId: string = 'progressChart';
  @ViewChild('budgetChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  isBrowser: boolean;
  private chart: Chart | null = null;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private dashboardService: DahsboardService,
    private authService: AuthService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => 
        {
          if (user && user.id && this.properties.length > 0) {
            this.currentUserId = user.id;
            this.selectedPropertyId = this.properties[0].id;
            this.loadBudgetData();
          } else {
          }
          
      },
      error: (_err) => {}
    });
  }
  

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['propertyId'] && this.propertyId && this.useApiData) {
      this.loadBudgetData();
    }
  }

  ngAfterViewInit(): void {
    if (this.isBrowser) {
      setTimeout(() => {
        this.renderBudgetChart();
      });
    }
  }

  private loadBudgetData(): void {
    this.loading = true;
    this.error = null;

    if (!this.propertyId) {
      this.initializeWithDefaultData();
      this.loading = false;
      return;
    }

    if (!this.selectedPropertyId || !this.currentUserId) {
    return;
  }

  this.dashboardService.getBudgetDashboardKpiWithParams(
    this.selectedPropertyId,
    this.currentUserId,
    { someParam: 'value' } // <-- si tu en as besoin
  ).subscribe({
    next: (_data) => {},
    error: (_err) => {}
  });
  }

  private mapApiDataToBudgetData(apiData: BudgetKpiResponse): void {
    this.budgetData = {
      consomme: apiData.totalConsumed,
      total: apiData.totalPlanned,
      pourcentage: Math.round(apiData.consumedPercentage)
    };
  }

  private initializeWithDefaultData(): void {
    if (!this.budgetData.pourcentage && this.budgetData.total > 0) {
      this.budgetData.pourcentage = Math.round((this.budgetData.consomme / this.budgetData.total) * 100);
    }
  }

  refreshData(): void {
    if (this.useApiData) {
      this.loadBudgetData();
    }
  }

  changeProperty(newPropertyId: number, newAdditionalParams?: { [key: string]: string | number }): void {
    this.propertyId = newPropertyId;
    this.additionalParams = newAdditionalParams;
    if (this.useApiData) {
      this.loadBudgetData();
    }
  }

  updateAdditionalParams(newParams: { [key: string]: string | number }): void {
    this.additionalParams = { ...this.additionalParams, ...newParams };
    if (this.useApiData && this.propertyId) {
      this.loadBudgetData();
    }
  }

  loadDataWithParams(propertyId?: number, additionalParams?: { [key: string]: string | number }): void {
    if (propertyId) {
      this.propertyId = propertyId;
    }
    if (additionalParams) {
      this.additionalParams = additionalParams;
    }
    if (this.useApiData) {
      this.loadBudgetData();
    }
  }

  renderBudgetChart(): void {
    if (!this.isBrowser || !this.chartCanvas) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const consumedColor = '#FF5C02';
    const remainingColor = '#fff7f3';

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [this.budgetData.pourcentage, 100 - this.budgetData.pourcentage],
          backgroundColor: [
            consumedColor,
            remainingColor
          ],
          borderWidth: 0,
          borderRadius: 5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            enabled: false
          }
        }
      }
    });
  }

  formatCurrency(amount: number, shortFormat: boolean = false): string {
    if (!amount && amount !== 0) return '0 FCFA';
    if (shortFormat) {
      return amount.toLocaleString('fr-FR') + 'F';
    }
    return amount.toLocaleString('fr-FR') + ' FCFA';
  }

  get totalPlanned(): number {
    return this.kpiData?.totalPlanned || this.budgetData.total;
  }

  get totalConsumed(): number {
    return this.kpiData?.totalConsumed || this.budgetData.consomme;
  }

  get totalRemaining(): number {
    return this.kpiData?.totalRemaining || (this.budgetData.total - this.budgetData.consomme);
  }

  get consumedPercentage(): number {
    const percentage = this.kpiData?.consumedPercentage || this.budgetData.pourcentage;
    return Math.round(percentage);
  }

  get remainingPercentage(): number {
    return this.kpiData?.remainingPercentage || (100 - this.budgetData.pourcentage);
  }
}
