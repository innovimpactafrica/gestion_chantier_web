import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../app/features/auth/services/auth.service';

// Interfaces pour le typage
export interface PerformanceAndTask {
  totalTasks: number;
  completedTasks: number;
  performancePercentage: number;
}

export interface PresenceLog {
  id: number;
  checkInTime: number[];
  checkOutTime: number[];
  latitude: number;
  longitude: number;
}

export interface PresenceHistory {
  logs: PresenceLog[];
  totalWorkedTime: string;
}

export interface InfoDashboard {
  daysPresent: number;
  totalWorkedHours: number;
}

export interface StatusDistribution {
  status: string;
  percentage: number;
} 

@Injectable({
  providedIn: 'root'
})
export class DetailsWorkerService {
  private baseUrl = 'https://wakana.online/api';
  
  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) { }

  getPerformanceAndTask(workerId: number): Observable<PerformanceAndTask> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<PerformanceAndTask>(`${this.baseUrl}/tasks/dashboard/mobile/${workerId}`, { headers });
  }

  getPresenceHistory(workerId: number): Observable<PresenceHistory> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<PresenceHistory>(`${this.baseUrl}/workers/${workerId}/presence-history`, { headers });
  }

  getInfoDashboard(workerId: number): Observable<InfoDashboard> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<InfoDashboard>(`${this.baseUrl}/workers/${workerId}/mobile/dashboard`, { headers });
  }

  getRepartitions(executorId: number): Observable<StatusDistribution[]> {
    const headers = this.authService.getAuthHeaders();
    return this.http.get<StatusDistribution[]>(`${this.baseUrl}/tasks/status-distribution/${executorId}`, { headers });
  }
}