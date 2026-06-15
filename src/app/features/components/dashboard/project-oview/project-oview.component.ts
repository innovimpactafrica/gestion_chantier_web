// project-oview.component.ts
import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { DahsboardService } from '../../../../core/services/dahsboard.service';
import { AuthService } from '../../../auth/services/auth.service';

interface ChantiersSummary {
  enCours: number;
  enRetard: number;
  enAttente: number;
  termines: number;
}

@Component({
  selector: 'app-project-oview',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './project-oview.component.html',
  styleUrl: './project-oview.component.css'
})
export class ProjectOviewComponent implements OnInit, OnChanges {
  @Input() chantiersSummary!: ChantiersSummary;
  @Input() selectedPropertyId!: number; // Ajout de l'Input pour recevoir selectedPropertyId du parent
  @Input() currentUserId!: number; // Ajout de l'Input pour recevoir currentUserId du parent
  
  tasksKPIs: any;
  
  // Compteurs pour chaque statut
  enCoursCount: number = 0;
  enRetardCount: number = 0;
  enAttenteCount: number = 0;
  termineesCount: number = 0;
  
  // États de chargement et d'erreur
  isLoading: boolean = true;
  error: string | null = null;

  constructor(
    private dashboardService: DahsboardService,
    private authService: AuthService
  ) { }

  ngOnInit(): void {
    // Si on a déjà les données nécessaires, charger immédiatement
    if (this.selectedPropertyId && this.currentUserId) {
      this.loadTasksData();
    } else {
      // Sinon, essayer de récupérer l'utilisateur actuel
      this.loadCurrentUser();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    // Réagir aux changements des inputs
    if ((changes['selectedPropertyId'] || changes['currentUserId']) && 
        this.selectedPropertyId && this.currentUserId) {
      this.loadTasksData();
    }
  }

  private loadCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: user => {
        if (user && user.id) {
          this.currentUserId = user.id;
          // Si on a maintenant les deux valeurs nécessaires, charger les données
          if (this.selectedPropertyId) {
            this.loadTasksData();
          }
        } else {
          this.error = 'Utilisateur non connecté';
          this.isLoading = false;
        }
      },
      error: err => {
        this.error = 'Erreur lors du chargement de l\'utilisateur';
        this.isLoading = false;
      }
    });
  }

  private loadTasksData(): void {
    const propertyId = this.selectedPropertyId;
    const promoterId = this.currentUserId;

    if (!propertyId || !promoterId) {
      const missingData = [];
      if (!propertyId) missingData.push('Propriété (ID: ' + propertyId + ')');
      if (!promoterId) missingData.push('Utilisateur (ID: ' + promoterId + ')');
      
      this.error = `${missingData.join(' et ')} manquant`;
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.error = null;


    this.dashboardService.getTasksKPIs(propertyId, promoterId).subscribe({
      next: (data: any) => {
        this.tasksKPIs = data;
        this.isLoading = false;
        
        // Traiter les données si nécessaire
        this.processTasksKPIs(data);
      },
      error: (error) => {
        this.error = 'Erreur lors du chargement des KPIs';
        this.isLoading = false;
      }
    });
  }

  private processTasksKPIs(data: any): void {
    // Traiter les données KPIs pour mettre à jour les compteurs si nécessaire
    if (data) {
      this.enCoursCount = data.enCours || 0;
      this.enRetardCount = data.enRetard || 0;
      this.enAttenteCount = data.enAttente || 0;
      this.termineesCount = data.terminees || 0;
    }
  }

  // Méthode pour rafraîchir les données
  refreshData(): void {
    if (this.selectedPropertyId && this.currentUserId) {
      this.loadTasksData();
    } else {
    }
  }
}