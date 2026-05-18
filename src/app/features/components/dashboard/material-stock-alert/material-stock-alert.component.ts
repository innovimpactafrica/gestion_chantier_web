// import { Component, Input } from '@angular/core';
// import { CommonModule } from '@angular/common';

// // Définition de l'interface pour le stock de matériaux
// // Cette interface définit la structure des données de stock de matériaux

// export interface MaterialStockItem {
//   nom: string;
//   quantite: number;
//   seuil: number;
//   pourcentage: number;
//   status: string;
// }
// @Component({
//   selector: 'app-stock-alerts',
//   templateUrl: './material-stock-alert.component.html',
//   styleUrls: ['./material-stock-alert.component.css'],
//   // Utilisation de CommonModule pour les directives Angular
//   standalone: true,
//   imports: [CommonModule]
// })
// export class MaterialStockAlertComponent {
//   @Input()  stockItems: MaterialStockItem[] = [];
  
//   // Méthode pour déterminer la classe de couleur en fonction du statut
//   getStatusClass(status: string): string {
//     switch (status) {
//       case 'Critique atteint':
//         return 'text-red-500';
//       case 'Faible':
//         return 'text-amber-500';
//       case 'Normal':
//         return 'text-green-500';
//       default:
//         return 'text-gray-500';
//     }
//   }
  
//   // Méthode pour déterminer la classe de couleur de la barre de progression
//   getProgressBarClass(status: string): string {
//     switch (status) {
//       case 'Critique atteint':
//         return 'bg-red-500';
//       case 'Faible':
//         return 'bg-amber-500';
//       case 'Normal':
//         return 'bg-green-500';
//       default:
//         return 'bg-gray-500';
//     }
//   }
// }

// Définition d'interface pour le MaterialStockAlert component
export interface MaterialStockItem {
  nom: string;
  quantite: number;
  seuil: number;
  pourcentage: number;
  status: string;
}

import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DahsboardService } from '../../../../core/services/dahsboard.service';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'app-material-stock-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './material-stock-alert.component.html',
  styleUrl: './material-stock-alert.component.css'

  
})
export class MaterialStockAlertComponent {
  @Input() stockItems: any[] = [];

  criticalMaterials: any[] = [];
  loading = false;
  error: string | null = null;

  constructor(private dahsbordService: DahsboardService
, private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadCriticalMaterials();
  }

  private loadCriticalMaterials(): void {
    this.loading = true;
    this.error = null;

    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user || !user.id) {
          this.error = 'Utilisateur non connecté';
          this.loading = false;
          return;
        }

        const promoterId = user.id;

        this.dahsbordService.getCriticalMaterials(promoterId).subscribe({
          next: (data: any) => {
            this.criticalMaterials = data?.content || data || [];
            this.loading = false;
          },
          error: () => {
            this.error = 'Erreur de chargement';
            this.loading = false;
          }
        });
      },
      error: () => {
        this.error = 'Erreur lors de la récupération de l\'utilisateur';
        this.loading = false;
      }
    });
  }
}

