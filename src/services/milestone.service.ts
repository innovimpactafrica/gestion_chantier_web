import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, forkJoin, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { API } from '../app/core/constants/api-endpoints';

// ─── Enums ──────────────────────────────────────────────────────────────────

export type MilestonePhase = 'GROS_OEUVRE' | 'SECOND_OEUVRE' | 'FINITION';

export const MILESTONE_PHASES: MilestonePhase[] = ['GROS_OEUVRE', 'SECOND_OEUVRE', 'FINITION'];

/**
 * Le backend déclare targetDate/actualDate comme `string (format: date)` dans le swagger,
 * mais sérialise en réalité un LocalDate Spring sous forme de tableau [année, mois, jour]
 * (vu en conditions réelles sur PATCH /api/milestones/{id}/check). On accepte donc les deux.
 */
export type BackendDate = [number, number, number] | string;

/** Convertit une date backend (tableau [année, mois, jour] ou string ISO) en Date JS, ou null si invalide */
export function toJsDate(value: BackendDate | null | undefined): Date | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    const [year, month, day] = value;
    const date = new Date(year, month - 1, day);
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// ─── Lots ───────────────────────────────────────────────────────────────────

export interface LotSimpleDto {
  id: number;
  name: string;
}

export interface MilestoneLot {
  id: number;
  name: string;
  description?: string;
  startDate?: BackendDate;
  endDate?: BackendDate;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD' | 'CANCELED';
  progressPercentage?: number;
}

// ─── Milestone (détail) ─────────────────────────────────────────────────────

export interface Milestone {
  id: number;
  name: string;
  description: string;
  targetDate: BackendDate;
  actualDate?: BackendDate | null;
  reached: boolean;
  phase: MilestonePhase;
  lots: MilestoneLot[];
}

export interface MilestoneRequest {
  name: string;
  description: string;
  /** Toujours envoyé en string "yyyy-MM-dd" (valeur brute d'un input HTML type="date") */
  targetDate: string;
  phase: MilestonePhase;
  lotIds: number[];
}

// ─── Milestone (item allégé dans une colonne de phase) ──────────────────────

export interface MilestoneItem {
  id: number;
  name: string;
  description: string;
  targetDate: BackendDate;
  actualDate?: BackendDate | null;
  reached: boolean;
  totalLots: number;
  completedLots: number;
  lotsProgressPercentage: number;
}

export interface MilestonePhaseResponse {
  phase: MilestonePhase;
  phaseLabel: string;
  totalMilestones: number;
  reachedMilestones: number;
  progressPercentage: number;
  milestones: MilestoneItem[];
}

// ─── Résumé global ───────────────────────────────────────────────────────────

export interface PhaseSummary {
  phase: MilestonePhase;
  phaseLabel: string;
  total: number;
  reached: number;
  late: number;
  progressPercentage: number;
}

export interface MilestoneSummaryResponse {
  propertyId: number;
  totalMilestones: number;
  reachedMilestones: number;
  lateMilestones: number;
  pendingMilestones: number;
  globalProgressPercentage: number;
  byPhase: PhaseSummary[];
}

// ─── Labels & couleurs (design system du module) ────────────────────────────

const PHASE_LABELS: Record<MilestonePhase, string> = {
  GROS_OEUVRE: 'Gros œuvre',
  SECOND_OEUVRE: 'Second œuvre',
  FINITION: 'Finition',
};

@Injectable({
  providedIn: 'root',
})
export class MilestoneService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // LECTURE — /api/milestones/property/{propertyId}/...
  // ═══════════════════════════════════════════════════════════════════════

  getSummary(propertyId: number): Observable<MilestoneSummaryResponse> {
    return this.http
      .get<MilestoneSummaryResponse>(`${API.milestones}/property/${propertyId}/summary`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getSummary')));
  }

  getByPhase(propertyId: number, phase: MilestonePhase): Observable<MilestonePhaseResponse> {
    return this.http
      .get<MilestonePhaseResponse>(`${API.milestones}/property/${propertyId}/phase/${phase}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getByPhase')));
  }

  /** Charge les 3 colonnes de phase en parallèle (Gros œuvre, Second œuvre, Finition). */
  getAllPhases(propertyId: number): Observable<MilestonePhaseResponse[]> {
    return forkJoin(MILESTONE_PHASES.map((phase) => this.getByPhase(propertyId, phase)));
  }

  getLotsWithoutMilestone(propertyId: number): Observable<LotSimpleDto[]> {
    return this.http
      .get<LotSimpleDto[]>(`${API.milestones}/property/${propertyId}/lots-without-milestone`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getLotsWithoutMilestone')));
  }

  getById(id: number): Observable<Milestone> {
    return this.http
      .get<Milestone>(`${API.milestones}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getById')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ÉCRITURE
  // ═══════════════════════════════════════════════════════════════════════

  create(propertyId: number, request: MilestoneRequest): Observable<Milestone> {
    return this.http
      .post<Milestone>(`${API.milestones}?propertyId=${propertyId}`, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'create')));
  }

  update(id: number, request: MilestoneRequest): Observable<Milestone> {
    return this.http
      .put<Milestone>(`${API.milestones}/${id}`, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'update')));
  }

  addLots(id: number, lotIds: number[]): Observable<Milestone> {
    return this.http
      .patch<Milestone>(`${API.milestones}/${id}/lots`, lotIds, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'addLots')));
  }

  check(id: number): Observable<Milestone> {
    return this.http
      .patch<Milestone>(`${API.milestones}/${id}/check`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'check')));
  }

  delete(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API.milestones}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'delete')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS D'AFFICHAGE
  // ═══════════════════════════════════════════════════════════════════════

  getPhaseLabel(phase: MilestonePhase): string {
    return PHASE_LABELS[phase] ?? phase;
  }

  /** Un jalon en retard : date cible dépassée et pas encore atteint. */
  isLate(item: { targetDate: BackendDate; reached: boolean }): boolean {
    if (item.reached) return false;
    const target = toJsDate(item.targetDate);
    if (!target) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return target.getTime() < today.getTime();
  }

  formatDate(value: BackendDate | undefined | null): string {
    const date = toJsDate(value);
    return date ? date.toLocaleDateString('fr-FR') : '-';
  }

  /** Convertit une date backend en "yyyy-MM-dd", format attendu par un input HTML type="date". */
  toInputDateString(value: BackendDate | undefined | null): string {
    const date = toJsDate(value);
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PRIVÉ
  // ═══════════════════════════════════════════════════════════════════════

  private getAuthHeaders(): HttpHeaders {
    if (this.authService && typeof this.authService.getAuthHeaders === 'function') {
      return this.authService.getAuthHeaders();
    }
    const token = this.authService?.getToken();
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  private handleError(error: any, context: string = 'unknown'): Observable<never> {
    let userMessage = `Erreur ${error.status ?? ''}`;

    switch (error.status) {
      case 0:
        userMessage = 'Impossible de contacter le serveur.';
        break;
      case 400:
        userMessage = 'Données invalides.';
        break;
      case 401:
        userMessage = 'Session expirée. Veuillez vous reconnecter.';
        break;
      case 403:
        userMessage = 'Accès non autorisé.';
        break;
      case 404:
        userMessage = 'Jalon introuvable.';
        break;
      case 500:
        userMessage = 'Erreur serveur. Réessayez plus tard.';
        break;
    }

    return throwError(() => ({ message: userMessage, userMessage, status: error.status, context, originalError: error }));
  }
}
