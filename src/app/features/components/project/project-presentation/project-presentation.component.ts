import { Component, inject, OnInit } from '@angular/core';
import { Projet } from '../../../../models/projet';
import { CommonModule } from '@angular/common';
import { StatusReportComponent } from '../status-report/status-report.component';
import { ProjectBudgetComponent } from '../project-budget/project-budget.component';
import { ActivatedRoute } from '@angular/router';
import { RealEstateProject, RealestateService } from '../../../../core/services/realestate.service';
import { DashboardService, PhaseIndicator } from '../../../../../services/dashboard.service';
import { ProjectBudgetService, BudgetResponse } from '../../../../../services/project-details.service'; // Ajout de l'import
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
  private projectBudgetService = inject(ProjectBudgetService); // Injection du service

  projet: RealEstateProject | null = null;
  loading = true;
  error: string | null = null;
  activeTab = 'general';

  averageProgress: number | null = null;
  isLoadingProgress = true;
  progressError: string | null = null;
  
  // Propriétés pour le budget
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
      this.loadBudget(projectId); // Chargement du budget
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
        this.projet = response.realEstateProperty;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement du projet:', error);
        this.error = 'Erreur lors du chargement des détails du projet';
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

  // Nouvelle méthode pour charger le budget
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
        
        // Calcul du pourcentage d'utilisation du budget
        if (this.budgetTotal > 0) {
          this.progressionBudgetaire = Math.round((this.budgetUtilise / this.budgetTotal) * 100);
        } else {
          this.progressionBudgetaire = 0;
        }
      } else {
        // Valeurs par défaut en cas d'erreur
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
      return 'linear-gradient(90deg, #FE6102 100%)'; // Rouge
    } else if (percentage <= 70) {
      return 'linear-gradient(90deg, #FE6102 100%)'; // Orange
    } else {
      return 'linear-gradient(90deg, #FE6102 100%)'; // Vert
    }
  }

  onModifier(): void {
    console.log('Modification du projet:', this.projet?.id);
  }

  get equipementsCommuns() {
    if (!this.projet) return [];
    const equipements = [];

    if (this.projet.hasHall) {
      equipements.push({
        icon: 'assets/images/project-icons/hall1.png',
        nom: 'Hall d\'entrée',
        description: 'Espace d\'accueil de l\'immeuble'
      });
    }

    if (this.projet.hasElevator) {
      equipements.push({
        icon: 'assets/images/project-icons/escalier.svg',
        nom: 'Escaliers et ascenseurs',
        description: 'Zones permettant d\'accéder aux différents niveaux'
      });
    }

    equipements.push({
      icon: 'assets/images/project-icons/couloir.png',
      nom: 'Couloirs',
      description: 'Espaces de circulation entre les différentes unités'
    });

    if (this.projet.hasGarden || this.projet.hasSharedTerrace) {
      equipements.push({
        icon: 'assets/images/project-icons/hall.png',
        nom: 'Jardins ou terrasses partagés',
        description: 'Espaces extérieurs accessibles à tous'
      });
    }

    if (this.projet.hasStorageRooms) {
      equipements.push({
        icon: 'assets/images/project-icons/locaux.png',
        nom: 'Locaux Techniques',
        description: 'Espaces dédiés aux installations'
      });
    }

    if (this.projet.hasParking) {
      equipements.push({
        icon: 'assets/images/project-icons/parking.png',
        nom: 'Parkings communs',
        description: 'Espaces de stationnement partagés'
      });
    }

    return equipements;
  }
}