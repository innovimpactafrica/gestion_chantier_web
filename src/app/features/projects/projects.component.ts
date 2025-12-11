import { expand, takeWhile, reduce, takeUntil } from 'rxjs/operators';
import { 
  Component, 
  OnInit, 
  OnDestroy, 
  ChangeDetectionStrategy, 
  inject,
  signal,
  computed,
  effect,
  Input
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { 
  Subject, 
  Observable, 
  combineLatest, 
  merge,
  EMPTY,
  timer,
  of
} from 'rxjs';
import { 
  debounceTime, 
  distinctUntilChanged, 
  startWith, 
  switchMap, 
  catchError, 
  finalize, 
  map,
  tap,
  retry,
  timeout,
  shareReplay
} from 'rxjs/operators';

import { 
  RealestateService, 
  ProjectFilters, 
  PaginatedResponse 
} from '../../core/services/realestate.service';
import { environment } from '../../../environments/environment.prod';
import { FormatDatePipe } from '../../pipes/format-date.pipe';
import { AuthService } from '../auth/services/auth.service';
import { log } from 'console';
import { SubscriptionService } from '../../../services/subscription.service';

// Types et interfaces
interface ProjectListState {
  projects: any[];
  loading: boolean;
  error: string | null;
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  allProjectsLoaded: boolean;
  canLoadMore: boolean;
}

interface PaginationInfo {
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasMore: boolean;
  loadedCount: number;
  canLoadMore: boolean;
}

@Component({
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  selector: 'app-projects',
  templateUrl: './projects.component.html',
  styleUrls: ['./projects.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProjectsComponent implements OnInit, OnDestroy {
  [x: string]: any;
  imageName: any;
  currentImageIndex: number = 0;
  tabImagesApi: any[] = [];
  images: any[] = [];
  imageError = false;
  imageLoading = true;

  allProjects: any[] = [];
  isLoading: boolean = false;
  errorMessage: string = '';
  
  // Ajoutez Math pour le template
  readonly Math = Math;
  
  // Signal pour gérer l'affichage du popup de blocage
  private readonly showBlockedPopup = signal<boolean>(false);
  private readonly blockedProjectTitle = signal<string>('');

  // Computed signals pour le template
  readonly isBlockedPopupVisible = computed(() => this.showBlockedPopup());
  readonly blockedProjectName = computed(() => this.blockedProjectTitle());
  
  // Injection de dépendances 
  private readonly router = inject(Router);
  public readonly realestateService = inject(RealestateService);
  public readonly subscriptionService = inject(SubscriptionService);
  private readonly fb = inject(FormBuilder);
  private apiImagesService = inject(RealestateService);
  private readonly authservice = inject(AuthService);

  private readonly canCreateProjectSignal = signal<boolean>(false);
  private readonly isCheckingPermission = signal<boolean>(true);

  // Computed signal pour l'accès dans le template
  readonly canCreateProject = computed(() => this.canCreateProjectSignal());
  readonly checkingPermission = computed(() => this.isCheckingPermission());

  promoterId: number = 0;

  @Input() project: any;
  filebaseUrl = environment.filebaseUrl;

  // Configuration pour pagination dynamique
  private readonly DEFAULT_PAGE_SIZE = 6;
  private readonly SEARCH_DEBOUNCE_TIME = 300;
  private readonly REQUEST_TIMEOUT = 15000;
  private readonly MAX_RETRIES = 2;

  // Signals avec état de pagination amélioré
  private readonly stateSignal = signal<ProjectListState>({
    projects: [],
    loading: false,
    error: null,
    totalElements: 0,
    totalPages: 0,
    currentPage: 0,
    pageSize: this.DEFAULT_PAGE_SIZE,
    hasMore: true,
    allProjectsLoaded: false,
    canLoadMore: true
  });

  // Computed signals pour les vues
  readonly projects = computed(() => this.stateSignal().projects);
  readonly loading = computed(() => this.stateSignal().loading);
  readonly error = computed(() => this.stateSignal().error);
  readonly pagination = computed((): PaginationInfo => {
    const state = this.stateSignal();
    return {
      totalElements: state.totalElements,
      totalPages: state.totalPages,
      currentPage: state.currentPage,
      pageSize: state.pageSize,
      hasMore: state.hasMore,
      loadedCount: state.projects.length,
      canLoadMore: state.canLoadMore && !state.loading && !state.allProjectsLoaded
    };
  });

  // Subjects pour la gestion des événements
  private readonly searchSubject = new Subject<ProjectFilters>();
  private readonly loadMoreSubject = new Subject<void>();
  private readonly refreshSubject = new Subject<void>();
  private readonly destroy$ = new Subject<void>();

  // Options de configuration dynamique
  readonly pageSizeOptions = [2, 5, 10, 20] as const;

  constructor() {
    effect(() => {
      const state = this.stateSignal();
      if (state.error) {
        console.error('Erreur dans ProjectsComponent:', state.error);
      }
    });

    this.setupFormSubscription();
    this.setupDataFlow();
  }

  isValidplan(url: string): boolean {
    try {
      new URL(url);
      return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/') || url.startsWith('assets/');
    } catch {
      return false;
    }
  }

  ngOnInit(): void {
    this.getPromoteurConnecter();
  }
  
  getPromoteurConnecter(): void {
    this.updateState({ loading: true, error: null });
    
    this.authservice.getCurrentUser().pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(1),
      catchError(error => {
        console.error("Erreur lors de la récupération de l'utilisateur connecté:", error);
        this.updateState({ 
          loading: false, 
          error: "Impossible de récupérer les informations utilisateur" 
        });
        return EMPTY;
      }),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        console.log("Utilisateur connecté:", response);
        if (response && response.id) {
          this.promoterId = response.id;
          console.log("ID utilisateur connecté:", this.promoterId);
          
          // Vérifier les permissions de création de projet
          this.checkCanCreateProject();
          
          // Déclencher le chargement initial des projets
          this.searchSubject.next(this.mapFormToFilters(this.searchForm.value));
        } else {
          this.updateState({ 
            loading: false, 
            error: "ID utilisateur non trouvé" 
          });
        }
      },
      error: (error) => {
        console.error("Erreur finale:", error);
        this.updateState({ 
          loading: false, 
          error: "Erreur lors de la connexion utilisateur" 
        });
      }
    });
  }

  /**
   * Vérifie si l'utilisateur peut créer un nouveau projet
   */
  private checkCanCreateProject(): void {
    if (!this.promoterId || this.promoterId <= 0) {
      console.warn("Impossible de vérifier les permissions: ID promoteur invalide");
      this.canCreateProjectSignal.set(false);
      this.isCheckingPermission.set(false);
      return;
    }

    console.log("🔍 Vérification des permissions de création de projet pour userId:", this.promoterId);
    
    this.isCheckingPermission.set(true);

    this.subscriptionService.canCreateProject(this.promoterId).pipe(
      timeout(this.REQUEST_TIMEOUT),
      retry(1),
      catchError(error => {
        console.error("❌ Erreur lors de la vérification des permissions:", error);
        // En cas d'erreur, on considère que l'utilisateur ne peut pas créer
        this.canCreateProjectSignal.set(false);
        return of(false);
      }),
      finalize(() => this.isCheckingPermission.set(false)),
      takeUntil(this.destroy$)
    ).subscribe({
      next: (canCreate: boolean) => {
        console.log("✅ Permission de créer un projet:", canCreate);
        this.canCreateProjectSignal.set(canCreate);
      },
      error: (error) => {
        console.error("❌ Erreur finale lors de la vérification:", error);
        this.canCreateProjectSignal.set(false);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ============ CONFIGURATION DES FLUX DE DONNÉES POUR PAGINATION DYNAMIQUE ============

  private setupFormSubscription(): void {
    this.searchForm.valueChanges
      .pipe(
        takeUntilDestroyed(),
        debounceTime(this.SEARCH_DEBOUNCE_TIME),
        distinctUntilChanged(),
        map(this.mapFormToFilters),
        tap(() => this.resetPagination())
      )
      .subscribe(filters => this.searchSubject.next(filters));
  }

  private setupDataFlow(): void {
    // Flux pour recherche initiale et rafraîchissement
    const initialSearchFlow$ = merge(
      this.searchSubject.pipe(
        startWith(this.mapFormToFilters(this.searchForm.value)),
        map(filters => ({ filters, page: 0, isRefresh: true, isLoadMore: false }))
      ),
      
      this.refreshSubject.pipe(
        map(() => ({
          filters: this.mapFormToFilters(this.searchForm.value),
          page: 0,
          isRefresh: true,
          isLoadMore: false
        }))
      )
    );

    // Flux pour "Charger plus"
    const loadMoreFlow$ = this.loadMoreSubject.pipe(
      map(() => {
        const state = this.stateSignal();
        return {
          filters: this.mapFormToFilters(this.searchForm.value),
          page: state.currentPage + 1,
          isRefresh: false,
          isLoadMore: true
        };
      })
    );

    // Combinaison des flux
    merge(initialSearchFlow$, loadMoreFlow$)
      .pipe(
        takeUntil(this.destroy$),
        tap(({ isLoadMore }) => {
          if (!isLoadMore) {
            this.updateState({ loading: true, error: null });
          } else {
            this.updateState({ loading: true });
          }
        }),
        switchMap(({ filters, page, isRefresh, isLoadMore }) => 
          this.loadProjectsWithRetry(filters, page, isRefresh, isLoadMore)
        ),
        catchError(error => {
          console.error('Erreur dans le flux principal:', error);
          this.handleLoadError(error);
          return EMPTY;
        })
      )
      .subscribe();
  }

  // ============ CHARGEMENT DES DONNÉES AVEC PAGINATION DYNAMIQUE ============

  private loadProjectsWithRetry(
    filters: ProjectFilters, 
    page: number, 
    isRefresh: boolean = false,
    isLoadMore: boolean = false
  ): Observable<void> {
    if (!this.promoterId || this.promoterId <= 0) {
      console.warn("Tentative de chargement avec ID promoteur invalide:", this.promoterId);
      this.updateState({ 
        loading: false, 
        error: "ID promoteur invalide" 
      });
      return EMPTY;
    }

    return this.realestateService
      .getAllProjectsPaginated(this.promoterId, page, this.stateSignal().pageSize)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Tentative ${retryCount + 1}/${this.MAX_RETRIES + 1} échouée:`, error.message);
            return timer(1000 * Math.pow(2, retryCount));
          }
        }),
        map(response => this.processProjectsResponse(response, filters, page, isRefresh, isLoadMore)),
        catchError(error => this.handleLoadError(error)),
        finalize(() => this.updateState({ loading: false })),
        shareReplay(1)
      );
  }

  // ============ TRAITEMENT DE LA RÉPONSE AVEC PAGINATION DYNAMIQUE ============

  private processProjectsResponse(
    response: PaginatedResponse<any>,
    filters: ProjectFilters,
    page: number,
    isRefresh: boolean,
    isLoadMore: boolean
  ): void {
    // Filtrer les projets localement si nécessaire
    const newProjects = response.content || [];
    const filteredProjects = this.filterProjectsLocally(newProjects, filters);
    
    const currentState = this.stateSignal();
    
    let updatedProjects: any[];
    let newCurrentPage = page;
    
    if (isRefresh || page === 0) {
      // Nouveau chargement ou rafraîchissement
      updatedProjects = filteredProjects;
      newCurrentPage = 0;
    } else if (isLoadMore) {
      // Ajout de nouveaux projets à la liste existante
      updatedProjects = [...currentState.projects, ...filteredProjects];
      newCurrentPage = page;
    } else {
      updatedProjects = filteredProjects;
    }

    // Calcul des états de pagination
    const totalElements = response.totalElements ?? 0;
    const totalPages = response.totalPages ?? 0;
    const loadedCount = updatedProjects.length;
    
    // Vérifier s'il y a encore des données à charger
    const allProjectsLoaded = newProjects.length < this.stateSignal().pageSize || 
                              loadedCount >= totalElements ||
                              (response.last !== undefined && response.last);
    
    const canLoadMore = !allProjectsLoaded && totalElements > 0;
    const hasMore = !allProjectsLoaded;

    this.updateState({
      projects: updatedProjects,
      totalElements,
      totalPages,
      currentPage: newCurrentPage,
      hasMore,
      allProjectsLoaded,
      canLoadMore,
      loading: false,
      error: null
    });

    console.log(`Page ${page} chargée: ${filteredProjects.length} nouveaux projets. Total: ${loadedCount}/${totalElements}. Peut charger plus: ${canLoadMore}`);
  }

  // ============ MÉTHODES PUBLIQUES POUR LA PAGINATION DYNAMIQUE ============

  /**
   * Charger plus de projets (pagination dynamique)
   */
  loadMoreProjects(): void {
    const state = this.stateSignal();
    if (state.canLoadMore && !state.loading && !state.allProjectsLoaded) {
      this.loadMoreSubject.next();
    }
  }

  /**
   * Vérifier si on peut charger plus de projets
   */
  canLoadMore(): boolean {
    return this.pagination().canLoadMore;
  }

  /**
   * Changer la taille de page dynamiquement
   */
  changePageSize(newSize: number): void {
    if (newSize > 0 && newSize !== this.stateSignal().pageSize) {
      this.updateState({ 
        pageSize: newSize,
        currentPage: 0,
        projects: [],
        allProjectsLoaded: false,
        canLoadMore: true,
        hasMore: true
      });
      
      // Recharger avec la nouvelle taille
      this.searchSubject.next(this.mapFormToFilters(this.searchForm.value));
    }
  }

  /**
   * Obtenir les informations de pagination pour l'affichage
   */
  getPaginationInfo(): string {
    const paginationInfo = this.pagination();
    return `${paginationInfo.loadedCount} sur ${paginationInfo.totalElements} projets chargés`;
  }

  private handleLoadError(error: any): Observable<void> {
    let errorMessage = 'Une erreur inattendue s\'est produite.';
    
    if (error.error && typeof error.error === 'string' && error.error.includes('<!DOCTYPE')) {
      errorMessage = 'Le serveur retourne du HTML au lieu de JSON. Vérifiez la configuration de votre API.';
    } else if (error.name === 'TimeoutError') {
      errorMessage = 'Le serveur met trop de temps à répondre. Veuillez réessayer.';
    } else if (error.code === 'UND_ERR_CONNECT_TIMEOUT') {
      errorMessage = 'Impossible de contacter le serveur. Vérifiez votre connexion internet.';
    } else if (error.status === 0) {
      errorMessage = 'Problème de connectivité réseau. Vérifiez votre connexion et l\'URL de l\'API.';
    } else if (error.status >= 500) {
      errorMessage = 'Erreur serveur. Veuillez réessayer plus tard.';
    } else if (error.status >= 400) {
      errorMessage = 'Erreur de requête. Veuillez vérifier les paramètres.';
    }

    console.error('Erreur détaillée:', error);
    
    this.updateState({
      loading: false,
      error: errorMessage,
      canLoadMore: false
    });

    return EMPTY;
  }

  // ============ GESTION D'ÉTAT ============

  private resetPagination(): void {
    this.updateState({
      currentPage: 0,
      projects: [],
      totalElements: 0,
      totalPages: 0,
      hasMore: true,
      allProjectsLoaded: false,
      canLoadMore: true
    });
  }

  private updateState(partialState: Partial<ProjectListState>): void {
    this.stateSignal.update(currentState => ({
      ...currentState,
      ...partialState
    }));
  }

  // ============ MÉTHODES EXISTANTES (inchangées) ============

  // Formulaire et recherche
  readonly searchForm = this.fb.group({
    search: [''],
    status: ['all'],
    period: ['all']
  });

  private mapFormToFilters = (formValue: any): ProjectFilters => ({
    search: formValue?.search?.trim() || undefined,
    status: formValue?.status !== 'all' ? formValue.status : undefined,
    period: formValue?.period !== 'all' ? formValue.period : undefined
  });

  private filterProjectsLocally(projects: any[], filters: ProjectFilters): any[] {
    if (!projects?.length) return [];

    return projects.filter(project => {
      if (filters.search && !this.matchesSearchTerm(project, filters.search)) {
        return false;
      }
      if (filters.status && !this.matchesStatus(project, filters.status)) {
        return false;
      }
      if (filters.period && !this.matchesPeriod(project, filters.period)) {
        return false;
      }
      return true;
    });
  }

  private matchesSearchTerm(project: any, searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    return [
      project.title,
      project.location,
      project.address
    ].some(field => field?.toLowerCase().includes(term));
  }

  private matchesStatus(project: any, status: string): boolean {
    switch (status) {
      case 'active': return project.available;
      case 'inactive': return !project.available;
      case 'completed': return project.progress >= 100;
      case 'in-progress': return project.progress > 0 && project.progress < 100;
      default: return true;
    }
  }

  private matchesPeriod(project: any, period: string): boolean {
    const currentYear = new Date().getFullYear();
    const projectYear = this.extractYearFromDate(project.startDate);

    switch (period) {
      case 'current-year': return projectYear === currentYear;
      case 'last-year': return projectYear === currentYear - 1;
      case 'older': return projectYear < currentYear - 1;
      default: return true;
    }
  }

  private extractYearFromDate(dateString: string): number {
    try {
      const parts = dateString.split('.');
      if (parts.length === 3) {
        let year = parseInt(parts[2], 10);
        if (year < 50) year += 2000;
        else if (year < 100) year += 1900;
        return year;
      }
    } catch (error) {
      console.warn('Erreur extraction année:', dateString, error);
    }
    return new Date().getFullYear();
  }

  onSearch(): void {
    this.searchSubject.next(this.mapFormToFilters(this.searchForm.value));
  }

  onClearSearch(): void {
    this.searchForm.reset({
      search: '',
      status: 'all',
      period: 'all'
    });
  }

  onPageSizeChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    if (!target?.value) return;
    const size = parseInt(target.value, 10);
    this.changePageSize(size);
  }

  onRefresh(): void {
    this.refreshSubject.next();
  }

  onProjectClick(project: any): void {
    if (!project || !project.id) {
      return;
    }
  
    // Vérifier si le projet est bloqué
    if (project.blocked === true) {
      console.warn('⚠️ Projet bloqué:', project.title);
      this.blockedProjectTitle.set(project.title || 'Ce projet');
      this.showBlockedPopup.set(true);
      return;
    }
  
    // Si le projet n'est pas bloqué, naviguer normalement
    this.router.navigate(['/detailprojet', project.id]);
  }
  
  /**
   * Ferme le popup de projet bloqué
   */
  closeBlockedPopup(): void {
    this.showBlockedPopup.set(false);
    this.blockedProjectTitle.set('');
  }
  
  /**
   * Redirige vers la page d'abonnement depuis le popup
   */
  goToSubscription(): void {
    this.closeBlockedPopup();
    this.router.navigate(['/mon-compte']);
  }
  
  /**
   * Vérifie si un projet est bloqué
   */
  isProjectBlocked(project: any): boolean {
    return project?.blocked === true;
  }
  
  /**
   * Obtient la classe CSS pour un projet bloqué
   */
  getProjectCardClass(project: any): string {
    const baseClass = 'bg-white rounded-[10px] overflow-hidden shadow-md cursor-pointer hover:shadow-lg transition-shadow duration-300 w-full max-w-[410px] mx-auto h-full';
    
    if (this.isProjectBlocked(project)) {
      return `${baseClass} opacity-60 cursor-not-allowed hover:shadow-md`;
    }
    
    return baseClass;
  }
  
  onImageLoad(event: Event): void {
    console.log('Image chargée avec succès:', (event.target as HTMLImageElement).src);
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/architecte.png';
  }

  // Méthodes utilitaires pour le template
  trackByProjectId = (index: number, project: any): number => project.id;

  getStatusClass(project: any): string {
    if (!project.available) return 'status-inactive';
    if (project.progress >= 100) return 'status-completed';
    if (project.progress > 0) return 'status-in-progress';
    return 'status-pending';
  }
  
  // Dans votre composant
  getLoadingPercentage(): number {
    const totalElements = this.pagination().totalElements;
    const loadedCount = this.pagination().loadedCount;
    
    if (totalElements === 0) return 0;
    return Math.round((loadedCount / totalElements) * 100);
  }

  goToPreviousPage(): void {
    const currentState = this.stateSignal();
    if (currentState.currentPage > 0) {
      const targetPage = currentState.currentPage - 1;
      console.log(`Navigation vers la page précédente: ${targetPage + 1}`);
      this.loadSpecificPage(targetPage);
    } else {
      console.log("Déjà sur la première page");
    }
  }

  goToNextPage(): void {
    const currentState = this.stateSignal();
    if (currentState.currentPage < currentState.totalPages - 1) {
      const targetPage = currentState.currentPage + 1;
      this.loadSpecificPage(targetPage);
    }
  }

  // Nouvelle méthode pour charger une page spécifique
  private loadSpecificPage(page: number): void {
    if (!this.promoterId || this.promoterId <= 0) {
      console.warn("ID promoteur invalide:", this.promoterId);
      return;
    }

    console.log(`Chargement de la page ${page + 1}...`);

    // Mettre à jour l'état pour indiquer le chargement
    this.updateState({ 
      loading: true, 
      error: null 
    });

    const filters = this.mapFormToFilters(this.searchForm.value);
    
    this.realestateService
      .getAllProjectsPaginated(this.promoterId, page, this.stateSignal().pageSize)
      .pipe(
        timeout(this.REQUEST_TIMEOUT),
        retry({
          count: this.MAX_RETRIES,
          delay: (error, retryCount) => {
            console.warn(`Tentative ${retryCount + 1}/${this.MAX_RETRIES + 1} échouée:`, error.message);
            return timer(1000 * Math.pow(2, retryCount));
          }
        }),
        tap((response) => {
          console.log(`Page ${page + 1} chargée avec succès, response:`, response);
          this.processSpecificPageResponse(response, filters, page);
        }),
        catchError(error => this.handleLoadError(error)),
        finalize(() => this.updateState({ loading: false })),
        takeUntil(this.destroy$)
      )
      .subscribe({
        next: () => {
          console.log(`Navigation vers la page ${page + 1} terminée`);
        },
        error: (error) => {
          console.error(`Erreur lors du chargement de la page ${page + 1}:`, error);
        }
      });
  }

  // Nouvelle méthode spécifique pour traiter la réponse d'une page donnée
  private processSpecificPageResponse(
    response: PaginatedResponse<any>,
    filters: ProjectFilters,
    page: number
  ): void {
    const newProjects = this.filterProjectsLocally(response.content || [], filters);
    
    // Pour la navigation par pages, on remplace complètement les projets
    const updatedProjects = newProjects;

    // Calcul des états de pagination
    const totalElements = response.totalElements ?? 0;
    const totalPages = response.totalPages ?? 0;
    
    // Mise à jour de l'état avec la nouvelle page
    this.updateState({
      projects: updatedProjects,
      totalElements,
      totalPages,
      currentPage: page,
      hasMore: page < totalPages - 1,
      allProjectsLoaded: false,
      canLoadMore: false, // Désactiver le "charger plus" en mode pagination normale
      loading: false,
      error: null
    });

    console.log(`Page ${page + 1} traitée: ${updatedProjects.length} projets. Total: ${totalElements}, Pages: ${totalPages}`);
  }

  // Méthode utilitaire pour obtenir le nombre total de pages
  getTotalPages(): number {
    return this.pagination().totalPages;
  }

  // Méthode utilitaire pour vérifier si on peut naviguer vers la page précédente
  canGoPrevious(): boolean {
    return this.pagination().currentPage > 0;
  }

  // Méthode utilitaire pour vérifier si on peut naviguer vers la page suivante
  canGoNext(): boolean {
    const pag = this.pagination();
    return pag.currentPage < pag.totalPages - 1;
  }

  // Méthode pour aller directement à une page spécifique (utile pour une pagination numérotée)
  goToPage(page: number): void {
    const currentState = this.stateSignal();
    if (page >= 0 && page < currentState.totalPages && page !== currentState.currentPage) {
      this.loadSpecificPage(page);
    }
  }

  getProgressBarClass(progress: number): string {
    if (progress < 30) return 'progress-low';
    if (progress < 70) return 'progress-medium';
    return 'progress-high';
  }

  formatProgress = (progress: number): string => `${progress}%`;
  getGradientBackground = (progress: number): string => 'linear-gradient(90deg, #F39C12 0%, #FF5C02 100%)';
  safeGetValue = (value: any): any => value ?? null;
  isDefined = <T>(value: T | undefined | null): value is T => value !== undefined && value !== null;
}