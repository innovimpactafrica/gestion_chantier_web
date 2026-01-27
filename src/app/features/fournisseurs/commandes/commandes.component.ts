import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CommandeService, Order, OrderItem } from './../../../../services/commande.service';
import { AuthService } from './../../../features/auth/services/auth.service';
import { Subscription } from 'rxjs';
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
    private authService: AuthService
  ) {}

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
        return 'Validée';
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
      },
      error: (err) => {
        console.error('Erreur lors du chargement des détails:', err);
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
  }

  /**
   * Vérifie si la commande est en attente
   */
  isPendingOrder(): boolean {
    return this.selectedCommande?.status === 'PENDING';
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