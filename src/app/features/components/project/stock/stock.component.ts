import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule, FormArray } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { MaterialsService, MaterialsResponse, Order,CreateOrder } from '../../../../../services/materials.service';
import { CommonModule } from '@angular/common';
import { UnitParameterService } from '../../../../core/services/unite-parametre.service';
import { UnitParameter,PaginatedResponse } from '../../../../models/unit-parameter';
import { PropertyTypeService } from '../../../../core/services/property-type.service';
import { PropertyType } from '../../../../models/property-type';
import { StatistiqueComponent } from "../../statistique/statistique.component";
import { DashboardService, CriticalMaterial } from '../../../../../services/dashboard.service';
import { ActivatedRoute } from '@angular/router';



// Ajoutez ces interfaces au début du fichier avec les autres interfaces
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
// Interfaces pour le service
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
}

interface CreateMaterial {
  label: string;
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
  id: number;
  number: string;
  date: string;
  command: string;
  supplier: string;
  status: 'Complète' | 'Partielle' | 'Annulée';
  proof: string;
}
// Ajoutez ces interfaces en haut du fichier avec les autres interfaces
interface StockMovement {
  id: number;
  material: Material;
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  movementDate: number[];
  comment: string;
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

interface CreateStockMovement {
  materialId: number;
  quantity: number;
  type: 'ENTRY' | 'EXIT';
  comment: string;
}


@Component({
  selector: 'app-stock',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, StatistiqueComponent],
  templateUrl: './stock.component.html',
  styleUrls: ['./stock.component.css']
})
export class StockComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  // Ajoutez ces propriétés à la classe StockComponent
  stockAlertes: StockAlerte[] = [];

orders: Order[] = [];
paginatedOrders: Order[] = [];
totalOrderElements: number = 0;
totalOrderPages: number = 0;
orderCurrentPage: number = 0;
showOrderModal: boolean = false;
// propertyId: number = 1; // Vous pouvez le rendre dynamique si nécessaire

orderForm: FormGroup;
    // Dans la classe StockComponent, ajoutez ces propriétés
  movements: StockMovement[] = [];
  paginatedMovements: StockMovement[] = [];
  totalMovementElements: number = 0;
  totalMovementPages: number = 0;
  movementCurrentPage: number = 0;
  // Matériaux critiques
criticalMaterials: CriticalMaterial[] = [];
criticalMaterialsLoading: boolean = false;
criticalMaterialsError: string | null = null;
totalCriticalMaterials: number = 0;
criticalMaterialsPage: number = 0;
criticalMaterialsPageSize: number = 5;
  

  units: UnitParameter[] = [];
  properties: PropertyType[] = [];
  
  // Propriété par défaut (à adapter selon vos besoins)
  // currentPropertyId: number = 1;
  propertyId!: number; // Dynamique depuis l'URL
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
  selectedMaterial: Material | null = null;

  searchTerm: string = '';
  selectedCategory: string = '';
  selectedStockStatus: string = '';

  currentPage: number = 0;
  itemsPerPage: number = 10;
  totalPages: number = 0;
  totalElements: number = 0;

  materialForm: FormGroup;
  movementForm: FormGroup;
  currentSortField: string = 'label';
  currentSortDirection: 'asc' | 'desc' = 'asc';
  data: MaterialsResponse | null = null;
  dashboardService: any;

  constructor(
    private fb: FormBuilder,
    private materialsService: MaterialsService,
    private unitParameterService: UnitParameterService,
    private propertyService: PropertyTypeService,
    private route: ActivatedRoute
  ) {
    this.materialForm = this.fb.group({
      label: ['', [Validators.required, Validators.minLength(2)]],
      quantity: [0, [Validators.required, Validators.min(0)]],
      criticalThreshold: [0, [Validators.required, Validators.min(0)]],
      unitId: [1, [Validators.required, Validators.min(1)]],
      propertyId: [this.propertyId, [Validators.required, Validators.min(1)]]
    });
    this.orderForm = this.fb.group({
      propertyId: [1, Validators.required],
      materials: this.fb.array([
        this.fb.group({
          materialId: ['', Validators.required],
          quantity: [1, [Validators.required, Validators.min(1)]]
        })
      ])
    });

    this.movementForm = this.fb.group({
      type: ['ENTRY', Validators.required],
      quantity: [0, [Validators.required, Validators.min(1)]],
      reference: ['', Validators.required],
      comment: ['']
    });
  }

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    if (idFromUrl) {
      this.propertyId = +idFromUrl;
      this.materialForm.patchValue({ propertyId: this.propertyId });
  
      this.loadStock();
      this.loadStockMovements();
      this.loadOrders();
      this.loadMockDeliveries();
      this.loadRecentMovements();
      this.loadUnits();
      this.loadProperties();
      this.loadCriticalMaterials(); // Ajoutez cette ligne
    } else {
      console.error("ID de propriété non trouvé dans l'URL.");
    }
  }
  

