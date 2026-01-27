import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlanAbonnementService, SubscriptionPlan, CreatePlanRequest } from './../../../services/plan-abonnement.service';
import { Subject, takeUntil } from 'rxjs';
import Chart from 'chart.js/auto';

interface SubscribedUser {
  id: number;
  name: string;
  email: string;
  role: string;
  status: 'Actif' | 'Inactif';
  avatarUrl: string;
}

@Component({
  selector: 'app-details-abonnement',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './details-abonnement.component.html',
  styleUrls: ['./details-abonnement.component.css']
})
export class DetailsAbonnementComponent implements OnInit, OnDestroy {
  @ViewChild('distributionChart', { static: false }) chartCanvas!: ElementRef;

  private destroy$ = new Subject<void>();
  planId!: number;
  plan: SubscriptionPlan | null = null;
  isLoading = true;
  chart: Chart | null = null;

  // 🆕 États pour les modals et notifications
  showDeleteModal = false;
  showToggleModal = false;
  showNotification = false;
  notificationType: 'deleted' | 'activated' | 'deactivated' = 'deleted';
  planLabel = '';

  // 🆕 Options pour formater le label
  labelOptions = [
    { value: 'BASIC', label: 'Basic' },
    { value: 'PREMIUM', label: 'Premium' }
  ];

  distributionData = {
    paid: 75,
    unpaid: 25
  };

  subscribedUsers: SubscribedUser[] = [
    { id: 1, name: 'Alpha Dieye', email: 'ad1@gmail.com', role: 'Promoteur', status: 'Actif', avatarUrl: 'assets/avatars/alpha.png' },
    { id: 2, name: 'Aziz Diop', email: 'ad@gmail.com', role: 'Promoteur', status: 'Actif', avatarUrl: 'assets/avatars/aziz.png' },
    { id: 3, name: 'Maguette Ndiaye', email: 'mb@gmail.com', role: 'BET', status: 'Actif', avatarUrl: 'assets/avatars/maguette.png' },
  ];

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private planService: PlanAbonnementService
  ) {}

  ngOnInit(): void {
    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.planId = +params['id'];
      if (this.planId) {
        this.loadPlanDetails(this.planId);
      } else {
        console.error('ID du plan manquant dans l\'URL');
        this.isLoading = false;
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.chart) {
      this.chart.destroy();
    }
  }

  loadPlanDetails(id: number): void {
    this.isLoading = true;
    this.planService.getPlanAbonnementById(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plan) => {
          this.plan = plan;
          this.isLoading = false;
          setTimeout(() => this.createChart(), 0);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des détails du plan:', error);
          this.isLoading = false;
          this.showNotificationMessage('Erreur lors du chargement des détails du plan', 'deleted');
        }
      });
  }

  createChart(): void {
    if (!this.chartCanvas) {
      console.warn('Canvas du graphique non trouvé.');
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Payé', 'Impayé'],
        datasets: [{
          data: [this.distributionData.paid, this.distributionData.unpaid],
          backgroundColor: ['#22c55f', '#f87171'],
          hoverBackgroundColor: ['#059669', '#DC2626'],
          borderWidth: 0,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                return `${label}: ${value}%`;
              }
            }
          }
        }
      }
    });
  }

  editPlan(): void {
    if (this.plan) {
      this.router.navigate(['/create-plan', this.plan.id], {
        queryParams: { mode: 'edit' }
      });
    }
  }

  // 🆕 Ouvre le modal de confirmation pour activer/désactiver
  openToggleModal(): void {
    if (!this.plan) return;
    this.showToggleModal = true;
  }

  // ✅ CORRECTION: Confirme l'activation/désactivation sans attendre de retour
  confirmToggleAction(): void {
    if (!this.plan) return;

    const newStatus = !this.plan.active;

    // ✅ Construire l'objet complet CreatePlanRequest
    const planData: CreatePlanRequest = {
      id: this.plan.id,
      name: this.plan.name,
      label: this.plan.label,
      description: this.plan.description,
      totalCost: this.plan.totalCost,
      installmentCount: this.plan.installmentCount,
      projectLimit: this.plan.projectLimit,
      unlimitedProjects: this.plan.unlimitedProjects,
      yearlyDiscountRate: this.plan.yearlyDiscountRate,
      active: newStatus
    };

    console.log('📝 Mise à jour du statut du plan:', planData);

    this.planService.putPlanAbonnement(this.plan.id, planData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Statut du plan mis à jour avec succès');
          
          // ✅ Mettre à jour manuellement le statut du plan local
          if (this.plan) {
            this.plan.active = newStatus;
          }
          
          // ✅ Utiliser le label formaté
          this.planLabel = this.getLabelDisplay(this.plan!.label);
          this.notificationType = newStatus ? 'activated' : 'deactivated';
          this.showToggleModal = false;
          this.showNotification = true;

          setTimeout(() => {
            this.showNotification = false;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour du statut:', error);
          this.showToggleModal = false;
          this.showNotificationMessage('Erreur lors de la modification du statut', 'deleted');
        }
      });
  }

  // 🆕 Annule l'action d'activation/désactivation
  cancelToggleAction(): void {
    this.showToggleModal = false;
  }

  // 🆕 Ouvre le modal de confirmation de suppression
  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  // ✅ CORRECTION: Confirme la suppression avec label formaté
  confirmDelete(): void {
    if (!this.plan) return;

    // ✅ Utiliser le label formaté
    this.planLabel = this.getLabelDisplay(this.plan.label);

    this.planService.deletePlanAbonnement(this.plan.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Plan supprimé avec succès');
          this.showDeleteModal = false;
          this.notificationType = 'deleted';
          this.showNotification = true;

          // Rediriger après 2 secondes
          setTimeout(() => {
            this.showNotification = false;
            this.router.navigate(['/abonnements']);
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression du plan:', error);
          this.showDeleteModal = false;
          this.showNotificationMessage('Erreur lors de la suppression du plan', 'deleted');
        }
      });
  }

  // 🆕 Annule la suppression
  cancelDelete(): void {
    this.showDeleteModal = false;
  }

  // 🆕 Affiche une notification d'erreur ou de succès
  private showNotificationMessage(message: string, type: 'deleted' | 'activated' | 'deactivated'): void {
    this.planLabel = message;
    this.notificationType = type;
    this.showNotification = true;
    setTimeout(() => {
      this.showNotification = false;
    }, 3000);
  }

  // ✅ NOUVEAU: Retourne le label formaté pour l'affichage
  private getLabelDisplay(label: string): string {
    const option = this.labelOptions.find(opt => opt.value === label);
    return option ? option.label : label;
  }

  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F`;
  }

  getStatutClass(active: boolean): string {
    return active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  }

  getStatutText(active: boolean): string {
    return active ? 'Actif' : 'Inactif';
  }

  getProjectLimit(plan: SubscriptionPlan): string {
    return plan.unlimitedProjects ? 'Illimité' : plan.projectLimit.toString();
  }

  viewUser(user: SubscribedUser): void {
    console.log(`Navigation vers les détails de l'utilisateur: ${user.name}`);
  }
}