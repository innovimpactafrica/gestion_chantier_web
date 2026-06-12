import { Component, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatusReportComponent } from '../status-report/status-report.component';
import { ProjectBudgetComponent } from '../project-budget/project-budget.component';
import { ActivatedRoute } from '@angular/router';
import { RealEstateProject, RealestateService } from '../../../../core/services/realestate.service';
import { DashboardService, PhaseIndicator } from '../../../../../services/dashboard.service';
import { ProjectBudgetService, BudgetResponse } from '../../../../../services/project-details.service';
import { catchError, takeUntil } from 'rxjs/operators';
import { of, Subject } from 'rxjs';
import { LanguageService } from '../../../../core/services/language.service';
import { environment } from '../../../../../environments/environment';

@Component({
  selector: 'app-project-presentation',
  standalone: true,
  imports: [CommonModule, StatusReportComponent, ProjectBudgetComponent],
  templateUrl: './project-presentation.component.html',
  styleUrl: './project-presentation.component.css'
})
export class ProjectPresentationComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  private route = inject(ActivatedRoute);
  private realEstateService = inject(RealestateService);
  private dashboardService = inject(DashboardService);
  private projectBudgetService = inject(ProjectBudgetService);
  private languageService = inject(LanguageService);

  readonly filebaseUrl = environment.filebaseUrl;

  // Translation helper
  t = (key: string) => this.languageService.translate(key);

  projet: RealEstateProject | null = null;
  loading = true;
  error: string | null = null;
  activeTab = 'general';

  averageProgress: number | null = null;
  isLoadingProgress = true;
  progressError: string | null = null;

  budgetUtilise: number = 0;
  budgetTotal: number = 0;
  progressionBudgetaire: number = 0;
  budgetData: BudgetResponse | null = null;
  isLoadingBudget = true;
  budgetError: string | null = null;
  isUpdatingStatus = false;
  statusUpdateError: string | null = null;
  statusSuccessMessage: string | null = null;
  private statusTimeout: ReturnType<typeof setTimeout> | null = null;

  // Mapping statut français -> anglais
  private statutMap: { [key: string]: string } = {
    'En cours': 'IN_PROGRESS',
    'En pause': 'PENDING',
    'Terminé': 'COMPLETED',
    'Planifié': 'PLANNED'
  };

  @ViewChild(StatusReportComponent) statusReportComponent?: StatusReportComponent;
  @ViewChild(ProjectBudgetComponent) projectBudgetComponent?: ProjectBudgetComponent;

  triggerAddAlbum(): void {
    if (this.statusReportComponent) {
      this.statusReportComponent.onAddClick();
    }
  }
  /**
 * Change le statut du projet
 * @param nouveauStatutFr Nouveau statut en français ('En cours', 'En pause', 'Terminé')
 */
  changeStatut(nouveauStatutFr: string): void {
    if (!this.projet || !this.projet.id) {
      return;
    }

    // Empêcher les changements multiples simultanés
    if (this.isUpdatingStatus) {
      return;
    }

    // Vérifier si le statut a réellement changé
    if (this.statutFrancais === nouveauStatutFr) {
      return;
    }

    const nouveauStatutEn = this.statutMap[nouveauStatutFr];

    if (!nouveauStatutEn) {
      return;
    }

    this.isUpdatingStatus = true;
    this.statusUpdateError = null;

    this.realEstateService.changeProjectStatus(this.projet.id, nouveauStatutEn).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        if (response && response.data && response.data.realEstateProperty) {
          this.projet = response.data.realEstateProperty;
        } else if (response && response.data) {
          this.projet = response.data as RealEstateProject;
        }

        // ✅ Garantie : toujours synchroniser le statut local pour éviter
        // un désynchronisme entre le radio sélectionné et le texte "Statut actuel"
        if (this.projet) {
          this.projet = { ...this.projet, constructionStatus: nouveauStatutEn };
        }

        this.isUpdatingStatus = false;
        this.statusUpdateError = null;

        this.statusSuccessMessage = `${this.t('projectPresentation.statusChanged')} : "${nouveauStatutFr}"`;
        if (this.statusTimeout) { clearTimeout(this.statusTimeout); }
        this.statusTimeout = setTimeout(() => { this.statusSuccessMessage = null; }, 3000);

        if (this.projet?.id) {
          this.loadBudget(this.projet.id);
        }
      },

      error: (_error) => {
        this.statusUpdateError = 'Impossible de mettre à jour le statut du projet';
        this.isUpdatingStatus = false;

        // Recharger le projet pour rétablir l'état précédent
        if (this.projet?.id) {
          this.loadProjectDetails(this.projet.id);
          this.loadBudget(this.projet.id);
        }
      }
    });
  }
  /**
   * Vérifie si un statut est sélectionné
   * @param statut Statut à vérifier
   * @returns true si le statut correspond au statut actuel
   */
  isStatutSelected(statut: string): boolean {
    return this.statutFrancais === statut;
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const projectId = +id;
      this.loadProjectDetails(projectId);
      this.loadProgression();
      this.loadBudget(projectId);
    }
  }
  ngOnDestroy(): void {
    if (this.statusTimeout) { clearTimeout(this.statusTimeout); }
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadProjectDetails(id: number): void {
    this.loading = true;
    this.error = null;

    this.realEstateService.getRealEstateDetails(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          if (response && response.realEstateProperty) {
            this.projet = response.realEstateProperty;
          } else {
            this.projet = response || null;
          }
          this.loading = false;
        },
        error: (_error) => {
          this.error = 'Erreur lors du chargement des détails du projet';
          this.projet = null;
          this.loading = false;
        }
      });
  }

  private loadProgression(): void {
    this.isLoadingProgress = true;
    this.dashboardService.etatAvancement().pipe(
      takeUntil(this.destroy$),
      catchError(_error => {
        this.progressError = 'Impossible de charger la progression';
        this.isLoadingProgress = false;
        return of([] as PhaseIndicator[]);
      })
    ).subscribe((phases: PhaseIndicator[]) => {
      const relevantPhases = phases.filter(p =>
        ['GROS_OEUVRE', 'SECOND_OEUVRE', 'FINITION'].includes(p.phaseName)
      );

      const total = relevantPhases.reduce((sum, p) => sum + p.averageProgressPercentage, 0);
      const count = relevantPhases.length;

      this.averageProgress = count > 0 ? Math.round(total / count) : 0;
      this.isLoadingProgress = false;
    });
  }

  private loadBudget(propertyId: number): void {
    this.isLoadingBudget = true;
    this.budgetError = null;

    this.projectBudgetService.GetProjectBudget(propertyId).pipe(
      takeUntil(this.destroy$),
      catchError(_error => {
        this.budgetError = 'Impossible de charger les données du budget';
        this.isLoadingBudget = false;
        return of(null);
      })
    ).subscribe((budgetResponse: BudgetResponse | null) => {
      if (budgetResponse) {
        this.budgetData = budgetResponse;
        this.budgetTotal = budgetResponse.plannedBudget;
        this.budgetUtilise = budgetResponse.consumedBudget;

        if (this.budgetTotal > 0) {
          this.progressionBudgetaire = Math.round((this.budgetUtilise / this.budgetTotal) * 100);
        } else {
          this.progressionBudgetaire = 0;
        }
      } else {
        this.budgetTotal = 0;
        this.budgetUtilise = 0;
        this.progressionBudgetaire = 0;
      }

      this.isLoadingBudget = false;
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  isActiveTab(tab: string): boolean {
    return this.activeTab === tab;
  }

  get statutFrancais(): string {
    if (!this.projet) return '';

    switch (this.projet.constructionStatus) {
      case 'IN_PROGRESS':
        return 'En cours';
      case 'COMPLETED':
        return 'Terminé';
      case 'PENDING':
        return 'En pause';
      case 'PLANNED':
        return 'Planifié';
      default:
        return 'En cours';
    }
  }

  get dateDebut(): string {
    if (!this.projet?.startDate) return '01/01/25';
    const date = new Date(this.projet.startDate);
    return isNaN(date.getTime()) ? '01/01/25' : date.toLocaleDateString('fr-FR');
  }

  get dateFinPrevue(): string {
    if (!this.projet?.endDate) return '01/01/27';
    const date = new Date(this.projet.endDate);
    return isNaN(date.getTime()) ? '01/01/27' : date.toLocaleDateString('fr-FR');
  }

  getGradientBackgroundDetail(percentage: number): string {
    if (percentage <= 30) {
      return 'linear-gradient(90deg, #FE6102 100%)';
    } else if (percentage <= 70) {
      return 'linear-gradient(90deg, #FE6102 100%)';
    } else {
      return 'linear-gradient(90deg, #FE6102 100%)';
    }
  }

  onModifier(): void {
    if (this.isActiveTab('budget') && this.projectBudgetComponent) {
      this.projectBudgetComponent.openBudgetModal();
    }
  }

  get equipementsCommuns() {
    if (!this.projet) return [];
    const equipements = [];

    // Hall d'entrée
    if (this.projet.hasHall) {
      equipements.push({
        icon: 'assets/images/project-icons/hall1.png',
        nom: this.t('equipment.hall'),
        description: this.t('equipment.hallDesc')
      });
    }

    // Ascenseur
    if (this.projet.hasElevator) {
      equipements.push({
        icon: 'assets/images/project-icons/elevator.png',
        nom: this.t('equipment.elevator'),
        description: this.t('equipment.elevatorDesc')
      });
    }

    // Parking
    if (this.projet.hasParking) {
      equipements.push({
        icon: 'assets/images/project-icons/parking.png',
        nom: this.t('equipment.parking'),
        description: this.t('equipment.parkingDesc')
      });
    }

    // Piscine
    if (this.projet.hasSwimmingPool) {
      equipements.push({
        icon: 'assets/images/project-icons/swimming.png', // Assurez-vous d'avoir cette icône
        nom: this.t('equipment.pool'),
        description: this.t('equipment.poolDesc')
      });
    }

    // Gym
    if (this.projet.hasGym) {
      equipements.push({
        icon: 'assets/images/project-icons/muscle.png',
        nom: this.t('equipment.gym'),
        description: this.t('equipment.gymDesc')
      });
    }

    // Terrain de jeux
    if (this.projet.hasPlayground) {
      equipements.push({
        icon: 'assets/images/project-icons/playground.png',
        nom: this.t('equipment.playground'),
        description: this.t('equipment.playgroundDesc')
      });
    }

    // Service de sécurité
    if (this.projet.hasSecurityService) {
      equipements.push({
        icon: 'assets/images/project-icons/security.png',
        nom: this.t('equipment.security'),
        description: this.t('equipment.securityDesc')
      });
    }

    // Jardin
    if (this.projet.hasGarden) {
      equipements.push({
        icon: 'assets/images/project-icons/park.png',
        nom: this.t('equipment.garden'),
        description: this.t('equipment.gardenDesc')
      });
    }

    // Terrasse partagée
    if (this.projet.hasSharedTerrace) {
      equipements.push({
        icon: 'assets/images/project-icons/hall.png',
        nom: this.t('equipment.terrace'),
        description: this.t('equipment.terraceDesc')
      });
    }

    // Stockage vélos
    if (this.projet.hasBicycleStorage) {
      equipements.push({
        icon: 'assets/images/project-icons/bike-parking.png',
        nom: this.t('equipment.bikeStorage'),
        description: this.t('equipment.bikeStorageDesc')
      });
    }

    // Laverie
    if (this.projet.hasLaundryRoom) {
      equipements.push({
        icon: 'assets/images/project-icons/washing-machine.png',
        nom: this.t('equipment.laundry'),
        description: this.t('equipment.laundryDesc')
      });
    }

    // Locaux de stockage
    if (this.projet.hasStorageRooms) {
      equipements.push({
        icon: 'assets/images/project-icons/boxes.png',
        nom: this.t('equipment.storage'),
        description: this.t('equipment.storageDesc')
      });
    }

    // Couloirs (toujours présent)
    equipements.push({
      icon: 'assets/images/project-icons/couloir.png',
      nom: this.t('equipment.corridors'),
      description: this.t('equipment.corridorsDesc')
    });

    return equipements;
  }

  /**
   * Called when progress is updated in the status report component
   * Reloads the progress data to keep the sidebar in sync
   */
  onProgressUpdated(): void {
    this.loadProgression();
  }
}