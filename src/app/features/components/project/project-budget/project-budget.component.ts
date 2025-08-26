// project-budget.component.ts
import {
  Component, OnInit, ElementRef, ViewChild, Inject, PLATFORM_ID
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { Chart, registerables } from 'chart.js';
import { ProjectBudgetService, BudgetResponse, Expense, ExpensesResponse, CreateExpenseRequest } from '../../../../../services/project-details.service';

Chart.register(...registerables);

@Component({
  selector: 'app-project-budget',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-budget.component.html',
  styleUrls: ['./project-budget.component.css']
})
export class ProjectBudgetComponent implements OnInit {
  @ViewChild('budgetChart') chartCanvas!: ElementRef<HTMLCanvasElement>;

  projectId!: number;
  budgetId!: number;
  budgetPrevu = 0;
  budgetUtilise = 0;
  budgetRestant = 0;
  error: string | null = null;
  loading = true;
  
  expenses: Expense[] = [];
  showExpenseModal = false;
  showBudgetModal = false;
  showConfirmModal = false;
  isEditingExpense = false;
  expenseToDelete: Expense | null = null;
  currentPage = 0;
  totalPages = 0;
  pageSize = 10;

  newExpense: CreateExpenseRequest = {
    description: '',
    date: '',
    amount: 0,
    budgetId: 0
  };
  
  editingExpense: Expense | null = null;
  
  budgetToEdit = {
    plannedBudget: 0
  };

  private chart: Chart | null = null;
  private isBrowser: boolean;

  constructor(
    private route: ActivatedRoute,
    private budgetService: ProjectBudgetService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.projectId = +idFromUrl;
      this.fetchBudgetData();
    } else {
      this.error = 'Projet introuvable';
      this.loading = false;
    }
  }

  fetchBudgetData(): void {
    this.loading = true;
    this.budgetService.GetProjectBudget(this.projectId).subscribe({
      next: (data: BudgetResponse) => {
        console.log('Réponse budget complète:', data);
        
        if (data.id && (typeof data.id === 'number' || typeof data.id === 'string')) {
          this.budgetId = Number(data.id);
        } else {
          console.error('ID du budget manquant ou invalide dans la réponse:', data);
          this.error = "ID du budget manquant dans la réponse du serveur";
          this.loading = false;
          return;
        }

        this.budgetPrevu = data.plannedBudget;
        this.budgetUtilise = data.consumedBudget;
        this.budgetRestant = data.remainingBudget;
        this.budgetToEdit.plannedBudget = data.plannedBudget;
        
        this.newExpense.budgetId = this.budgetId;
        this.loading = false;
        
        this.fetchExpenses();
        
        if (this.isBrowser) {
          setTimeout(() => this.renderChart(), 100);
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement du budget:', error);
        this.error = "Erreur lors du chargement du budget";
        this.loading = false;
      }
    });
  }

  fetchExpenses(): void {
    if (!this.budgetId) {
      console.warn('budgetId non défini, impossible de récupérer les dépenses');
      this.error = "ID du budget non défini";
      return;
    }
    
    this.budgetService.getDepense(this.budgetId, this.currentPage, this.pageSize).subscribe({
      next: (response: ExpensesResponse) => {
        this.expenses = response.content;
        this.totalPages = response.totalPages;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des dépenses:', error);
        this.error = "Erreur lors du chargement des dépenses";
      }
    });
  }

  // Méthodes pour calculer les pourcentages
  getBudgetUtilisePercentage(): number {
    if (this.budgetPrevu === 0) return 0;
    return Math.round((this.budgetUtilise / this.budgetPrevu) * 100);
  }

  getBudgetRestantPercentage(): number {
    if (this.budgetPrevu === 0) return 0;
    return Math.round((this.budgetRestant / this.budgetPrevu) * 100);
  }

  // Gestion du budget
  openBudgetModal(): void {
    this.showBudgetModal = true;
    this.error = null;
  }

  closeBudgetModal(): void {
    this.showBudgetModal = false;
    this.budgetToEdit.plannedBudget = this.budgetPrevu;
  }

  saveBudget(): void {
    if (this.budgetToEdit.plannedBudget <= 0) {
      this.error = "Le budget doit être supérieur à 0";
      return;
    }
  
    this.loading = true;
    
    this.budgetService.putBudget(this.budgetId, this.budgetToEdit.plannedBudget).subscribe({
      next: (data: BudgetResponse) => {
        this.handleBudgetUpdateSuccess(data);
      },
      error: (error) => {
        this.handleBudgetUpdateError(error);
      }
    });
  }
  
  private handleBudgetUpdateSuccess(data: BudgetResponse): void {
    this.budgetId = data.id;
    this.budgetPrevu = data.plannedBudget;
    this.budgetUtilise = data.consumedBudget;
    this.budgetRestant = data.remainingBudget;
    this.loading = false;
    this.closeBudgetModal();
    
    if (this.isBrowser) {
      setTimeout(() => this.renderChart(), 100);
    }
  }
  
  private handleBudgetUpdateError(error: any): void {
    console.error('Erreur lors de la mise à jour du budget:', error);
    
    if (error.status === 403) {
      this.error = "Vous n'avez pas les droits pour modifier ce budget";
    } else {
      this.error = "Erreur lors de la mise à jour du budget";
    }
    
    this.loading = false;
  }

  // Gestion des dépenses
  openExpenseModal(): void {
    this.showExpenseModal = true;
    this.isEditingExpense = false;
    this.editingExpense = null;
    this.resetExpenseForm();
    this.error = null;
  }

  openEditExpenseModal(expense: Expense): void {
    this.showExpenseModal = true;
    this.isEditingExpense = true;
    this.editingExpense = expense;
    this.newExpense = {
      description: expense.description,
      date: this.formatDateForInput(expense.date),
      amount: expense.amount,
      budgetId: this.budgetId
    };  
    this.error = null;
  }

  closeExpenseModal(): void {
    this.showExpenseModal = false;
    this.isEditingExpense = false;
    this.editingExpense = null;
    this.resetExpenseForm();
  }

  resetExpenseForm(): void {
    this.newExpense = {
      description: '',
      date: '',
      amount: 0,
      budgetId: this.budgetId
    };
  }


  confirmDeleteExpense(expense: Expense): void {
    this.expenseToDelete = expense;
    this.showConfirmModal = true;
  }

  deleteExpense(): void {
    if (!this.expenseToDelete) return;

    this.loading = true;
    this.budgetService.deleteDepense(this.expenseToDelete.id).subscribe({
      next: () => {
        this.loading = false;
        this.closeConfirmModal();
        this.fetchExpenses();
        this.fetchBudgetData();
      },
      error: (error) => {
        console.error('Erreur lors de la suppression de la dépense:', error);
        this.error = "Erreur lors de la suppression de la dépense";
        this.loading = false;
      }
    });
  }
  // project-budget.component.ts


// Méthode saveExpense corrigée dans project-budget.component.ts
saveExpense(): void {
  // Validation des données
  if (!this.validateExpenseForm()) {
    return;
  }

  // S'assurer que le budgetId est correctement défini
  this.newExpense.budgetId = this.budgetId;

  // CORRECTION: Créer un objet pour l'envoi avec la date formatée pour l'API
  const expenseToSend = {
    ...this.newExpense,
    // Convertir la date de yyyy-MM-dd (input HTML) vers dd-MM-yyyy (API)
    date: this.formatDateForAPI(this.newExpense.date)
  };

  this.loading = true;
  this.error = null;

  console.log('Données envoyées:', expenseToSend);

  // CORRECTION: Vérifier le token avant d'envoyer la requête
  this.budgetService.checkAuthToken();

  if (this.isEditingExpense && this.editingExpense) {
    this.updateExpenseWithFormattedDate(expenseToSend);
  } else {
    this.createExpenseWithFormattedDate(expenseToSend);
  }
}

// NOUVELLE MÉTHODE: Formater la date pour l'API
private formatDateForAPI(dateString: string): string {
  // dateString est au format yyyy-MM-dd (depuis l'input HTML)
  const [year, month, day] = dateString.split('-');
  // Retourner au format dd-MM-yyyy pour l'API
  return `${month}-${day}-${year}`;
}

// NOUVELLE MÉTHODE: Vérifier l'authentification avant l'envoi
private checkAuthenticationBeforeSubmit(): boolean {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  
  if (!token) {
    this.error = "Aucun token d'authentification trouvé. Veuillez vous reconnecter.";
    this.loading = false;
    return false;
  }
  
  console.log('Token présent:', token.substring(0, 20) + '...');
  return true;
}

// Méthode validateExpenseForm corrigée


// Méthode createExpense avec gestion d'erreur améliorée
private createExpenseWithFormattedDate(expenseData: any): void {
  this.budgetService.createDepense(expenseData).subscribe({
    next: (response) => {
      console.log('Dépense créée avec succès:', response);
      this.loading = false;
      this.closeExpenseModal();
      this.fetchExpenses();
      this.fetchBudgetData();
    },
    error: (error) => {
      console.error('Erreur lors de la création de la dépense:', error);
      this.loading = false;
      
      // CORRECTION: Gestion spécifique des erreurs
      if (error.includes('403') || error.includes('Forbidden')) {
        this.error = "Vous n'avez pas les droits pour créer une dépense. Vérifiez votre connexion.";
      } else if (error.includes('401')) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.includes('400')) {
        this.error = "Données invalides. Vérifiez les informations saisies.";
      } else {
        this.error = "Erreur lors de la création de la dépense. Veuillez réessayer.";
      }
    }
  });
}

// Méthode updateExpense avec gestion d'erreur améliorée
private updateExpenseWithFormattedDate(expenseData: any): void {
  if (!this.editingExpense) return;

  this.budgetService.putDepense(this.editingExpense.id, expenseData).subscribe({
    next: (response) => {
      console.log('Dépense modifiée avec succès:', response);
      this.loading = false;
      this.closeExpenseModal();
      this.fetchExpenses();
      this.fetchBudgetData();
    },
    error: (error) => {
      console.error('Erreur lors de la modification de la dépense:', error);
      this.loading = false;
      
      // CORRECTION: Gestion spécifique des erreurs
      if (error.includes('403') || error.includes('Forbidden')) {
        this.error = "Vous n'avez pas les droits pour modifier cette dépense.";
      } else if (error.includes('401')) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.includes('404')) {
        this.error = "Dépense introuvable.";
      } else {
        this.error = "Erreur lors de la modification de la dépense. Veuillez réessayer.";
      }
    }
  });
}
// Méthode validateExpenseForm corrigée
private validateExpenseForm(): boolean {
  if (!this.newExpense.description.trim()) {
    this.error = "La description est obligatoire";
    return false;
  }
  if (!this.newExpense.date) {
    this.error = "La date est obligatoire";
    return false;
  }
  if (this.newExpense.amount <= 0) {
    this.error = "Le montant doit être supérieur à 0";
    return false;
  }
  if (!this.budgetId) {
    this.error = "Budget non défini";
    return false;
  }
  return true;
}

