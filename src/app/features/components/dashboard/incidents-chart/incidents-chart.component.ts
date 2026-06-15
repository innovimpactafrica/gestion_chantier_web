import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Chart } from 'chart.js/auto';
// import { IncidentService } from '../../../core/services/incident.service'; // adapt path if needed
import { DahsboardService } from '../../../../core/services/dahsboard.service';
import { AuthService } from '../../../auth/services/auth.service';

// import { AuthService } from 'src/app/features/auth/services/auth.service';


@Component({
  selector: 'app-incidents-chart',
  standalone: true,
  imports: [],
  template: `
    <div class="bg-white rounded-lg shadow p-4">
      <div class="flex justify-between items-center mb-4">  
        <h3 class="text-lg font-semibold text-gray-700">{{ title }}</h3>
        <div class="p-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
          </svg>
        </div>
      </div>
      
      <div class="h-48">
        <canvas [id]="canvasId"></canvas>
      </div>
    </div>
  `
})
export class IncidentsChartComponent {
  title: string = 'Statistiques des signalements';
  canvasId: string = '';
  incidentData: { jour: string, nombre: number }[] = [];

  private chart: Chart | null = null;
  private isBrowser: boolean;
  error: string | null = null;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private dahsboarService: DahsboardService,
    private authService: AuthService,
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }


   
  
    ngOnInit(): void {
      this.canvasId = 'incidents_chart_' + Math.random().toString(36).substring(2, 9);

      this.loadIncidents();
    }
  
    private loadIncidents(): void {
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          if (!user || !user.id) {
            this.error = 'Utilisateur non connecté';
            return;
          }
  
          const promoterId = user.id;
  
          this.dahsboarService.getIncidentsKpi(promoterId).subscribe({
            next: (data: any) => {
              this.incidentData = data;
  
              if (this.isBrowser) {
                setTimeout(() => this.initChart(), 0);
              }
            },
            error: (err) => {
              this.error = 'Erreur de chargement des incidents';
            }
          });
        },
        error: (err) => {
          this.error = 'Erreur utilisateur';
        }
      });
    }
  

  ngAfterViewInit() {
    if (this.isBrowser && this.incidentData.length > 0) {
      this.initChart();
    }
  }

  private initChart() {
    const canvas = document.getElementById(this.canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    const labels = this.incidentData.map(item => item.jour);
    const data = this.incidentData.map(item => item.nombre);

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Incidents',
          data,
          backgroundColor: '#FF5C021A',
          borderColor: '#FF5C02',
          borderWidth: 2,
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1
            }
          }
        },
        plugins: {
          legend: {
            display: false
          }
        }
      }
    });
  }

  ngOnDestroy() {
    if (this.chart) {
      this.chart.destroy();
    }
  }
}