/**
 * Charge les matériaux critiques
//  */
// loadCriticalMaterials(): void {
//   this.criticalMaterialsLoading = true;
//   this.criticalMaterialsError = null;
  
//   this.dashboardService.materiauxCritique(this.criticalMaterialsPage, this.criticalMaterialsPageSize)
//     .pipe(takeUntil(this.destroy$))
//     .subscribe({
//       next: (response: any) => {
//         this.criticalMaterials = response.content || [];
//         this.totalCriticalMaterials = response.totalElements || 0;
//         this.criticalMaterialsLoading = false;
//       },
//       error: (error: any) => {
//         console.error('Erreur lors du chargement des matériaux critiques:', error);
//         this.criticalMaterialsLoading = false;
//         this.criticalMaterialsError = 'Erreur lors du chargement des matériaux critiques';
//       }
//     });
// }

/**
 * Calcule le pourcentage de stock par rapport au seuil critique
 */
getStockPercentage(material: any): number {
  if (!material.criticalThreshold || material.criticalThreshold === 0) {
    return material.quantity > 0 ? 100 : 0;
  }
  
  const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * Corrigez votre méthode loadCriticalMaterials pour utiliser le bon service
 */


// Ajoutez Math à votre composant pour l'utiliser dans le template
Math = Math;

/**
 * Change la page des matériaux critiques
 */
changeCriticalMaterialsPage(page: number): void {
  this.criticalMaterialsPage = page;
  this.loadCriticalMaterials();
}

/**
 * Ouvre le modal de création de commande
 */
openOrderModal(): void {
  this.showOrderModal = true;
}

/**
 * Ferme le modal de création de commande
 */
closeOrderModal(): void {
  this.showOrderModal = false;
  this.orderForm.reset({
    propertyId: this.propertyId,
    materials: [{ materialId: '', quantity: 1 }]
  });
}
/**
 * Calcule le montant total d'une commande
 * @param order La commande pour laquelle calculer le total
 * @returns Le montant total de la commande
 */
calculateOrderTotal(order: Order): number {
  if (!order.items || order.items.length === 0) {
    return 0;
  }
  
  return order.items.reduce((total, item) => {
    return total + (item.quantity * item.unitPrice);
  }, 0);
}

/**
 * Ajoute un nouveau matériau au formulaire de commande
 */
addMaterialToOrder(): void {
  const materials = this.orderForm.get('materials') as FormArray;
  materials.push(this.fb.group({
    materialId: ['', Validators.required],
    quantity: [1, [Validators.required, Validators.min(1)]]
  }));
}

/**
 * Supprime un matériau du formulaire de commande
 */
removeMaterialFromOrder(index: number): void {
  const materials = this.orderForm.get('materials') as FormArray;
  if (materials.length > 1) {
    materials.removeAt(index);
  }
}

/**
 * Soumet la commande
 */
onSubmitOrder(): void {
  if (this.orderForm.valid && !this.loading) {
    this.loading = true;
    
    const orderData: CreateOrder = {
      propertyId: this.orderForm.value.propertyId,
      materials: this.orderForm.value.materials
    };
    
    this.materialsService.createCommand(orderData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdOrder) => {
          this.loading = false;
          this.closeOrderModal();
          this.loadOrders(); // Recharger la liste des commandes
          this.showSuccessMessage('Commande créée avec succès !');
        },
        error: (error) => {
          this.loading = false;
          console.error('Erreur lors de la création de la commande:', error);
          this.showErrorMessage('Erreur lors de la création de la commande');
        }
      });
  }
}
// Ajoutez ces méthodes à la classe StockComponent

