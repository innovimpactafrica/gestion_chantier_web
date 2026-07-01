import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Subject, takeUntil, forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import {
  PayrollService,
  PayType,
  PayrollCurrency,
  PayPeriodType,
  PaymentMethod,
  SalaryProfileResponse,
  SalaryProfileRequest,
  SalaryProfileBulkRequest,
  PayPeriodResponse,
  PayPeriodRequest,
  PayslipResponse,
  PayslipAdjustRequest,
  SalaryAdvanceResponse,
  SalaryAdvanceRequest,
  PayrollPaymentResponse,
  PayrollPaymentRequest,
  PayrollKpiResponse,
  toJsDate
} from '../../../../../services/payroll.service';
import { UtilisateurService, Worker } from '../../../../../services/utilisateur.service';

type SalaryTab = 'profils' | 'periodes' | 'bulletins' | 'acomptes' | 'paiements';

@Component({
  selector: 'app-gestion-salaire',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-salaire.component.html',
  styleUrls: ['./gestion-salaire.component.css']
})
export class GestionSalaireComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  propertyId: number | null = null;
  activeSubTab: SalaryTab = 'profils';

  loading = false;
  error: string | null = null;
  successMessage: string | null = null;

  workers: Worker[] = [];

  // ── Profils salariaux ──
  salaryProfiles: SalaryProfileResponse[] = [];
  showProfileModal = false;
  editingProfileId: number | null = null;
  profileForm: SalaryProfileRequest = this.emptyProfileForm();

  // Sélection multiple d'ouvriers (autocomplétion) pour la création en masse
  selectedWorkerIds: number[] = [];
  workerSearchKeyword = '';
  showWorkerDropdown = false;

  // ── Périodes de paie ──
  payPeriods: PayPeriodResponse[] = [];
  showPeriodModal = false;
  periodForm: PayPeriodRequest = this.emptyPeriodForm();
  selectedPeriodId: number | null = null;

  // ── Bulletins de paie ──
  payslips: PayslipResponse[] = [];
  showAdjustModal = false;
  adjustingPayslip: PayslipResponse | null = null;
  adjustForm: PayslipAdjustRequest = { bonus: 0, otherDeductions: 0 };

  // ── Acomptes ──
  salaryAdvances: SalaryAdvanceResponse[] = [];
  showAdvanceModal = false;
  advanceForm: SalaryAdvanceRequest = this.emptyAdvanceForm();
  advanceWorkerSearchKeyword = '';
  showAdvanceWorkerDropdown = false;

  // ── Paiements ──
  payrollKpis: PayrollKpiResponse | null = null;
  payrollPayments: PayrollPaymentResponse[] = [];
  showPaymentModal = false;
  paymentForm: PayrollPaymentRequest = this.emptyPaymentForm();
  bulkPayMethod: PaymentMethod = 'BANK_TRANSFER';

  readonly payTypes: PayType[] = ['HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY'];
  readonly currencies: PayrollCurrency[] = ['CFA', 'EURO', 'DOLLAR'];
  readonly periodTypes: PayPeriodType[] = ['DAILY', 'WEEKLY', 'MONTHLY'];
  readonly paymentMethods: PaymentMethod[] = ['CASH', 'BANK_TRANSFER', 'PAYTECH', 'MOBILE_MONEY', 'OTHER'];

  // ── Popup de confirmation (remplace window.confirm) ──
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmDanger = true;
  private confirmAction: (() => void) | null = null;

  constructor(
    private route: ActivatedRoute,
    private payrollService: PayrollService,
    private utilisateurService: UtilisateurService
  ) {}

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.propertyId = +idFromUrl;
      this.loadWorkers();
      this.loadSalaryProfiles();
      this.loadPayPeriods();
    } else {
      this.error = "ID de propriété non trouvé dans l'URL.";
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setActiveTab(tab: SalaryTab): void {
    this.activeSubTab = tab;
    this.clearMessages();

    if (tab === 'bulletins' && this.selectedPeriodId) {
      this.loadPayslips();
    } else if (tab === 'acomptes' && this.selectedPeriodId) {
      this.loadSalaryAdvances();
    } else if (tab === 'paiements') {
      this.loadPaymentsAndKpis();
    }
  }

  private clearMessages(): void {
    this.error = null;
    this.successMessage = null;
  }

  private showError(message: string): void {
    this.error = message;
    this.successMessage = null;
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.error = null;
  }

  private askConfirmation(title: string, message: string, action: () => void, danger: boolean = true): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmDanger = danger;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  confirmYes(): void {
    this.showConfirmModal = false;
    const action = this.confirmAction;
    this.confirmAction = null;
    if (action) action();
  }

  confirmNo(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // OUVRIERS (pour les listes déroulantes)
  // ═══════════════════════════════════════════════════════════════════════

  loadWorkers(): void {
    if (!this.propertyId) return;
    this.utilisateurService.getWorkers(0, 200, this.propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => { this.workers = response.content; },
        error: () => { this.workers = []; }
      });
  }

  getWorkerName(workerId: number): string {
    const worker = this.workers.find(w => w.id === workerId);
    return worker ? `${worker.prenom} ${worker.nom}` : `Ouvrier #${workerId}`;
  }

  /** Ouvriers proposés dans l'autocomplétion (hors ceux déjà sélectionnés) */
  get filteredWorkersForSelection(): Worker[] {
    const keyword = this.workerSearchKeyword.trim().toLowerCase();
    return this.workers.filter(worker => {
      if (this.selectedWorkerIds.includes(worker.id)) return false;
      if (!keyword) return true;
      return `${worker.prenom} ${worker.nom}`.toLowerCase().includes(keyword);
    });
  }

  onWorkerSearchFocus(): void {
    this.showWorkerDropdown = true;
  }

  onWorkerSearchBlur(): void {
    // Léger délai pour laisser le temps au clic sur une suggestion de s'exécuter avant fermeture
    setTimeout(() => { this.showWorkerDropdown = false; }, 150);
  }

  toggleWorkerSelection(worker: Worker): void {
    const index = this.selectedWorkerIds.indexOf(worker.id);
    if (index > -1) {
      this.selectedWorkerIds.splice(index, 1);
    } else {
      this.selectedWorkerIds.push(worker.id);
    }
    this.workerSearchKeyword = '';
  }

  removeSelectedWorker(workerId: number): void {
    this.selectedWorkerIds = this.selectedWorkerIds.filter(id => id !== workerId);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PROFILS SALARIAUX
  // ═══════════════════════════════════════════════════════════════════════

  private emptyProfileForm(): SalaryProfileRequest {
    return {
      workerId: 0,
      payType: 'DAILY',
      normalHoursPerDay: 8,
      overtimeMultiplier: 1.5,
      currency: 'CFA'
    };
  }

  loadSalaryProfiles(): void {
    if (!this.propertyId) return;
    this.loading = true;
    this.payrollService.getSalaryProfilesByProperty(this.propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profiles) => { this.salaryProfiles = profiles; this.loading = false; },
        error: (err) => { this.showError(err.userMessage || 'Erreur lors du chargement des profils salariaux'); this.loading = false; }
      });
  }

  openCreateProfileModal(): void {
    this.editingProfileId = null;
    this.profileForm = this.emptyProfileForm();
    this.selectedWorkerIds = [];
    this.workerSearchKeyword = '';
    this.showProfileModal = true;
  }

  openEditProfileModal(profile: SalaryProfileResponse): void {
    this.editingProfileId = profile.id;
    this.profileForm = {
      workerId: profile.workerId,
      payType: profile.payType,
      hourlyRate: profile.hourlyRate,
      dailyRate: profile.dailyRate,
      weeklyRate: profile.weeklyRate,
      monthlySalary: profile.monthlySalary,
      normalHoursPerDay: profile.normalHoursPerDay,
      overtimeMultiplier: profile.overtimeMultiplier,
      currency: profile.currency
    };
    // En édition, un seul ouvrier, non modifiable (affiché en lecture seule)
    this.selectedWorkerIds = [profile.workerId];
    this.workerSearchKeyword = '';
    this.showProfileModal = true;
  }

  closeProfileModal(): void {
    this.showProfileModal = false;
  }

  saveSalaryProfile(): void {
    if (this.selectedWorkerIds.length === 0) {
      this.showError('Veuillez sélectionner au moins un ouvrier');
      return;
    }

    if (this.editingProfileId) {
      const request: SalaryProfileRequest = { ...this.profileForm, workerId: this.selectedWorkerIds[0] };
      this.payrollService.updateSalaryProfile(this.editingProfileId, request)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.showSuccess('Profil salarial mis à jour');
            this.closeProfileModal();
            this.loadSalaryProfiles();
          },
          error: (err) => this.showError(err.userMessage || "Erreur lors de l'enregistrement du profil")
        });
      return;
    }

    const bulkRequest: SalaryProfileBulkRequest = {
      workerIds: this.selectedWorkerIds,
      payType: this.profileForm.payType,
      hourlyRate: this.profileForm.hourlyRate,
      dailyRate: this.profileForm.dailyRate,
      weeklyRate: this.profileForm.weeklyRate,
      monthlySalary: this.profileForm.monthlySalary,
      normalHoursPerDay: this.profileForm.normalHoursPerDay,
      overtimeMultiplier: this.profileForm.overtimeMultiplier,
      currency: this.profileForm.currency
    };

    this.payrollService.bulkCreateSalaryProfiles(bulkRequest)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (profiles) => {
          this.showSuccess(`${profiles.length} profil(s) salarial(aux) créé(s)`);
          this.closeProfileModal();
          this.loadSalaryProfiles();
        },
        error: (err) => this.showError(err.userMessage || "Erreur lors de l'enregistrement du profil")
      });
  }

  deleteSalaryProfile(profile: SalaryProfileResponse): void {
    this.askConfirmation(
      'Supprimer le profil salarial',
      `Supprimer le profil salarial de ${profile.workerName} ?`,
      () => {
        this.payrollService.deleteSalaryProfile(profile.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => { this.showSuccess('Profil salarial supprimé'); this.loadSalaryProfiles(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors de la suppression')
          });
      }
    );
  }

  getRateLabel(payType: PayType): string {
    switch (payType) {
      case 'HOURLY': return 'Taux horaire';
      case 'DAILY': return 'Taux journalier';
      case 'WEEKLY': return 'Taux hebdomadaire';
      case 'MONTHLY': return 'Salaire mensuel';
    }
  }

  getPeriodTypeLabel(type: PayPeriodType): string {
    switch (type) {
      case 'DAILY': return 'Journalier';
      case 'WEEKLY': return 'Hebdomadaire';
      case 'MONTHLY': return 'Mensuel';
    }
  }

  getProfileRate(profile: SalaryProfileResponse): number | undefined {
    switch (profile.payType) {
      case 'HOURLY': return profile.hourlyRate;
      case 'DAILY': return profile.dailyRate;
      case 'WEEKLY': return profile.weeklyRate;
      case 'MONTHLY': return profile.monthlySalary;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PÉRIODES DE PAIE
  // ═══════════════════════════════════════════════════════════════════════

  private emptyPeriodForm(): PayPeriodRequest {
    return {
      propertyId: this.propertyId || 0,
      label: '',
      type: 'MONTHLY',
      startDate: '',
      endDate: ''
    };
  }

  loadPayPeriods(): void {
    if (!this.propertyId) return;
    this.loading = true;
    this.payrollService.getPayPeriodsByProperty(this.propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (periods) => {
          this.payPeriods = periods;
          this.loading = false;
          if (!this.selectedPeriodId && periods.length > 0) {
            this.selectedPeriodId = periods[0].id;
          }
        },
        error: (err) => { this.showError(err.userMessage || 'Erreur lors du chargement des périodes de paie'); this.loading = false; }
      });
  }

  openCreatePeriodModal(): void {
    this.periodForm = this.emptyPeriodForm();
    this.showPeriodModal = true;
  }

  closePeriodModal(): void {
    this.showPeriodModal = false;
  }

  savePayPeriod(): void {
    if (!this.propertyId) return;
    if (!this.periodForm.label || !this.periodForm.startDate || !this.periodForm.endDate) {
      this.showError('Veuillez remplir le libellé et les dates de la période');
      return;
    }

    this.periodForm.propertyId = this.propertyId;

    this.payrollService.createPayPeriod(this.periodForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.showSuccess('Période de paie créée');
          this.closePeriodModal();
          this.loadPayPeriods();
        },
        error: (err) => this.showError(err.userMessage || 'Erreur lors de la création de la période')
      });
  }

  lockPeriod(period: PayPeriodResponse): void {
    this.askConfirmation(
      'Verrouiller la période',
      `Verrouiller la période "${period.label}" ? Aucun bulletin ne pourra plus être généré.`,
      () => {
        this.payrollService.lockPayPeriod(period.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => { this.showSuccess('Période verrouillée'); this.loadPayPeriods(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors du verrouillage')
          });
      }
    );
  }

  closePeriod(period: PayPeriodResponse): void {
    this.askConfirmation(
      'Clôturer la période',
      `Clôturer la période "${period.label}" ? Elle sera marquée comme payée.`,
      () => {
        this.payrollService.closePayPeriod(period.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => { this.showSuccess('Période clôturée'); this.loadPayPeriods(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors de la clôture')
          });
      }
    );
  }

  deletePeriod(period: PayPeriodResponse): void {
    this.askConfirmation(
      'Supprimer la période',
      `Supprimer la période "${period.label}" ?`,
      () => {
        this.payrollService.deletePayPeriod(period.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.showSuccess('Période supprimée');
              if (this.selectedPeriodId === period.id) this.selectedPeriodId = null;
              this.loadPayPeriods();
            },
            error: (err) => this.showError(err.userMessage || 'Erreur lors de la suppression')
          });
      }
    );
  }

  onPeriodSelectionChange(): void {
    if (this.activeSubTab === 'bulletins') this.loadPayslips();
    if (this.activeSubTab === 'acomptes') this.loadSalaryAdvances();
    if (this.activeSubTab === 'paiements') this.loadPaymentsAndKpis();
  }

  getPeriodStatusClass(status: string): string {
    switch (status) {
      case 'OPEN': return 'bg-green-100 text-green-700';
      case 'LOCKED': return 'bg-yellow-100 text-yellow-700';
      case 'PAID': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // BULLETINS DE PAIE
  // ═══════════════════════════════════════════════════════════════════════

  loadPayslips(): void {
    if (!this.selectedPeriodId) { this.payslips = []; return; }
    this.loading = true;
    this.payrollService.getPayslipsByPeriod(this.selectedPeriodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payslips) => { this.payslips = payslips; this.loading = false; },
        error: (err) => { this.showError(err.userMessage || 'Erreur lors du chargement des bulletins'); this.loading = false; }
      });
  }

  generatePayslips(): void {
    if (!this.selectedPeriodId) {
      this.showError('Veuillez sélectionner une période de paie');
      return;
    }
    this.loading = true;
    this.payrollService.generatePayslips(this.selectedPeriodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (payslips) => {
          this.payslips = payslips;
          this.loading = false;
          this.showSuccess(`${payslips.length} bulletin(s) généré(s)`);
        },
        error: (err) => { this.showError(err.userMessage || 'Erreur lors de la génération des bulletins'); this.loading = false; }
      });
  }

  openAdjustModal(payslip: PayslipResponse): void {
    this.adjustingPayslip = payslip;
    this.adjustForm = { bonus: payslip.bonus || 0, otherDeductions: payslip.otherDeductions || 0 };
    this.showAdjustModal = true;
  }

  closeAdjustModal(): void {
    this.showAdjustModal = false;
    this.adjustingPayslip = null;
  }

  saveAdjustment(): void {
    if (!this.adjustingPayslip) return;
    this.payrollService.adjustPayslip(this.adjustingPayslip.id, this.adjustForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.showSuccess('Bulletin ajusté'); this.closeAdjustModal(); this.loadPayslips(); },
        error: (err) => this.showError(err.userMessage || "Erreur lors de l'ajustement")
      });
  }

  validatePayslip(payslip: PayslipResponse): void {
    this.askConfirmation(
      'Valider le bulletin',
      `Valider le bulletin de ${payslip.workerName} ?`,
      () => {
        this.payrollService.validatePayslip(payslip.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => { this.showSuccess('Bulletin validé'); this.loadPayslips(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors de la validation')
          });
      },
      false
    );
  }

  deletePayslip(payslip: PayslipResponse): void {
    this.askConfirmation(
      'Supprimer le bulletin',
      `Supprimer le bulletin de ${payslip.workerName} ?`,
      () => {
        this.payrollService.deletePayslip(payslip.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => { this.showSuccess('Bulletin supprimé'); this.loadPayslips(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors de la suppression')
          });
      }
    );
  }

  downloadPayslipPdf(payslip: PayslipResponse): void {
    this.payrollService.getPayslipPdf(payslip.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `bulletin-${payslip.workerName}-${payslip.periodLabel}.pdf`;
          link.click();
          window.URL.revokeObjectURL(url);
        },
        error: (err) => this.showError(err.userMessage || 'Erreur lors du téléchargement du PDF')
      });
  }

  getPayslipStatusClass(status: string): string {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-700';
      case 'VALIDATED': return 'bg-blue-100 text-blue-700';
      case 'PAID': return 'bg-green-100 text-green-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════
  // ACOMPTES
  // ═══════════════════════════════════════════════════════════════════════

  private emptyAdvanceForm(): SalaryAdvanceRequest {
    return {
      workerId: 0,
      payPeriodId: this.selectedPeriodId || 0,
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      reason: ''
    };
  }

  loadSalaryAdvances(): void {
    if (!this.selectedPeriodId) { this.salaryAdvances = []; return; }
    this.loading = true;
    this.payrollService.getSalaryAdvancesByPeriod(this.selectedPeriodId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (advances) => { this.salaryAdvances = advances; this.loading = false; },
        error: (err) => { this.showError(err.userMessage || 'Erreur lors du chargement des acomptes'); this.loading = false; }
      });
  }

  openCreateAdvanceModal(): void {
    if (!this.selectedPeriodId) {
      this.showError('Veuillez sélectionner une période de paie');
      return;
    }
    this.advanceForm = this.emptyAdvanceForm();
    this.advanceWorkerSearchKeyword = '';
    this.showAdvanceModal = true;
  }

  closeAdvanceModal(): void {
    this.showAdvanceModal = false;
  }

  /** Ouvriers proposés dans l'autocomplétion du formulaire d'acompte */
  get filteredWorkersForAdvance(): Worker[] {
    const keyword = this.advanceWorkerSearchKeyword.trim().toLowerCase();
    if (!keyword) return this.workers;
    return this.workers.filter(worker => `${worker.prenom} ${worker.nom}`.toLowerCase().includes(keyword));
  }

  onAdvanceWorkerSearchFocus(): void {
    this.showAdvanceWorkerDropdown = true;
  }

  onAdvanceWorkerSearchBlur(): void {
    setTimeout(() => { this.showAdvanceWorkerDropdown = false; }, 150);
  }

  selectAdvanceWorker(worker: Worker): void {
    this.advanceForm.workerId = worker.id;
    this.advanceWorkerSearchKeyword = `${worker.prenom} ${worker.nom}`;
    this.showAdvanceWorkerDropdown = false;
  }

  saveSalaryAdvance(): void {
    if (!this.advanceForm.workerId || !this.advanceForm.amount) {
      this.showError('Veuillez sélectionner un ouvrier et un montant');
      return;
    }
    this.advanceForm.payPeriodId = this.selectedPeriodId || this.advanceForm.payPeriodId;

    this.payrollService.createSalaryAdvance(this.advanceForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.showSuccess('Acompte enregistré'); this.closeAdvanceModal(); this.loadSalaryAdvances(); },
        error: (err) => this.showError(err.userMessage || "Erreur lors de l'enregistrement de l'acompte")
      });
  }

  deleteSalaryAdvance(advance: SalaryAdvanceResponse): void {
    this.askConfirmation(
      "Supprimer l'acompte",
      `Supprimer cet acompte de ${advance.workerName} ?`,
      () => {
        this.payrollService.deleteSalaryAdvance(advance.id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => { this.showSuccess('Acompte supprimé'); this.loadSalaryAdvances(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors de la suppression')
          });
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // PAIEMENTS
  // ═══════════════════════════════════════════════════════════════════════

  private emptyPaymentForm(): PayrollPaymentRequest {
    return { payslipId: 0, amount: 0, method: 'BANK_TRANSFER', reference: '', evidence: '' };
  }

  loadPaymentsAndKpis(): void {
    if (!this.propertyId) return;
    this.loading = true;

    forkJoin({
      kpis: this.payrollService.getPayrollKpis(this.propertyId, this.selectedPeriodId ?? undefined).pipe(catchError(() => of(null))),
      payments: this.payrollService.getPaymentsByProperty(this.propertyId).pipe(catchError(() => of([])))
    }).pipe(takeUntil(this.destroy$)).subscribe(({ kpis, payments }) => {
      this.payrollKpis = kpis;
      this.payrollPayments = payments;
      this.loading = false;
    });
  }

  openCreatePaymentModal(): void {
    if (!this.selectedPeriodId) {
      this.showError('Veuillez sélectionner une période de paie');
      return;
    }
    if (!this.payslips.length) {
      this.loadPayslips();
    }
    this.paymentForm = this.emptyPaymentForm();
    this.showPaymentModal = true;
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
  }

  savePayrollPayment(): void {
    if (!this.paymentForm.payslipId || !this.paymentForm.amount) {
      this.showError('Veuillez sélectionner un bulletin et un montant');
      return;
    }
    this.payrollService.createPayrollPayment(this.paymentForm)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.showSuccess('Paiement enregistré'); this.closePaymentModal(); this.loadPaymentsAndKpis(); },
        error: (err) => this.showError(err.userMessage || "Erreur lors de l'enregistrement du paiement")
      });
  }

  payInBulk(): void {
    if (!this.selectedPeriodId) {
      this.showError('Veuillez sélectionner une période de paie');
      return;
    }

    this.askConfirmation(
      'Payer en masse',
      `Payer tous les bulletins en attente de la période sélectionnée via ${this.bulkPayMethod} ?`,
      () => {
        this.payrollService.bulkPay(this.selectedPeriodId!, this.bulkPayMethod)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: (payments) => { this.showSuccess(`${payments.length} paiement(s) effectué(s)`); this.loadPaymentsAndKpis(); },
            error: (err) => this.showError(err.userMessage || 'Erreur lors du paiement en masse')
          });
      },
      false
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // UTILITAIRES
  // ═══════════════════════════════════════════════════════════════════════

  formatDate(value: any): string {
    const date = toJsDate(value);
    return date ? date.toLocaleDateString('fr-FR') : '-';
  }

  formatAmount(amount: number | undefined | null, currency: PayrollCurrency = 'CFA'): string {
    if (amount == null) return '-';
    const suffix = currency === 'EURO' ? '€' : currency === 'DOLLAR' ? '$' : 'FCFA';
    return `${amount.toLocaleString('fr-FR')} ${suffix}`;
  }
}
