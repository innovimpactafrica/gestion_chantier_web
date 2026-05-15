import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Subject, takeUntil, finalize } from 'rxjs';
import {
  CreateTaskRequest,
  UpdateTaskRequest,
  ProjectBudgetService,
  Task,
  TasksResponse
} from './../../../services/project-details.service';
import {
  UtilisateurService,
  Worker,
  WorkersResponse
} from './../../../services/utilisateur.service';

import {
  CommentFileService,
  Document,
  DocumentsResponse,
  JoinFileResponse,
  AddDocumentRequest
} from './../../../services/comment-file.service';
import { ActivatedRoute } from '@angular/router';
import { LanguageService } from '../../core/services/language.service';
import { environment } from '../../../environments/environment';

interface User {
  id: number;
  avatarUrl: string;
  name: string;
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
  id: 'TODO' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE';
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
  workers: Worker[] = [];

  // Form data
  newTask: Partial<Task> = {};
  updateTask: Partial<Task> = {};

  // UI state
  isEditMode = false;
  selectedTask: TaskDisplay | null = null;
  showTaskForm = false;
  showModal = false;
  showDetailModal = false;
  showCommentModal = false;
  showFileModal = false;
  loading = false;
  error: string | null = null;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  searchQuery: string = '';

  // Drag and drop state
  draggedTask: TaskDisplay | null = null;
  isDragging = false;
  dragOverColumn: string | null = null;
  isUpdatingTaskStatus = false;

  // Pagination pour les tâches
  currentPage = 0;
  pageSize = 50;
  totalTasks = 0;
  totalPages = 0;

  // Pagination interne pour chaque colonne (3 tâches visibles)
  columnPages: { [key: string]: number } = {
    'TODO': 0,
    'IN_PROGRESS': 0,
    'BLOCKED': 0,
    'DONE': 0
  };
  tasksPerColumn = 3;

  // File upload
  selectedFiles: File[] = [];

  // Property ID
  currentPropertyId: number = 17;

  // Task form
  currentTask: any = {
    id: null,
    title: '',
    description: '',
    priority: 'MEDIUM',
    startDate: this.getCurrentDateArray(),
    endDate: this.getCurrentDateArray(),
    realEstateProperty: { id: this.currentPropertyId },
    executors: [],
    status: 'TODO',
    pictures: []
  };

  // Comment & File modals
  currentTaskForComment: TaskDisplay | null = null;
  currentTaskForFile: TaskDisplay | null = null;
  comments: Document[] = [];
  loadingComments = false;
  commentPage = 0;
  commentPageSize = 10;
  totalComments = 0;
  newComment = {
    title: '',
    description: '',
    file: null as File | null
  };

  // File modal
  fileToJoin: File | null = null;
  fileLibelle: string = '';
  loadingFileJoin = false;

  // Worker auto-completion
  workerSearchKeyword: string = '';
  workerPage: number = 0;
  workerPageSize: number = 4;
  workerHasMore: boolean = false;
  workerLoading: boolean = false;
  availableWorkers: any[] = [];
  showWorkerDropdown: boolean = false;
  private workerSearchSubject = new Subject<string>();

  // Executor pagination in detail modal
  executorPage: number = 0;
  executorPageSize: number = 4; // 4 per row, showing 1 row at a time

  private destroy$ = new Subject<void>();

  constructor(
    private projectBudgetService: ProjectBudgetService,
    private utilisateurService: UtilisateurService,
    private commentFileService: CommentFileService,
    private route: ActivatedRoute,
    private languageService: LanguageService
  ) { }

  public t(key: string, params?: { [key: string]: string | number }): string {
    return this.languageService.translate(key, params);
  }

  setPropertyId(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.currentTask.realEstateProperty = { id: propertyId };
    this.loadTasks();
    this.loadWorkers();
  }

  initializeWithProperty(propertyId: number): void {
    this.currentPropertyId = propertyId;
    this.currentTask.realEstateProperty = { id: propertyId };
    this.initializeUsers();
    this.loadWorkers();
    this.loadTasks();
  }

  ngOnInit(): void {
    this.initializeUsers();
    this.resetCurrentTask();
    this.getPropertyIdFromRoute();
  }