/**
 * Charge les commandes en attente
 */
loadOrders(): void {
  this.loading = true;
  
  this.materialsService.getCommand(this.propertyId, this.orderCurrentPage, this.itemsPerPage)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        this.orders = response.content || [];
        this.totalOrderElements = response.totalElements || 0;
        this.totalOrderPages = response.totalPages || 0;
        this.paginatedOrders = this.orders;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des commandes:', error);
        this.loading = false;
        
        if (error.status === 403) {
          this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
        } else if (error.status === 401) {
          this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
        } else if (error.status === 404) {
          this.showErrorMessage('Aucune commande trouvée');
        } else {
          this.showErrorMessage('Erreur lors du chargement des commandes');
        }
      }
    });
}

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }



  /**
   * Charge les stocks pour la propriété courante
   */
/**
 * Charge les stocks pour la propriété courante
 */
loadStock(): void {
  this.loading = true;
  
  // Vérifier si propertyId est valide
  if (!this.propertyId || this.propertyId <= 0) {
    console.error('ID de propriété invalide:', this.propertyId);
    this.showErrorMessage('ID de propriété invalide');
    this.loading = false;
    return;
  }


  console.log(`Chargement du stock pour la propriété ${this.propertyId}`);
  
  this.materialsService.getStock(this.propertyId, this.currentPage, this.pageSize)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: MaterialsResponse) => {
        console.log('Réponse reçue:', response);
        this.data = response;
        this.materials = response.content || [];
        this.totalElements = response.totalElements || 0;
        this.totalPages = response.totalPages || 0;
        this.filteredMaterials = this.materials;
        this.paginatedMaterials = this.materials;
        this.generateStockAlerts();
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur complète lors du chargement du stock:', error);
        this.loading = false;
        
        // Gestion spécifique des erreurs
        if (error.status === 403) {
          this.showErrorMessage('Accès refusé - Vérifiez vos permissions pour cette propriété');
        } else if (error.status === 401) {
          this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
          // Optionnel : rediriger vers la page de connexion
          // this.router.navigate(['/login']);
        } else if (error.status === 404) {
          this.showErrorMessage('Propriété non trouvée');
        } else if (error.status === 0) {
          this.showErrorMessage('Erreur de connexion - Vérifiez votre connexion internet');
        } else {
          this.showErrorMessage(error.message || 'Erreur lors du chargement du stock');
        }
      }
    });
}


  getFormattedDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const [year, month, day] = dateArray;
    return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
  }
/**
 * Charge les livraisons pour la propriété courante
 * Cette méthode peut être adaptée pour utiliser une vraie API de livraisons
 */
loadMockDeliveries(): void {
  this.loading = true;
  
  // Si vous avez une API pour les livraisons, remplacez cette partie par un appel API
  // this.materialsService.getDeliveries(this.propertyId, this.currentPage, this.pageSize)
  
  // Pour l'instant, on génère des données mockées basées sur les commandes existantes
  setTimeout(() => {
    try {
      // Générer des livraisons mockées basées sur les commandes
      this.deliveries = this.generateMockDeliveries();
      this.loading = false;
      
      console.log('Livraisons chargées:', this.deliveries);
    } catch (error) {
      console.error('Erreur lors du chargement des livraisons:', error);
      this.loading = false;
      this.showErrorMessage('Erreur lors du chargement des livraisons');
    }
  }, 500); // Simulation d'un délai réseau
}

/**
 * Génère des livraisons mockées pour la démonstration
 * Cette méthode peut être supprimée quand vous aurez une vraie API
 */
