import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MaterialsService, MaterialsResponse, Order, CreateOrder, CreateStockMovement } from '../../../../../services/materials.service';
import { MaterialTypeService, MaterialType } from '../../../../../services/material-type.service';
import { CommonModule } from '@angular/common';
import { UnitParameterService } from '../../../../core/services/unite-parametre.service';
import { UnitParameter, PaginatedResponse } from '../../../../models/unit-parameter';
import { PropertyTypeService } from '../../../../core/services/property-type.service';
import { PropertyType } from '../../../../models/property-type';
import { StatistiqueComponent } from '../../statistique/statistique.component';
import { DashboardService, CriticalMaterial } from '../../../../../services/dashboard.service';
import { ActivatedRoute } from '@angular/router';
import { UserService, User } from '../../../../../services/user.service';
import { StatistiqueService, EvolutionData, ConsommationData } from '../../../../../services/statistique.service';
import { Chart } from 'chart.js';
import { CommandeService, Quote, QuoteResponse } from '../../../../../services/commande.service';
import { ToastService } from '../../../../core/services/toast.service';
import { LanguageService } from '../../../../core/services/language.service';




Chart.defaults.font.family = "'Inter', 'Segoe UI', sans-serif";
Chart.defaults.font.size = 12;
Chart.defaults.color = '#7F8C8D';


interface StockAlerte {
  id: number;
  nom: string;
  quantiteActuelle: number;
  seuil: number;
  unite: string;
  status: 'Normal' | 'Faible' | 'Critique atteint';
  pourcentage: number;
  materialId: number;
}
interface Supplier {
  id: number;
  prenom: string;
  nom: string;
  telephone: string;
}


interface Unit {
  id: number;
  label: string;
  code: string;
  hasStartDate: boolean;
  hasEndDate: boolean;
  type: string;
}

interface Property {
  id: number;
  name: string;
  number: string;
  address: string;
}

interface Material {
  id: number;
  label: string;
  quantity: number;
  criticalThreshold: number;
  createdAt: number[];
  unit: Unit;
  property: Property;
  materialType?: MaterialType;
}

interface CreateMaterial {
  materialTypeId: number;
  quantity: number;
  criticalThreshold: number;
  unitId: number;
  propertyId: number;
}

interface StockAlert {
  id: number;
  message: string;
  createdAt: Date;
  materialId: number;
}

interface Movement {
  id: number;
  type: 'ENTRY' | 'OUT' | 'ADJUSTMENT';
  quantity: number;
  reference: string;
  comment?: string;
  date: string;
  time: string;
  description: string;
  location: string;
  materialId: number;
}

interface Delivery {
  orderDate: number[];
  supplier: {
    id: number;
    prenom: string;
    nom: string;
    telephone: string;
  };
  id: number;
  number: string;
  date: string; // Attendu au format dd-MM-yyyy
  command: string;

  status: 'Complète' | 'Partielle' | 'Annulée';
  proof: string;
}

interface MovementMaterial {
  id: number;
  materialType: { id: number; nameFr: string; nameEn: string; icon: string | null; } | null;
  quantity: number;
  criticalThreshold: number;
  createdAt: number[];
  unit: Unit;
  labelFr: string | null;
  labelEn: string | null;
}

interface StockMovement {
  id: number;
  material: MovementMaterial;
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  movementDate: number[];
  comment: string | null;
  slip: string | null;
}

interface StockMovementsResponse {
  content: StockMovement[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  first: boolean;
  empty: boolean;
}

// Nouvelle interface pour la réponse de getLivraison
interface DeliveriesResponse {
  content: Delivery[];
  pageable: {
    pageNumber: number;
    pageSize: number;
    sort: {
      unsorted: boolean;
      sorted: boolean;
      empty: boolean;
    };
    offset: number;
    paged: boolean;
    unpaged: boolean;
  };
  totalElements: number;
  totalPages: number;
  last: boolean;
  numberOfElements: number;
  size: number;
  number: number;
  sort: {
    unsorted: boolean;
    sorted: boolean;
    empty: boolean;
  };
  first: boolean;
  empty: boolean;
}

@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatistiqueComponent],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css']
})
export class StockComponent implements OnInit, OnDestroy, AfterViewInit {
  private destroy$ = new Subject<void>();
  private languageService = inject(LanguageService);

  // Translation helper
  t = (key: string, params?: any) => this.languageService.translate(key, params);
  stockAlertes: StockAlerte[] = [];
  orders: Order[] = [];
  paginatedOrders: Order[] = [];
  totalOrderElements: number = 0;
  totalOrderPages: number = 0;
  orderCurrentPage: number = 0;
  showOrderModal: boolean = false;
  movements: StockMovement[] = [];
  paginatedMovements: StockMovement[] = [];
  totalMovementElements: number = 0;
  totalMovementPages: number = 0;
  movementCurrentPage: number = 0;
  criticalMaterials: CriticalMaterial[] = [];
  criticalMaterialsLoading: boolean = false;
  criticalMaterialsError: string | null = null;
  totalCriticalMaterials: number = 0;
  criticalMaterialsPage: number = 0;
  criticalMaterialsPageSize: number = 5;
  units: UnitParameter[] = [];
  properties: PropertyType[] = [];
  propertyId!: number;
  pageSize = 10;
  activeTab: string = 'inventaires';
  loading: boolean = false;
  showNewMaterialModal: boolean = false;
  showMovementModal: boolean = false;
  openDropdownIndex: number | null = null;
  materials: Material[] = [];
  filteredMaterials: Material[] = [];
  paginatedMaterials: Material[] = [];
  stockAlerts: StockAlert[] = [];
  recentMovements: Movement[] = [];
  deliveries: Delivery[] = [];
  paginatedDeliveries: Delivery[] = []; // Nouvelle propriété pour la pagination
  totalDeliveryElements: number = 0; // Total des livraisons
  totalDeliveryPages: number = 0; // Total des pages de livraisons
  deliveryCurrentPage: number = 0; // Page courante des livraisons
  selectedMaterial: Material | null = null;
  searchTerm: string = '';
  selectedCategory: string = '';
  selectedStockStatus: string = '';
  currentPage: number = 0;
  itemsPerPage: number = 3;
  totalPages: number = 0;
  totalElements: number = 0;
  materialForm: FormGroup;
  movementForm: FormGroup;
  orderForm: FormGroup;
  currentSortField: string = 'label';
  currentSortDirection: 'asc' | 'desc' = 'asc';
  data: MaterialsResponse | null = null;
  // Ajoutez ces propriétés pour la pagination et filtres des livraisons
  searchDeliveryTerm: string = '';
  statusDeliveryFilter: string = '';
  filteredDeliveries: any[] = [];
  materialCurrentPage: number = 0;
  searchMaterialTerm: string = '';
  statusMaterialFilter: string = '';

  materialPageSize: number = 5;
  totalMaterialElements: number = 0;
  totalMaterialPages: number = 0;
  materialPageNumbers: number[] = [];
  orderPageNumbers: number[] = [];
  deliveryPageNumbers: number[] = [];

  // Material type autocomplete
  materialTypes: MaterialType[] = [];
  materialTypeSearchTerm: string = '';
  showMaterialTypeDropdown: boolean = false;
  selectedMaterialType: MaterialType | null = null;
  materialTypeLoading: boolean = false;
  private materialTypeSearchSubject = new Subject<string>();

  // Slip upload (movement)
  slipFile: File | null = null;
  slipFileError: boolean = false;
  // Dans stock.component.ts
  suppliers: User[] = []; // Liste des fournisseurs
  suppliersLoading: boolean = false;
  supplierSearchKeyword: string = '';
  showSupplierDropdown: boolean = false;
  selectedSupplier: User | null = null;
  supplierPage: number = 0;
  showMenu = false;
  // Ajouter ces propriétés dans la classe StockComponent
  consommationData: ConsommationData[] = [];
  evolutionData: EvolutionData[] = [];
  consommationChart: Chart | null = null;
  evolutionChart: Chart | null = null;

  // Modals de confirmation
  showDeleteModal: boolean = false;
  showDeleteOrderModal: boolean = false;
  materialToDelete: Material | null = null;
  orderToDelete: Order | null = null;
  showSuccessModal: boolean = false;
  showErrorModal: boolean = false;
  successMessage: string = '';
  errorMessage: string = '';
  // ===== AJOUTS DANS LES PROPRIÉTÉS DE LA CLASSE =====
  // Modal de détails de commande avec citations
  showOrderDetailsModal: boolean = false;
  selectedOrderDetails: Order | null = null;
  orderQuotes: Quote[] = [];
  loadingQuotes: boolean = false;
  quotesError: string | null = null;
  selectedQuote: Quote | null = null;
  // Pour les livraisons
  approvingOrder: boolean = false;
  showApproveConfirmModal: boolean = false;
  orderToApprove: Order | null = null;
  selectedQuoteForApproval: Quote | null = null;
  deliveryPageSize: number = 10;
  orderPageSize: number = 10;