  private getPropertyIdFromRoute(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.currentPropertyId = +idFromUrl;
      this.currentTask.realEstateProperty = { id: this.currentPropertyId };
      console.log('Property ID récupéré depuis l\'URL:', this.currentPropertyId);

      this.loadWorkers();
      this.loadTasks();
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
      this.error = "ID de propriété non trouvé dans l'URL.";
      this.initializeEmptyColumns();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initializeUsers(): void {
    this.users = [];
  }

  private loadWorkers(): void {
    if (this.workerLoading || !this.currentPropertyId) return;

    this.workerLoading = true;
    const apiPage = this.workerPage;

    this.utilisateurService.getWorkers(apiPage, this.workerPageSize, this.currentPropertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: WorkersResponse) => {
          if (apiPage === 0) {
            this.availableWorkers = response.content;
          } else {
            this.availableWorkers = [...this.availableWorkers, ...response.content];
          }
          this.workerHasMore = response.number < response.totalPages - 1;
          this.users = this.availableWorkers.map((worker: Worker) => ({
            id: worker.id,
            avatarUrl: worker.photo ? `${environment.filebaseUrl}${worker.photo}` : 'assets/images/profil.png',
            name: `${worker.prenom} ${worker.nom}`
          }));
          this.workerLoading = false;
        },
        error: (err: unknown) => {
          console.error('❌ Erreur lors du chargement des workers:', err);
          this.users = [];
          this.workerLoading = false;
        }
      });
  }

  get filteredAvailableWorkers(): Worker[] {
    if (!this.workerSearchKeyword.trim()) return this.availableWorkers;
    const kw = this.workerSearchKeyword.toLowerCase();
    return this.availableWorkers.filter((w: Worker) =>
      `${w.prenom} ${w.nom}`.toLowerCase().includes(kw) ||
      (w.email?.toLowerCase().includes(kw) ?? false)
    );
  }

  // Load more workers for infinite scroll
  loadMoreWorkers(): void {
    if (!this.workerLoading && this.workerHasMore) {
      this.workerPage++;
      this.loadWorkers();
    }
  }

  // Worker auto-completion methods
  onWorkerSearch(keyword: string): void {
    this.workerSearchKeyword = keyword;
    this.showWorkerDropdown = true;
  }

  selectWorker(worker: any): void {
    // Check if worker is already selected
    const isAlreadySelected = this.currentTask.executors.some((e: any) => e.id === worker.id);

    if (!isAlreadySelected) {
      // Add worker to executors
      this.currentTask.executors.push({
        id: worker.id,
        prenom: worker.prenom,
        nom: worker.nom,
        photo: worker.photo,
        profil: worker.profil,
        email: worker.email
      });
    }

    // Keep dropdown open for multiple selections
    // User can close it manually or by clicking outside
  }

  focusWorkerInput(): void {
    this.showWorkerDropdown = true;
    if (this.availableWorkers.length === 0) {
      this.loadWorkers();
    }
  }

  onWorkerScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const atBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (atBottom && this.workerHasMore && !this.workerLoading) {
      this.workerPage++;
      this.loadWorkers();
    }
  }

  isWorkerAlreadySelected(workerId: number): boolean {
    return this.currentTask.executors.some((e: any) => e.id === workerId);
  }

  resetWorkerSearch(): void {
    this.workerSearchKeyword = '';
    this.workerPage = 0;
    this.showWorkerDropdown = false;
    this.availableWorkers = [];
  }

  private mapWorkersToUsers(workers: Worker[]): User[] {
    return workers.map((worker) => {
      return {
        id: worker.id,
        avatarUrl: worker.photo ? `${environment.filebaseUrl}${worker.photo}` : 'assets/images/profil.png',
        name: `${worker.prenom} ${worker.nom}`
      };
    });
  }

  public getFileBaseUrl() {
    return `${environment.filebaseUrl}`;
  }
  private loadTasks(): void {
    if (!this.currentPropertyId) {
      console.warn('⚠️ Property ID not set, cannot load tasks');
      this.error = this.t('taskBoard.error.propertyNotSet') || 'ID de propriété non défini';
      this.initializeEmptyColumns();
      return;
    }

    this.loading = true;
    this.error = null;

    console.log('🔄 Chargement des tâches pour la propriété:', this.currentPropertyId);

    this.projectBudgetService.getTasks(this.currentPropertyId, this.currentPage, this.pageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response: TasksResponse) => {
          console.log('✅ Tâches chargées avec succès:', response);
          this.totalTasks = response.totalElements;
          this.totalPages = response.totalPages;
          this.organizeTasks(response.content);
          this.error = null;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des tâches:', error);

          let errorMsg = this.t('taskBoard.error.loadTasks') || 'Erreur lors du chargement des tâches';
          if (error.status === 404) {
            errorMsg = this.t('taskBoard.error.propertyNotFound') || 'Propriété non trouvée';
          } else if (error.status === 403) {
            errorMsg = this.t('taskBoard.error.accessDenied') || 'Accès refusé à cette propriété';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }

          this.error = errorMsg;
          this.errorMessage = errorMsg;
          this.initializeEmptyColumns();
        }
      });
  }

  forceRefreshTasks(): void {
    console.log('🔄 Rafraîchissement forcé des tâches...');
    this.loadTasks();
  }

  private organizeTasks(apiTasks: Task[]): void {
    const transformedTasks = apiTasks.map(task => this.transformApiTask(task));

    this.columns = [
      {
        id: 'TODO',
        title: this.t('taskBoard.column.TODO'),
        color: 'gray',
        count: transformedTasks.filter(t => t.status === 'TODO').length,
        tasks: transformedTasks.filter(t => t.status === 'TODO')
      },
      {
        id: 'IN_PROGRESS',
        title: this.t('taskBoard.column.IN_PROGRESS'),
        color: 'yellow-400',
        count: transformedTasks.filter(t => t.status === 'IN_PROGRESS').length,
        tasks: transformedTasks.filter(t => t.status === 'IN_PROGRESS')
      },
      {
        id: 'BLOCKED',
        title: this.t('taskBoard.column.BLOCKED'),
        color: 'red-400',
        count: transformedTasks.filter(t => t.status === 'BLOCKED').length,
        tasks: transformedTasks.filter(t => t.status === 'BLOCKED')
      },
      {
        id: 'DONE',
        title: this.t('taskBoard.column.DONE'),
        color: 'green-400',
        count: transformedTasks.filter(t => t.status === 'DONE').length,
        tasks: transformedTasks.filter(t => t.status === 'DONE')
      }
    ];
  }

  private initializeEmptyColumns(): void {
    this.columns = [
      { id: 'TODO', title: this.t('taskBoard.column.TODO'), color: 'gray', count: 0, tasks: [] },
      { id: 'IN_PROGRESS', title: this.t('taskBoard.column.IN_PROGRESS'), color: 'yellow-400', count: 0, tasks: [] },
      { id: 'BLOCKED', title: this.t('taskBoard.column.BLOCKED'), color: 'red-400', count: 0, tasks: [] },
      { id: 'DONE', title: this.t('taskBoard.column.DONE'), color: 'green-400', count: 0, tasks: [] }
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
      comments: 0,
      attachments: apiTask.pictures?.length || 0,
      dueDate: apiTask.endDate ? this.formatDate(apiTask.endDate) : 'N/A',
      isDone: apiTask.status === 'DONE'
    };
  }

  private getAssignedUsers(executors: any[]): User[] {
    if (!executors || executors.length === 0) return [];

    return executors.slice(0, 3).map((executor) => {
      const worker = this.workers.find(w => w.id === executor.id);
      if (worker) {
        return {
          id: worker.id,
          avatarUrl: worker.photo ? `${environment.filebaseUrl}${worker.photo}` : 'assets/images/profil.png',
          name: `${worker.prenom} ${worker.nom}`
        };
      }

      return {
        id: executor.id,
        avatarUrl: 'assets/images/profil.png',
        name: `Exécuteur ${executor.id}`
      };
    });
  }

  private getTagForTask(task: Task): TaskTag {
    const priorityTags: Record<string, TaskTag> = {
      'LOW': {
        name: this.t('taskBoard.priority.LOW'),
        colorClass: 'bg-blue-50',
        textColorClass: 'text-blue-500'
      },
      'MEDIUM': {
        name: this.t('taskBoard.priority.MEDIUM'),
        colorClass: 'bg-yellow-50',
        textColorClass: 'text-yellow-500'
      },
      'HIGH': {
        name: this.t('taskBoard.priority.HIGH'),
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

  public formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';

    try {
      const [year, month, day] = dateArray;
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('fr-FR');
    } catch {
      return 'N/A';
    }
  }

  private resetCurrentTask(): void {
    const now = new Date();
    const currentDateString = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    this.currentTask = {
      id: null,
      title: '',
      description: '',
      priority: 'MEDIUM',
      startDate: currentDateString,
      endDate: currentDateString,
      realEstateProperty: { id: this.currentPropertyId },
      executors: [],
      status: 'TODO',
      pictures: []
    };
  }

  // ================== PAGINATION PAR COLONNE ==================

  getVisibleTasks(column: TaskColumn): TaskDisplay[] {
    const startIndex = this.columnPages[column.id] * this.tasksPerColumn;
    const endIndex = startIndex + this.tasksPerColumn;
    return column.tasks.slice(startIndex, endIndex);
  }

  canScrollUp(columnId: string): boolean {
    return this.columnPages[columnId] > 0;
  }

  canScrollDown(column: TaskColumn): boolean {
    const maxPage = Math.ceil(column.tasks.length / this.tasksPerColumn) - 1;
    return this.columnPages[column.id] < maxPage;
  }

  scrollColumnUp(columnId: string): void {
    if (this.canScrollUp(columnId)) {
      this.columnPages[columnId]--;
    }
  }

  scrollColumnDown(column: TaskColumn): void {
    if (this.canScrollDown(column)) {
      this.columnPages[column.id]++;
    }
  }

  // ================== DRAG AND DROP METHODS ==================

  onDragStart(event: DragEvent, task: TaskDisplay): void {
    console.log('🎯 Début du drag de la tâche:', task.title);

    if (event.dataTransfer && task.id) {
      this.draggedTask = { ...task };
      this.isDragging = true;

      event.dataTransfer.setData('application/json', JSON.stringify({
        taskId: task.id,
        originalStatus: task.status,
        taskTitle: task.title
      }));
      event.dataTransfer.effectAllowed = 'move';

      if (event.target instanceof HTMLElement) {
        event.target.classList.add('dragging');
      }
    }
  }

  onDragEnd(event: DragEvent): void {
    console.log('🏁 Fin du drag');

    this.draggedTask = null;
    this.isDragging = false;
    this.dragOverColumn = null;

    if (event.target instanceof HTMLElement) {
      event.target.classList.remove('dragging');
    }
  }

  onDragOver(event: DragEvent, columnId?: string): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }

    if (columnId && this.isDragging) {
      this.dragOverColumn = columnId;
    }
  }

  onDragLeave(event: DragEvent, columnId: string): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;

    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      if (this.dragOverColumn === columnId) {
        this.dragOverColumn = null;
      }
    }
  }

  onDrop(event: DragEvent, targetStatus: string): void {
    event.preventDefault();
    event.stopPropagation();

    console.log('📥 Drop dans la colonne:', targetStatus);

    this.dragOverColumn = null;

    if (!event.dataTransfer) {
      console.warn('⚠️ Pas de dataTransfer disponible');
      return;
    }

    let dragData;
    try {
      const dataTransferText = event.dataTransfer.getData('application/json');
      if (!dataTransferText) {
        console.warn('⚠️ Pas de données disponibles dans dataTransfer');
        return;
      }
      dragData = JSON.parse(dataTransferText);
    } catch (error) {
      console.error('⚠️ Erreur lors de la parsing des données de drag:', error);
      return;
    }

    const { taskId, originalStatus, taskTitle } = dragData;

    if (!taskId || isNaN(Number(taskId))) {
      console.warn('⚠️ ID de tâche invalide:', taskId);
      return;
    }

    if (originalStatus === targetStatus) {
      console.log('ℹ️ La tâche est déjà dans cette colonne');
      return;
    }

    console.log('🔄 Changement de statut demandé:', originalStatus, '->', targetStatus);

    const task = this.findTaskById(Number(taskId));
    if (!task) {
      console.warn('⚠️ Tâche introuvable avec l\'ID:', taskId);
      return;
    }

    const originalTaskData = { ...task };
    this.updateTaskStatusLocally(task, targetStatus);
    this.updateTaskStatusOnServer(Number(taskId), targetStatus, originalTaskData, taskTitle);
  }

  private findTaskById(taskId: number): TaskDisplay | undefined {
    for (const column of this.columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) return task;
    }
    return undefined;
  }

  private updateTaskStatusLocally(task: TaskDisplay, newStatus: string): void {
    const oldStatus = task.status;

    const oldColumn = this.columns.find(col => col.id === oldStatus);
    if (oldColumn) {
      const taskIndex = oldColumn.tasks.findIndex(t => t.id === task.id);
      if (taskIndex > -1) {
        oldColumn.tasks.splice(taskIndex, 1);
        oldColumn.count = oldColumn.tasks.length;
      }
    }

    const newColumn = this.columns.find(col => col.id === newStatus);
    if (newColumn) {
      task.status = newStatus as any;
      task.isDone = newStatus === 'DONE';
      newColumn.tasks.push(task);
      newColumn.count = newColumn.tasks.length;
    }

    console.log('✅ Mise à jour locale terminée');
  }

  private updateTaskStatusOnServer(
    taskId: number,
    newStatus: string,
    originalTaskData: TaskDisplay,
    taskTitle: string
  ): void {
    if (this.isUpdatingTaskStatus) {
      console.log('⏳ Mise à jour déjà en cours...');
      return;
    }

    this.isUpdatingTaskStatus = true;

    console.log('📤 Envoi de la mise à jour au serveur:', { taskId, status: newStatus });

    this.projectBudgetService.updateTaskStatus(taskId, newStatus)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.isUpdatingTaskStatus = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Statut mis à jour avec succès sur le serveur:', response);
          this.successMessage = `Tâche "${taskTitle}" déplacée vers "${this.getStatusColumnTitle(newStatus)}"`;

          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour du statut:', error);

          let errorMsg = 'Erreur lors du déplacement de la tâche';
          if (error.status === 403) {
            errorMsg = 'Accès refusé. Vous n\'avez pas les permissions pour modifier cette tâche.';
          } else if (error.status === 404) {
            errorMsg = 'Tâche non trouvée.';
          } else if (error.status === 401) {
            errorMsg = 'Session expirée. Veuillez vous reconnecter.';
          } else if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }

          this.errorMessage = errorMsg;
          this.revertTaskStatusLocally(originalTaskData);

          setTimeout(() => {
            this.errorMessage = null;
          }, 5000);
        }
      });
  }

  private revertTaskStatusLocally(originalTaskData: TaskDisplay): void {
    console.log('🔄 Annulation du changement local...');

    const currentTask = this.findTaskById(originalTaskData.id!);
    if (currentTask) {
      const currentColumn = this.columns.find(col => col.tasks.includes(currentTask));
      if (currentColumn) {
        const taskIndex = currentColumn.tasks.indexOf(currentTask);
        if (taskIndex > -1) {
          currentColumn.tasks.splice(taskIndex, 1);
          currentColumn.count = currentColumn.tasks.length;
        }
      }

      const originalColumn = this.columns.find(col => col.id === originalTaskData.status);
      if (originalColumn) {
        Object.assign(currentTask, originalTaskData);
        originalColumn.tasks.push(currentTask);
        originalColumn.count = originalColumn.tasks.length;
      }
    } else {
      console.warn('Impossible de trouver la tâche pour l\'annulation, rechargement complet...');
      this.loadTasks();
    }
  }

  // ================== MODAL METHODS ==================

  openDetailModal(task: TaskDisplay): void {
    this.selectedTask = task;
    this.executorPage = 0;
    this.showDetailModal = true;
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.selectedTask = null;
  }

  openEditModal(task: TaskDisplay): void {
    this.isEditMode = true;
    this.currentTask = {
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      startDate: this.formatDateForInput(task.startDate),
      endDate: this.formatDateForInput(task.endDate),
      realEstateProperty: task.realEstateProperty,
      executors: [...task.executors],
      status: task.status,
      pictures: task.pictures || []
    };
    this.selectedFiles = [];
    this.error = null;
    this.showModal = true;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.resetCurrentTask();
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

  // ================== COMMENT MODAL METHODS ==================

  openCommentModal(task: TaskDisplay): void {
    this.currentTaskForComment = task;
    this.showCommentModal = true;
    this.loadComments();
  }

  closeCommentModal(): void {
    this.showCommentModal = false;
    this.currentTaskForComment = null;
    this.comments = [];
    this.newComment = {
      title: '',
      description: '',
      file: null
    };
  }

  private loadComments(): void {
    if (!this.currentPropertyId) return;

    this.loadingComments = true;

    this.commentFileService.getComment(this.currentPropertyId, this.commentPage, this.commentPageSize)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingComments = false;
        })
      )
      .subscribe({
        next: (response: DocumentsResponse) => {
          this.comments = response.content;
          this.totalComments = response.totalElements;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des commentaires:', error);
          this.errorMessage = 'Erreur lors du chargement des commentaires';
        }
      });
  }

  // Comment pagination
  get totalCommentPages(): number {
    return Math.ceil(this.totalComments / this.commentPageSize);
  }

  nextCommentPage(): void {
    if (this.commentPage < this.totalCommentPages - 1) {
      this.commentPage++;
      this.loadComments();
    }
  }

  prevCommentPage(): void {
    if (this.commentPage > 0) {
      this.commentPage--;
      this.loadComments();
    }
  }

  // Executor pagination in detail modal
  get totalExecutorPages(): number {
    if (!this.selectedTask?.executors) return 0;
    return Math.ceil(this.selectedTask.executors.length / this.executorPageSize);
  }

  get pagedExecutors(): any[] {
    if (!this.selectedTask?.executors) return [];
    const start = this.executorPage * this.executorPageSize;
    return this.selectedTask.executors.slice(start, start + this.executorPageSize);
  }

  nextExecutorPage(): void {
    if (this.executorPage < this.totalExecutorPages - 1) {
      this.executorPage++;
    }
  }

  prevExecutorPage(): void {
    if (this.executorPage > 0) {
      this.executorPage--;
    }
  }

  onCommentFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.newComment.file = file;
    }
  }

  submitComment(): void {
    if (!this.newComment.title || !this.newComment.description || !this.newComment.file) {
      this.error = 'Veuillez remplir tous les champs';
      return;
    }

    const commentData: AddDocumentRequest = {
      title: this.newComment.title,
      file: this.newComment.file,
      description: this.newComment.description,
      realEstatePropertyId: this.currentPropertyId,
      typeId: 1 // Vous pouvez ajuster ce typeId selon votre besoin
    };

    this.loadingComments = true;

    this.commentFileService.addComment(commentData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingComments = false;
        })
      )
      .subscribe({
        next: (response) => {
          this.successMessage = 'Commentaire ajouté avec succès';
          this.newComment = {
            title: '',
            description: '',
            file: null
          };
          this.loadComments();

          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de l\'ajout du commentaire:', error);
          this.errorMessage = 'Erreur lors de l\'ajout du commentaire';
        }
      });
  }

  // ================== FILE MODAL METHODS ==================

  openFileModal(task: TaskDisplay): void {
    this.currentTaskForFile = task;
    this.showFileModal = true;
  }

  closeFileModal(): void {
    this.showFileModal = false;
    this.currentTaskForFile = null;
    this.fileToJoin = null;
    this.fileLibelle = '';
  }

  onFileToJoinSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.fileToJoin = file;
    }
  }

  joinFileToTask(): void {
    if (!this.fileToJoin || !this.fileLibelle || !this.currentTaskForFile) {
      this.error = 'Veuillez sélectionner un fichier et renseigner un libellé';
      return;
    }

    this.loadingFileJoin = true;

    this.commentFileService.joinFile(this.currentTaskForFile.id!, this.fileLibelle, this.fileToJoin)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loadingFileJoin = false;
        })
      )
      .subscribe({
        next: (response: JoinFileResponse) => {
          this.successMessage = 'Fichier joint avec succès';
          this.fileToJoin = null;
          this.fileLibelle = '';
          this.closeFileModal();
          this.loadTasks(); // Recharger les tâches pour mettre à jour le compteur de fichiers

          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('Erreur lors de la jointure du fichier:', error);
          this.errorMessage = 'Erreur lors de la jointure du fichier';

          setTimeout(() => {
            this.errorMessage = null;
          }, 5000);
        }
      });
  }

  // Reste des méthodes dans le prochain artefact...
  // ================== HELPER METHODS ==================

  private formatDateFromInput(dateString: string): string {
    if (!dateString) {
      return this.formatDateForApi(this.getCurrentDateArray());
    }

    const parts = dateString.split('-');
    if (parts.length === 3) {
      return `${parts[1]}-${parts[2]}-${parts[0]}`;
    }

    return this.formatDateForApi(this.getCurrentDateArray());
  }

  private formatDateForInput(dateArray: number[] | string): string {
    if (typeof dateArray === 'string') {
      const parts = dateArray.split('-');
      if (parts.length === 3) {
        return `${parts[2]}-${parts[0]}-${parts[1]}`;
      }
      return dateArray;
    }

    if (!dateArray || dateArray.length < 3) {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const year = now.getFullYear();
      return `${year}-${month}-${day}`;
    }

    const [year, month, day] = dateArray;
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files) {
      this.selectedFiles = Array.from(files);
    }
  }

  validateTaskForm(): boolean {
    if (!this.currentTask.title?.trim()) {
      this.error = 'Le titre est requis';
      return false;
    }
    if (!this.currentTask.description?.trim()) {
      this.error = 'La description est requise';
      return false;
    }
    if (!this.currentTask.realEstateProperty?.id) {
      this.error = 'Propriété non définie';
      return false;
    }
    return true;
  }

  deleteTask(taskId: number): void {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette tâche ?')) {
      return;
    }

    this.loading = true;
    this.error = null;

    this.projectBudgetService.deleteTask(taskId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: () => {
          console.log('✅ Tâche supprimée avec succès');
          this.successMessage = 'Tâche supprimée avec succès';
          this.loadTasks();

          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la suppression de la tâche:', error);

          let errorMsg = 'Erreur lors de la suppression de la tâche';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }

          this.errorMessage = errorMsg;

          setTimeout(() => {
            this.errorMessage = null;
          }, 5000);
        }
      });
  }

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

  private formatDateForApi(dateArray: number[] | string): string {
    if (typeof dateArray === 'string') {
      return dateArray;
    }

    if (!dateArray || dateArray.length < 3) {
      const now = new Date();
      const month = (now.getMonth() + 1).toString().padStart(2, '0');
      const day = now.getDate().toString().padStart(2, '0');
      const year = now.getFullYear();
      return `${month}-${day}-${year}`;
    }

    const [year, month, day] = dateArray;
    return `${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}-${year}`;
  }

  resetForm(): void {
    this.closeModal();
    this.selectedFiles = [];
    this.resetCurrentTask();
  }

  clearError(): void {
    this.error = null;
    this.errorMessage = null;
  }

  clearSuccess(): void {
    this.successMessage = null;
  }

  refreshTasks(): void {
    this.loadTasks();
  }

  refreshWorkers(): void {
    this.loadWorkers();
  }

  getStatusColumnTitle(status: string): string {
    const statusMap: Record<string, string> = {
      'TODO': this.t('tasks.todo'),
      'IN_PROGRESS': this.t('tasks.inProgress'),
      'BLOCKED': this.t('tasks.blocked'),
      'DONE': this.t('tasks.done')
    };
    return statusMap[status] || status;
  }

  getPropertyDetails(propertyId: number): any {
    return {
      id: propertyId,
      name: `Propriété ${propertyId}`,
      address: 'Adresse non disponible',
      plan: 'Plan non disponible'
    };
  }

  getExecutorDetails(executor: any): string {
    if (!executor) return 'Exécuteur non défini';

    // Utiliser directement les données de l'executor (prenom et nom sont déjà dans l'objet)
    if (executor.prenom || executor.nom) {
      return `${executor.prenom || ''} ${executor.nom || ''}`.trim();
    }

    return `Exécuteur ${executor.id}`;
  }

  getPropertyInfo(task: Task): string {
    if (task.realEstateProperty) {
      return `${task.realEstateProperty.name} - ${task.realEstateProperty.address}`;
    }
    return 'Propriété non définie';
  }

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

  trackByUserId(index: number, user: User): number {
    return user.id;
  }

  closeTaskForm(): void {
    this.showTaskForm = false;
    this.resetForm();
  }

  saveTask(): void {
    if (!this.validateTaskForm()) {
      return;
    }

    this.loading = true;
    this.error = null;
    this.successMessage = null;

    const taskData: CreateTaskRequest = {
      title: this.currentTask.title.trim(),
      description: this.currentTask.description.trim(),
      priority: this.currentTask.priority,
      startDate: this.formatDateFromInput(this.currentTask.startDate),
      endDate: this.formatDateFromInput(this.currentTask.endDate),
      realEstatePropertyId: this.currentTask.realEstateProperty?.id || this.currentPropertyId,
      executorIds: this.currentTask.executors.map((executor: any) => executor.id) || [],
      pictures: this.currentTask.pictures || []
    };

    console.log('Task data to send:', taskData);

    if (this.selectedFiles.length > 0) {
      const filePromises = this.selectedFiles.map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e: any) => {
            resolve(e.target.result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      Promise.all(filePromises)
        .then(base64Files => {
          taskData.pictures = [...(taskData.pictures || []), ...base64Files];
          this.createOrUpdateTask(taskData);
        })
        .catch(error => {
          console.error('Error converting files to base64:', error);
          this.error = 'Erreur lors de la conversion des fichiers';
          this.loading = false;
        });
    } else {
      this.createOrUpdateTask(taskData);
    }
  }

  private getDefaultAvatar(index?: number): string {
    return 'assets/images/profil.png';
  }

  onExecutorChange(event: any): void {
    const selectedOptions = Array.from(event.target.selectedOptions) as HTMLOptionElement[];
    const selectedIds = selectedOptions.map(option => parseInt(option.value));

    this.currentTask.executors = selectedIds.map(id => ({ id }));
  }

  removeExecutor(userId: number): void {
    const index = this.currentTask.executors.findIndex((exec: any) => exec.id === userId);
    if (index > -1) {
      this.currentTask.executors.splice(index, 1);
    }
  }

  getUserAvatar(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user?.avatarUrl || 'assets/images/profil.png';
  }

  getUserName(userId: number): string {
    const user = this.users.find(u => u.id === userId);
    return user?.name || 'Utilisateur inconnu';
  }

  onImageError(event: Event): void {
    const imgElement = event.target as HTMLImageElement;
    imgElement.src = 'assets/images/profil.png';
  }

  private createOrUpdateTask(taskData: CreateTaskRequest): void {
    if (this.isEditMode && this.currentTask.id) {
      this.updateExistingTask(taskData);
    } else {
      this.projectBudgetService.createTask(taskData)
        .pipe(
          takeUntil(this.destroy$),
          finalize(() => {
            this.loading = false;
          })
        )
        .subscribe({
          next: (response) => {
            console.log('✅ Tâche créée avec succès:', response);
            this.successMessage = 'Tâche créée avec succès';
            this.closeModal();
            this.loadTasks();

            setTimeout(() => {
              this.successMessage = null;
            }, 3000);
          },
          error: (error) => {
            console.error('❌ Erreur lors de la création de la tâche:', error);

            let errorMsg = 'Erreur lors de la création de la tâche';
            if (error.error?.message) {
              errorMsg = error.error.message;
            } else if (error.message) {
              errorMsg = error.message;
            }

            this.error = errorMsg;
            this.errorMessage = errorMsg;
          }
        });
    }
  }

  removeFile(index: number): void {
    this.selectedFiles.splice(index, 1);
  }

  isUserSelected(userId: number): boolean {
    return this.currentTask.executors.some((exec: any) => exec.id === userId);
  }
  toggleWorkerSelection(worker: any): void {
  const index = this.currentTask.executors.findIndex((e: any) => e.id === worker.id);
  if (index > -1) {
    // Déjà sélectionné → on le retire
    this.currentTask.executors.splice(index, 1);
  } else {
    // Pas encore sélectionné → on l'ajoute
    this.currentTask.executors.push({
      id: worker.id,
      prenom: worker.prenom,
      nom: worker.nom,
      photo: worker.photo,
      profil: worker.profil,
      email: worker.email
    });
  }
}
closeWorkerDropdownOnOutsideClick(event: Event): void {
  const target = event.target as HTMLElement;
  if (!target.closest('.worker-dropdown-container')) {
    this.showWorkerDropdown = false;
  }
}

  toggleUserSelection(userId: number): void {
    const index = this.currentTask.executors.findIndex((exec: any) => exec.id === userId);
    if (index > -1) {
      this.currentTask.executors.splice(index, 1);
    } else {
      this.currentTask.executors.push({ id: userId });
    }
  }

  private updateExistingTask(taskData: CreateTaskRequest): void {
    if (!this.currentTask.id) {
      this.error = 'ID de tâche manquant';
      this.loading = false;
      return;
    }

    const updateData: UpdateTaskRequest = {
      title: taskData.title,
      description: taskData.description,
      priority: taskData.priority,
      startDate: taskData.startDate,
      endDate: taskData.endDate,
      status: this.currentTask.status,
      realEstatePropertyId: taskData.realEstatePropertyId,
      executorIds: taskData.executorIds,
      pictures: taskData.pictures
    };

    this.projectBudgetService.updateTask(this.currentTask.id, updateData)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe({
        next: (response) => {
          console.log('✅ Tâche mise à jour avec succès:', response);
          this.successMessage = 'Tâche mise à jour avec succès';
          this.closeModal();
          this.loadTasks();

          setTimeout(() => {
            this.successMessage = null;
          }, 3000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour de la tâche:', error);

          let errorMsg = 'Erreur lors de la mise à jour de la tâche';
          if (error.error?.message) {
            errorMsg = error.error.message;
          } else if (error.message) {
            errorMsg = error.message;
          }

          this.error = errorMsg;
          this.errorMessage = errorMsg;

          setTimeout(() => {
            this.errorMessage = null;
          }, 5000);
        }
      });
  }
}