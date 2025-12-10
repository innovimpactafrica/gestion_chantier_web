import { Component, inject, OnInit } from '@angular/core';
import { Projet } from '../../../../models/projet';
import { CommonModule } from '@angular/common';
import { StatusReportComponent } from '../status-report/status-report.component';
import { ProjectBudgetComponent } from '../project-budget/project-budget.component';
import { ActivatedRoute } from '@angular/router';
import { RealEstateProject, RealestateService } from '../../../../core/services/realestate.service';
import { DashboardService, PhaseIndicator } from '../../../../../services/dashboard.service';
import { ProjectBudgetService, BudgetResponse } from '../../../../../services/project-details.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

@Component({
  selector: 'app-project-presentation',
  standalone: true,
  imports: [CommonModule, StatusReportComponent, ProjectBudgetComponent],
  templateUrl: './project-presentation.component.html',
  styleUrl: './project-presentation.component.css'
})
export class ProjectPresentationComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private realEstateService = inject(RealestateService);
  private dashboardService = inject(DashboardService);
  private projectBudgetService = inject(ProjectBudgetService);

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

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const projectId = +id;
      this.loadProjectDetails(projectId);
      this.loadProgression();
      this.loadBudget(projectId);
    }
  }

  private phaseDisplayNames: { [key: string]: string } = {
    'GROS_OEUVRE': 'Gros œuvre',
    'SECOND_OEUVRE': 'Second œuvre',
    'FINITION': 'Finition'
  };

  private loadProjectDetails(id: number): void {
    this.loading = true;
    this.error = null;
  
    this.realEstateService.getRealEstateDetails(id).subscribe({
      next: (response) => {
        if (response && response.realEstateProperty) {
          this.projet = response.realEstateProperty;
        } else {
          this.projet = response || null;
        }
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du projet:', error);
        this.error = 'Erreur lors du chargement des détails du projet';
        this.projet = null;
        this.loading = false;
      }
    });
  }

  private loadProgression(): void {
    this.isLoadingProgress = true;
    this.dashboardService.etatAvancement().pipe(
      catchError(error => {
        console.error('Erreur progression:', error);
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
      catchError(error => {
        console.error('Erreur lors du chargement du budget:', error);
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
      case 'PAUSED':
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
    console.log('Modification du projet:', this.projet?.id);
  }

  get equipementsCommuns() {
    if (!this.projet) return [];
    const equipements = [];

    // Hall d'entrée
    if (this.projet.hasHall) {
      equipements.push({
        icon: 'assets/images/project-icons/hall1.png',
        nom: 'Hall d\'entrée',
        description: 'Espace d\'accueil de l\'immeuble'
      });
    }

    // Ascenseur
    if (this.projet.hasElevator) {
      equipements.push({
        icon: 'assets/images/project-icons/elevator.png',
        nom: 'Ascenseur',
        description: 'Accès aux différents niveaux'
      });
    }

    // Parking
    if (this.projet.hasParking) {
      equipements.push({
        icon: 'assets/images/project-icons/parking.png',
        nom: 'Parking',
        description: 'Espaces de stationnement'
      });
    }

    // Piscine
    if (this.projet.hasSwimmingPool) {
      equipements.push({
        icon: 'assets/images/project-icons/swimming.png', // Assurez-vous d'avoir cette icône
        nom: 'Piscine',
        description: 'Bassin de natation'
      });
    }

    // Gym
    if (this.projet.hasGym) {
      equipements.push({
        icon: 'assets/images/project-icons/muscle.png',
        nom: 'Salle de sport',
        description: 'Espace fitness équipé'
      });
    }

    // Terrain de jeux
    if (this.projet.hasPlayground) {
      equipements.push({
        icon: 'assets/images/project-icons/playground.png',
        nom: 'Terrain de jeux',
        description: 'Espace de jeux pour enfants'
      });
    }

    // Service de sécurité
    if (this.projet.hasSecurityService) {
      equipements.push({
        icon: 'assets/images/project-icons/security.png',
        nom: 'Service de sécurité',
        description: 'Surveillance 24/7'
      });
    }

    // Jardin
    if (this.projet.hasGarden) {
      equipements.push({
        icon: 'assets/images/project-icons/park.png',
        nom: 'Jardin',
        description: 'Espace vert paysager'
      });
    }

    // Terrasse partagée
    if (this.projet.hasSharedTerrace) {
      equipements.push({
        icon: 'assets/images/project-icons/hall.png',
        nom: 'Terrasse partagée',
        description: 'Espace extérieur commun'
      });
    }

    // Stockage vélos
    if (this.projet.hasBicycleStorage) {
      equipements.push({
        icon: 'assets/images/project-icons/bike-parking.png',
        nom: 'Local à vélos',
        description: 'Stationnement sécurisé pour vélos'
      });
    }

    // Laverie
    if (this.projet.hasLaundryRoom) {
      equipements.push({
        icon: 'assets/images/project-icons/washing-machine.png',
        nom: 'Laverie',
        description: 'Espace buanderie commun'
      });
    }

    // Locaux de stockage
    if (this.projet.hasStorageRooms) {
      equipements.push({
        icon: 'assets/images/project-icons/boxes.png',
        nom: 'Locaux de stockage',
        description: 'Espaces de rangement individuels'
      });
    }

    // Couloirs (toujours présent)
    equipements.push({
      icon: 'assets/images/project-icons/couloir.png',
      nom: 'Couloirs',
      description: 'Espaces de circulation'
    });

    return equipements;
  }
}