private generateMockDeliveries(): Delivery[] {
  const mockDeliveries: Delivery[] = [];
  const statuses: Array<'Complète' | 'Partielle' | 'Annulée'> = ['Complète', 'Partielle', 'Annulée'];
  const suppliers = ['Fournisseur A', 'Fournisseur B', 'Fournisseur C', 'Fournisseur Global'];
  
  // Générer 10 livraisons d'exemple
  for (let i = 1; i <= 10; i++) {
    const randomDate = new Date();
    randomDate.setDate(randomDate.getDate() - Math.floor(Math.random() * 30)); // Dates des 30 derniers jours
    
    const delivery: Delivery = {
      id: i,
      number: `LIV-${i.toString().padStart(4, '0')}`,
      date: randomDate.toLocaleDateString('fr-FR'),
      command: `CMD-${(i + 100).toString().padStart(4, '0')}`,
      supplier: suppliers[Math.floor(Math.random() * suppliers.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      proof: Math.random() > 0.3 ? `Bon_livraison_${i}.pdf` : 'Aucune'
    };
    
    mockDeliveries.push(delivery);
  }
  
  // Trier par date (plus récent en premier)
  return mockDeliveries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}



  /**
   * Crée un nouveau stock
   */
  onSaveNewStock(): void {
    if (this.materialForm.valid && !this.loading) {
      this.loading = true;
  
      const newMaterial: CreateMaterial = {
        label: this.materialForm.value.label,
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
            console.error('Erreur lors de l\'ajout:', error);
            
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

  /**
   * Charge les unités
   */
  loadUnits(): void {
    this.unitParameterService.units$
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: PaginatedResponse<UnitParameter> | null) => {
          if (res) {
            this.units = res.content;
          }
        },
        error: (err) => {
          console.error('Erreur lors du chargement des unités', err);
        }
      });

    this.unitParameterService.getUnits({ page: 0, size: this.pageSize });
  }
  
  /**
   * Charge les propriétés
   */
  loadProperties(): void {
    this.propertyService.getAll()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: PropertyType[]) => {
          this.properties = response;
        },
        error: (err) => {
          console.error('Erreur lors de la récupération des propriétés:', err);
        }
      });
  }

  /**
   * Génère les alertes de stock
   */
  generateStockAlerts(): void {
    this.stockAlerts = [];
    this.materials.forEach(material => {
      const status = this.getMaterialStatus(material);
      if (status === 'CRITICAL' || status === 'LOW') {
        const alert: StockAlert = {
          id: material.id,
          message: `${material.label} - ${material.quantity} ${material.unit.code} restant${material.quantity > 1 ? 's' : ''}`,
          createdAt: new Date(),
          materialId: material.id
        };
        this.stockAlerts.push(alert);
      }
    });
  }
  

/**
 * Charge les mouvements récents depuis l'API
 */
loadRecentMovements(): void {
  this.loading = true;
  
  if (!this.propertyId || this.propertyId <= 0) {
    console.error('ID de propriété invalide:', this.propertyId);
    this.showErrorMessage('ID de propriété invalide');
    this.loading = false;
    return;
  }

  console.log(`Chargement des mouvements récents pour la propriété ${this.propertyId}`);
  
  // Charger seulement les 5 derniers mouvements pour les mouvements récents
  this.materialsService.getStockMove(this.propertyId, 0, 5)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: StockMovementsResponse) => {
        console.log('Mouvements récents reçus:', response);
        
        if (response.content && response.content.length > 0) {
          // Transformer les données de l'API en format Movement
          this.recentMovements = response.content.map(movement => ({
            id: movement.id,
            type: movement.type === 'ENTRY' ? 'ENTRY' : 'OUT' as 'ENTRY' | 'OUT' | 'ADJUSTMENT',
            quantity: movement.quantity,
            reference: `MVT-${movement.id.toString().padStart(4, '0')}`,
            comment: movement.comment,
            date: this.formatMovementDate(movement.movementDate),
            time: this.getTimeFromDateArray(movement.movementDate),
            description: `${movement.quantity} ${movement.material.unit.code} de ${movement.material.label}`,
            location: movement.material.property.name,
            materialId: movement.material.id
          }));
        } else {
          this.recentMovements = [];
        }
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des mouvements récents:', error);
        this.loading = false;
        
        // En cas d'erreur, initialiser avec un tableau vide
        this.recentMovements = [];
        
        if (error.status === 403) {
          this.showErrorMessage('Accès refusé - Vérifiez vos permissions');
        } else if (error.status === 401) {
          this.showErrorMessage('Session expirée - Veuillez vous reconnecter');
        } else if (error.status === 404) {
          console.log('Aucun mouvement trouvé pour cette propriété');
          // Ne pas afficher d'erreur pour 404, c'est normal s'il n'y a pas de mouvements
        } else {
          this.showErrorMessage('Erreur lors du chargement des mouvements récents');
        }
      }
    });
}

  // Méthodes utilitaires (existantes)
  getMaterialName(material: Material): string {
    return material.label || 'N/A';
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
    const texts = {
      'NORMAL': 'Stock normal',
      'LOW': 'Stock faible',
      'CRITICAL': 'Rupture de stock'
    };
    return texts[status as keyof typeof texts] || 'Inconnu';
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
    const texts = {
      'ENTRY': 'Entrée',
      'OUT': 'Sortie',
      'ADJUSTMENT': 'Ajustement'
    };
    return texts[type as keyof typeof texts] || type;
  }

  getDeliveryStatusClass(status: string): string {
    const classes = {
      'Complète': 'bg-green-100 text-green-800',
      'Partielle': 'bg-yellow-100 text-yellow-800',
      'Annulée': 'bg-red-100 text-red-800'
    };
    return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
  }

  /**
 * Méthode pour déboguer et vérifier l'authentification
 */
