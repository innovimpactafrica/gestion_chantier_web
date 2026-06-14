import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, Order, OrderItem, CreateQuoteRequest, CreateQuoteItemRequest } from './../../../../services/commande.service';
import { AuthService } from './../../../features/auth/services/auth.service';
import { LanguageService } from './../../../core/services/language.service';
import { forkJoin, of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';

interface ExtendedOrder extends Order {
  isStatic?: boolean;
}

type ModalAction = 'validate' | 'reject' | 'delete';

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-commandes',
  templateUrl: './commandes.component.html',
  styleUrls: ['./commandes.component.css']
})
export class CommandesComponent implements OnInit, OnDestroy {
  @ViewChild('modalContent') modalContent!: ElementRef;

  searchTerm: string = '';
  selectedPeriod: string = 'Période';
  selectedStatus: string = 'Statut';
  showModal: boolean = false;
  selectedCommande: ExtendedOrder | null = null;

  // Modals de confirmation
  showConfirmModal: boolean = false;
  confirmModalAction: ModalAction | null = null;

  // Gestion des citations (quotes)
  isCreatingQuote: boolean = false;
  quoteItems: Map<number, number> = new Map();
  quoteSuccess: boolean = false;
  quoteError: string | null = null;

  // Noms des matériaux résolus (materialId → label)
  materialNames: Map<number, string> = new Map();
  isLoadingMaterials: boolean = false;

  // Données dynamiques
  commandes: ExtendedOrder[] = [];
  filteredCommandes: ExtendedOrder[] = [];
  loading: boolean = true;
  error: string | null = null;
  isProcessing: boolean = false;

  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;

  // ID du fournisseur (dynamique depuis l'utilisateur connecté)
  supplierId: number | null = null;

  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();

  // Propriété Math pour utilisation dans le template
  Math = Math;

  constructor(
    private commandeService: CommandeService,
    private authService: AuthService,
    private languageService: LanguageService
  ) { }

  ngOnInit() {
    this.initializeSupplierId();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  /**
   * Initialise l'ID du fournisseur à partir de l'utilisateur connecté
   */
  private initializeSupplierId(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();

      if (user && user.id) {
        this.supplierId = user.id;
        this.loadCommandes();
      } else {
        const refreshSubscription = this.authService.refreshUser().subscribe({
          next: (refreshedUser) => {
            if (refreshedUser && refreshedUser.id) {
              this.supplierId = refreshedUser.id;
              this.loadCommandes();
            } else {
              this.handleUserError('Utilisateur non trouvé ou ID manquant');
            }
          },
          error: (error: HttpErrorResponse) => {
            this.handleUserError('Erreur lors du chargement des informations utilisateur');
            console.error('Erreur refreshUser:', error);
          }
        });

        this.subscriptions.add(refreshSubscription);
      }
    } else {
      this.handleUserError('Utilisateur non authentifié');
    }
  }

  private handleUserError(message: string): void {
    console.error(message);
    this.error = message;
    this.loading = false;
  }

  /**
   * Vérifie si l'utilisateur est un fournisseur
   */
  private isSupplierUser(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    if (typeof user.profil === 'string') {
      return user.profil === 'SUPPLIER';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('SUPPLIER' as any);
    }

    return false;
  }

  /**
   * Charge les commandes depuis le backend
   */
  loadCommandes(page: number = 0) {
    if (this.supplierId === null) {
      this.error = 'ID fournisseur non disponible';
      this.loading = false;
      return;
    }

    if (!this.isSupplierUser()) {
      this.error = 'Accès réservé aux fournisseurs';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;

    const loadSubscription = this.commandeService.getCommandes(this.supplierId, page, this.pageSize).subscribe({
      next: (response) => {
        this.commandes = response.content.map((commande: Order) => ({
          ...commande,
          items: commande.items || [],
          isStatic: false
        }));
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;

        this.filterCommandes();
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur lors du chargement des commandes:', err);
        this.error = 'Erreur lors du chargement des commandes';
        this.loading = false;
      }
    });

    this.subscriptions.add(loadSubscription);
  }

  /**
   * Change la taille de page
   */
  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = +target.value;

    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadCommandes();
  }

