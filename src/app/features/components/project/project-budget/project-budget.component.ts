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
    // Formatage manuel de la date en jj-mm-yyyy
const dateObj = new Date(this.newExpense.date);
const jour = String(dateObj.getDate()).padStart(2, '0');
const mois = String(dateObj.getMonth() + 1).padStart(2, '0');
const annee = dateObj.getFullYear();
this.newExpense.date = `${jour}-${mois}-${annee}`;

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
        console.log('ID du budget:', data.id);
        console.log('Type de l\'ID:', typeof data.id);
        
        // Vérification que l'ID existe et est valide
        if (data.id && (typeof data.id === 'number' || typeof data.id === 'string')) {
          this.budgetId = Number(data.id);
          console.log('budgetId assigné:', this.budgetId);
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
        
        // Mise à jour du budgetId pour les nouvelles dépenses
        this.newExpense.budgetId = this.budgetId;
        
        this.loading = false;
        
        // Maintenant qu'on a le budgetId, on peut récupérer les dépenses
        this.fetchExpenses();
        
        // Rendu du graphique
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
    // Vérification que le budgetId est bien défini
    if (!this.budgetId) {
      console.warn('budgetId non défini, impossible de récupérer les dépenses');
      this.error = "ID du budget non défini";
      return;
    }
    
    console.log('Récupération des dépenses pour budgetId:', this.budgetId);
    
    this.budgetService.getDepense(this.budgetId, this.currentPage, this.pageSize).subscribe({
      next: (response: ExpensesResponse) => {
        console.log('Réponse des dépenses:', response);
        console.log('Nombre de dépenses:', response.content.length);
        
        this.expenses = response.content;
        this.totalPages = response.totalPages;
        
        if (this.expenses.length === 0) {
          console.log('Aucune dépense trouvée pour ce budget');
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des dépenses:', error);
        this.error = "Erreur lors du chargement des dépenses";
      }
    });
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
    
    // Envoyez directement le montant plutôt qu'un objet
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
      budgetId: this.budgetId // Utiliser le budgetId du composant
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
      budgetId: this.budgetId // Utiliser le budgetId du composant
    };
  }

  saveExpense(): void {
    if (!this.newExpense.description.trim()) {
      this.error = "La description est obligatoire";
      return;
    }
    if (!this.newExpense.date) {
      this.error = "La date est obligatoire";
      return;
    }
    if (this.newExpense.amount <= 0) {
      this.error = "Le montant doit être supérieur à 0";
      return;
    }
  
    // S'assurer que le budgetId est correct
    console.log('budgetId avant sauvegarde:', this.budgetId);
    this.newExpense.budgetId = this.budgetId;
  
    // 👉 Formater la date au format jj-mm-yyyy
    const dateObj = new Date(this.newExpense.date);
    const jour = String(dateObj.getDate()).padStart(2, '0');
    const mois = String(dateObj.getMonth() + 1).padStart(2, '0');
    const annee = dateObj.getFullYear();
    this.newExpense.date = `${jour}-${mois}-${annee}`;
  
    this.loading = true;
  
    if (this.isEditingExpense && this.editingExpense) {
      // Modification
      this.budgetService.putDepense(this.editingExpense.id, this.newExpense).subscribe({
        next: () => {
          this.loading = false;
          this.closeExpenseModal();
          this.fetchExpenses();
          this.fetchBudgetData(); // Rafraîchir le budget pour les montants
        },
        error: (error) => {
          console.error('Erreur lors de la modification de la dépense:', error);
          this.error = "Erreur lors de la modification de la dépense";
          this.loading = false;
        }
      });
    } else {
      // Création
      this.budgetService.createDepense(this.newExpense).subscribe({
        next: () => {
          this.loading = false;
          this.closeExpenseModal();
          this.fetchExpenses();
          this.fetchBudgetData(); // Rafraîchir le budget pour les montants
        },
        error: (error) => {
          console.error('Erreur lors de la création de la dépense:', error);
          this.error = "Erreur lors de la création de la dépense";
          this.loading = false;
        }
      });
    }
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
        this.fetchBudgetData(); // Rafraîchir le budget pour les montants
      },
      error: (error) => {
        console.error('Erreur lors de la suppression de la dépense:', error);
        this.error = "Erreur lors de la suppression de la dépense";
        this.loading = false;
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

  // Utilitaires
  renderChart(): void {
    if (!this.chartCanvas || !this.isBrowser) return;

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    if (this.chart) {
      this.chart.destroy();
    }

    this.chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Utilisé', 'Restant'],
        datasets: [{
          data: [this.budgetUtilise, this.budgetRestant],
          backgroundColor: ['#10B981', '#F97316'],
          borderWidth: 1
        }]
      },
      options: {
        cutout: '70%',
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.label}: ${this.formatCurrency(context.raw as number)}`
            }
          }
        }
      }
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