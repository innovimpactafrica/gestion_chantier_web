import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { PlanAbonnementService, SubscriptionPlan } from '../../../services/plan-abonnement.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-abonnements',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './abonnements.component.html',
  styleUrls: ['./abonnements.component.css']
})
export class AbonnementsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // État de chargement
  isLoading = true;
  isSearching = false;
  isDeleting = false;

  // Données
  allPlans: SubscriptionPlan[] = [];
  filteredPlans: SubscriptionPlan[] = [];
  
  // Recherche
  searchTerm: string = '';
  
  // Pagination
  currentPage: number = 1;
  pageSize: number = 10;
  totalResults: number = 0;

  // Modal de confirmation de suppression
  showDeleteModal = false;
  planToDelete: SubscriptionPlan | null = null;

  // 🆕 Modal et notification pour activer/désactiver
  showToggleModal = false;
  showNotification = false;
  modalAction: 'activate' | 'deactivate' = 'deactivate';
  notificationType: 'activated' | 'deactivated' = 'deactivated';
  selectedPlanForAction: SubscriptionPlan | null = null;

  Math = Math;

  constructor(
    private planService: PlanAbonnementService,
    private router: Router
  ) {
    console.log('🚀 AbonnementsComponent initialisé');
  }

  ngOnInit(): void {
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // loadPlans(): void {
  //   this.isLoading = true;
    
  //   this.planService.getAbonnements()
  //     .pipe(takeUntil(this.destroy$))
  //     .subscribe({
  //       next: (subscriptions) => {
  //         console.log('✅ Abonnements chargés:', subscriptions);
          
  //         const planMap = new Map<number, SubscriptionPlan>();
  //         subscriptions.forEach(sub => {
  //           if (sub.subscriptionPlan && !planMap.has(sub.subscriptionPlan.id)) {
  //             planMap.set(sub.subscriptionPlan.id, sub.subscriptionPlan);
  //           }
  //         });
          
  //         this.allPlans = Array.from(planMap.values());
  //         this.filteredPlans = [...this.allPlans];
  //         this.totalResults = this.allPlans.length;
  //         this.isLoading = false;

  //         console.log('📊 Plans extraits:', this.allPlans.length);
  //       },
  //       error: (error) => {
  //         console.error('❌ Erreur lors du chargement des plans:', error);
  //         this.isLoading = false;
  //         alert(error.userMessage || 'Erreur lors du chargement des plans');
  //       }
  //     });
  // }

  loadPlans(): void {
    this.isLoading = true;
    
    // Charger les plans d'un type spécifique (ex: 'PREMIUM')
    this.planService.getAllPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          console.log('✅ Plans par nom chargés:', plans);
          
          this.allPlans = plans;
          this.filteredPlans = [...this.allPlans];
          this.totalResults = this.allPlans.length;
          this.isLoading = false;
  
          console.log('📊 Plans chargés:', this.allPlans.length);
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des plans:', error);
          this.isLoading = false;
          alert(error.userMessage || 'Erreur lors du chargement des plans');
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

    console.log(`🔍 Recherche: "${term}" - ${this.totalResults} résultats`);
  }

  createPlan(): void {
    this.router.navigate(['/create-plan']);
  }

  viewPlan(plan: SubscriptionPlan): void {
    console.log('👁️ Voir plan:', plan);
    this.router.navigate(['/details-abonnement', plan.id], {
      queryParams: { mode: 'view' }
    });
  }

  editPlan(plan: SubscriptionPlan): void {
    console.log('✏️ Modifier plan:', plan);
    this.router.navigate(['/create-plan', plan.id], {
      queryParams: { mode: 'edit' }
    });
  }

  // 🆕 NOUVELLE MÉTHODE : Ouvre le modal de confirmation
  togglePlanStatus(plan: SubscriptionPlan): void {
    console.log('🔄 Toggle statut plan:', plan);
    this.selectedPlanForAction = plan;
    this.modalAction = plan.active ? 'deactivate' : 'activate';
    this.showToggleModal = true;
  }

  // 🆕 NOUVELLE MÉTHODE : Confirme l'activation/désactivation
  confirmToggleAction(): void {
    if (!this.selectedPlanForAction) return;

    this.isLoading = true;
    const newStatus = !this.selectedPlanForAction.active;

    this.planService.putPlanAbonnement(this.selectedPlanForAction.id, { active: newStatus })
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedPlan) => {
          console.log('✅ Statut du plan mis à jour:', updatedPlan);
          
          // Mettre à jour le plan dans la liste
          const index = this.allPlans.findIndex(p => p.id === this.selectedPlanForAction!.id);
          if (index !== -1) {
            this.allPlans[index] = updatedPlan;
            this.searchPlans();
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
          console.error('❌ Erreur lors de la mise à jour du statut:', error);
          this.showToggleModal = false;
          this.isLoading = false;
          alert(error.userMessage || 'Erreur lors de la modification du statut');
        }
      });
  }

  // 🆕 NOUVELLE MÉTHODE : Annule l'action
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
          console.log('✅ Plan supprimé:', planId);
          
          this.allPlans = this.allPlans.filter(p => p.id !== planId);
          this.searchPlans();
          
          this.isDeleting = false;
          this.showDeleteModal = false;
          this.planToDelete = null;
          
          alert(`Plan "${planLabel}" supprimé avec succès`);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression:', error);
          this.isDeleting = false;
          alert(error.userMessage || 'Erreur lors de la suppression du plan');
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
    return active ? 'Actif' : 'Inactif';
  }

  getProjectLimit(plan: SubscriptionPlan): string {
    return plan.unlimitedProjects ? 'Illimité' : plan.projectLimit.toString();
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
    console.log('📤 Export des plans...');
    alert('Fonctionnalité d\'export à venir');
  }
}
