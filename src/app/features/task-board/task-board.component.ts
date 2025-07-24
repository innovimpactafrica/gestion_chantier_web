import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import { 
  ProjectBudgetService, 
  Task, 
  TasksResponse 
} from './../../../services/project-details.service';

interface User {
  id: number;
  avatarUrl: string;
}

interface TaskTag {
  name: string;
  colorClass: string;
  textColorClass: string;
}

interface TaskDisplay extends Task {
  assignedUsers: User[];
  additionalUsers: number;
  tag: TaskTag;
  comments: number;
  attachments: number;
  dueDate: string;
  isDone?: boolean;
}

interface TaskColumn {
  id: string;
  title: string;
  color: string;
  count: number;
  tasks: TaskDisplay[];
}

@Component({
  selector: 'app-task-board',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './task-board.component.html',
  styleUrls: ['./task-board.component.scss']
})
export class TaskBoardComponent implements OnInit, OnDestroy {

  columns: TaskColumn[] = [];
  users: User[] = [];
  
  // Form data
  newTask: Partial<Task> = {};
  updateTask: Partial<Task> = {};
  
  // UI state
  isEditMode = false;
  selectedTask: TaskDisplay | null = null;
  showTaskForm = false;
  showModal = false;
  loading = false;
  error: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  
  // Pagination
  currentPage = 0; // API utilise 0 comme première page
  pageSize = 50;
  totalTasks = 0;
  totalPages = 0;

  // File upload
  selectedFiles: File[] = [];
  
  // Property ID (à adapter selon votre logique)
  currentPropertyId: number = 1; // Vous devrez récupérer cet ID depuis votre contexte

  // Task form
  currentTask: any = {
    id: null,
    title: '',
    description: '',
    priority: 'MEDIUM',
    startDate: null,
    endDate: null,
    realEstateProperty: null,
    executors: [],
    status: 'TODO',
    pictures: []
  };

  // Pour gérer la désinscription des observables
  private destroy$ = new Subject<void>();
correctionTask: TaskDisplay | undefined;
coulageTask: TaskDisplay | undefined;

  constructor(private projectBudgetService: ProjectBudgetService) { }

  // Méthode pour définir l'ID de la propriété
  setPropertyId(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.loadTasks();
  }

  // Méthode pour initialiser avec un ID de propriété spécifique
  initializeWithProperty(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.initializeUsers();
    this.loadTasks();
  }

