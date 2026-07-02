import { Component, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  MilestoneService,
  Milestone,
  MilestoneItem,
  MilestonePhase,
  MilestonePhaseResponse,
  MilestoneSummaryResponse,
  MilestoneRequest,
  LotSimpleDto,
  BackendDate,
  MILESTONE_PHASES
} from '../../../services/milestone.service';
import { RealestateService } from '../../core/services/realestate.service';
import { AuthService } from '../auth/services/auth.service';
import { ToastService } from '../../core/services/toast.service';
import { LotService } from '../../../services/lot.service';
import { UserService, User } from '../../../services/user.service';

type MilestoneFilter = 'ALL' | MilestonePhase | 'REACHED' | 'LATE';
type MilestoneStatus = 'REACHED' | 'LATE' | 'IN_PROGRESS';

interface SelectableProperty {
  id: number;
  title: string;
}

/** État du formulaire création/édition : la phase démarre vide ("-- Choisir --") tant que l'utilisateur n'a pas choisi. */
interface MilestoneFormState {
  name: string;
  description: string;
  targetDate: string;
  phase: MilestonePhase | '';
}

@Component({
  selector: 'app-jalons',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './jalons.component.html',
  styleUrls: ['./jalons.component.css']
})
export class JalonsComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // ── Sélecteur de chantier ──
  properties: SelectableProperty[] = [];
  loadingProperties = false;
  selectedPropertyId: number | null = null;
  showProjectDropdown = false;
  showCenterDropdown = false;
  centerDropdownSearch = '';

  // ── Données ──
  loading = false;
  summary: MilestoneSummaryResponse | null = null;
  phases: MilestonePhaseResponse[] = [];

  readonly phaseOrder: MilestonePhase[] = MILESTONE_PHASES;

  // ── Filtres ──
  activeFilter: MilestoneFilter = 'ALL';

  // ── Modal création/édition ──
  showFormModal = false;
  savingForm = false;
  editingMilestoneId: number | null = null;
  form: MilestoneFormState = this.emptyForm();
  selectedLotIds: number[] = [];
  availableLots: LotSimpleDto[] = [];
  loadingForm = false;
  showLotPicker = false;

  // ── Sous-popup création de lot ──
  showCreateLotModal = false;
  createLotModalContext: 'form' | 'addLots' = 'form';

  // ── Création rapide d'un lot (quand aucun lot n'est disponible) — mêmes champs que
  // le popup de création de lot du détail chantier (lots-subcontractors.component) ──
  newLotName = '';
  newLotDescription = '';
  newLotStartDate = '';
  newLotEndDate = '';
  newLotSubcontractorId: number = 0;
  creatingLot = false;
  subcontractors: User[] = [];
  loadingSubcontractors = false;
  subcontractorSearch = '';
  showSubcontractorDropdown = false;
  filteredSubcontractors: User[] = [];

  // ── Modal détail ──
  showDetailModal = false;
  loadingDetail = false;
  detailMilestone: Milestone | null = null;

  // ── Modal "Ajouter des lots" ──
  showAddLotsModal = false;
  addLotsTargetId: number | null = null;
  addLotsTargetName = '';
  addLotsSelection: number[] = [];
  addLotsAvailable: LotSimpleDto[] = [];
  loadingAddLots = false;

  // ── Popup de confirmation ──
  showConfirmModal = false;
  confirmTitle = '';
  confirmMessage = '';
  confirmDanger = true;
  private confirmAction: (() => void) | null = null;

  private readonly phaseColors: Record<MilestonePhase, { badge: string; bar: string; dot: string }> = {
    GROS_OEUVRE: { badge: 'bg-green-100 text-green-700', bar: 'bg-green-500', dot: 'bg-green-500' },
    SECOND_OEUVRE: { badge: 'bg-blue-100 text-blue-700', bar: 'bg-blue-500', dot: 'bg-blue-500' },
    FINITION: { badge: 'bg-orange-100 text-orange-700', bar: 'bg-orange-500', dot: 'bg-orange-500' }
  };

  private readonly statusStyles: Record<MilestoneStatus, { badge: string; border: string; label: string }> = {
    REACHED: { badge: 'bg-green-100 text-green-700', border: 'border-l-green-500', label: '✓ Atteint' },
    LATE: { badge: 'bg-red-100 text-red-700', border: 'border-l-red-500', label: 'Retard' },
    IN_PROGRESS: { badge: 'bg-orange-100 text-orange-700', border: 'border-l-orange-500', label: 'En cours' }
  };

  constructor(
    private milestoneService: MilestoneService,
    private realestateService: RealestateService,
    private authService: AuthService,
    private toast: ToastService,
    private lotService: LotService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    this.loadProperties();
    this.loadSubcontractors();
  }

  /**
   * Source : GET /user/by-profil?profil=SUBCONTRACTOR — c'est ce qu'utilise déjà le module
   * "Lots & sous-traitants" (lots-subcontractors.component.ts) pour peupler ce même choix.
   * `LotService.getSubcontractors()` (api/workers/{managerId}/subcontractors) répond à un besoin
   * différent (sous-traitants déjà liés en tant que "workers") et renvoyait une liste vide ici.
   */
  private loadSubcontractors(): void {
    this.loadingSubcontractors = true;
    this.userService.getUserByProfil('SUBCONTRACTOR', undefined, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => { this.subcontractors = response.content || []; this.loadingSubcontractors = false; },
        error: () => { this.subcontractors = []; this.loadingSubcontractors = false; }
      });
  }

  getSubcontractorFullName(subcontractor: User): string {
    return `${subcontractor.prenom} ${subcontractor.nom}`.trim();
  }

  /** Reproduit le filtre du popup de création de lot (détail chantier) : nom, entreprise, téléphone. */
  filterSubcontractorsForNewLot(): void {
    const keyword = this.subcontractorSearch.trim().toLowerCase();
    if (!keyword) {
      this.filteredSubcontractors = [...this.subcontractors];
      this.showSubcontractorDropdown = true;
      return;
    }
    this.filteredSubcontractors = this.subcontractors.filter(sub =>
      this.getSubcontractorFullName(sub).toLowerCase().includes(keyword) ||
      (sub.company?.name || '').toLowerCase().includes(keyword) ||
      (sub.telephone || '').includes(this.subcontractorSearch)
    );
    this.showSubcontractorDropdown = this.filteredSubcontractors.length > 0;
  }

  selectSubcontractorForNewLot(sub: User): void {
    this.newLotSubcontractorId = sub.id;
    this.subcontractorSearch = this.getSubcontractorFullName(sub);
    this.showSubcontractorDropdown = false;
  }

  clearNewLotSubcontractor(): void {
    this.newLotSubcontractorId = 0;
    this.subcontractorSearch = '';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SÉLECTEUR DE CHANTIER
  // ═══════════════════════════════════════════════════════════════════════

  private loadProperties(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.loadingProperties = true;
    this.realestateService.getAllProjectsPaginated(userId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.properties = (response.content || []).map((p: any) => ({ id: p.id, title: p.title || p.name }));
          this.loadingProperties = false;
        },
        error: () => { this.loadingProperties = false; }
      });
  }

  onPropertyChange(): void {
    this.activeFilter = 'ALL';
    this.summary = null;
    this.phases = [];
    if (this.selectedPropertyId) {
      this.loadMilestonesData();
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.project-dropdown-container')) {
      this.showProjectDropdown = false;
    }
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.showProjectDropdown = false;
    this.showCenterDropdown = false;
    this.centerDropdownSearch = '';
  }

  openPropertySelector(): void {
    this.centerDropdownSearch = '';
    this.showCenterDropdown = true;
  }

  toggleProjectDropdown(): void {
    this.showProjectDropdown = !this.showProjectDropdown;
  }

  toggleCenterDropdown(): void {
    this.showCenterDropdown = !this.showCenterDropdown;
    if (this.showCenterDropdown) this.centerDropdownSearch = '';
  }

  selectProject(id: number | null): void {
    this.selectedPropertyId = id;
    this.showProjectDropdown = false;
    this.showCenterDropdown = false;
    this.centerDropdownSearch = '';
    this.onPropertyChange();
  }

  get filteredPropertiesForCenter(): SelectableProperty[] {
    if (!this.centerDropdownSearch.trim()) return this.properties;
    const q = this.centerDropdownSearch.toLowerCase();
    return this.properties.filter(p => p.title.toLowerCase().includes(q));
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CHARGEMENT DES JALONS (stats + colonnes de phase)
  // ═══════════════════════════════════════════════════════════════════════

  loadMilestonesData(): void {
    if (!this.selectedPropertyId) return;
    const propertyId = this.selectedPropertyId;
    this.loading = true;

    forkJoin({
      summary: this.milestoneService.getSummary(propertyId).pipe(catchError(() => of(null))),
      phases: this.milestoneService.getAllPhases(propertyId).pipe(catchError(() => of([])))
    }).pipe(takeUntil(this.destroy$)).subscribe(({ summary, phases }) => {
      this.summary = summary;
      this.phases = this.phaseOrder
        .map(phase => phases.find(p => p.phase === phase))
        .filter((p): p is MilestonePhaseResponse => !!p);
      this.loading = false;
    });
  }

  private refresh(): void {
    this.loadMilestonesData();
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FILTRES (instantanés, sans rechargement)
  // ═══════════════════════════════════════════════════════════════════════

  setFilter(filter: MilestoneFilter): void {
    this.activeFilter = filter;
  }

  get visiblePhases(): MilestonePhaseResponse[] {
    if (this.activeFilter === 'GROS_OEUVRE' || this.activeFilter === 'SECOND_OEUVRE' || this.activeFilter === 'FINITION') {
      return this.phases.filter(p => p.phase === this.activeFilter);
    }
    return this.phases;
  }

  visibleItems(phase: MilestonePhaseResponse): MilestoneItem[] {
    if (this.activeFilter === 'REACHED') return phase.milestones.filter(m => m.reached);
    if (this.activeFilter === 'LATE') return phase.milestones.filter(m => this.milestoneService.isLate(m));
    return phase.milestones;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // HELPERS D'AFFICHAGE
  // ═══════════════════════════════════════════════════════════════════════

  getPhaseLabel(phase: MilestonePhase): string {
    return this.milestoneService.getPhaseLabel(phase);
  }

  getPhaseColors(phase: MilestonePhase) {
    return this.phaseColors[phase];
  }

  getItemStatus(item: MilestoneItem): MilestoneStatus {
    if (item.reached) return 'REACHED';
    if (this.milestoneService.isLate(item)) return 'LATE';
    return 'IN_PROGRESS';
  }

  getStatusStyle(item: MilestoneItem) {
    return this.statusStyles[this.getItemStatus(item)];
  }

  formatDate(value: BackendDate | undefined | null): string {
    return this.milestoneService.formatDate(value);
  }

  /** Arrondit un pourcentage pour l'affichage (le backend peut renvoyer des décimales malgré un type int32 documenté). */
  round(value: number | undefined | null): number {
    return Math.round(value ?? 0);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MODAL CRÉATION / ÉDITION
  // ═══════════════════════════════════════════════════════════════════════

  private emptyForm(): MilestoneFormState {
    return { name: '', description: '', targetDate: '', phase: '' };
  }

  get selectedPropertyName(): string {
    if (!this.selectedPropertyId) return '-- Sélectionner un chantier --';
    return this.properties.find(p => p.id === this.selectedPropertyId)?.title || '-- Sélectionner un chantier --';
  }

  openCreateModal(): void {
    if (!this.selectedPropertyId) return;
    this.editingMilestoneId = null;
    this.form = this.emptyForm();
    this.selectedLotIds = [];
    this.showLotPicker = false;
    this.cancelCreateLotForm();
    this.loadingForm = true;
    this.showFormModal = true;

    this.milestoneService.getLotsWithoutMilestone(this.selectedPropertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lots) => { this.availableLots = lots; this.loadingForm = false; },
        error: () => { this.availableLots = []; this.loadingForm = false; }
      });
  }

  openEditModal(itemId: number): void {
    if (!this.selectedPropertyId) return;
    const propertyId = this.selectedPropertyId;
    this.editingMilestoneId = itemId;
    this.showLotPicker = false;
    this.cancelCreateLotForm();
    this.loadingForm = true;
    this.showFormModal = true;

    forkJoin({
      milestone: this.milestoneService.getById(itemId),
      freeLots: this.milestoneService.getLotsWithoutMilestone(propertyId).pipe(catchError(() => of([])))
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: ({ milestone, freeLots }) => {
        this.form = {
          name: milestone.name,
          description: milestone.description,
          targetDate: this.milestoneService.toInputDateString(milestone.targetDate),
          phase: milestone.phase
        };
        this.selectedLotIds = milestone.lots.map(l => l.id);

        const attached: LotSimpleDto[] = milestone.lots.map(l => ({ id: l.id, name: l.name }));
        this.availableLots = [...attached, ...freeLots.filter(fl => !attached.some(a => a.id === fl.id))];
        this.loadingForm = false;
      },
      error: (err) => {
        this.loadingForm = false;
        this.showFormModal = false;
        this.toast.showError(err.userMessage || 'Erreur lors du chargement du jalon');
      }
    });
  }

  closeFormModal(): void {
    this.showFormModal = false;
  }

  toggleLotSelection(lotId: number): void {
    const index = this.selectedLotIds.indexOf(lotId);
    if (index > -1) {
      this.selectedLotIds.splice(index, 1);
    } else {
      this.selectedLotIds.push(lotId);
    }
  }

  isLotSelected(lotId: number): boolean {
    return this.selectedLotIds.includes(lotId);
  }

  toggleLotPicker(): void {
    this.showLotPicker = !this.showLotPicker;
  }

  /** Lots encore proposables dans le picker (ceux déjà choisis sont retirés et affichés en chips). */
  get unselectedAvailableLots(): LotSimpleDto[] {
    return this.availableLots.filter(l => !this.selectedLotIds.includes(l.id));
  }

  getLotName(lotId: number): string {
    return this.availableLots.find(l => l.id === lotId)?.name || `Lot #${lotId}`;
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CRÉATION RAPIDE D'UN LOT (quand le picker n'a aucun lot disponible)
  // ═══════════════════════════════════════════════════════════════════════

  cancelCreateLotForm(): void {
    this.newLotName = '';
    this.newLotDescription = '';
    this.newLotStartDate = '';
    this.newLotEndDate = '';
    this.newLotSubcontractorId = 0;
    this.subcontractorSearch = '';
    this.showSubcontractorDropdown = false;
  }

  openCreateLotModal(context: 'form' | 'addLots'): void {
    this.createLotModalContext = context;
    this.cancelCreateLotForm();
    this.showCreateLotModal = true;
  }

  closeCreateLotModal(): void {
    this.showCreateLotModal = false;
    this.cancelCreateLotForm();
  }

  /** Conversion yyyy-MM-dd (input HTML type="date") -> dd-MM-yyyy attendu par l'API, identique à lots-subcontractors.component.ts */
  private formatDateForAPI(date: string): string {
    if (!date) return '';
    const parts = date.split('-');
    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}-${month}-${year}`;
    }
    return date;
  }

  /** Crée un lot (mêmes champs que le popup de création de lot du détail chantier) et l'ajoute au picker concerné. */
  createLotInline(targetList: 'form' | 'addLots'): void {
    if (!this.selectedPropertyId) return;
    if (!this.newLotName.trim()) {
      this.toast.showError('Le nom du lot est requis');
      return;
    }
    if (!this.newLotStartDate || !this.newLotEndDate) {
      this.toast.showError('Les dates de début et de fin sont requises');
      return;
    }
    if (!this.newLotSubcontractorId) {
      this.toast.showError('Veuillez sélectionner un sous-traitant');
      return;
    }

    this.creatingLot = true;
    this.lotService.createLot({
      name: this.newLotName.trim(),
      description: this.newLotDescription.trim(),
      startDate: this.formatDateForAPI(this.newLotStartDate),
      endDate: this.formatDateForAPI(this.newLotEndDate),
      realEstatePropertyId: this.selectedPropertyId,
      subcontractorId: this.newLotSubcontractorId
    }).pipe(takeUntil(this.destroy$)).subscribe({
      next: (lot) => {
        const simpleLot: LotSimpleDto = { id: lot.id, name: lot.name };
        this.creatingLot = false;
        this.showCreateLotModal = false;
        this.cancelCreateLotForm();

        if (targetList === 'form') {
          this.availableLots = [...this.availableLots, simpleLot];
          this.selectedLotIds.push(simpleLot.id);
          this.toast.showSuccess(`Lot "${simpleLot.name}" créé et ajouté à la sélection`);
        } else {
          // Modal "Ajouter des lots" : le lot vient d'être créé, on l'attache immédiatement au jalon.
          this.addLotsAvailable = [...this.addLotsAvailable, simpleLot];
          this.addLotsSelection.push(simpleLot.id);
          this.saveAddLots();
        }
      },
      error: (err) => {
        this.creatingLot = false;
        const backendMessage = err?.error?.message || err?.error?.error;
        this.toast.showError(backendMessage || err.userMessage || 'Erreur lors de la création du lot');
      }
    });
  }

  saveMilestone(): void {
    if (!this.selectedPropertyId) return;

    if (!this.form.name?.trim()) {
      this.toast.showError('Le nom du jalon est requis');
      return;
    }
    if (!this.form.phase) {
      this.toast.showError('Veuillez choisir une phase');
      return;
    }
    if (!this.form.targetDate) {
      this.toast.showError('La date cible est requise');
      return;
    }

    const request: MilestoneRequest = {
      name: this.form.name,
      description: this.form.description,
      targetDate: this.form.targetDate,
      phase: this.form.phase,
      lotIds: [...this.selectedLotIds]
    };
    this.savingForm = true;

    const request$ = this.editingMilestoneId
      ? this.milestoneService.update(this.editingMilestoneId, request)
      : this.milestoneService.create(this.selectedPropertyId, request);

    request$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.showSuccess(this.editingMilestoneId ? 'Jalon mis à jour' : 'Jalon créé avec succès');
        this.savingForm = false;
        this.closeFormModal();
        this.refresh();
      },
      error: (err) => {
        this.savingForm = false;
        this.toast.showError(err.userMessage || "Erreur lors de l'enregistrement du jalon");
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MODAL DÉTAIL
  // ═══════════════════════════════════════════════════════════════════════

  openDetailModal(itemId: number): void {
    this.showDetailModal = true;
    this.loadingDetail = true;
    this.detailMilestone = null;

    this.milestoneService.getById(itemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (milestone) => { this.detailMilestone = milestone; this.loadingDetail = false; },
        error: (err) => {
          this.loadingDetail = false;
          this.showDetailModal = false;
          this.toast.showError(err.userMessage || 'Erreur lors du chargement du jalon');
        }
      });
  }

  closeDetailModal(): void {
    this.showDetailModal = false;
    this.detailMilestone = null;
  }

  getDetailStatus(): MilestoneStatus {
    if (!this.detailMilestone) return 'IN_PROGRESS';
    if (this.detailMilestone.reached) return 'REACHED';
    if (this.milestoneService.isLate(this.detailMilestone)) return 'LATE';
    return 'IN_PROGRESS';
  }

  getDetailStatusStyle() {
    return this.statusStyles[this.getDetailStatus()];
  }

  /** % de lots terminés sur le jalon affiché en détail (0% si aucun lot, 100% si tous terminés). */
  get detailMilestoneLotsProgress(): number {
    const lots = this.detailMilestone?.lots ?? [];
    if (lots.length === 0) return 0;
    const completed = lots.filter(l => l.status === 'COMPLETED').length;
    return Math.round((completed / lots.length) * 100);
  }

  editFromDetail(): void {
    if (!this.detailMilestone) return;
    const id = this.detailMilestone.id;
    this.closeDetailModal();
    this.openEditModal(id);
  }

  // ═══════════════════════════════════════════════════════════════════════
  // AJOUTER DES LOTS
  // ═══════════════════════════════════════════════════════════════════════

  openAddLotsModal(itemId: number, itemName: string): void {
    if (!this.selectedPropertyId) return;
    this.addLotsTargetId = itemId;
    this.addLotsTargetName = itemName;
    this.addLotsSelection = [];
    this.cancelCreateLotForm();
    this.loadingAddLots = true;
    this.showAddLotsModal = true;

    this.milestoneService.getLotsWithoutMilestone(this.selectedPropertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (lots) => { this.addLotsAvailable = lots; this.loadingAddLots = false; },
        error: () => { this.addLotsAvailable = []; this.loadingAddLots = false; }
      });
  }

  closeAddLotsModal(): void {
    this.showAddLotsModal = false;
    this.addLotsTargetId = null;
  }

  toggleAddLotSelection(lotId: number): void {
    const index = this.addLotsSelection.indexOf(lotId);
    if (index > -1) {
      this.addLotsSelection.splice(index, 1);
    } else {
      this.addLotsSelection.push(lotId);
    }
  }

  isAddLotSelected(lotId: number): boolean {
    return this.addLotsSelection.includes(lotId);
  }

  saveAddLots(): void {
    if (!this.addLotsTargetId || this.addLotsSelection.length === 0) {
      this.toast.showError('Veuillez sélectionner au moins un lot');
      return;
    }

    const targetId = this.addLotsTargetId;
    this.milestoneService.addLots(targetId, [...this.addLotsSelection])
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (milestone) => {
          // La réponse PATCH renvoie déjà le jalon complet (lots inclus) : on l'utilise
          // directement pour le détail plutôt que de refaire un GET superflu.
          this.toast.showSuccess(`${milestone.lots.length} lot(s) au total sur ce jalon`);
          this.closeAddLotsModal();
          if (this.showDetailModal && this.detailMilestone?.id === targetId) {
            this.detailMilestone = milestone;
          }
          this.refresh();
        },
        error: (err) => this.toast.showError(err.userMessage || "Erreur lors de l'ajout des lots")
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // VÉRIFIER
  // ═══════════════════════════════════════════════════════════════════════

  checkMilestone(itemId: number, itemName: string): void {
    this.milestoneService.check(itemId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (milestone) => {
          if (milestone.reached) {
            this.toast.showSuccess(`Jalon "${itemName}" vérifié et marqué atteint`);
          } else {
            this.toast.showInfo(`Jalon "${itemName}" vérifié : critères non encore atteints`);
          }
          this.refresh();
          if (this.showDetailModal && this.detailMilestone?.id === itemId) {
            this.openDetailModal(itemId);
          }
        },
        error: (err) => this.toast.showError(err.userMessage || 'Erreur lors de la vérification du jalon')
      });
  }

  // ═══════════════════════════════════════════════════════════════════════
  // SUPPRESSION
  // ═══════════════════════════════════════════════════════════════════════

  deleteMilestone(itemId: number, itemName: string): void {
    this.askConfirmation(
      'Supprimer le jalon',
      `Supprimer le jalon "${itemName}" ? Cette action est irréversible.`,
      () => {
        this.milestoneService.delete(itemId)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.toast.showSuccess('Jalon supprimé');
              if (this.showDetailModal && this.detailMilestone?.id === itemId) {
                this.closeDetailModal();
              }
              this.refresh();
            },
            error: (err) => this.toast.showError(err.userMessage || 'Erreur lors de la suppression')
          });
      }
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // CONFIRMATION (remplace window.confirm)
  // ═══════════════════════════════════════════════════════════════════════

  private askConfirmation(title: string, message: string, action: () => void, danger: boolean = true): void {
    this.confirmTitle = title;
    this.confirmMessage = message;
    this.confirmDanger = danger;
    this.confirmAction = action;
    this.showConfirmModal = true;
  }

  confirmYes(): void {
    this.showConfirmModal = false;
    const action = this.confirmAction;
    this.confirmAction = null;
    if (action) action();
  }

  confirmNo(): void {
    this.showConfirmModal = false;
    this.confirmAction = null;
  }
}
