import { Injectable } from '@angular/core';


import { Observable, of } from 'rxjs';
import { 
  ProjectOverview, 
  MaterialStockAlert, 
  CriticalTask, 
  ProgressStage, 
  IncidentData, 
  ProjectPhoto, 
  PerformanceSummary 
} from '../../models/dashboard.model';

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  etatAvancement() {
    throw new Error('Method not implemented.');
  }
  getProjectOverview(): Observable<ProjectOverview> {
    return of({
      inProgress: 12,
      delayed: 8,
      pending: 5,
      completed: 8
    });
  }

  getMaterialStockAlerts(): Observable<MaterialStockAlert[]> {
    return of([
      {
        material: 'Ciment',
        chantier: 'Chantier A',
        current: 20,
        threshold: 25,
        status: 'Faible'
      },
      {
        material: 'Fer à béton',
        chantier: 'Chantier A',
        current: 40,
        threshold: 40,
        status: 'Normal'
      },
      {
        material: 'Carrelage',
        chantier: 'Chantier B',
        current: 12,
        threshold: 30,
        status: 'Critique'
      }
    ]);
  }

  getCriticalTasks(): Observable<CriticalTask[]> {
    return of([
      {
        title: 'Clôture du chantier A',
        chantier: 'Chantier A',
        dueDate: new Date('2025-05-01'),
        status: 'En retard'
      },
      {
        title: 'Livraison matériel chantier B',
        chantier: 'Chantier B',
        dueDate: new Date('2025-05-10'),
        status: 'Urgent'
      },
      {
        title: 'Inspection sécurité chantier C',
        chantier: 'Chantier C',
        dueDate: new Date('2025-05-15'),
        status: 'A jour'
      },
      {
        title: 'Réunion suivi client',
        chantier: 'Client Meeting',
        dueDate: new Date('2025-05-25'),
        status: 'A jour'
      }
    ]);
  }

  getProgressStages(): Observable<ProgressStage[]> {
    return of([
      { stage: 'Gros œuvre', percentage: 90 },
      { stage: 'Second œuvre', percentage: 45 },
      { stage: 'Finition', percentage: 0 }
    ]);
  }

  getIncidentData(): Observable<IncidentData[]> {
    return of([
      { date: 'J-6', count: 1 },
      { date: 'J-5', count: 2 },
      { date: 'J-4', count: 1 },
      { date: 'J-3', count: 3 },
      { date: 'J-2', count: 2 },
      { date: 'J-1', count: 4 },
      { date: 'Aujourd\'hui', count: 5 }
    ]);
  }

  // getProjectPhotos(): Observable<ProjectPhoto[]> {
  //   return of([
  //     {
  //       chantier: 'Chantier A',
  //       date: '02/05/2025',
  //       imageUrl: '/api/placeholder/200/150'
  //     },
  //     {
  //       chantier: 'Chantier A',
  //       date: '02/05/2025',
  //       imageUrl: '/api/placeholder/200/150'
  //     }
  //   ]);
  // }

  getPerformanceSummary(): Observable<PerformanceSummary> {
    return of({
      averageProgress: 68,
      budgetConsumed: 70,
      incidents: 12,
      averagePresence: 89,
      delayedTasks: 7,
      materialsAlerted: 17
    });
  }
}