import { Component, OnInit, signal, computed, inject, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, finalize } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../../../features/auth/services/auth.service';
import { SubscriptionService } from '../../../../services/subscription.service';
import { PlanSelectionPopupComponent } from '../plan-selection-popup/plan-selection-popup.component';

/**
 * Hero d'accueil "Espace Chantier" — affiché tant que l'utilisateur n'a créé aucun chantier.
 * Réutilisé sur la page Projets et sur le Dashboard pour un rendu identique partout.
 * Entièrement autonome : gère lui-même la vérification d'abonnement et le popup de plans.
 */
@Component({
  selector: 'app-chantier-welcome-hero',
  standalone: true,
  imports: [CommonModule, RouterLink, PlanSelectionPopupComponent],
  templateUrl: './chantier-welcome-hero.component.html',
  styleUrls: ['./chantier-welcome-hero.component.css']
})
export class ChantierWelcomeHeroComponent implements OnInit {
  /** Émis quand l'utilisateur clique "Voir mes chantiers" — le parent décide du comportement (fermer le hero, naviguer...). */
  @Output() viewProjects = new EventEmitter<void>();

  private authService = inject(AuthService);
  private subscriptionService = inject(SubscriptionService);

  private readonly canCreateProjectSignal = signal(false);
  private readonly isCheckingPermission = signal(true);
  readonly canCreateProject = computed(() => this.canCreateProjectSignal());
  readonly checkingPermission = computed(() => this.isCheckingPermission());

  readonly showSubscriptionPopup = signal(false);

  ngOnInit(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) {
      this.isCheckingPermission.set(false);
      return;
    }

    this.subscriptionService.canCreateProject(userId).pipe(
      catchError(() => of(false)),
      finalize(() => this.isCheckingPermission.set(false))
    ).subscribe(canCreate => this.canCreateProjectSignal.set(canCreate));
  }

  openSubscriptionPopup(): void {
    this.showSubscriptionPopup.set(true);
  }

  onClosePlanPopup(): void {
    this.showSubscriptionPopup.set(false);
  }

  onPlanSelected(_planType: string): void {
    this.showSubscriptionPopup.set(false);
  }

  onViewProjects(): void {
    this.viewProjects.emit();
  }
}