  // History modal
  showHistoryModal: boolean = false;
  historyMaterial: Material | null = null;
  historyMovements: StockMovement[] = [];
  historyLoading: boolean = false;
  historyTotalElements: number = 0;
  constructor(
    private fb: FormBuilder,
    private materialsService: MaterialsService,
    private materialTypeService: MaterialTypeService,
    private unitParameterService: UnitParameterService,
    private propertyService: PropertyTypeService,
    private dashboardService: DashboardService,
    private route: ActivatedRoute,
    private statistiqueService: StatistiqueService,
    private userService: UserService,
    private commandeService: CommandeService,
    private cdr: ChangeDetectorRef,
    private toastService: ToastService,

    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.materialForm = this.fb.group({
      materialTypeId: [null, [Validators.required]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      criticalThreshold: [0, [Validators.required, Validators.min(0)]],
      unitId: ['', [Validators.required]],
      propertyId: [null, [Validators.required]]
    });

    // ✅ REMPLACER l'orderForm actuel par :
    this.orderForm = this.fb.group({
      supplierId: ['', Validators.required],
      materials: this.fb.array([])
    });

    this.movementForm = this.fb.group({
      type: ['ENTRY', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      comment: ['']
    });
  }
  get materialsArray(): FormArray {
    return this.orderForm.get('materials') as FormArray;
  }
  addMaterialLine(): void {
    this.materialsArray.push(
      this.fb.group({
        materialId: ['', Validators.required],
        quantity: [1, [Validators.required, Validators.min(1)]]
      })
    );
  }
  removeMaterialLine(index: number): void {
    if (this.materialsArray.length > 1) {
      this.materialsArray.removeAt(index);
    }
  }
  getStockForMaterial(index: number): number {
    const materialId = this.materialsArray.at(index).get('materialId')?.value;
    if (!materialId) return 0;
    const mat = this.materials.find(m => m.id === Number(materialId));
    return mat ? mat.quantity : 0;
  }
  ngOnInit(): void {
    this.materialTypeSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => this.searchMaterialTypes(term));

    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.propertyId = +idFromUrl;

      this.materialForm.patchValue({ propertyId: this.propertyId });
      this.orderForm.patchValue({ propertyId: this.propertyId });

      this.loadStock();
      this.loadStockMovements();
      this.loadOrders();
      this.loadDeliveries();
      this.loadRecentMovements();
      this.loadUnits();
      this.loadProperties();
      this.loadCriticalMaterials();
      this.loadStatistiques();
      this.loadSuppliers();
      this.loadMaterialTypes();

    } else {
      this.showErrorMessage("ID de propriété non trouvé dans l'URL.");
    }
  }
  printOrder(order: Order): void {
    // Télécharger la facture PDF
    this.telechargerFacturePDF(order.id);
  }
  loadStatistiques(): void {
    // Charger données de consommation
    this.statistiqueService.getConsommation(this.propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.consommationData = data;
          if (this.activeTab === 'statistiques') {
            setTimeout(() => this.initConsumptionChart(), 100);
          }
        },
        error: () => { /* silent */ }
      });

    // Charger données d'évolution
    this.statistiqueService.getEvolution(this.propertyId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.evolutionData = data;
          if (this.activeTab === 'statistiques') {
            setTimeout(() => this.initEvolutionChart(), 100);
          }
        },
        error: () => { /* silent */ }
      });
  }
  getMaterialStockByIndex(index: number): string {
    const materials = this.orderForm.get('materials') as FormArray;
    const materialId = materials.at(index).get('materialId')?.value;

    if (!materialId) return '-';

    const material = this.materials.find(m => m.id === Number(materialId));
    if (!material) return '-';

    return `${material.quantity} ${material.unit.code}`;
  }

  public formatDeliveryDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';

    const [year, month, day, hours = 0, minutes = 0] = dateArray;

    // Formatage en français dd/MM/yyyy HH:mm
    const dayStr = day.toString().padStart(2, '0');
    const monthStr = month.toString().padStart(2, '0');
    const hoursStr = hours.toString().padStart(2, '0');
    const minutesStr = minutes.toString().padStart(2, '0');

    return `${dayStr}/${monthStr}/${year} ${hoursStr}:${minutesStr}`;
  }


  // Formater le nom complet du fournisseur
  formatSupplierName(supplier: any): string {
    if (!supplier) return 'N/A';

    const prenom = supplier.prenom || '';
    const nom = supplier.nom || '';

    return `${prenom} ${nom}`.trim() || 'N/A';
  }
  /**
   * Ouvre la modal de confirmation d'approbation
   */
  confirmApproveOrder(order: Order, quote: Quote): void {
    if (!order || !quote) {
      this.showErrorMessage('Données invalides pour l\'approbation');
      return;
    }

    // Vérifier que la commande est dans un état permettant l'approbation
    if (order.status === 'APPROVED' || order.status === 'DELIVERED' || order.status === 'DELIVERY') {
      this.showErrorMessage('Cette commande ne peut plus être approuvée');
      return;
    }

    this.orderToApprove = order;
    this.selectedQuoteForApproval = quote;
    this.showApproveConfirmModal = true;
  }

  /**
   * Annule l'approbation
   */
  cancelApproveOrder(): void {
    this.showApproveConfirmModal = false;
    this.orderToApprove = null;
    this.selectedQuoteForApproval = null;
  }

  /**
   * Approuve la commande avec la citation sélectionnée
   */
  approveOrderConfirmed(): void {
    if (!this.orderToApprove || !this.selectedQuoteForApproval) {
      this.showErrorMessage('Aucune commande ou citation sélectionnée');
      return;
    }

    this.approvingOrder = true;



    this.commandeService.updateStatusOrder(this.orderToApprove.id, 'APPROVED')
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (updatedOrder) => {
          this.approvingOrder = false;
          this.showApproveConfirmModal = false;

          // Mettre à jour la commande dans la liste
          if (this.selectedOrderDetails) {
            this.selectedOrderDetails.status = 'APPROVED';
          }

          // Recharger les commandes
          this.loadOrders();

          // Fermer le modal de détails
          this.closeOrderDetailsModal();

          // Afficher le message de succès
          this.showSuccessMessage(
            `Commande #CMD-${this.orderToApprove?.id.toString().padStart(4, '0')} approuvée avec succès !`
          );

          // Réinitialiser
          this.orderToApprove = null;
          this.selectedQuoteForApproval = null;
        },
        error: (error) => {
          // Erreur gérée par showErrorMessage ci-dessous
          this.approvingOrder = false;
          this.showApproveConfirmModal = false;

          let errorMessage = 'Erreur lors de l\'approbation de la commande';

          if (error.status === 403) {
            errorMessage = 'Accès refusé - Vous n\'avez pas les permissions nécessaires';
          } else if (error.status === 404) {
            errorMessage = 'Commande introuvable';
          } else if (error.status === 400) {
            errorMessage = error.error?.message || 'Données invalides';
          }

          this.showErrorMessage(errorMessage);

          this.orderToApprove = null;
          this.selectedQuoteForApproval = null;
        }
      });
  }

  // ===== MÉTHODE canApproveOrder() - CORRIGER =====
  canApproveOrder(order: Order | null, hasQuotes: boolean): boolean {


    if (!order || !hasQuotes || this.orderQuotes.length === 0) {
      return false;
    }

    // Statuts permettant l'approbation
    const approvableStatuses = ['PENDING', 'IN_PROGRESS'];

    const canApprove = approvableStatuses.includes(order.status);

    return canApprove;
  }
  // Obtenir le texte du statut de livraison
  getDeliveryStatusText(status: string): string {
    const map: { [k: string]: string } = {
      'IN_DELIVERY': 'stock.status.inDelivery',
      'DELIVERY': 'stock.status.delivered',
      'DELIVERED': 'stock.status.delivered',
      'CANCELLED': 'stock.status.cancelled',
      'PENDING': 'stock.status.pending',
      'APPROVED': 'stock.status.approved'
    };
    return map[status] ? this.t(map[status]) : status;
  }

  // Mettre à jour les méthode  existante

  private normalizeMaterialStatus(displayStatus: string): string[] {
    const statusMapping: { [key: string]: string[] } = {
      'stock normal': ['NORMAL'],
      'stock faible': ['LOW'],
      'rupture de stock': ['CRITICAL']
    };

    return statusMapping[displayStatus.toLowerCase()] || [];
  }



  private computePageNums(currentPage: number, totalPages: number): number[] {
    const maxPages = 5;
    let startPage = Math.max(0, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages - 1, startPage + maxPages - 1);
    if (endPage - startPage < maxPages - 1) {
      startPage = Math.max(0, endPage - maxPages + 1);
    }
    return Array.from({ length: endPage - startPage + 1 }, (_, i) => startPage + i);
  }

  // ===== MODIFIER loadStock() pour utiliser materialCurrentPage =====
  loadStock(): void {
    this.loading = true;
    if (!this.propertyId || this.propertyId <= 0) {
      this.showErrorMessage('ID de propriété invalide');
      this.loading = false;
      return;
    }

    // ✅ UTILISER materialCurrentPage et materialPageSize
    this.materialsService.getStock(this.propertyId, this.materialCurrentPage, this.materialPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: MaterialsResponse) => {
          // Réponse reçue avec succès
          this.data = response;
          this.materials = response.content || [];
          this.totalMaterialElements = response.totalElements || 0;
          this.totalMaterialPages = response.totalPages || 0;

          // Plus besoin de filtrage côté client pour la pagination
          this.paginatedMaterials = [...this.materials];
          this.generateStockAlerts();
          this.materialPageNumbers = this.computePageNums(this.materialCurrentPage, this.totalMaterialPages);
          this.loading = false;
        },
        error: (error) => {
          // Erreur gérée par showErrorMessage ci-dessous
          this.loading = false;
          this.showErrorMessage(error.message || 'Erreur lors du chargement du stock');
        }
      });
  }


  // ===== MODIFIER loadOrders() pour utiliser orderPageSize =====
  loadOrders(): void {
    this.loading = true;
    this.materialsService.getCommand(this.propertyId, this.orderCurrentPage, this.orderPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.orders = response.content || [];
          this.totalOrderElements = response.totalElements || 0;
          this.totalOrderPages = response.totalPages || 0;
          this.paginatedOrders = this.orders;
          this.orderPageNumbers = this.computePageNums(this.orderCurrentPage, this.totalOrderPages);
          this.loading = false;
        },
        error: (error) => {
          // Erreur gérée par showErrorMessage ci-dessous
          this.loading = false;
          this.showErrorMessage('Erreur lors du chargement des commandes');
        }
      });
  }

  // ===== MODIFIER loadDeliveries() pour utiliser deliveryPageSize =====
  loadDeliveries(): void {
    this.loading = true;

    if (!this.propertyId || this.propertyId <= 0) {
      this.showErrorMessage('ID de propriété invalide');
      this.loading = false;
      return;
    }

    this.materialsService.getLivraison(this.propertyId, this.deliveryCurrentPage, this.deliveryPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {

          if (response && Array.isArray(response.content)) {
            this.deliveries = response.content.map((delivery: any) => ({
              ...delivery,
              date: delivery.orderDate,
              formattedDate: this.formatDeliveryDate(delivery.orderDate),
            }));

            this.totalDeliveryElements = response.totalElements || 0;
            this.totalDeliveryPages = response.totalPages || 0;
            this.paginatedDeliveries = [...this.deliveries];
            this.deliveryPageNumbers = this.computePageNums(this.deliveryCurrentPage, this.totalDeliveryPages);
          } else {
            this.deliveries = [];
            this.paginatedDeliveries = [];
          }

          this.loading = false;
        },
        error: (error: any) => {
          // Erreur gérée par showErrorMessage ci-dessous
          this.loading = false;
          this.deliveries = [];
          this.paginatedDeliveries = [];
          this.showErrorMessage('Erreur lors du chargement des livraisons');
        }
      });
  }
  formatRecentMovementDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';

    const [year, month, day, hours = 0, minutes = 0] = dateArray;
    const movementDate = new Date(year, month - 1, day, hours, minutes);
    const now = new Date();

    const diffMs = now.getTime() - movementDate.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? "À l'instant" : `Il y a ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Aujourd'hui, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else if (diffHours < 48) {
      return `Hier, ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }

    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
  getMovementBadge(movement: StockMovement): string {
    return movement.type === 'ENTRY' ? this.t('stock.movement.entry') : this.t('stock.movement.exit');
  }

  getMovementMaterialName(movement: StockMovement): string {
    const mat = movement.material;
    const isEN = this.languageService.currentLang() === 'EN';
    if (isEN && mat.labelEn) return mat.labelEn;
    if (mat.labelFr) return mat.labelFr;
    if (mat.materialType) {
      return isEN ? (mat.materialType.nameEn || mat.materialType.nameFr) : mat.materialType.nameFr;
    }
    return 'N/A';
  }
  getAlertPercentage(alert: StockAlert): number {
    const material = this.materials.find(m => m.id === alert.materialId);
    if (!material) return 0;

    if (!material.criticalThreshold || material.criticalThreshold === 0) {
      return material.quantity > 0 ? 100 : 0;
    }

    const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getAlertStatus(alert: StockAlert): string {
    const material = this.materials.find(m => m.id === alert.materialId);
    if (!material) return 'NORMAL';
    return this.getMaterialStatus(material);
  }
  loadRecentMovements(): void {
    this.loadStockMovements();
  }

  loadUnits(): void {
    this.unitParameterService.getAll({ type: 'UNIT', page: 0, size: 1000 }) // Augmentez la taille pour récupérer plus d'éléments si nécessaire
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PaginatedResponse<UnitParameter>) => {
          // La réponse est paginée, nous devons extraire le tableau 'content'
          this.units = response.content || [];
          // Unités chargées avec succès
        },
        error: (err: any) => {
          // Erreur gérée par showErrorMessage ci-dessous
          this.showErrorMessage('Erreur lors du chargement des unités');
        }
      });
  }

  loadProperties(): void {
    // ✅ Utiliser getAll() qui retourne PropertyType[] directement
    this.propertyService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (properties: PropertyType[]) => {
          this.properties = properties;
          // Propriétés chargées avec succès
        },
        error: (err) => {
          // Erreur gérée par showErrorMessage ci-dessous
          this.showErrorMessage('Erreur lors du chargement des propriétés');
        }
      });
  }
  loadCriticalMaterials(): void {
    this.criticalMaterialsLoading = true;
    this.criticalMaterialsError = null;
    if (!this.dashboardService) {
      this.criticalMaterialsLoading = false;
      this.criticalMaterialsError = 'Service indisponible';
      return;
    }
    this.dashboardService.materiauxCritique(this.criticalMaterialsPage, this.criticalMaterialsPageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          this.criticalMaterials = (response.content || []).map((item: any) => ({
            ...item,
            createdAt: item.createdAt || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]
          }));
          this.totalCriticalMaterials = response.totalElements || 0;
          this.criticalMaterialsLoading = false;
        },
        error: (error: any) => {
          // Erreur lors du chargement des matériaux critiques
          this.criticalMaterialsLoading = false;
          this.criticalMaterialsError = 'Erreur lors du chargement des matériaux critiques';
        }
      });
  }

  // Autres méthodes existantes (non modifiées)
  getStockPercentage(material: any): number {
    if (!material.criticalThreshold || material.criticalThreshold === 0) {
      return material.quantity > 0 ? 100 : 0;
    }
    const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  changeCriticalMaterialsPage(page: number): void {
    this.criticalMaterialsPage = page;
    this.loadCriticalMaterials();
  }


  // calculateOrderTotal(order: Order): number {
  //   if (!order.items || order.items.length === 0) {
  //     return 0;
  //   }
  //   return order.items.reduce((total, item) => {
  //     return total + (item.quantity * item.unitPrice);
  //   }, 0);
  // }



  removeMaterialFromOrder(index: number): void {
    const materials = this.orderForm.get('materials') as FormArray;
    if (materials.length > 1) {
      materials.removeAt(index);
    }
  }


  // ✅ CORRIGER addMaterialToOrder
  loadSuppliers(keyword: string = '', page: number = 0, append: boolean = false): void {
    this.suppliersLoading = true;

    this.userService.getUserByProfil('SUPPLIER', keyword, page, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          if (append) {
            this.suppliers = [...this.suppliers, ...(response.content || [])];
          } else {
            this.suppliers = response.content || [];
          }
          this.suppliersLoading = false;
        },
        error: (error: any) => {
          this.showErrorMessage('Erreur lors du chargement des fournisseurs');
          this.suppliersLoading = false;
          if (!append) this.suppliers = [];
        }
      });
  }

  // ─── Material type autocomplete ───────────────────────────────────────────

  loadMaterialTypes(): void {
    this.materialTypeService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: types => (this.materialTypes = types),
      error: () => { /* silent */ }
    });
  }

  onMaterialTypeInput(value: string): void {
    this.materialTypeSearchTerm = value;
    this.showMaterialTypeDropdown = true;
    this.selectedMaterialType = null;
    this.materialForm.patchValue({ materialTypeId: null });
    this.materialTypeSearchSubject.next(value);
  }

  searchMaterialTypes(query: string): void {
    if (!query.trim()) {
      this.materialTypes = [];
      this.materialTypeLoading = false;
      this.materialTypeService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
        next: types => (this.materialTypes = types),
        error: () => { /* silent */ }
      });
      return;
    }
    this.materialTypeLoading = true;
    this.materialTypeService.search(query).pipe(takeUntil(this.destroy$)).subscribe({
      next: types => { this.materialTypes = types; this.materialTypeLoading = false; },
      error: () => { this.materialTypeLoading = false; }
    });
  }

  selectMaterialType(type: MaterialType): void {
    this.selectedMaterialType = type;
    this.materialTypeSearchTerm = type.nameFr;
    this.materialForm.patchValue({ materialTypeId: type.id });
    this.showMaterialTypeDropdown = false;
  }

  closeMaterialTypeDropdown(): void {
    setTimeout(() => { this.showMaterialTypeDropdown = false; }, 200);
  }

  // ─── Slip upload (movement) ──────────────────────────────────────────────

  onSlipFileChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.slipFile = input.files[0];
      this.slipFileError = false;
    } else {
      this.slipFile = null;
    }
  }

  onSupplierSearch(keyword: string): void {
    this.supplierSearchKeyword = keyword;
    this.supplierPage = 0;
    this.showSupplierDropdown = true;
    this.loadSuppliers(keyword, 0, false);
  }

  focusSupplierInput(): void {
    this.showSupplierDropdown = true;
    if (this.suppliers.length === 0) {
      this.loadSuppliers(this.supplierSearchKeyword, 0, false);
    }
  }

  selectSupplier(supplier: User): void {
    this.selectedSupplier = supplier;
    this.supplierSearchKeyword = `${supplier.prenom} ${supplier.nom}`;
    this.orderForm.get('supplierId')?.setValue(supplier.id);
    this.showSupplierDropdown = false;
  }

  onSupplierScroll(event: any): void {
    const element = event.target;
    if (element.scrollHeight - element.scrollTop <= element.clientHeight + 50) {
      if (!this.suppliersLoading) {
        this.supplierPage++;
        this.loadSuppliers(this.supplierSearchKeyword, this.supplierPage, true);
      }
    }
  }

  // ===== MODIFIER addMaterialToOrder =====
  // ✅ REMPLACER par (ligne ~280 environ) :
  addMaterialToOrder(): void {
    const materials = this.orderForm.get('materials') as FormArray;
    materials.push(this.fb.group({
      materialId: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]]
      // ❌ SUPPRIMER unitPrice
    }));
  }

  // ===== NOUVELLE MÉTHODE: Calculer le total d'une ligne =====
  calculateLineTotal(index: number): void {
    const materials = this.orderForm.get('materials') as FormArray;
    const material = materials.at(index);

    const quantity = material.get('quantity')?.value || 0;
    const unitPrice = material.get('unitPrice')?.value || 0;

    // Le total est calculé dynamiquement dans getLineTotal()
  }
  getLineTotal(index: number): number {
    const materials = this.orderForm.get('materials') as FormArray;
    const material = materials.at(index);

    const quantity = material.get('quantity')?.value || 0;
    const unitPrice = material.get('unitPrice')?.value || 0;

    return quantity * unitPrice;
  }

  // ===== NOUVELLE MÉTHODE: Obtenir le total général =====
  getOrderTotal(): number {
    const materials = this.orderForm.get('materials') as FormArray;
    let total = 0;

    materials.controls.forEach((material, index) => {
      total += this.getLineTotal(index);
    });

    return total;
  }

  openOrderModal(): void {
    this.showOrderModal = true;

    const materials = this.orderForm.get('materials') as FormArray;
    if (materials.length === 0) {
      this.addMaterialToOrder();
    }
  }

  // ✅ REMPLACER onSubmitOrder() par :
  onSubmitOrder(): void {
    if (!this.orderForm.valid || this.loading) {
      this.showErrorMessage('Veuillez remplir tous les champs requis');
      return;
    }

    this.loading = true;

    // ✅ Structure EXACTE du swagger
    const orderData: CreateOrder = {
      supplierId: Number(this.orderForm.value.supplierId),
      materials: this.orderForm.value.materials.map((m: any) => ({
        materialId: Number(m.materialId),
        quantity: Number(m.quantity)
      }))
    };

    this.materialsService.createCommand(orderData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.closeOrderModal();
          this.loadOrders();
          this.showSuccessMessage('Commande créée avec succès !');
        },
        error: (error) => {
          this.loading = false;
          this.showErrorMessage(error.message || 'Erreur lors de la création');
        }
      });
  }


  // ===== NOUVELLE MÉTHODE: Gérer la sélection d'un matériau =====
  onMaterialSelect(_index: number): void { }

  // ===== MODIFIER closeOrderModal =====
  closeOrderModal(): void {
    this.showOrderModal = false;
    const materials = this.orderForm.get('materials') as FormArray;
    materials.clear();
    this.orderForm.reset({ supplierId: '' });
    this.addMaterialToOrder(); // Ajouter une ligne vide
  }
  generateStockAlerts(): void {
    this.stockAlerts = [];
    this.materials.forEach(material => {
      const status = this.getMaterialStatus(material);
      if (status === 'CRITICAL' || status === 'LOW') {
        const name = material.materialType?.nameFr || material.label || 'Matériau inconnu';
        const alert: StockAlert = {
          id: material.id,
          message: `${name} - ${material.quantity} ${material.unit.code} restant${material.quantity > 1 ? 's' : ''}`,
          createdAt: new Date(),
          materialId: material.id
        };
        this.stockAlerts.push(alert);
      }
    });
  }

  getFormattedDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  // Autres méthodes utilitaires et d'interaction (non modifiées)
  getMaterialName(material: Material): string {
    return material.materialType?.nameFr || material.label || 'N/A';
  }

  getMaterialStock(material: Material): number {
    return material.quantity || 0;
  }

  getMaterialUnit(material: Material): string {
    return material.unit?.code || material.unit?.label || 'N/A';
  }

  getMaterialThreshold(material: Material): number {
    return material.criticalThreshold || 0;
  }

  getMaterialStatus(material: Material): string {
    const stock = this.getMaterialStock(material);
    const threshold = this.getMaterialThreshold(material);
    if (stock === 0) {
      return 'CRITICAL';
    } else if (stock <= threshold) {
      return 'CRITICAL';
    } else if (stock <= threshold * 1.5) {
      return 'LOW';
    }
    return 'NORMAL';
  }

  getStatusClass(status: string): string {
    const classes = {
      'NORMAL': 'bg-green-100 text-green-800',
      'LOW': 'bg-yellow-100 text-yellow-800',
      'CRITICAL': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getStatusText(status: string): string {
    const map: { [k: string]: string } = {
      'NORMAL': 'stock.status.normal',
      'LOW': 'stock.status.low',
      'CRITICAL': 'stock.status.critical'
    };
    return map[status] ? this.t(map[status]) : status;
  }

  getMovementTypeClass(type: string): string {
    const classes = {
      'ENTRY': 'text-green-600',
      'OUT': 'text-red-600',
      'ADJUSTMENT': 'text-blue-600'
    };
    return classes[type as keyof typeof classes] || 'text-gray-600';
  }

  getMovementTypeText(type: string): string {
    const map: { [k: string]: string } = {
      'ENTRY': 'stock.movement.entry',
      'EXIT': 'stock.movement.exit',
      'OUT': 'stock.movement.exit',
      'ADJUSTMENT': 'stock.modals.movement.adjustment'
    };
    return map[type] ? this.t(map[type]) : type;
  }

  getDeliveryStatusClass(status: string): string {
    const classes = {
      'Complète': 'bg-green-100 text-green-800',
      'Partielle': 'bg-yellow-100 text-yellow-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  checkAuthStatus(): void { }

  testApiConnection(): void {
    this.materialsService.checkTokenValidity()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => { this.showSuccessMessage('Connexion API réussie'); },
        error: () => { this.showErrorMessage('Erreur de connexion à l\'API'); }
      });
  }
  // Méthode pour filtrer les matériaux
  filterMaterials(): void {
    this.filteredMaterials = this.materials.filter(material => {
      const matchesSearch = !this.searchMaterialTerm ||
        this.getMaterialName(material).toLowerCase().includes(this.searchMaterialTerm.toLowerCase()) ||
        this.getMaterialUnit(material).toLowerCase().includes(this.searchMaterialTerm.toLowerCase());

      let matchesStatus = true;
      if (this.statusMaterialFilter) {
        const technicalStatuses = this.normalizeMaterialStatus(this.statusMaterialFilter);
        const materialStatus = this.getMaterialStatus(material);
        matchesStatus = technicalStatuses.length > 0 ?
          technicalStatuses.includes(materialStatus) :
          false;
      }

      return matchesSearch && matchesStatus;
    });

    // Réinitialiser la pagination après filtrage
    this.materialCurrentPage = 0;
    this.updatePaginatedMaterials();
  }

  updatePaginatedMaterials(): void {
    const startIndex = this.materialCurrentPage * this.materialPageSize;
    const endIndex = startIndex + this.materialPageSize;
    this.paginatedMaterials = this.filteredMaterials.slice(startIndex, endIndex);
    this.totalMaterialElements = this.filteredMaterials.length;
    this.totalMaterialPages = Math.ceil(this.totalMaterialElements / this.materialPageSize);
  }

  // Méthode appelée lors du changement de recherche
  onMaterialSearchChange(): void {
    this.filterMaterials();
  }

  // Méthode appelée lors du changement de filtre de statut
  onMaterialStatusFilterChange(): void {
    this.filterMaterials();
  }
  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadStock();
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadStock();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadStock();
    }
  }



  toggleDropdown(index: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }



  openNewMaterialModal(): void {
    this.showNewMaterialModal = true;
    this.selectedMaterialType = null;
    this.materialTypeSearchTerm = '';
    this.showMaterialTypeDropdown = false;
    this.materialForm.reset({
      materialTypeId: null,
      quantity: 0,
      criticalThreshold: 0,
      unitId: '',
      propertyId: this.propertyId
    });
    Object.keys(this.materialForm.controls).forEach(key => {
      this.materialForm.get(key)?.markAsUntouched();
      this.materialForm.get(key)?.markAsPristine();
    });
  }

  closeNewMaterialModal(): void {
    this.showNewMaterialModal = false;
    this.resetMaterialForm();
  }
  resetMaterialFilters(): void {
    this.searchMaterialTerm = '';
    this.statusMaterialFilter = '';
    this.filteredMaterials = [...this.materials];
    this.materialCurrentPage = 0;
    this.updatePaginatedMaterials();
  }
  // Méthodes de navigation pour la pagination des matériaux
  previousMaterialPage(): void {
    if (this.materialCurrentPage > 0) {
      this.materialCurrentPage--;
      this.loadStock();
    }
  }

  nextMaterialPage(): void {
    if (this.materialCurrentPage < this.totalMaterialPages - 1) {
      this.materialCurrentPage++;
      this.loadStock();
    }
  }
  openMovementModal(material: Material): void {
    this.selectedMaterial = material;
    this.showMovementModal = true;
    this.resetMovementForm();
    const suggestedType = material.quantity <= material.criticalThreshold ? 'ENTRY' : 'OUT';
    this.movementForm.patchValue({
      type: suggestedType,
      quantity: 1
    });
  }

  loadStockMovements(): void {
    this.loading = true;
    if (!this.propertyId || this.propertyId <= 0) {
      this.showErrorMessage('ID de propriété invalide');
      this.loading = false;
      return;
    }
    this.materialsService.getStockMove(this.propertyId, this.movementCurrentPage, this.itemsPerPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: StockMovementsResponse) => {
          this.movements = response.content || [];
          this.totalMovementElements = response.totalElements || 0;
          this.totalMovementPages = response.totalPages || 0;
          this.paginatedMovements = this.movements;
          this.loading = false;
          this.updateRecentMovements();
        },
        error: (error) => {
          this.loading = false;
          if (error.status === 403) {
            this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
          } else if (error.status === 401) {
            this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
          } else {
            this.showErrorMessage('Erreur lors du chargement des mouvements');
          }
        }
      });
  }

  updateRecentMovements(): void {
    // movements card uses the `movements` array directly
  }

  formatMovementDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return 'N/A';
    const [year, month, day] = dateArray;
    const movementDate = new Date(year, month - 1, day);
    const today = new Date();
    if (movementDate.toDateString() === today.toDateString()) {
      return 'Aujourd\'hui';
    }
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (movementDate.toDateString() === yesterday.toDateString()) {
      return 'Hier';
    }
    return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
  }

  getTimeFromDateArray(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 5) return '00:00';
    const [_, __, ___, hours, minutes] = dateArray;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }
  // ===== SUPPRESSION COMMANDE =====
  confirmDeleteOrder(order: Order): void {
    if (!order) return;

    if (order.status === 'DELIVERED' || order.status === 'DELIVERY') {
      this.showErrorMessage('Impossible de supprimer une commande déjà livrée');
      return;
    }

    this.orderToDelete = order;
    this.showDeleteOrderModal = true;
  }

  cancelDeleteOrder(): void {
    this.showDeleteOrderModal = false;
    this.orderToDelete = null;
  }

  deleteOrderConfirmed(): void {
    if (!this.orderToDelete) return;

    this.loading = true;

    this.commandeService.deleteCommande(this.orderToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.showDeleteOrderModal = false;
          this.orderToDelete = null;

          this.showSuccessMessage('Commande supprimée avec succès');
          this.loadOrders();
        },
        error: (error) => {
          this.loading = false;
          this.showDeleteOrderModal = false;
          this.orderToDelete = null;

          this.showErrorMessage('Erreur lors de la suppression de la commande');
        }
      });
  }

  onCreateMovement(): void {
    if (!this.slipFile) {
      this.slipFileError = true;
      return;
    }
    if (this.movementForm.valid && this.selectedMaterial && !this.loading) {
      this.loading = true;
      const newMovement: CreateStockMovement = {
        materialId: this.selectedMaterial.id,
        quantity: this.movementForm.value.quantity,
        type: this.movementForm.value.type,
        comment: this.movementForm.value.comment || ''
      };
      this.materialsService.createStockMove(newMovement, this.slipFile)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (createdMovement) => {
            this.loading = false; // ✅ Reset loading state
            this.closeMovementModal();
            this.addToRecentMovements(createdMovement, this.selectedMaterial!);
            this.loadStock();
            this.loadStockMovements();
            this.loadRecentMovements(); // ✅ Reload recent movements list
            this.loadStatistiques(); // ✅ Reload statistics after movement
            this.showSuccessMessage('Mouvement enregistré avec succès !');
          },
          error: (error) => {
            this.loading = false;
            // Erreur gérée par showErrorMessage ci-dessous
            if (error.status === 403) {
              this.showErrorMessage('Accès refusé - Vous n\'avez pas les permissions nécessaires');
            } else if (error.status === 401) {
              this.showErrorMessage('Non authentifié - Veuillez vous reconnecter');
            } else {
              this.showErrorMessage('Erreur lors de l\'enregistrement du mouvement');
            }
          }
        });
    }
  }

  private addToRecentMovements(_createdMovement: any, _material: Material): void {
    // movements card is refreshed via loadStockMovements() after creation
  }

  closeMovementModal(): void {
    this.showMovementModal = false;
    this.selectedMaterial = null;
    this.slipFile = null;
    this.slipFileError = false;
    this.resetMovementForm();
  }

  resetMaterialForm(): void {
    this.selectedMaterialType = null;
    this.materialTypeSearchTerm = '';
    this.showMaterialTypeDropdown = false;
    this.materialForm.reset({
      materialTypeId: null,
      quantity: 0,
      criticalThreshold: 0,
      unitId: '',
      propertyId: this.propertyId
    });
  }

  resetMovementForm(): void {
    this.movementForm.reset({
      type: 'ENTRY',
      quantity: 0,
      comment: ''
    });
  }

  isFormValid(): boolean {
    return this.materialForm.valid;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.materialForm.get(fieldName);
    if (fieldName === 'unitId' || fieldName === 'propertyId' || fieldName === 'materialTypeId') {
      const value = field?.value;
      const isEmpty = !value || value === '' || value === null;
      return !!(field && (field.invalid || isEmpty) && (field.dirty || field.touched));
    }
    return !!(field && field.invalid && (field.dirty || field.touched));
  }
  getFieldError(fieldName: string): string {
    const field = this.materialForm.get(fieldName);
    if (field?.errors) {
      if (field.errors['required']) {
        return 'Ce champ est requis';
      }
      if (field.errors['minlength']) {
        return `Minimum ${field.errors['minlength'].requiredLength} caractères`;
      }
    }
    return '';
  }

  onAction(action: string, material: Material, event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    switch (action) {
      case 'modifier':
        this.editMaterial(material);
        break;
      case 'commander':
        this.orderMaterial(material);
        break;
      case 'historique':
        this.showMaterialHistory(material);
        break;
      case 'supprimer':
        this.deleteMaterial(material);
        break;
    }
  }

  onSaveNewStock(): void {
    if (!this.selectedMaterialType) {
      this.showErrorMessage('Veuillez sélectionner un type de matériau');
      return;
    }
    if (this.materialForm.valid && !this.loading) {
      this.loading = true;
      const newMaterial: CreateMaterial = {
        materialTypeId: this.selectedMaterialType.id,
        quantity: this.materialForm.value.quantity,
        criticalThreshold: this.materialForm.value.criticalThreshold,
        unitId: this.materialForm.value.unitId,
        propertyId: this.propertyId
      };
      this.materialsService.createStock(newMaterial)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.loading = false;
            this.closeNewMaterialModal();
            this.loadStock();
            this.showSuccessMessage('Matériau ajouté avec succès !');
          },
          error: (error) => {
            this.loading = false;
            if (error.status === 403) {
              this.showErrorMessage('Accès refusé - Vous n\'avez pas les permissions nécessaires');
            } else if (error.status === 401) {
              this.showErrorMessage('Non authentifié - Veuillez vous reconnecter');
            } else {
              this.showErrorMessage('Erreur lors de l\'ajout du matériau');
            }
          }
        });
    }
  }

  editMaterial(_material: Material): void { }

  orderMaterial(_material: Material): void { }

  showMaterialHistory(material: Material): void {
    this.historyMaterial = material;
    this.historyMovements = [];
    this.historyTotalElements = 0;
    this.historyLoading = true;
    this.showHistoryModal = true;
    this.materialsService.getStockMove(this.propertyId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          this.historyMovements = (response.content || []).filter(m => m.material.id === material.id);
          this.historyTotalElements = this.historyMovements.length;
          this.historyLoading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.historyLoading = false;
          this.showErrorMessage('Erreur lors du chargement de l\'historique');
        }
      });
  }

  closeHistoryModal(): void {
    this.showHistoryModal = false;
    this.historyMaterial = null;
    this.historyMovements = [];
  }

  deleteMaterial(_material: Material): void { }

  goToMaterialPage(page: number): void {
    if (page >= 0 && page < this.totalMaterialPages && page !== this.materialCurrentPage) {
      this.materialCurrentPage = page;
      this.loadStock();
    }
  }


  previousMovementPage(): void {
    if (this.movementCurrentPage > 0) {
      this.movementCurrentPage--;
      this.loadStockMovements();
    }
  }

  nextMovementPage(): void {
    if (this.movementCurrentPage < this.totalMovementPages - 1) {
      this.movementCurrentPage++;
      this.loadStockMovements();
    }
  }

  getSlipUrl(slip: string | null): string | null {
    return this.materialsService.getSlipDownloadUrl(slip);
  }

  downloadSlip(slip: string | null): void {
    const url = this.materialsService.getSlipDownloadUrl(slip);
    if (!url) return;
    window.open(url, '_blank');
  }

  showSuccessMessage(message: string): void {
    this.toastService.showSuccess(message);
  }

  showErrorMessage(message: string): void {
    this.toastService.showError(message);
  }

  // Méthodes conservées pour compatibilité avec les modals existants
  closeSuccessModal(): void {
    this.showSuccessModal = false;
    this.successMessage = '';
  }

  closeErrorModal(): void {
    this.showErrorModal = false;
    this.errorMessage = '';
  }

  get displayCurrentPage(): number {
    return this.currentPage + 1;
  }

  previousOrderPage(): void {
    if (this.orderCurrentPage > 0) {
      this.orderCurrentPage--;
      this.loadOrders();
    }
  }

  nextOrderPage(): void {
    if (this.orderCurrentPage < this.totalOrderPages - 1) {
      this.orderCurrentPage++;
      this.loadOrders();
    }
  }

  goToOrderPage(page: number): void {
    if (page >= 0 && page < this.totalOrderPages && page !== this.orderCurrentPage) {
      this.orderCurrentPage = page;
      this.loadOrders();
    }
  }


  getOrderStatusClass(status: string): string {
    const classes = {
      'PENDING': 'bg-yellow-100 text-yellow-800',
      'CONFIRMED': 'bg-blue-100 text-blue-800',
      'IN_PROGRESS': 'bg-purple-100 text-purple-800',
      'DELIVERY': 'bg-green-100 text-green-800',
      'DELIVERED': 'bg-green-100 text-green-800',
      'CANCELLED': 'bg-red-100 text-red-800',
      'PARTIALLY_DELIVERED': 'bg-orange-100 text-orange-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  getOrderStatusText(status: string): string {
    const map: { [k: string]: string } = {
      'PENDING': 'stock.orderStatus.pending',
      'CONFIRMED': 'stock.orderStatus.confirmed',
      'IN_PROGRESS': 'stock.orderStatus.inProgress',
      'DELIVERY': 'stock.orderStatus.delivery',
      'DELIVERED': 'stock.orderStatus.delivered',
      'CANCELLED': 'stock.orderStatus.cancelled',
      'APPROVED': 'stock.orderStatus.approved',
      'PARTIALLY_DELIVERED': 'stock.orderStatus.partiallyDelivered'
    };
    return map[status] ? this.t(map[status]) : status;
  }

  onOrderAction(action: string, order: Order, event: Event): void {
    event.stopPropagation();
    this.closeDropdown();
    switch (action) {
      case 'voir':
        this.viewOrderDetails(order);
        break;
      case 'modifier':
        this.editOrder(order);
        break;
      case 'dupliquer':
        this.duplicateOrder(order);
        break;
      case 'annuler':
        this.cancelOrder(order);
        break;
    }
  }



  editOrder(order: Order): void {
    if (order.status === 'LIVREE' || order.status === 'ANNULEE') {
      this.showErrorMessage('Impossible de modifier une commande livrée ou annulée');
      return;
    }
  }

  duplicateOrder(order: Order): void {
    if (order.materials && order.materials.length > 0) {
      const materialsArray = this.orderForm.get('materials') as FormArray;
      while (materialsArray.length !== 0) {
        materialsArray.removeAt(0);
      }
      order.materials.forEach((material: { id: any; quantity: any; }) => {
        materialsArray.push(this.fb.group({
          materialId: [material.id, Validators.required],
          quantity: [material.quantity || 1, [Validators.required, Validators.min(1)]]
        }));
      });
    }
    this.orderForm.patchValue({
      propertyId: order.supplier?.id || this.propertyId
    });
    this.openOrderModal();
  }

  cancelOrder(order: Order): void {
    if (order.status === 'LIVREE' || order.status === 'ANNULEE') {
      this.showErrorMessage('Impossible d\'annuler une commande déjà livrée ou annulée');
      return;
    }
    const confirmMessage = `Êtes-vous sûr de vouloir annuler la commande CMD-${order.id.toString().padStart(4, '0')} ?`;
  }

  get orderMaterials(): FormArray {
    return this.orderForm.get('materials') as FormArray;
  }

  getCriticalMaterialStatus(material: CriticalMaterial): string {
    const stock = material.quantity || 0;
    const threshold = material.criticalThreshold || 0;
    if (stock === 0) {
      return 'CRITICAL';
    } else if (stock <= threshold) {
      return 'CRITICAL';
    } else if (stock <= threshold * 1.5) {
      return 'LOW';
    }
    return 'NORMAL';
  }

  getCriticalMaterialStockPercentage(material: CriticalMaterial): number {
    if (!material.criticalThreshold || material.criticalThreshold === 0) {
      return material.quantity > 0 ? 100 : 0;
    }
    const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
  }

  getCriticalMaterialName(material: CriticalMaterial): string {
    return material.label || 'N/A';
  }

  getCriticalMaterialUnit(material: CriticalMaterial): string {
    return material.unit?.code || material.unit?.label || 'N/A';
  }

  Math = Math;

  /**
   * Télécharge la facture PDF pour une commande donnée
   */
  telechargerFacturePDF(orderId: number): void {
    if (!orderId) {
      this.showErrorMessage('ID de commande invalide');
      return;
    }

    // Trouver la commande
    const order = this.orders.find(o => o.id === orderId);
    if (!order) {
      this.showErrorMessage('Commande introuvable');
      return;
    }

    try {
      // Import dynamique de jsPDF
      import('jspdf').then((jsPDFModule) => {
        const jsPDF = jsPDFModule.default;
        const doc = new jsPDF();

        // Configuration
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const margin = 20;
        let yPosition = margin;

        // En-tête
        doc.setFillColor(255, 92, 2);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text('FACTURE', margin, 25);

        // Numéro de commande
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        const orderNumber = `#CMD-${order.id.toString().padStart(4, '0')}`;
        doc.text(orderNumber, pageWidth - margin - doc.getTextWidth(orderNumber), 25);

        yPosition = 50;

        // Informations commande
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Date de commande:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatDeliveryDate(order.orderDate), margin + 50, yPosition);

        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Fournisseur:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(this.formatSupplierName(order.supplier), margin + 50, yPosition);

        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Téléphone:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(order.supplier.telephone || 'N/A', margin + 50, yPosition);

        yPosition += 10;
        doc.setFont('helvetica', 'bold');
        doc.text('Statut:', margin, yPosition);
        doc.setFont('helvetica', 'normal');
        doc.text(this.getOrderStatusText(order.status), margin + 50, yPosition);

        yPosition += 20;

        // Tableau des matériaux
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('Matériaux commandés', margin, yPosition);
        yPosition += 10;

        // En-tête du tableau
        doc.setFillColor(240, 240, 240);
        doc.rect(margin, yPosition - 5, pageWidth - 2 * margin, 10, 'F');
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Matériau', margin + 2, yPosition);
        doc.text('Quantité', pageWidth - margin - 40, yPosition);
        yPosition += 10;

        // Lignes du tableau
        doc.setFont('helvetica', 'normal');
        if (order.materials && order.materials.length > 0) {
          order.materials.forEach((material: any) => {
            if (yPosition > pageHeight - 30) {
              doc.addPage();
              yPosition = margin;
            }
            doc.text(material.label || 'N/A', margin + 2, yPosition);
            doc.text(material.quantity?.toString() || '0', pageWidth - margin - 40, yPosition);
            yPosition += 8;
          });
        } else {
          doc.setTextColor(150, 150, 150);
          doc.text('Aucun matériau', margin + 2, yPosition);
          yPosition += 8;
        }

        // Pied de page
        doc.setTextColor(150, 150, 150);
        doc.setFontSize(8);
        const footerText = `Généré le ${new Date().toLocaleDateString('fr-FR')} - BTP CLOUD`;
        doc.text(footerText, pageWidth / 2 - doc.getTextWidth(footerText) / 2, pageHeight - 10);

        // Télécharger le PDF
        doc.save(`Facture_${orderNumber}.pdf`);
        this.showSuccessMessage('Facture téléchargée avec succès');
      }).catch((error) => {
        console.error('Erreur lors du chargement de jsPDF:', error);
        this.showErrorMessage('Erreur lors de la génération du PDF');
      });
    } catch (error) {
      console.error('Erreur lors de la génération du PDF:', error);
      this.showErrorMessage('Erreur lors de la génération du PDF');
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
  filterDeliveries(): void {
    this.filteredDeliveries = this.deliveries.filter(delivery => {
      const matchesSearch = !this.searchDeliveryTerm ||
        delivery.number.toLowerCase().includes(this.searchDeliveryTerm.toLowerCase()) ||
        // delivery.supplier.toLowerCase().includes(this.searchDeliveryTerm.toLowerCase()) ||
        delivery.command.toLowerCase().includes(this.searchDeliveryTerm.toLowerCase());

      let matchesStatus = true;
      if (this.statusDeliveryFilter) {
        const technicalStatuses = this.normalizeDeliveryStatus(this.statusDeliveryFilter);
        matchesStatus = technicalStatuses.length > 0 ?
          technicalStatuses.includes(delivery.status) :
          false;
      }

      return matchesSearch && matchesStatus;
    });

    // Réinitialiser la pagination après filtrage
    this.deliveryCurrentPage = 0;
    this.updatePaginatedDeliveries();
  }

  // Méthode pour mettre à jour la pagination des livraisons filtrées
  updatePaginatedDeliveries(): void {
    const startIndex = this.deliveryCurrentPage * this.pageSize;
    const endIndex = startIndex + this.pageSize;
    this.paginatedDeliveries = this.filteredDeliveries.slice(startIndex, endIndex);
    this.totalDeliveryElements = this.filteredDeliveries.length;
    this.totalDeliveryPages = Math.ceil(this.totalDeliveryElements / this.pageSize);
  }

  // Méthode appelée lors du changement de recherche
  onDeliverySearchChange(): void {
    this.filterDeliveries();
  }

  // Méthode appelée lors du changement de filtre de statut
  onDeliveryStatusFilterChange(): void {
    this.filterDeliveries();
  }

  // Méthode pour réinitialiser les filtres des livraisons
  resetDeliveryFilters(): void {
    this.searchDeliveryTerm = '';
    this.statusDeliveryFilter = '';
    this.filteredDeliveries = [...this.deliveries];
    this.deliveryCurrentPage = 0;
    this.updatePaginatedDeliveries();
  }

  // Méthode pour les actions sur les livraisons
  onDeliveryAction(action: string, delivery: Delivery, event: Event): void {
    event.stopPropagation();
    this.closeDropdown();

    switch (action) {
      case 'voir':
        this.viewDeliveryDetails(delivery);
        break;
      case 'modifier':
        this.editDelivery(delivery);
        break;
      case 'telecharger':
        this.downloadDeliveryProof(delivery);
        break;
      case 'supprimer':
        this.deleteDelivery(delivery);
        break;
    }
  }

  // Méthodes d'action pour les livraisons
  viewDeliveryDetails(_delivery: Delivery): void { }

  editDelivery(delivery: Delivery): void {
    if (delivery.status === 'Annulée') {
      this.showErrorMessage('Impossible de modifier une livraison annulée');
    }
  }

  downloadDeliveryProof(delivery: Delivery): void {
    if (delivery.proof === 'Aucune') {
      this.showErrorMessage('Aucune preuve disponible pour cette livraison');
    }
  }

  deleteDelivery(_delivery: Delivery): void { }

  // Méthode pour obtenir l'icône selon le type de preuve
  getDeliveryProofIcon(proof: string): string {
    if (proof === 'Aucune') return '';

    const extension = proof.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'jpg':
      case 'jpeg':
      case 'png':
        return '🖼️';
      case 'doc':
      case 'docx':
        return '📝';
      default:
        return '📎';
    }
  }



  // Modifier les méthodes de pagination existantes
  // ===== MÉTHODES DE NAVIGATION LIVRAISONS =====
  previousDeliveryPage(): void {
    if (this.deliveryCurrentPage > 0) {
      this.deliveryCurrentPage--;
      this.loadDeliveries();
    }
  }

  nextDeliveryPage(): void {
    if (this.deliveryCurrentPage < this.totalDeliveryPages - 1) {
      this.deliveryCurrentPage++;
      this.loadDeliveries();
    }
  }

  goToDeliveryPage(page: number): void {
    if (page >= 0 && page < this.totalDeliveryPages && page !== this.deliveryCurrentPage) {
      this.deliveryCurrentPage = page;
      this.loadDeliveries();
    }
  }


  private normalizeDeliveryStatus(displayStatus: string): string[] {
    const statusMapping: { [key: string]: string[] } = {
      'livré': ['DELIVERY', 'DELIVERED'],
      'en cours': ['IN_DELIVERY'],
      'annulé': ['CANCELLED'],
      'en attente': ['PENDING']
    };

    return statusMapping[displayStatus.toLowerCase()] || [];
  }


  // ===== SUPPRESSION MATÉRIEL =====
  confirmDeleteMaterial(material: Material): void {
    this.materialToDelete = material;
    this.showDeleteModal = true;
  }

  cancelDeleteMaterial(): void {
    this.showDeleteModal = false;
    this.materialToDelete = null;
  }

  deleteMaterialConfirmed(): void {
    if (!this.materialToDelete) return;

    this.loading = true;

    this.materialsService.deleteMaterial(this.materialToDelete.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loading = false;
          this.showDeleteModal = false;
          const materialName = this.materialToDelete?.label || '';
          this.materialToDelete = null;

          this.showSuccessMessage(`${materialName} a été supprimé avec succès`);
          this.loadStock();
          this.loadStockMovements();
        },
        error: (error: { status: number; }) => {
          this.loading = false;
          this.showDeleteModal = false;
          this.materialToDelete = null;

          if (error.status === 403) {
            this.showErrorMessage('Accès refusé - Vous n\'avez pas les permissions nécessaires');
          } else if (error.status === 409) {
            this.showErrorMessage('Impossible de supprimer ce matériel car il est lié à des commandes');
          } else {
            this.showErrorMessage('Erreur lors de la suppression du matériel');
          }
        }
      });
  }

  //ABOUBACAR SOW


  showMouvementModal: boolean = false;
  stockAlertsCount = 3;
  openInventoryDropdownIndex: number | null = null;

  toggleInventoryDropdown(index: number, event: MouseEvent) {
    event.stopPropagation(); // IMPORTANT
    this.openInventoryDropdownIndex =
      this.openInventoryDropdownIndex === index ? null : index;
  }

  openOrderDropdownIndex: number | null = null;

  toggleOrderDropdown(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openOrderDropdownIndex =
      this.openOrderDropdownIndex === index ? null : index;
  }


  openDeliveryDropdownIndex: number | null = null;

  toggleDeliveryDropdown(index: number, event: MouseEvent): void {
    event.stopPropagation();
    this.openDeliveryDropdownIndex =
      this.openDeliveryDropdownIndex === index ? null : index;
  }


  showExportDropdown: boolean = false;

  toggleExportDropdown(event: MouseEvent): void {
    event.stopPropagation();
    this.showExportDropdown = !this.showExportDropdown;
  }

  closeDropdown(): void {
    this.openDropdownIndex = null;
    this.openInventoryDropdownIndex = null;
    this.openOrderDropdownIndex = null;
    this.openDeliveryDropdownIndex = null;
  }


  ngAfterViewInit(): void {
    if (this.activeTab === 'statistiques') {
      this.initConsumptionChart();
      this.initEvolutionChart();
    }
  }


  setActiveTab(tab: string): void {
    this.activeTab = tab;

    if (tab === 'statistiques') {
      setTimeout(() => {
        if (this.consommationData.length > 0) {
          this.initConsumptionChart();
        }
        if (this.evolutionData.length > 0) {
          this.initEvolutionChart();
        }
      }, 100);
    }
  }




  initConsumptionChart() {
    const canvas = document.getElementById('consumptionChart') as HTMLCanvasElement;
    if (!canvas) return;

    // Détruire l'ancien graphique s'il existe
    if (this.consommationChart) {
      this.consommationChart.destroy();
    }

    // Préparer les données
    const labels = this.consommationData.map(item => item.materialLabel);
    const data = this.consommationData.map(item => item.totalUsedQuantity);

    // Couleurs dynamiques
    const colors = [
      '#FDEDEC', '#BB8FCE', '#F1948A', '#F7DC6F', '#82E0AA',
      '#85C1E9', '#F8B88B', '#D7BDE2', '#A9DFBF', '#FAD7A0'
    ];

    this.consommationChart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: colors.slice(0, labels.length),
          barPercentage: 0.3,
          categoryPercentage: 0.8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `${context.parsed.y} unités`
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: {
                family: 'Inter',
                size: 12,
                weight: 500
              },
              color: '#34495E'
            },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: {
              font: {
                family: 'Inter',
                size: 11
              },
              color: '#7F8C8D'
            },
            grid: {
              color: '#ECF0F1'
            }
          }
        }
      }
    });
  }

  // ⚠️  initEvolutionChart :
  initEvolutionChart() {
    const canvas = document.getElementById('evolutionChart') as HTMLCanvasElement;
    if (!canvas) return;

    // Détruire l'ancien graphique s'il existe
    if (this.evolutionChart) {
      this.evolutionChart.destroy();
    }

    // Préparer les données
    const labels = this.evolutionData.map(item => {
      const parts = item.date?.split('-');
      if (parts?.length === 2) {
        const month = parseInt(parts[0], 10);
        const year = parseInt(parts[1], 10);
        const date = new Date(year, month - 1, 1);
        return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      }
      return item.date ?? '';
    });
    const entriesData = this.evolutionData.map(item => item.totalEntries);
    const exitsData = this.evolutionData.map(item => item.totalExits);

    this.evolutionChart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Entrées',
            data: entriesData,
            borderColor: '#10B981',
            backgroundColor: 'rgba(16, 185, 129, 0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#10B981'
          },
          {
            label: 'Sorties',
            data: exitsData,
            borderColor: '#FF5C02',
            backgroundColor: 'rgba(255, 92, 2, 0.15)',
            fill: true,
            tension: 0.4,
            pointRadius: 4,
            pointBackgroundColor: '#FF5C02'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              font: { family: 'Inter', size: 12, weight: 500 },
              color: '#34495E'
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: { family: 'Inter', size: 12 },
              color: '#34495E'
            },
            grid: { display: false }
          },
          y: {
            ticks: {
              font: { family: 'Inter', size: 11 },
              color: '#7F8C8D'
            },
            grid: { color: '#ECF0F1' }
          }
        }
      }
    });
  }
  // ===== NOUVELLES MÉTHODES À AJOUTER =====

  viewOrderDetails(order: Order): void {
    if (!order || !order.id) {
      this.showErrorMessage('Commande invalide');
      return;
    }

    // ✅ Réinitialiser AVANT d'ouvrir
    this.orderQuotes = [];
    this.selectedQuote = null;
    this.loadingQuotes = false;
    this.quotesError = null;

    this.selectedOrderDetails = order;
    this.showOrderDetailsModal = true;

    // ✅ Forcer la détection
    this.cdr.detectChanges();

    // ✅ Charger les citations après un délai
    setTimeout(() => {
      this.loadOrderQuotes(order.id);
    }, 200); // Augmenter le délai à 200ms
  }

  /**
   * Charge les citations (quotes) d'une commande
   */
  loadOrderQuotes(orderId: number): void {
    this.loadingQuotes = true;
    this.quotesError = null;
    this.orderQuotes = [];
    this.selectedQuote = null;

    this.commandeService.getQuotes(orderId, 0, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: QuoteResponse) => {
          this.orderQuotes = response.content || [];
          this.loadingQuotes = false;

          // Sélectionner automatiquement la première citation s'il y en a
          if (this.orderQuotes.length > 0) {
            this.selectedQuote = this.orderQuotes[0];
          }

          // Forcer la détection des changements
          this.cdr.detectChanges();
        },
        error: (error) => {
          this.loadingQuotes = false;

          if (error.status === 404) {
            this.quotesError = 'Aucune citation trouvée pour cette commande';
          } else if (error.status === 403) {
            this.quotesError = 'Accès refusé';
          } else {
            this.quotesError = 'Erreur lors du chargement des citations';
          }

          this.cdr.detectChanges();
        }
      });
  }


  selectQuote(quote: Quote): void {
    this.selectedQuote = quote;
  }

  // ===== MÉTHODE closeOrderDetailsModal() - VÉRIFIER =====
  closeOrderDetailsModal(): void {
    this.showOrderDetailsModal = false;
    this.selectedOrderDetails = null;
    this.orderQuotes = [];
    this.selectedQuote = null;
    this.quotesError = null;
    this.loadingQuotes = false;
  }

  /**
   * Formate la date d'upload de la citation
   */
  /**
   * Formate la date de citation depuis le format LocalDateTime
   * Format: [year, month, day, hour, minute, second, nanosecond]
   * Exemple: [2025, 6, 9, 18, 38, 13, 99096000]
   */
  formatQuoteDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) {
      return 'N/A';
    }

    // Extraction des composants (nanoseconds ignorées)
    const [year, month, day, hours = 0, minutes = 0, seconds = 0] = dateArray;

    // Validation des valeurs
    if (!year || !month || !day) {
      return 'N/A';
    }

    // Création de la date (month - 1 car JS utilise 0-11 pour les mois)
    const date = new Date(year, month - 1, day, hours, minutes, seconds);

    // Vérification que la date est valide
    if (isNaN(date.getTime())) {
      return 'N/A';
    }

    // Format: DD/MM/YYYY HH:mm
    const formattedDate = date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    const formattedTime = date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });

    return `${formattedDate} ${formattedTime}`;
  }

  /**
   * Formate le montant avec séparateurs de milliers
   */
  formatAmount(amount: number | null | undefined): string {
    if (amount === null || amount === undefined || isNaN(amount)) {
      return '0';
    }
    return amount.toLocaleString('fr-FR');
  }

  /**
   * Récupère le nom complet du fournisseur de manière sécurisée
   */
  getSupplierFullName(quote: Quote | null): string {
    if (!quote || !quote.generedBy) {
      return 'N/A';
    }
    const { prenom, nom } = quote.generedBy;
    if (!prenom && !nom) {
      return 'Fournisseur inconnu';
    }
    return `${prenom || ''} ${nom || ''}`.trim();
  }

  /**
   * Récupère le téléphone du fournisseur de manière sécurisée
   */
  getSupplierPhone(quote: Quote | null): string {
    if (!quote || !quote.generedBy || !quote.generedBy.telephone) {
      return 'N/A';
    }
    return quote.generedBy.telephone;
  }

  /**
   * Récupère l'email du fournisseur de manière sécurisée (si nécessaire)
   */
  getSupplierEmail(quote: Quote | null): string {
    if (!quote || !quote.generedBy || !quote.generedBy.email) {
      return 'N/A';
    }
    return quote.generedBy.email;
  }

  /**
   * Récupère la société du fournisseur de manière sécurisée
   */
  getSupplierCompany(quote: Quote | null): string {
    if (!quote || !quote.generedBy || !quote.generedBy.company) {
      return 'N/A';
    }
    return quote.generedBy.company;
  }

}