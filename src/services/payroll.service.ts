import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AuthService } from '../app/features/auth/services/auth.service';
import { API } from '../app/core/constants/api-endpoints';

// ─── Enums ──────────────────────────────────────────────────────────────────

export type PayType = 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type PayrollCurrency = 'CFA' | 'EURO' | 'DOLLAR';
export type PayPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY';
export type PayPeriodStatus = 'OPEN' | 'LOCKED' | 'PAID';
export type PayslipStatus = 'DRAFT' | 'VALIDATED' | 'PAID';
export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'PAYTECH' | 'MOBILE_MONEY' | 'OTHER';

/** Tableau LocalDate/LocalDateTime backend : [année, mois, jour, heure?, minute?, seconde?, nanosecondes?] */
export type BackendDateTime = [number, number, number, number?, number?, number?, number?];

/** Convertit une date backend (tableau, ISO, ou "DD-MM-YYYY[ HH:mm]") en Date JS, ou null si invalide */
export function toJsDate(value: BackendDateTime | string | null | undefined): Date | null {
  if (!value) return null;

  if (Array.isArray(value)) {
    const [year, month, day, hour = 0, minute = 0, second = 0, nano = 0] = value;
    const date = new Date(year, month - 1, day, hour, minute, second, Math.floor(nano / 1_000_000));
    return isNaN(date.getTime()) ? null : date;
  }

  const frenchFormat = /^(\d{2})-(\d{2})-(\d{4})(?:\s+(\d{2}):(\d{2}))?$/.exec(value);
  if (frenchFormat) {
    const [, day, month, year, hour = '0', minute = '0'] = frenchFormat;
    const date = new Date(+year, +month - 1, +day, +hour, +minute);
    return isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(value);
  return isNaN(date.getTime()) ? null : date;
}

// ─── Salary Profile ───────────────────────────────────────────────────────────

export interface SalaryProfileRequest {
  workerId: number;
  payType: PayType;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlySalary?: number;
  normalHoursPerDay?: number;
  overtimeMultiplier?: number;
  currency: PayrollCurrency;
}

export interface SalaryProfileResponse {
  id: number;
  workerId: number;
  workerName: string;
  payType: PayType;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlySalary?: number;
  normalHoursPerDay?: number;
  overtimeMultiplier?: number;
  currency: PayrollCurrency;
  active: boolean;
}

export interface SalaryProfileBulkRequest {
  workerIds: number[];
  payType: PayType;
  hourlyRate?: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlySalary?: number;
  normalHoursPerDay?: number;
  overtimeMultiplier?: number;
  currency: PayrollCurrency;
}

// ─── Pay Period ───────────────────────────────────────────────────────────────

export interface PayPeriodRequest {
  propertyId: number;
  label: string;
  type: PayPeriodType;
  startDate: string;
  endDate: string;
}

export interface PayPeriodResponse {
  id: number;
  label: string;
  type: PayPeriodType;
  startDate: BackendDateTime | string;
  endDate: BackendDateTime | string;
  propertyId: number;
  propertyName: string;
  status: PayPeriodStatus;
}

// ─── Payslip ──────────────────────────────────────────────────────────────────

export interface PayslipResponse {
  id: number;
  workerId: number;
  workerName: string;
  jobName: string;
  payPeriodId: number;
  periodLabel: string;
  payType: PayType;
  appliedRate: number;
  workedHours: number;
  overtimeHours: number;
  daysPresent: number;
  weeksWorked: number;
  grossAmount: number;
  bonus: number;
  advanceTotal: number;
  otherDeductions: number;
  netAmount: number;
  currency: PayrollCurrency;
  status: PayslipStatus;
  generatedAt: BackendDateTime | string;
  validatedAt: BackendDateTime | string | null;
}

export interface PayslipAdjustRequest {
  bonus?: number;
  otherDeductions?: number;
}

export interface PagePayslipResponse {
  content: PayslipResponse[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

// ─── Salary Advance ───────────────────────────────────────────────────────────

export interface SalaryAdvanceRequest {
  workerId: number;
  payPeriodId: number;
  amount: number;
  date: string;
  reason?: string;
}

export interface SalaryAdvanceResponse {
  id: number;
  workerId: number;
  workerName: string;
  payPeriodId: number;
  amount: number;
  date: BackendDateTime | string;
  reason: string;
}

// ─── Payroll Payment ──────────────────────────────────────────────────────────

export interface PayrollPaymentRequest {
  payslipId: number;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  evidence?: string;
}

export interface PayrollPaymentResponse {
  id: number;
  payslipId: number;
  workerId: number;
  workerName: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  evidence: string;
  paidAt: BackendDateTime | string;
}

export interface JobMass {
  jobName: string;
  totalGross: number;
  totalNet: number;
  workerCount: number;
}

export interface PayrollKpiResponse {
  propertyId: number;
  totalGross: number;
  totalAdvances: number;
  totalNet: number;
  totalPaid: number;
  remainingToPay: number;
  payslipCount: number;
  paidPayslipCount: number;
  byJob: JobMass[];
}

// ─── Worker work summary (calcul des heures depuis le pointage géolocalisé) ──

export interface WorkSummaryResponse {
  workerId: number;
  startDate: BackendDateTime | string;
  endDate: BackendDateTime | string;
  daysPresent: number;
  weeksWorked: number;
  totalWorkedHours: number;
  overtimeHours: number;
  formattedTime: string;
}

@Injectable({
  providedIn: 'root',
})
export class PayrollService {
  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  // ═══════════════════════════════════════════════════════════════════════
  // SALARY PROFILES — /api/salary-profiles
  // ═══════════════════════════════════════════════════════════════════════

  createSalaryProfile(request: SalaryProfileRequest): Observable<SalaryProfileResponse> {
    return this.http
      .post<SalaryProfileResponse>(API.salaryProfiles, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'createSalaryProfile')));
  }

  bulkCreateSalaryProfiles(request: SalaryProfileBulkRequest): Observable<SalaryProfileResponse[]> {
    return this.http
      .post<SalaryProfileResponse[]>(`${API.salaryProfiles}/bulk`, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'bulkCreateSalaryProfiles')));
  }

  getSalaryProfilesByProperty(propertyId: number): Observable<SalaryProfileResponse[]> {
    return this.http
      .get<SalaryProfileResponse[]>(`${API.salaryProfiles}/property/${propertyId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getSalaryProfilesByProperty')));
  }

  getSalaryProfileByWorker(workerId: number): Observable<SalaryProfileResponse> {
    return this.http
      .get<SalaryProfileResponse>(`${API.salaryProfiles}/worker/${workerId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getSalaryProfileByWorker')));
  }

  updateSalaryProfile(id: number, request: SalaryProfileRequest): Observable<SalaryProfileResponse> {
    return this.http
      .put<SalaryProfileResponse>(`${API.salaryProfiles}/${id}`, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'updateSalaryProfile')));
  }

  deleteSalaryProfile(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API.salaryProfiles}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'deleteSalaryProfile')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAY PERIODS — /api/pay-periods
  // ═══════════════════════════════════════════════════════════════════════

  createPayPeriod(request: PayPeriodRequest): Observable<PayPeriodResponse> {
    return this.http
      .post<PayPeriodResponse>(API.payPeriods, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'createPayPeriod')));
  }

  getPayPeriodsByProperty(propertyId: number): Observable<PayPeriodResponse[]> {
    return this.http
      .get<PayPeriodResponse[]>(`${API.payPeriods}/property/${propertyId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getPayPeriodsByProperty')));
  }

  getPayPeriodById(id: number): Observable<PayPeriodResponse> {
    return this.http
      .get<PayPeriodResponse>(`${API.payPeriods}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getPayPeriodById')));
  }

  deletePayPeriod(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API.payPeriods}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'deletePayPeriod')));
  }

  closePayPeriod(id: number): Observable<PayPeriodResponse> {
    return this.http
      .put<PayPeriodResponse>(`${API.payPeriods}/${id}/close`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'closePayPeriod')));
  }

  lockPayPeriod(id: number): Observable<PayPeriodResponse> {
    return this.http
      .put<PayPeriodResponse>(`${API.payPeriods}/${id}/lock`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'lockPayPeriod')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYSLIPS — /api/payslips
  // ═══════════════════════════════════════════════════════════════════════

  generatePayslips(periodId: number): Observable<PayslipResponse[]> {
    const params = new HttpParams().set('periodId', periodId.toString());
    return this.http
      .post<PayslipResponse[]>(`${API.payslips}/generate`, {}, { headers: this.getAuthHeaders(), params })
      .pipe(catchError((error) => this.handleError(error, 'generatePayslips')));
  }

  generatePayslipForWorker(periodId: number, workerId: number): Observable<PayslipResponse> {
    const params = new HttpParams().set('periodId', periodId.toString());
    return this.http
      .post<PayslipResponse>(`${API.payslips}/generate/worker/${workerId}`, {}, { headers: this.getAuthHeaders(), params })
      .pipe(catchError((error) => this.handleError(error, 'generatePayslipForWorker')));
  }

  getPayslipsByPeriod(periodId: number): Observable<PayslipResponse[]> {
    return this.http
      .get<PayslipResponse[]>(`${API.payslips}/period/${periodId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getPayslipsByPeriod')));
  }

  getPayslipsByWorker(workerId: number, page: number = 0, size: number = 10): Observable<PagePayslipResponse> {
    const params = new HttpParams().set('page', page.toString()).set('size', size.toString());
    return this.http
      .get<PagePayslipResponse>(`${API.payslips}/worker/${workerId}`, { headers: this.getAuthHeaders(), params })
      .pipe(catchError((error) => this.handleError(error, 'getPayslipsByWorker')));
  }

  getPayslipById(id: number): Observable<PayslipResponse> {
    return this.http
      .get<PayslipResponse>(`${API.payslips}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getPayslipById')));
  }

  adjustPayslip(id: number, request: PayslipAdjustRequest): Observable<PayslipResponse> {
    return this.http
      .put<PayslipResponse>(`${API.payslips}/${id}`, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'adjustPayslip')));
  }

  deletePayslip(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API.payslips}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'deletePayslip')));
  }

  getPayslipPdf(id: number): Observable<Blob> {
    return this.http
      .get(`${API.payslips}/${id}/pdf`, { headers: this.getAuthHeaders(), responseType: 'blob' })
      .pipe(catchError((error) => this.handleError(error, 'getPayslipPdf')));
  }

  validatePayslip(id: number): Observable<PayslipResponse> {
    return this.http
      .put<PayslipResponse>(`${API.payslips}/${id}/validate`, {}, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'validatePayslip')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SALARY ADVANCES — /api/salary-advances
  // ═══════════════════════════════════════════════════════════════════════

  createSalaryAdvance(request: SalaryAdvanceRequest): Observable<SalaryAdvanceResponse> {
    return this.http
      .post<SalaryAdvanceResponse>(API.salaryAdvances, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'createSalaryAdvance')));
  }

  getSalaryAdvancesByPeriod(periodId: number): Observable<SalaryAdvanceResponse[]> {
    return this.http
      .get<SalaryAdvanceResponse[]>(`${API.salaryAdvances}/period/${periodId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getSalaryAdvancesByPeriod')));
  }

  getSalaryAdvancesByWorker(workerId: number): Observable<SalaryAdvanceResponse[]> {
    return this.http
      .get<SalaryAdvanceResponse[]>(`${API.salaryAdvances}/worker/${workerId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getSalaryAdvancesByWorker')));
  }

  deleteSalaryAdvance(id: number): Observable<void> {
    return this.http
      .delete<void>(`${API.salaryAdvances}/${id}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'deleteSalaryAdvance')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAYROLL PAYMENTS — /api/payroll-payments
  // ═══════════════════════════════════════════════════════════════════════

  createPayrollPayment(request: PayrollPaymentRequest): Observable<PayrollPaymentResponse> {
    return this.http
      .post<PayrollPaymentResponse>(API.payrollPayments, request, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'createPayrollPayment')));
  }

  bulkPay(periodId: number, method: PaymentMethod): Observable<PayrollPaymentResponse[]> {
    const params = new HttpParams().set('periodId', periodId.toString()).set('method', method);
    return this.http
      .post<PayrollPaymentResponse[]>(`${API.payrollPayments}/bulk`, {}, { headers: this.getAuthHeaders(), params })
      .pipe(catchError((error) => this.handleError(error, 'bulkPay')));
  }

  getPayrollKpis(propertyId: number, periodId?: number): Observable<PayrollKpiResponse> {
    let params = new HttpParams();
    if (periodId != null) params = params.set('periodId', periodId.toString());
    return this.http
      .get<PayrollKpiResponse>(`${API.payrollPayments}/kpis/property/${propertyId}`, { headers: this.getAuthHeaders(), params })
      .pipe(catchError((error) => this.handleError(error, 'getPayrollKpis')));
  }

  getPaymentsByPayslip(payslipId: number): Observable<PayrollPaymentResponse[]> {
    return this.http
      .get<PayrollPaymentResponse[]>(`${API.payrollPayments}/payslip/${payslipId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getPaymentsByPayslip')));
  }

  getPaymentsByProperty(propertyId: number): Observable<PayrollPaymentResponse[]> {
    return this.http
      .get<PayrollPaymentResponse[]>(`${API.payrollPayments}/property/${propertyId}`, { headers: this.getAuthHeaders() })
      .pipe(catchError((error) => this.handleError(error, 'getPaymentsByProperty')));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // WORK SUMMARY — calcul des heures depuis le pointage géolocalisé existant
  // ═══════════════════════════════════════════════════════════════════════

  getWorkSummary(workerId: number, start: string, end: string): Observable<WorkSummaryResponse> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http
      .get<WorkSummaryResponse>(`${API.workers}/${workerId}/work-summary`, { headers: this.getAuthHeaders(), params })
      .pipe(catchError((error) => this.handleError(error, 'getWorkSummary')));
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
        userMessage = 'Ressource introuvable.';
        break;
      case 409:
        userMessage = error.error?.message || 'Action impossible : la période est verrouillée ou déjà payée.';
        break;
      case 500:
        userMessage = 'Erreur serveur. Réessayez plus tard.';
        break;
    }

    return throwError(() => ({ message: userMessage, userMessage, status: error.status, context, originalError: error }));
  }
}