  /**
   * Filtre les commandes selon les critères
   */
  filterCommandes() {
    this.filteredCommandes = this.commandes.filter(commande => {
      const matchesSearch = this.matchesSearchFilter(commande);
      const matchesPeriod = this.selectedPeriod === 'Période' || this.matchesPeriodFilter(commande);
      const matchesStatus = this.selectedStatus === 'Statut' || this.mapStatusToFrench(commande.status) === this.selectedStatus;

      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }

  private matchesSearchFilter(commande: ExtendedOrder): boolean {
    const searchLower = this.searchTerm.toLowerCase();
    return (
      commande.property?.name?.toLowerCase().includes(searchLower) ||
      commande.supplier?.prenom?.toLowerCase().includes(searchLower) ||
      commande.supplier?.nom?.toLowerCase().includes(searchLower) ||
      `CMD-${commande.id}`.toLowerCase().includes(searchLower)
    );
  }

  private matchesPeriodFilter(commande: ExtendedOrder): boolean {
    const createdDate = this.arrayToDate(commande.orderDate);
    const now = new Date();

    switch (this.selectedPeriod) {
      case 'Cette semaine':
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return createdDate >= weekAgo;
      case 'Ce mois':
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        return createdDate >= monthAgo;
      case 'Ce trimestre':
        const quarterAgo = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
        return createdDate >= quarterAgo;
      default:
        return true;
    }
  }

  onSearchChange() {
    this.filterCommandes();
  }

  onPeriodChange() {
    this.filterCommandes();
  }

  onStatusChange() {
    this.filterCommandes();
  }

  /**
   * Convertit un tableau de date en objet Date
   */
  arrayToDate(dateArray: number[] | undefined): Date {
    if (!dateArray || !Array.isArray(dateArray) || dateArray.length < 3) {
      return new Date();
    }
    return new Date(dateArray[0], dateArray[1] - 1, dateArray[2],
      dateArray[3] || 0, dateArray[4] || 0, dateArray[5] || 0);
  }

  /**
   * Formate une date pour l'affichage
   */
  formatDate(dateArray: number[] | undefined): string {
    if (!dateArray || !Array.isArray(dateArray) || dateArray.length < 3) {
      return 'N/A';
    }
    const date = this.arrayToDate(dateArray);
    return date.toLocaleDateString('fr-FR');
  }

  /**
   * Formate un prix pour l'affichage
   */
  formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) {
      return '0';
    }
    return price.toLocaleString('fr-FR');
  }