  ngOnInit(): void {
    this.initializeUsers();
    // Ne pas charger les tâches automatiquement, attendre qu'un propertyId soit défini
    if (this.currentPropertyId) {
      this.loadTasks();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUsers(): void {
    // Mock users - remplacez par vos vraies données utilisateur
    this.users = [
      { id: 1, avatarUrl: 'assets/images/av1.png' },
      { id: 2, avatarUrl: 'assets/images/av2.png' },
      { id: 3, avatarUrl: 'assets/images/av3.png' },
      { id: 4, avatarUrl: 'assets/images/av4.png' }
    ];
  }

  private loadTasks(): void {
    if (!this.currentPropertyId) {
      console.warn('Property ID not set, cannot load tasks');
      this.error = 'ID de propriété non défini';
      this.initializeEmptyColumns();
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectBudgetService.getTasks(this.currentPropertyId, this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: TasksResponse) => {
          console.log('Tasks loaded:', response);
          this.totalTasks = response.totalElements;
          this.totalPages = response.totalPages;
          this.organizeTasks(response.content);
          this.error = null;
        },
        error: (error) => {
          console.error('Error loading tasks:', error);
          this.error = 'Erreur lors du chargement des tâches';
          this.errorMessage = `Impossible de charger les tâches: ${error.message || error}`;
          this.initializeEmptyColumns();
        }
      });
  }

  private organizeTasks(apiTasks: Task[]): void {
    // Transform API tasks to display format
    const transformedTasks = apiTasks.map(task => this.transformApiTask(task));

    this.columns = [
      {
        id: 'TODO',
        title: 'À faire',
        color: 'gray',
        count: transformedTasks.filter(t => t.status === 'TODO').length,
        tasks: transformedTasks.filter(t => t.status === 'TODO')
      },
      {
        id: 'IN_PROGRESS',
        title: 'En cours',
        color: 'yellow-400',
        count: transformedTasks.filter(t => t.status === 'IN_PROGRESS').length,
        tasks: transformedTasks.filter(t => t.status === 'IN_PROGRESS')
      },
      {
        id: 'COMPLETED',
        title: 'Terminé',
        color: 'green-400',
        count: transformedTasks.filter(t => t.status === 'COMPLETED').length,
        tasks: transformedTasks.filter(t => t.status === 'COMPLETED')
      }
    ];
  }

  private initializeEmptyColumns(): void {
    this.columns = [
      { id: 'TODO', title: 'À faire', color: 'gray', count: 0, tasks: [] },
      { id: 'IN_PROGRESS', title: 'En cours', color: 'yellow-400', count: 0, tasks: [] },
      { id: 'COMPLETED', title: 'Terminé', color: 'green-400', count: 0, tasks: [] }
    ];
  }

  private transformApiTask(apiTask: Task): TaskDisplay {
    return {
      id: apiTask.id,
      title: apiTask.title,
      description: apiTask.description,
      priority: apiTask.priority,
      status: apiTask.status,
      startDate: apiTask.startDate,
      endDate: apiTask.endDate,
      pictures: apiTask.pictures,
      realEstateProperty: apiTask.realEstateProperty,
      executors: apiTask.executors,
      assignedUsers: this.getAssignedUsers(apiTask.executors),
      additionalUsers: Math.max(0, apiTask.executors.length - 3),
      tag: this.getTagForTask(apiTask),
      comments: 0, // À implémenter selon votre logique
      attachments: apiTask.pictures?.length || 0,
      dueDate: apiTask.endDate ? this.formatDate(apiTask.endDate) : 'N/A',
      isDone: apiTask.status === 'COMPLETED'
    };
  }

  // Méthode pour récupérer les utilisateurs assignés à partir des executors
  private getAssignedUsers(executors: any[]): User[] {
    if (!executors || executors.length === 0) return [];
    
    return executors.slice(0, 3).map((executor, index) => ({
      id: executor.id,
      avatarUrl: this.users[index % this.users.length]?.avatarUrl || 'assets/images/default-avatar.png'
    }));
  }

  private getTagForTask(task: Task): TaskTag {
    const priorityTags: Record<string, TaskTag> = {
      'LOW': { 
        name: 'Basse priorité', 
        colorClass: 'bg-blue-50', 
        textColorClass: 'text-blue-500' 
      },
      'MEDIUM': { 
        name: 'Priorité moyenne', 
        colorClass: 'bg-yellow-50', 
        textColorClass: 'text-yellow-500' 
      },
      'HIGH': { 
        name: 'Haute priorité', 
        colorClass: 'bg-red-50', 
        textColorClass: 'text-red-500' 
      }
    };

    return priorityTags[task.priority] || { 
      name: 'Tâche', 
      colorClass: 'bg-gray-50', 
      textColorClass: 'text-gray-500' 
    };
  }

  private formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    
    try {
      // dateArray format: [year, month, day] (month is 1-based)
      const [year, month, day] = dateArray;
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
  }

  // Modal methods
  openModal(task?: Task) {
    if (task) {
      this.isEditMode = true;
      this.currentTask = {
        id: task.id,
        title: task.title,
        description: task.description,
        priority: task.priority,
        startDate: task.startDate,
        endDate: task.endDate,
        realEstateProperty: task.realEstateProperty,
        executors: [...task.executors],
        status: task.status,
        pictures: task.pictures || []
      };
    } else {
      this.isEditMode = false;
      this.currentTask = {
        id: null,
        title: '',
        description: '',
        priority: 'MEDIUM',
        startDate: this.getCurrentDateArray(),
        endDate: this.getCurrentDateArray(),
        realEstateProperty: null,
        executors: [],
        status: 'TODO',
        pictures: []
      };
    }
    this.selectedFiles = [];
    this.error = null;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.selectedTask = null;
    this.selectedFiles = [];
    this.error = null;
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  // File handling
  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  // Form validation
  validateTaskForm(): boolean {
    if (!this.currentTask.title?.trim()) {
      this.error = 'Le titre est requis';
      return false;
    }
    if (!this.currentTask.description?.trim()) {
      this.error = 'La description est requise';
      return false;
    }
    return true;
  }

  // Save task (Note: Vous devrez implémenter les méthodes de création/mise à jour dans le service)
  saveTask(): void {
    if (!this.validateTaskForm()) {
      return;
    }

    this.loading = true;
    this.error = null;

    // Pour l'instant, on simule la sauvegarde
    // Vous devrez ajouter des méthodes createTask et updateTask dans ProjectBudgetService
    setTimeout(() => {
      this.loading = false;
      this.loadTasks();
      this.resetForm();
      this.successMessage = this.isEditMode ? 'Tâche mise à jour avec succès' : 'Tâche créée avec succès';
    }, 1000);
  }

  // Edit task
  editTask(task: TaskDisplay): void {
    this.openModal(task);
  }

  // Delete task (Note: Vous devrez implémenter deleteTask dans le service)
  deleteTask(taskId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    this.loading = true;
    
    // Simulation de suppression
    setTimeout(() => {
      this.loading = false;
      this.loadTasks();
      this.successMessage = 'Tâche supprimée avec succès';
    }, 1000);
  }

  // Pagination
  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadTasks();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadTasks();
    }
  }

