import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PlanAbonnementService, SubscriptionPlan, CreatePlanRequest } from '../../../services/plan-abonnement.service';
import { LanguageService } from '../../core/services/language.service';
import { Subject, takeUntil } from 'rxjs';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-abonnements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './abonnements.component.html',
  styleUrls: ['./abonnements.component.css']
})
export class AbonnementsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isLoading = true;
  isSearching = false;
  isDeleting = false;

  allPlans: SubscriptionPlan[] = [];
  filteredPlans: SubscriptionPlan[] = [];

  searchTerm: string = '';

  currentPage: number = 1;
  pageSize: number = 10;
  totalResults: number = 0;

  showDeleteModal = false;
  planToDelete: SubscriptionPlan | null = null;

  showToggleModal = false;
  showNotification = false;
  modalAction: 'activate' | 'deactivate' = 'deactivate';
  notificationType: 'activated' | 'deactivated' = 'deactivated';
  selectedPlanForAction: SubscriptionPlan | null = null;

  Math = Math;

  constructor(
    private planService: PlanAbonnementService,
    private router: Router,
    public languageService: LanguageService,
    private toastService: ToastService
  ) {
  }

  // Helper pour la traduction
  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void {
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPlans(): void {
    this.isLoading = true;

    this.planService.getAllPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {

          this.allPlans = plans;
          this.filteredPlans = [...this.allPlans];
          this.totalResults = this.allPlans.length;
          this.isLoading = false;

        },
        error: (error) => {
          this.isLoading = false;
          this.toastService.showError(error.userMessage || this.t('admin.subscription.error.load'));
        }
      });
  }

  searchPlans(): void {
    if (this.searchTerm.trim() === '') {
      this.filteredPlans = [...this.allPlans];
      this.totalResults = this.allPlans.length;
      return;
    }

    const term = this.searchTerm.toLowerCase().trim();

    this.filteredPlans = this.allPlans.filter(plan =>
      plan.name.toLowerCase().includes(term) ||
      plan.label.toLowerCase().includes(term) ||
      plan.description.toLowerCase().includes(term)
    );

    this.totalResults = this.filteredPlans.length;
    this.currentPage = 1;

  }

  createPlan(): void {
    this.router.navigate(['/create-plan']);
  }

  viewPlan(plan: SubscriptionPlan): void {
    this.router.navigate(['/details-abonnement', plan.id], {
      queryParams: { mode: 'view' }
    });
  }

  editPlan(plan: SubscriptionPlan): void {
    this.router.navigate(['/create-plan', plan.id], {
      queryParams: { mode: 'edit' }
    });
  }

  togglePlanStatus(plan: SubscriptionPlan): void {
    this.selectedPlanForAction = plan;
    this.modalAction = plan.active ? 'deactivate' : 'activate';
    this.showToggleModal = true;
  }

  // ✅ CORRECTION: Gestion correcte du retour void de l'API
  confirmToggleAction(): void {
    if (!this.selectedPlanForAction) return;

    this.isLoading = true;
    const newStatus = !this.selectedPlanForAction.active;

    // ✅ Construire l'objet complet avec TOUTES les propriétés requises
    const planData: CreatePlanRequest = {
      id: this.selectedPlanForAction.id,
      name: this.selectedPlanForAction.name,
      label: this.selectedPlanForAction.label,
      description: this.selectedPlanForAction.description,
      totalCost: this.selectedPlanForAction.totalCost,
      installmentCount: this.selectedPlanForAction.installmentCount,
      projectLimit: this.selectedPlanForAction.projectLimit,
      unlimitedProjects: this.selectedPlanForAction.unlimitedProjects,
      yearlyDiscountRate: this.selectedPlanForAction.yearlyDiscountRate,
      active: newStatus  // ✅ Seul ce champ change
    };


    this.planService.putPlanAbonnement(this.selectedPlanForAction.id, planData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {

          // ✅ Mettre à jour manuellement le plan dans la liste locale
          const index = this.allPlans.findIndex(p => p.id === this.selectedPlanForAction!.id);
          if (index !== -1) {
            // Créer une copie du plan avec le nouveau statut
            this.allPlans[index] = {
              ...this.allPlans[index],
              active: newStatus
            };
            this.searchPlans(); // Rafraîchir la liste filtrée
          }

          // Afficher la notification
          this.notificationType = newStatus ? 'activated' : 'deactivated';
          this.showToggleModal = false;
          this.showNotification = true;
          this.isLoading = false;

          // Masquer la notification après 3 secondes
          setTimeout(() => {
            this.showNotification = false;
            this.selectedPlanForAction = null;
          }, 3000);
        },
        error: (error) => {
          this.showToggleModal = false;
          this.isLoading = false;
          this.toastService.showError(error.userMessage || this.t('lots.error.statusChangeFailed'));
        }
      });
  }

  cancelToggleAction(): void {
    this.showToggleModal = false;
    this.selectedPlanForAction = null;
  }

  confirmDelete(plan: SubscriptionPlan): void {
    this.planToDelete = plan;
    this.showDeleteModal = true;
  }

  deletePlan(): void {
    if (!this.planToDelete) return;

    this.isDeleting = true;
    const planId = this.planToDelete.id;
    const planLabel = this.planToDelete.label;

    this.planService.deletePlanAbonnement(planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {

          this.allPlans = this.allPlans.filter(p => p.id !== planId);
          this.searchPlans();

          this.isDeleting = false;
          this.showDeleteModal = false;
          this.planToDelete = null;

          this.toastService.showSuccess(this.t('admin.subscription.success.delete', { label: planLabel }));
        },
        error: (error) => {
          this.isDeleting = false;
          this.toastService.showError(error.userMessage || this.t('admin.subscription.error.delete'));
        }
      });
  }

  cancelDelete(): void {
    this.showDeleteModal = false;
    this.planToDelete = null;
  }

  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F CFA`;
  }

  getStatutClass(active: boolean): string {
    return active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  }

  getStatutText(active: boolean): string {
    return active ? this.t('admin.subscription.status.active') : this.t('admin.subscription.status.inactive');
  }

  getProjectLimit(plan: SubscriptionPlan): string {
    return plan.unlimitedProjects ? this.t('admin.subscription.unlimited') : plan.projectLimit.toString();
  }

  get paginatedPlans(): SubscriptionPlan[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredPlans.slice(start, end);
  }

  get totalPages(): number {
    return Math.ceil(this.totalResults / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  exportPlans(): void {
    this.toastService.showInfo(this.t('admin.subscription.export') + ' - ' + this.t('lots.preview'));
  }
}