import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { PlanAbonnementService, SubscriptionPlan }   from './../../../services/plan-abonnement.service';
import { Subject, takeUntil } from 'rxjs'; 
import Chart from 'chart.js/auto';

// Interface pour les utilisateurs abonnés (mock)
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
  showDeleteModal = false; // Contrôle l'affichage du modal de suppression
  showDeactivateModal = false; // Contrôle l'affichage du modal de désactivation

  // Données pour le graphique (basées sur la capture d'écran)
  distributionData = {
    paid: 75,
    unpaid: 25
  };

  // Données mockées pour les utilisateurs abonnés
  subscribedUsers: SubscribedUser[] = [
    { id: 1, name: 'Alpha Dieye', email: 'ad1@gmail.com', role: 'Promoteur', status: 'Actif', avatarUrl: 'assets/alpha.png' },
    { id: 2, name: 'Aziz Diop', email: 'ad@gmail.com', role: 'Promoteur', status: 'Actif', avatarUrl: 'assets/aziz.png' },
    { id: 3, name: 'Maguette Ndiaye', email: 'mb@gmail.com', role: 'BET', status: 'Actif', avatarUrl: 'assets/maguette.png' },
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

  /**
   * Charge les détails du plan d'abonnement
   */
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
          alert(error.userMessage || 'Erreur lors du chargement des détails du plan');
        }
      });
  }

  /**
   * Crée le graphique de répartition des abonnements (Donut Chart)
   */
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

  /**
   * Navigue vers la page de modification du plan
   */
  editPlan(): void {
    if (this.plan) {
      this.router.navigate(['/create-plan', this.plan.id], {
        queryParams: { mode: 'edit' }
      });
    }
  }

  /**
   * Désactive le plan d'abonnement
   * @deprecated Utilisez openDeactivateModal() à la place
   */
  deactivatePlan(): void {
    this.openDeactivateModal();
  }

  /**
   * Ouvre le modal de confirmation de désactivation
   */
  openDeactivateModal(): void {
    if (!this.plan || !this.plan.active) return;
    this.showDeactivateModal = true;
  }

  /**
   * Ferme le modal de confirmation de désactivation
   */
  closeDeactivateModal(): void {
    this.showDeactivateModal = false;
  }

  /**
   * Confirme et exécute la désactivation du plan
   */
  confirmDeactivate(): void {
    if (!this.plan) return;

    this.planService.putPlanAbonnement(this.plan.id, { active: false })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedPlan) => {
          this.plan = updatedPlan;
          this.closeDeactivateModal();
          alert(`Plan "${this.plan?.label}" désactivé avec succès`);
        },
        error: (error) => {
          console.error('Erreur lors de la désactivation du plan:', error);
          this.closeDeactivateModal();
          alert(error.userMessage || 'Erreur lors de la désactivation du plan');
        }
      });
  }

  /**
   * Ouvre le modal de confirmation de suppression
   */
  openDeleteModal(): void {
    this.showDeleteModal = true;
  }

  /**
   * Ferme le modal de confirmation de suppression
   */
  closeDeleteModal(): void {
    this.showDeleteModal = false;
  }

  /**
   * Confirme et exécute la suppression du plan
   */
  confirmDelete(): void {
    if (!this.plan) return;

    this.planService.deletePlanAbonnement(this.plan.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.closeDeleteModal();
          alert(`Plan "${this.plan?.label}" supprimé avec succès`);
          this.router.navigate(['/abonnements']);
        },
        error: (error) => {
          console.error('Erreur lors de la suppression du plan:', error);
          this.closeDeleteModal();
          alert(error.userMessage || 'Erreur lors de la suppression du plan');
        }
      });
  }

  /**
   * Ancienne méthode deletePlan (conservée pour compatibilité)
   * Redirige vers openDeleteModal
   */
  deletePlan(): void {
    this.openDeleteModal();
  }

  /**
   * Formate le montant
   */
  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} F`;
  }

  /**
   * Retourne la classe CSS pour le statut
   */
  getStatutClass(active: boolean): string {
    return active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
  }

  /**
   * Retourne le texte du statut
   */
  getStatutText(active: boolean): string {
    return active ? 'Actif' : 'Inactif';
  }

  /**
   * Retourne la limite de projets formatée
   */
  getProjectLimit(plan: SubscriptionPlan): string {
    return plan.unlimitedProjects ? 'Illimité' : plan.projectLimit.toString();
  }

  /**
   * Simule la navigation vers les détails d'un utilisateur
   */
  viewUser(user: SubscribedUser): void {
    console.log(`Navigation vers les détails de l'utilisateur: ${user.name}`);
    // Implémenter la navigation réelle ici
  }
}