  // Utility methods
  private getCurrentDateArray(): number[] {
    const now = new Date();
    return [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  }

  private getCurrentDate(): string {
    const now = new Date();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const year = now.getFullYear();
    return `${year}-${month}-${day}`;
  }

  resetForm(): void {
    this.closeModal();
    this.selectedFiles = [];
  }

  clearError(): void {
    this.error = null;
    this.errorMessage = null;
  }

  clearSuccess(): void {
    this.successMessage = null;
  }

  // Refresh methods
  refreshTasks(): void {
    this.loadTasks();
  }

  // UI Helpers
  getStatusColumnTitle(status: string): string {
    const statusMap: Record<string, string> = {
      'TODO': 'À faire',
      'IN_PROGRESS': 'En cours',
      'COMPLETED': 'Terminé'
    };
    return statusMap[status] || status;
  }

  // Méthode pour récupérer les détails d'une propriété
  getPropertyDetails(propertyId: number): any {
    // Cette méthode pourrait être utile si vous avez besoin des détails de la propriété
    // Pour l'instant, on retourne un objet par défaut
    return {
      id: propertyId,
      name: `Propriété ${propertyId}`,
      address: 'Adresse non disponible',
      plan: 'Plan non disponible'
    };
  }

  // Méthode pour récupérer les informations d'un executor
  getExecutorDetails(executor: any): string {
    if (!executor) return 'Exécuteur non défini';
    return `${executor.prenom || ''} ${executor.nom || ''}`.trim() || `Exécuteur ${executor.id}`;
  }

  // Méthode pour formater les informations de propriété
  getPropertyInfo(task: Task): string {
    if (task.realEstateProperty) {
      return `${task.realEstateProperty.name} - ${task.realEstateProperty.address}`;
    }
    return 'Propriété non définie';
  }

  // Méthode pour obtenir le nom de la propriété
  getPropertyName(task?: Task): string {
    if (task?.realEstateProperty) {
      return task.realEstateProperty.name;
    }
    return `Propriété ${this.currentPropertyId}`;
  }

  getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      'LOW': 'Basse',
      'MEDIUM': 'Moyenne',
      'HIGH': 'Haute'
    };
    return labels[priority] || priority;
  }

  trackByColumnId(index: number, column: TaskColumn): string {
    return column.id;
  }

  trackByTaskId(index: number, task: TaskDisplay): number {
    return task.id!;
  }

  // Drag and drop
  onDragStart(event: DragEvent, task: TaskDisplay): void {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', task.id!.toString());
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
  }

  onDrop(event: DragEvent, targetStatus: string): void {
    event.preventDefault();
    
    if (event.dataTransfer) {
      const taskId = parseInt(event.dataTransfer.getData('text/plain'));
      const task = this.findTaskById(taskId);
      
      if (task && task.status !== targetStatus) {
        // Vous devrez implémenter updateTaskStatus dans le service
        this.updateTaskStatus(task, targetStatus);
      }
    }
  }

  private findTaskById(taskId: number): TaskDisplay | undefined {
    for (const column of this.columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  private updateTaskStatus(task: TaskDisplay, newStatus: string): void {
    // Simulation de mise à jour du statut
    task.status = newStatus as any;
    this.loadTasks();
  }

  // Close task form
  closeTaskForm(): void {
    this.showTaskForm = false;
    this.resetForm();
  }
}