// Méthode createExpense avec gestion d'erreur améliorée
private createExpense(): void {
  this.budgetService.createDepense(this.newExpense).subscribe({
    next: (response) => {
      console.log('Dépense créée avec succès:', response);
      this.loading = false;
      this.closeExpenseModal();
      this.fetchExpenses();
      this.fetchBudgetData();
    },
    error: (error) => {
      console.error('Erreur lors de la création de la dépense:', error);
      this.loading = false;
      
      // CORRECTION: Gestion spécifique des erreurs
      if (error.includes('403') || error.includes('Forbidden')) {
        this.error = "Vous n'avez pas les droits pour créer une dépense. Vérifiez votre connexion.";
      } else if (error.includes('401')) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.includes('400')) {
        this.error = "Données invalides. Vérifiez les informations saisies.";
      } else {
        this.error = "Erreur lors de la création de la dépense. Veuillez réessayer.";
      }
    }
  });
}

// Méthode updateExpense avec gestion d'erreur améliorée
private updateExpense(): void {
  if (!this.editingExpense) return;

  this.budgetService.putDepense(this.editingExpense.id, this.newExpense).subscribe({
    next: (response) => {
      console.log('Dépense modifiée avec succès:', response);
      this.loading = false;
      this.closeExpenseModal();
      this.fetchExpenses();
      this.fetchBudgetData();
    },
    error: (error) => {
      console.error('Erreur lors de la modification de la dépense:', error);
      this.loading = false;
      
      // CORRECTION: Gestion spécifique des erreurs
      if (error.includes('403') || error.includes('Forbidden')) {
        this.error = "Vous n'avez pas les droits pour modifier cette dépense.";
      } else if (error.includes('401')) {
        this.error = "Session expirée. Veuillez vous reconnecter.";
      } else if (error.includes('404')) {
        this.error = "Dépense introuvable.";
      } else {
        this.error = "Erreur lors de la modification de la dépense. Veuillez réessayer.";
      }
    }
  });
}
  closeConfirmModal(): void {
    this.showConfirmModal = false;
    this.expenseToDelete = null;
  }

  // Pagination
  changePage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.fetchExpenses();
    }
  }

  // Graphique avec pourcentages
 // Méthode renderChart() modifiée pour afficher les pourcentages sur les segments