checkAuthStatus(): void {
  console.log('=== DEBUG AUTHENTIFICATION ===');
  console.log('localStorage auth_token:', localStorage.getItem('auth_token'));
  console.log('localStorage token:', localStorage.getItem('token'));
  console.log('sessionStorage auth_token:', sessionStorage.getItem('auth_token'));
  console.log('sessionStorage token:', sessionStorage.getItem('token'));
  console.log('Property ID:', this.propertyId);
  console.log('Current page:', this.currentPage);
  console.log('Page size:', this.pageSize);
  console.log('================================');
}

testApiConnection(): void {
  console.log('Test de connexion à l\'API...');
  
  this.materialsService.checkTokenValidity()
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response) => {
        console.log('Token valide:', response);
        this.showSuccessMessage('Connexion API réussie');
      },
      error: (error) => {
        console.error('Erreur de connexion API:', error);
        this.showErrorMessage('Erreur de connexion à l\'API');
      }
    });
}
  // Méthodes d'interaction (existantes)
  filterMaterials(): void {
    this.filteredMaterials = this.materials.filter(material => {
      const matchesSearch = !this.searchTerm || this.getMaterialName(material).toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = !this.selectedStockStatus || this.getMaterialStatus(material) === this.selectedStockStatus;
      return matchesSearch && matchesStatus;
    });
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

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  toggleDropdown(index: number, event: Event): void {
    event.stopPropagation();
    this.openDropdownIndex = this.openDropdownIndex === index ? null : index;
  }

  closeDropdown(): void {
    this.openDropdownIndex = null;
  }

  // Méthodes de modal (existantes)
  openNewMaterialModal(): void {
    this.showNewMaterialModal = true;
    this.resetMaterialForm();
  }

  closeNewMaterialModal(): void {
    this.showNewMaterialModal = false;
    this.resetMaterialForm();
  }

   // Modifiez la méthode openMovementModal pour initialiser le formulaire avec le matériau sélectionné
openMovementModal(material: Material): void {
  this.selectedMaterial = material;
  this.showMovementModal = true;
  this.resetMovementForm();
  
  // Pré-remplir le type en fonction du stock
  const suggestedType = material.quantity <= material.criticalThreshold ? 'ENTRY' : 'OUT';
  this.movementForm.patchValue({
    type: suggestedType,
    quantity: 1
  });
}
loadStockMovements(): void {
  this.loading = true;
  
  if (!this.propertyId || this.propertyId <= 0) {
    console.error('ID de propriété invalide:', this.propertyId);
    this.showErrorMessage('ID de propriété invalide');
    this.loading = false;
    return;
  }

  console.log(`Chargement des mouvements pour la propriété ${this.propertyId}`);
  
  this.materialsService.getStockMove(this.propertyId, this.movementCurrentPage, this.itemsPerPage)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: StockMovementsResponse) => {
        console.log('Mouvements reçus:', response);
        this.movements = response.content || [];
        this.totalMovementElements = response.totalElements || 0;
        this.totalMovementPages = response.totalPages || 0;
        this.paginatedMovements = this.movements;
        this.loading = false;
        
        // Mettre à jour aussi les mouvements récents si nécessaire
        this.updateRecentMovements();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des mouvements:', error);
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

/**
 * Met à jour les mouvements récents à partir des données réelles
 */
updateRecentMovements(): void {
  // Prendre les 3 derniers mouvements pour l'affichage dans le tableau de bord
  const recent = this.movements.slice(0, 3).map(movement => ({
    id: movement.id,
    type: movement.type === 'ENTRY' ? 'ENTRY' : 'OUT' as 'ENTRY' | 'OUT' | 'ADJUSTMENT', // Conversion explicite
    quantity: movement.quantity,
    reference: `MVT-${movement.id}`,
    date: this.formatMovementDate(movement.movementDate),
    time: this.getTimeFromDateArray(movement.movementDate),
    description: `${movement.quantity} ${movement.material.unit.code} de ${movement.material.label}`,
    location: movement.material.property.name,
    materialId: movement.material.id
  }));
  
  this.recentMovements = [...recent, ...this.recentMovements.slice(0, 3 - recent.length)] as Movement[];
}

/**
 * Formate une date de mouvement
 */
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
  
  return `${day.toString().padStart(2, '0')}/${month.toString().padStart(2, '0')}/${year}`;
}

/**
 * Extrait l'heure d'un tableau de date
 */
getTimeFromDateArray(dateArray: number[]): string {
  if (!dateArray || dateArray.length < 5) return '00:00';
  const [_, __, ___, hours, minutes] = dateArray;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}


/**
 * Méthode améliorée pour créer un mouvement de stock
 * avec mise à jour automatique des mouvements récents
 */
onCreateMovement(): void {
  if (this.movementForm.valid && this.selectedMaterial && !this.loading) {
    this.loading = true;
    
    const newMovement: CreateStockMovement = {
      materialId: this.selectedMaterial.id,
      quantity: this.movementForm.value.quantity,
      type: this.movementForm.value.type,
      comment: this.movementForm.value.comment || ''
    };
    
    this.materialsService.createStockMove(newMovement)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdMovement) => {
          console.log('Mouvement créé:', createdMovement);
          this.loading = false;
          this.closeMovementModal();
          
          // Mettre à jour immédiatement les mouvements récents
          this.addToRecentMovements(createdMovement, this.selectedMaterial!);
          
          // Recharger les données en arrière-plan
          this.loadStock();
          this.loadStockMovements();
          
          this.showSuccessMessage('Mouvement enregistré avec succès !');
        },
        error: (error) => {
          this.loading = false;
          console.error('Erreur lors de la création du mouvement:', error);
          
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

private addToRecentMovements(createdMovement: any, material: Material): void {
 const now = new Date();
 const newRecentMovement: Movement = {
   id: createdMovement.id || Date.now(),
   type: createdMovement.type,
   quantity: createdMovement.quantity,
   reference: `MVT-${(createdMovement.id || Date.now()).toString().padStart(4, '0')}`,
   comment: createdMovement.comment,
   date: 'À l\'instant',
   time: now.toLocaleTimeString('fr-FR', { 
     hour: '2-digit', 
     minute: '2-digit' 
   }),
   description: `${createdMovement.quantity} ${material.unit.code} de ${material.label}`,
   location: material.property.name,
   materialId: material.id
 };
 
 // Ajouter au début de la liste et garder seulement les 5 derniers
 this.recentMovements.unshift(newRecentMovement);
 this.recentMovements = this.recentMovements.slice(0, 5);
}


  closeMovementModal(): void {
    this.showMovementModal = false;
    this.selectedMaterial = null;
    this.resetMovementForm();
  }

  resetMaterialForm(): void {
    this.materialForm.reset({
      label: '',
      quantity: 0,
      criticalThreshold: 0,
      unitId: 1,
      propertyId: this.propertyId
    });
  }

  resetMovementForm(): void {
    this.movementForm.reset({
      type: 'ENTRY',
      quantity: 0,
      reference: '',
      comment: ''
    });
  }

  // Méthodes de validation (existantes)
  isFormValid(): boolean {
    return this.materialForm.valid;
  }

  isFieldInvalid(fieldName: string): boolean {
    const field = this.materialForm.get(fieldName);
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
      // if (ield.errors['min']) {
      //   return `La valeur doit être supérieure ou égale à ${field.errors['min'].min}`;
      // }
    }
    return '';
  }

  // Méthodes d'actions (existantes)
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

  onSubmit(): void {
    this.onSaveNewStock();
  }

  editMaterial(material: Material): void {
    console.log('Modifier', material);
  }

  orderMaterial(material: Material): void {
    console.log('Commander', material);
  }

  showMaterialHistory(material: Material): void {
    console.log('Historique', material);
  }

  deleteMaterial(material: Material): void {
    if (confirm(`Supprimer "${material.label}" ?`)) {
      console.log('Supprimer', material);
    }
  }

  showSuccessMessage(message: string): void {
    console.log('✅', message);
  }

  showErrorMessage(message: string): void {
    console.error('❌', message);
  }

  get displayCurrentPage(): number {
    return this.currentPage + 1;
  }

  // Ajoutez ces méthodes à votre classe StockComponent

// ===== MÉTHODES DE PAGINATION DES COMMANDES =====

/**
 * Va à la page précédente des commandes
 */
previousOrderPage(): void {
  if (this.orderCurrentPage > 0) {
    this.orderCurrentPage--;
    this.loadOrders();
  }
}

/**
 * Va à la page suivante des commandes
 */
nextOrderPage(): void {
  if (this.orderCurrentPage < this.totalOrderPages - 1) {
    this.orderCurrentPage++;
    this.loadOrders();
  }
}

/**
 * Va à une page spécifique des commandes
 */
goToOrderPage(page: number): void {
  if (page >= 0 && page < this.totalOrderPages && page !== this.orderCurrentPage) {
    this.orderCurrentPage = page;
    this.loadOrders();
  }
}

/**
 * Génère les numéros de pages pour la pagination
 */
getOrderPageNumbers(): number[] {
  const pages: number[] = [];
  const maxPages = 5; // Nombre maximum de pages à afficher
  
  let startPage = Math.max(0, this.orderCurrentPage - Math.floor(maxPages / 2));
  let endPage = Math.min(this.totalOrderPages - 1, startPage + maxPages - 1);
  
  // Ajuster si on est proche du début
  if (endPage - startPage < maxPages - 1) {
    startPage = Math.max(0, endPage - maxPages + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  return pages;
}

// ===== MÉTHODES DE GESTION DES STATUTS =====

/**
 * Retourne la classe CSS pour le statut de la commande
 */
getOrderStatusClass(status: string): string {
  const classes = {
    'EN_ATTENTE': 'bg-yellow-100 text-yellow-800',
    'CONFIRMEE': 'bg-blue-100 text-blue-800',
    'EN_COURS': 'bg-purple-100 text-purple-800',
    'LIVREE': 'bg-green-100 text-green-800',
    'ANNULEE': 'bg-red-100 text-red-800',
    'PARTIELLEMENT_LIVREE': 'bg-orange-100 text-orange-800'
  };
  return classes[status as keyof typeof classes] || 'bg-gray-100 text-gray-800';
}

/**
 * Retourne le texte à afficher pour le statut
 */
getOrderStatusText(status: string): string {
  const texts = {
    'EN_ATTENTE': 'En attente',
    'CONFIRMEE': 'Confirmée',
    'EN_COURS': 'En cours',
    'LIVREE': 'Livrée',
    'ANNULEE': 'Annulée',
    'PARTIELLEMENT_LIVREE': 'Partiellement livrée'
  };
  return texts[status as keyof typeof texts] || status;
}

// ===== MÉTHODES D'ACTIONS SUR LES COMMANDES =====

/**
 * Gère les actions sur les commandes (voir, modifier, dupliquer, annuler)
 */
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

/**
 * Affiche les détails d'une commande
 */
viewOrderDetails(order: Order): void {
  console.log('Voir détails de la commande:', order);
  // Implémentez ici l'ouverture d'un modal ou la navigation vers une page de détails
  // Par exemple:
  // this.router.navigate(['/orders', order.id]);
  // ou ouvrir un modal avec les détails
}

/**
 * Modifie une commande
 */
editOrder(order: Order): void {
  if (order.status === 'LIVREE' || order.status === 'ANNULEE') {
    this.showErrorMessage('Impossible de modifier une commande livrée ou annulée');
    return;
  }

  console.log('Modifier la commande:', order);
  // Implémentez ici la logique de modification
  // Par exemple, pré-remplir le formulaire avec les données de la commande
}

/**
 * Duplique une commande
 */
duplicateOrder(order: Order): void {
  console.log('Dupliquer la commande:', order);
  
  // Pré-remplir le formulaire avec les données de la commande existante
  if (order.materials && order.materials.length > 0) {
    const materialsArray = this.orderForm.get('materials') as FormArray;
    
    // Vider le FormArray
    while (materialsArray.length !== 0) {
      materialsArray.removeAt(0);
    }
    
    // Ajouter les matériaux de la commande à dupliquer
    order.materials.forEach((material: { id: any; quantity: any; }) => {
      materialsArray.push(this.fb.group({
        materialId: [material.id, Validators.required],
        quantity: [material.quantity || 1, [Validators.required, Validators.min(1)]]
      }));
    });
  }
  
  // Définir le fournisseur
  this.orderForm.patchValue({
    propertyId: order.supplier?.id || this.propertyId
  });
  
  // Ouvrir le modal
  this.openOrderModal();
}

/**
 * Annule une commande
 */
cancelOrder(order: Order): void {
  if (order.status === 'LIVREE' || order.status === 'ANNULEE') {
    this.showErrorMessage('Impossible d\'annuler une commande déjà livrée ou annulée');
    return;
  }

  const confirmMessage = `Êtes-vous sûr de vouloir annuler la commande CMD-${order.id.toString().padStart(4, '0')} ?`;

}

// ===== MÉTHODES UTILITAIRES =====

/**
 * Ferme le dropdown des actions
 */


/**
 * Obtient le FormArray des matériaux pour le formulaire de commande
 */
get orderMaterials(): FormArray {
  return this.orderForm.get('materials') as FormArray;
}

/**
 * Obtient le statut d'un matériau critique
 */
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

/**
 * Calcule le pourcentage de stock pour un matériau critique
 */
getCriticalMaterialStockPercentage(material: CriticalMaterial): number {
  if (!material.criticalThreshold || material.criticalThreshold === 0) {
    return material.quantity > 0 ? 100 : 0;
  }
  
  const percentage = (material.quantity / (material.criticalThreshold * 2)) * 100;
  return Math.min(Math.max(percentage, 0), 100);
}

/**
 * Obtient le nom d'un matériau critique
 */
getCriticalMaterialName(material: CriticalMaterial): string {
  return material.label || 'N/A';
}

/**
 * Obtient l'unité d'un matériau critique
 */
getCriticalMaterialUnit(material: CriticalMaterial): string {
  return material.unit?.code || material.unit?.label || 'N/A';
}

// Solution 3: Modifier la méthode loadCriticalMaterials pour s'assurer du bon type
/**
 * Charge les matériaux critiques - Version corrigée
 */
loadCriticalMaterials(): void {
  this.criticalMaterialsLoading = true;
  this.criticalMaterialsError = null;
  
  // Vérifiez que dashboardService est bien injecté
  if (!this.dashboardService) {
    console.error('DashboardService n\'est pas injecté');
    this.criticalMaterialsLoading = false;
    this.criticalMaterialsError = 'Service indisponible';
    return;
  }
  
  this.dashboardService.materiauxCritique(this.criticalMaterialsPage, this.criticalMaterialsPageSize)
    .pipe(takeUntil(this.destroy$))
    .subscribe({
      next: (response: any) => {
        // Assurez-vous que les données correspondent au type attendu
        this.criticalMaterials = (response.content || []).map((item: any) => ({
          ...item,
          // Ajoutez les propriétés manquantes si nécessaire
          createdAt: item.createdAt || [new Date().getFullYear(), new Date().getMonth() + 1, new Date().getDate()]
        }));
        this.totalCriticalMaterials = response.totalElements || 0;
        this.criticalMaterialsLoading = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des matériaux critiques:', error);
        this.criticalMaterialsLoading = false;
        this.criticalMaterialsError = 'Erreur lors du chargement des matériaux critiques';
      }
    });
}


}

// le html 
 