  /**
   * Mappe le statut anglais vers le français
   */
  mapStatusToFrench(status: string | undefined): string {
    if (!status) return 'Inconnu';

    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'APPROVED':
        return 'Approuvée';
      case 'REJECTED':
        return 'Rejetée';
      case 'IN_DELIVERY':
        return 'En livraison';
      case 'DELIVERED':
        return 'Livrée';
      default:
        return status;
    }
  }

  /**
   * Retourne la classe CSS selon le statut
   */
  getStatusClass(status: string | undefined): string {
    const frenchStatus = this.mapStatusToFrench(status);
    switch (frenchStatus) {
      case 'En attente':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Validée':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejetée':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'En livraison':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Livrée':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  /**
   * Ouvre le modal de détails
   */
  openDetails(commande: ExtendedOrder) {
    if (!commande || !commande.id) {
      console.error('Commande non valide ou ID manquant');
      this.error = 'Commande non valide';
      return;
    }

    // Réinitialiser les états de citation
    this.quoteItems.clear();
    this.quoteSuccess = false;
    this.quoteError = null;

    // Charger les détails complets de la commande
    this.commandeService.getOrderById(commande.id).subscribe({
      next: (fullOrder) => {
        this.selectedCommande = {
          ...fullOrder,
          items: fullOrder.items || [],
          isStatic: false
        };
        this.showModal = true;

        setTimeout(() => {
          if (this.modalContent) {
            this.modalContent.nativeElement.focus();
          }
        }, 0);

        this.resolveMaterialNames(fullOrder.items || []);
      },
      error: (_err) => {
        this.error = 'Erreur lors du chargement des détails de la commande';
      }
    });
  }

  /**
   * Ferme le modal
   */
  closeModal() {
    this.showModal = false;
    this.selectedCommande = null;
    this.quoteItems.clear();
    this.materialNames.clear();
    this.quoteSuccess = false;
    this.quoteError = null;
  }

  /**
   * Résout les noms des matériaux pour chaque item de la commande
   */
  private resolveMaterialNames(items: OrderItem[]): void {
    if (!items.length) return;

    this.isLoadingMaterials = true;
    const requests = items.map(item =>
      this.commandeService.getMaterialById(item.materialId).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(requests).subscribe({
      next: (results) => {
        const isFr = (this.languageService.currentLang?.() ?? 'FR').toUpperCase() === 'FR';
        results.forEach((material, index) => {
          if (material) {
            const label = isFr ? material.labelFr : material.labelEn;
            this.materialNames.set(items[index].materialId, label || `Mat #${items[index].materialId}`);
          } else {
            this.materialNames.set(items[index].materialId, `Mat #${items[index].materialId}`);
          }
        });
        this.isLoadingMaterials = false;
      }
    });
  }

  /**
   * Retourne le nom affiché d'un matériau
   */
  getMaterialName(materialId: number): string {
    return this.materialNames.get(materialId) ?? `Mat #${materialId}`;
  }

  /**
   * Indique si la commande est en PENDING (seul statut permettant la saisie du prix)
   */
  canSetUnitPrice(): boolean {
    return this.selectedCommande?.status === 'PENDING';
  }

  /**
   * Vérifie si la commande est en attente
   */
  isPendingOrder(): boolean {
    return this.selectedCommande?.status === 'PENDING';
  }

  /**
   * Met à jour le prix d'un matériau pour la citation
   */
  updateQuoteItemPrice(materialId: number, priceValue: string): void {
    const price = parseFloat(priceValue);
    if (!isNaN(price) && price > 0) {
      this.quoteItems.set(materialId, price);
    } else {
      this.quoteItems.delete(materialId);
    }
  }

  /**
   * Récupère le prix saisi pour un matériau
   */
  getQuoteItemPrice(materialId: number): number | undefined {
    return this.quoteItems.get(materialId);
  }

  /**
   * Calcule le total d'un item avec le prix de la citation
   */
  calculateQuoteItemTotal(item: OrderItem): number {
    const price = this.quoteItems.get(item.materialId);
    if (price !== undefined) {
      return item.quantity * price;
    }
    return 0;
  }

  /**
   * Calcule le total général de la citation
   */
  calculateQuoteTotal(): number {
    if (!this.selectedCommande || !this.selectedCommande.items) {
      return 0;
    }

    return this.selectedCommande.items.reduce((sum, item) => {
      return sum + this.calculateQuoteItemTotal(item);
    }, 0);
  }

  /**
   * Vérifie si tous les prix sont renseignés
   */
  isQuoteComplete(): boolean {
    if (!this.selectedCommande || !this.selectedCommande.items) {
      return false;
    }

    return this.selectedCommande.items.every(item => {
      const price = this.quoteItems.get(item.materialId);
      return price !== undefined && price > 0;
    });
  }

  /**
   * Crée la citation (quote)
   */
  createQuote(): void {
    if (!this.selectedCommande || !this.supplierId) {
      this.quoteError = 'Informations manquantes pour créer la citation';
      return;
    }

    if (!this.isQuoteComplete()) {
      this.quoteError = 'Veuillez renseigner tous les prix unitaires';
      return;
    }

    this.isCreatingQuote = true;
    this.quoteError = null;

    // Construire le tableau d'items pour la citation
    const items: CreateQuoteItemRequest[] = this.selectedCommande.items.map(item => ({
      itemId: item.id,
      price: this.quoteItems.get(item.materialId) || 0
    }));

    // Construire la requête
    const quoteRequest: CreateQuoteRequest = {
      orderId: this.selectedCommande.id,
      items: items,
      generedById: this.supplierId
    };

    // Appeler le service
    this.commandeService.createQuote(this.selectedCommande.id, quoteRequest).subscribe({
      next: (response) => {
        console.log('Citation créée avec succès:', response);
        this.quoteSuccess = true;
        this.isCreatingQuote = false;

        // Fermer le modal après 2 secondes
        setTimeout(() => {
          this.closeModal();
          this.refreshData();
        }, 2000);
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur lors de la création de la citation:', err);
        this.quoteError = 'Erreur lors de la création de la citation. Veuillez réessayer.';
        this.isCreatingQuote = false;
      }
    });
  }

  /**
   * Ouvre le modal de confirmation pour valider
   */
  openValidateConfirm() {
    this.confirmModalAction = 'validate';
    this.showConfirmModal = true;
  }

  /**
   * Ouvre le modal de confirmation pour rejeter
   */
  openRejectConfirm() {
    this.confirmModalAction = 'reject';
    this.showConfirmModal = true;
  }

  /**
   * Ouvre le modal de confirmation pour supprimer
   */
  openDeleteConfirm(commande: ExtendedOrder) {
    this.selectedCommande = commande;
    this.confirmModalAction = 'delete';
    this.showConfirmModal = true;
  }

  /**
   * Annule l'action de confirmation
   */
  cancelConfirmAction() {
    this.showConfirmModal = false;
    this.confirmModalAction = null;
  }

  /**
   * Confirme l'action sélectionnée
   */
  confirmAction() {
    if (!this.selectedCommande || !this.confirmModalAction) return;

    switch (this.confirmModalAction) {
      case 'validate':
        this.validateOrder();
        break;
      case 'reject':
        this.rejectOrder();
        break;
      case 'delete':
        this.deleteOrder();
        break;
    }
  }

  /**
   * Valide une commande
   */
  private validateOrder() {
    if (!this.selectedCommande) return;

    this.isProcessing = true;
    this.commandeService.updateStatusOrder(this.selectedCommande.id, 'DELIVERED').subscribe({
      next: () => {
        this.showConfirmModal = false;
        this.showModal = false;
        this.confirmModalAction = null;
        this.isProcessing = false;
        this.refreshData();
      },
      error: (err) => {
        console.error('Erreur lors de la validation:', err);
        this.error = 'Erreur lors de la validation de la commande';
        this.isProcessing = false;
      }
    });
  }

  /**
   * Rejette une commande
   */
  private rejectOrder() {
    if (!this.selectedCommande) return;

    this.isProcessing = true;
    this.commandeService.updateStatusOrder(this.selectedCommande.id, 'REJECTED').subscribe({
      next: () => {
        this.showConfirmModal = false;
        this.showModal = false;
        this.confirmModalAction = null;
        this.isProcessing = false;
        this.refreshData();
      },
      error: (err) => {
        console.error('Erreur lors du rejet:', err);
        this.error = 'Erreur lors du rejet de la commande';
        this.isProcessing = false;
      }
    });
  }

  /**
   * Supprime une commande
   */
  private deleteOrder() {
    if (!this.selectedCommande) return;

    this.isProcessing = true;
    this.commandeService.deleteCommande(this.selectedCommande.id).subscribe({
      next: () => {
        this.showConfirmModal = false;
        this.confirmModalAction = null;
        this.isProcessing = false;
        this.refreshData();
      },
      error: (err) => {
        console.error('Erreur lors de la suppression:', err);
        this.error = 'Erreur lors de la suppression de la commande';
        this.isProcessing = false;
      }
    });
  }

  /**
   * Calcule le total de la commande
   */
  calculateTotal(items: OrderItem[]): number {
    if (!items || items.length === 0) return 0;
    return items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  }

  /**
   * Pagination - Page précédente
   */
  previousPage() {
    if (this.currentPage > 0) {
      this.loadCommandes(this.currentPage - 1);
    }
  }

  /**
   * Pagination - Page suivante
   */
  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.loadCommandes(this.currentPage + 1);
    }
  }

  /**
   * Pagination - Aller à une page spécifique
   */
  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.loadCommandes(page);
    }
  }

  /**
   * Obtient le nom d'affichage de l'utilisateur
   */
  getUserDisplayName(): string {
    return this.authService.getUserDisplayName() || 'Utilisateur inconnu';
  }

  /**
   * Rafraîchit les données
   */
  refreshData() {
    this.loadCommandes(this.currentPage);
  }

  /**
   * Obtient le texte du modal de confirmation
   */
  getConfirmModalText(): { title: string; message: string } {
    if (!this.confirmModalAction || !this.selectedCommande) {
      return { title: '', message: '' };
    }

    switch (this.confirmModalAction) {
      case 'validate':
        return {
          title: 'Valider la commande ?',
          message: `Cette commande passera au statut <strong>Validée</strong>.`
        };
      case 'reject':
        return {
          title: 'Rejeter la commande ?',
          message: `Cette commande passera au statut <strong>Rejetée</strong>.`
        };
      case 'delete':
        return {
          title: 'Supprimer la commande ?',
          message: `Êtes-vous sûr de vouloir supprimer la commande <strong>CMD-${this.selectedCommande.id}</strong> ? Cette action est irréversible.`
        };
      default:
        return { title: '', message: '' };
    }
  }
}