renderChart(): void {
  if (!this.chartCanvas || !this.isBrowser) return;

  const ctx = this.chartCanvas.nativeElement.getContext('2d');
  if (!ctx) return;

  if (this.chart) {
    this.chart.destroy();
  }

  const utilisePercentage = this.getBudgetUtilisePercentage();
  const restantPercentage = this.getBudgetRestantPercentage();

  this.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Utilisé', 'Restant'],
      datasets: [{
        data: [this.budgetUtilise, this.budgetRestant],
        backgroundColor: ['#10B981', '#F97316'], // Vert et Orange
        borderWidth: 3,
        borderColor: '#ffffff'
      }]
    },
    options: {
      cutout: '60%', // Augmenté pour avoir plus d'espace pour le texte central
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: (context) => {
              const percentage = context.dataIndex === 0 ? utilisePercentage : restantPercentage;
              return `${context.label}: ${this.formatCurrency(context.raw as number)} (${percentage}%)`;
            }
          }
        }
      }
    },
    plugins: [{
      id: 'segmentLabels',
      afterDatasetsDraw: (chart) => {
        const ctx = chart.ctx;
        const meta = chart.getDatasetMeta(0);
        
        meta.data.forEach((arc: any, index: number) => {
          const percentage = index === 0 ? utilisePercentage : restantPercentage;
          
          // Calculer la position du cercle blanc sur l'arc
          const angle = arc.startAngle + (arc.endAngle - arc.startAngle) / 2;
          const radius = (arc.innerRadius + arc.outerRadius) / 2;
          
          const x = arc.x + Math.cos(angle) * radius;
          const y = arc.y + Math.sin(angle) * radius;
          
          ctx.save();
          
          // Dessiner le cercle blanc
          const circleRadius = 18; // Rayon du cercle blanc
          ctx.beginPath();
          ctx.arc(x, y, circleRadius, 0, 2 * Math.PI);
          ctx.fillStyle = '#ffffff';
          ctx.fill();
          
          // Ajouter une bordure légère au cercle
          ctx.strokeStyle = '#E5E7EB';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Afficher le pourcentage dans le cercle
          ctx.font = 'bold 12px Arial';
          ctx.fillStyle = index === 0 ? '#10B981' : '#F97316'; // Couleur du texte selon le segment
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${percentage}%`, x, y);
          
          ctx.restore();
        });
      }
    }, {
      id: 'centerText',
      beforeDraw: (chart) => {
        const ctx = chart.ctx;
        const centerX = chart.width / 2;
        const centerY = chart.height / 2;

        ctx.save();
        ctx.font = 'bold 16px Arial';
        ctx.fillStyle = '#374151';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Texte principal au centre - montant total utilisé
        ctx.fillText(this.formatCurrency(this.budgetUtilise), centerX, centerY - 8);
        
        // Texte secondaire
        ctx.font = '11px Arial';
        ctx.fillStyle = '#6B7280';
        ctx.fillText('Utilisé', centerX, centerY + 8);
        
        ctx.restore();
      }
    }]
  });
}

  formatCurrency(value: number): string {
    return `${value.toLocaleString()} F`;
  }

  getFormattedDate(date: number[]): string {
    if (Array.isArray(date) && date.length >= 3) {
      const d = new Date(date[0], date[1] - 1, date[2]);
      return d.toLocaleDateString('fr-FR');
    }
    return '';
  }

  formatDateForInput(date: number[]): string {
    if (Array.isArray(date) && date.length >= 3) {
      const year = date[0];
      const month = date[1].toString().padStart(2, '0');
      const day = date[2].toString().padStart(2, '0');
      return `${year}-${month}-${day}`;
    }
    return '';
  }

  get pageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }
} 