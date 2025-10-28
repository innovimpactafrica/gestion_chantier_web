import { Component, OnInit, OnDestroy, Inject, forwardRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DemandeService, Demande, Report, Material, Activity } from './../../../../services/demande.service';
import { AuthService, profil } from './../../../features/auth/services/auth.service';
import { Subscription, Observable } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';

// Extend the Demande interface to include isStatic
interface ExtendedDemande extends Demande {
  isStatic?: boolean;
}

interface Comment {
  id: number;
  text: string;
  author: string;
  createdAt: Date;
}

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-demande',
  templateUrl: './commandes.component.html',
  styleUrls: ['./commandes.component.css']
})
export class CommandeComponent implements OnInit, OnDestroy {
  @ViewChild('modalContent') modalContent!: ElementRef;
  searchTerm: string = '';
  selectedPeriod: string = 'Période';
  selectedStatus: string = 'Statut';
  showModal: boolean = false;
  selectedDemande: ExtendedDemande | null = null;
  comment: string = '';
  
  // Modal de création de rapport
  showCreateReportModal: boolean = false;
  newReport: {
    title: string;
    version: string;
    file: File | null;
  } = {
    title: '',
    version: '',
    file: null
  };
  
  // États de création
  isCreatingReport: boolean = false;
  createReportError: string | null = null;
  
  // Données dynamiques
  demandes: ExtendedDemande[] = [];
  filteredDemandes: ExtendedDemande[] = [];
  loading: boolean = true;
  error: string | null = null;
  
  // Données statiques pour le fallback
  staticDemandes: ExtendedDemande[] = [
    {
      id: 1,
      commandeId: 'CMD-001',
      title: 'Commande statique 1',
      propertyName: 'Chantier Exemple 1',
      betName: 'Jean Dupont',
      description: 'Matériaux de construction généraux',
      createdAt: [2025, 10, 1, 10, 30, 0],
      status: 'PENDING',
      materials: [
        { name: 'Ciment', stock: '50', unit: 'sacs', unitPrice: 5000, total: 250000 },
        { name: 'Sable', stock: '10', unit: 'm³', unitPrice: 15000, total: 150000 }
      ],
      activities: [
        { action: 'Commande créée', user: 'Jean Dupont', date: [2025, 10, 1, 10, 30, 0] }
      ],
      reports: [],
      totalAmount: 400000,
      propertyId: 1,
      moaId: 1,
      moaName: 'MOA Exemple',
      betId: 1,
      propertyImg: '',
      isStatic: true
    },
    {
      id: 2,
      commandeId: 'CMD-002',
      title: 'Commande statique 2',
      propertyName: 'Chantier Exemple 2',
      betName: 'Marie Dubois',
      description: 'Équipements électriques',
      createdAt: [2025, 10, 2, 14, 0, 0],
      status: 'VALIDATED',
      materials: [
        { name: 'Câbles électriques', stock: '200', unit: 'mètres', unitPrice: 1000, total: 200000 },
        { name: 'Prises', stock: '50', unit: 'unités', unitPrice: 2000, total: 100000 }
      ],
      activities: [
        { action: 'Commande validée', user: 'Marie Dubois', date: [2025, 10, 2, 14, 0, 0] }
      ],
      reports: [],
      totalAmount: 300000,
      propertyId: 2,
      moaId: 2,
      moaName: 'MOA Exemple 2',
      betId: 2,
      propertyImg: '',
      isStatic: true
    },
     {
      id: 3,
      commandeId: 'CMD-003',
      title: 'Commande statique 3',
      propertyName: 'Chantier Exemple 3',
      betName: 'ASSANE NDAW',
      description: 'Équipements Sportives',
      createdAt: [2025, 10, 2, 14, 0, 0],
      status: 'REJECTED',
      materials: [
        { name: 'Equipements loisirs', stock: '200', unit: 'mètres', unitPrice: 1000, total: 200000 },
        { name: 'Prises', stock: '50', unit: 'unités', unitPrice: 2000, total: 100000 }
      ],
      activities: [
        { action: 'Commande en attente', user: 'NDAW', date: [2025, 10, 2, 14, 0, 0] }
      ],
      reports: [],
      totalAmount: 300000,
      propertyId: 3,
      moaId: 3,
      moaName: 'MOA Exemple 3',
      betId: 3,
      propertyImg: '',
      isStatic: true
    },
     {
      id: 4,
      commandeId: 'CMD-004',
      title: 'Commande statique 4',
      propertyName: 'Chantier Exemple 4',
      betName: 'ASSANE NDAW',
      description: 'Équipements Sportives',
      createdAt: [2025, 10, 2, 14, 0, 0],
      status: 'IN_PROGRESS',
      materials: [
        { name: 'Equipements loisirs', stock: '200', unit: 'mètres', unitPrice: 1000, total: 200000 },
        { name: 'Prises', stock: '50', unit: 'unités', unitPrice: 2000, total: 100000 }
      ],
      activities: [
        { action: 'Commande en attente', user: 'NDAW', date: [2025, 10, 2, 14, 0, 0] }
      ],
      reports: [],
      totalAmount: 300000,
      propertyId: 4,
      moaId: 4,
      moaName: 'MOA Exemple 4',
      betId: 4,
      propertyImg: '',
      isStatic: true
    },
    {
      id: 5,
      commandeId: 'CMD-005',
      title: 'Commande statique 5',
      propertyName: 'Chantier Exemple 5',
      betName: 'ASSANE NDAW',
      description: 'Équipements Sportives',
      createdAt: [2025, 10, 2, 14, 0, 0],
      status: 'DELIVERED',
      materials: [
        { name: 'Equipements loisirs', stock: '200', unit: 'mètres', unitPrice: 1000, total: 200000 },
        { name: 'Prises', stock: '50', unit: 'unités', unitPrice: 2000, total: 100000 }
      ],
      activities: [
        { action: 'Commande en attente', user: 'NDAW', date: [2025, 10, 2, 14, 0, 0] }
      ],
      reports: [],
      totalAmount: 300000,
      propertyId: 5,
      moaId: 5,
      moaName: 'MOA Exemple 5',
      betId: 5,
      propertyImg: '',
      isStatic: true
    }
  ];
  
  // Pagination
  currentPage: number = 0;
  pageSize: number = 10;
  totalElements: number = 0;
  totalPages: number = 0;
  
  // Commentaires simulés
  comments: Comment[] = [];
  
  // ID du BET (dynamique depuis l'utilisateur connecté)
  betId: number | null = null;
  
  // Subscription pour nettoyer les observables
  private subscriptions: Subscription = new Subscription();
  
  // Propriété Math pour utilisation dans le template
  Math = Math;

  constructor(
    private demandeService: DemandeService,
    @Inject(forwardRef(() => AuthService)) private authService: AuthService
  ) {}

  ngOnInit() {
    this.initializeBetId();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private initializeBetId(): void {
    if (this.authService.isAuthenticated()) {
      const user = this.authService.currentUser();
      
      if (user && user.id) {
        this.betId = user.id;
        this.loadDemandes();
      } else {
        const refreshSubscription = this.authService.refreshUser().subscribe({
          next: (refreshedUser: { id: number | null; }) => {
            if (refreshedUser && refreshedUser.id) {
              this.betId = refreshedUser.id;
              this.loadDemandes();
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

  private isBETUser(): boolean {
    const user = this.authService.currentUser();
    if (!user) return false;

    if (typeof user.profil === 'string') {
      return user.profil === 'SUPPLIER';
    } else if (Array.isArray(user.profil)) {
      return user.profil.includes('SUPPLIER' as any);
    }

    return false;
  }

  loadDemandes(page: number = 0) {
    if (this.betId === null) {
      this.error = 'ID utilisateur non disponible';
      this.loading = false;
      return;
    }

    if (!this.isBETUser()) {
      this.error = 'Accès réservé aux utilisateurs BET';
      this.loading = false;
      return;
    }

    this.loading = true;
    this.error = null;
    
    this.demandeService.getDemande(this.betId, page, this.pageSize).subscribe({
      next: (response) => {
        this.demandes = response.content.map((demande: Demande) => ({
          ...demande,
          materials: demande.materials || [],
          activities: demande.activities || [],
          reports: demande.reports || [],
          isStatic: false
        }));
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.currentPage = response.number;
        
        this.filterDemandes();
        this.loading = false;
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur lors du chargement des demandes:', err);
        this.error = 'Erreur lors du chargement des demandes';
        this.loading = false;
      }
    });
  }

  changePageSize(event: Event): void {
    const target = event.target as HTMLSelectElement;
    const newSize = +target.value;
    
    this.pageSize = newSize;
    this.currentPage = 0;
    this.loadDemandes();
  }

  filterDemandes() {
    this.filteredDemandes = this.demandes.filter(demande => {
      const matchesSearch = (demande.title || '').toLowerCase().includes(this.searchTerm.toLowerCase()) ||
                           (demande.description || '').toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesPeriod = this.selectedPeriod === 'Période' || this.matchesPeriodFilter(demande);
      const matchesStatus = this.selectedStatus === 'Statut' || this.mapStatusToFrench(demande.status) === this.selectedStatus;
      
      return matchesSearch && matchesPeriod && matchesStatus;
    });
  }

  private matchesPeriodFilter(demande: ExtendedDemande): boolean {
    const createdDate = this.arrayToDate(demande.createdAt);
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
    this.filterDemandes();
  }

  onPeriodChange() {
    this.filterDemandes();
  }

  onStatusChange() {
    this.filterDemandes();
  }

  arrayToDate(dateArray: number[] | undefined): Date {
    if (!dateArray || !Array.isArray(dateArray) || dateArray.length < 3) {
      return new Date();
    }
    return new Date(dateArray[0], dateArray[1] - 1, dateArray[2], 
                    dateArray[3] || 0, dateArray[4] || 0, dateArray[5] || 0);
  }

  formatDate(dateArray: number[] | undefined): string {
    if (!dateArray || !Array.isArray(dateArray) || dateArray.length < 3) {
      return 'N/A';
    }
    const date = this.arrayToDate(dateArray);
    return date.toLocaleDateString('fr-FR');
  }

  formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) {
      return '0';
    }
    return price.toLocaleString('fr-FR');
  }

  mapStatusToFrench(status: string | undefined): string {
    if (!status) return 'Inconnu';
    
    switch (status) {
      case 'PENDING':
        return 'En attente';
      case 'VALIDATED':
      case 'APPROVED':
        return 'Validée';
      case 'REJECTED':
        return 'Rejetée';
      case 'IN_PROGRESS':
        return 'En cours';
      case 'DELIVERED':
        return 'Livrée';
      default:
        return status;
    }
  }

  getStatusClass(status: string | undefined): string {
    const frenchStatus = this.mapStatusToFrench(status);
    switch (frenchStatus) {
      case 'En attente':
        return 'bg-gray-100 text-black-800 border-amber-200';
      case 'Validée':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejetée':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'En cours':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Livrée':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  openDetails(demande: ExtendedDemande) {
    if (!demande || !demande.id) {
      console.error('Demande non valide ou ID manquant');
      this.error = 'Demande non valide';
      return;
    }
    this.selectedDemande = { 
      ...demande, 
      materials: demande.materials || [], 
      activities: demande.activities || [], 
      reports: demande.reports || [],
      isStatic: demande.isStatic || false
    };
    this.showModal = true;
    this.comment = '';
    this.loadComments(demande.id);
    setTimeout(() => {
      if (this.modalContent) {
        this.modalContent.nativeElement.focus();
      }
    }, 0);
  }

  closeModal() {
    this.showModal = false;
    this.selectedDemande = null;
    this.comment = '';
    this.comments = [];
  }

  approveDemande(demande: ExtendedDemande | null) {
    if (!demande || !demande.id || demande.isStatic) {
      console.log('Action non autorisée pour les données statiques ou demande invalide');
      return;
    }
    
    this.demandeService.updateDemandeStatus(demande.id, 'VALIDATED').subscribe({
      next: () => {
        console.log('Demande approuvée:', demande.id);
        demande.status = 'VALIDATED';
        this.filterDemandes();
        this.closeModal();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur lors de l\'approbation:', err);
        this.error = 'Erreur lors de l\'approbation de la demande';
      }
    });
  }

  rejectDemande(demande: ExtendedDemande | null) {
    if (!demande || !demande.id || demande.isStatic) {
      console.log('Action non autorisée pour les données statiques ou demande invalide');
      return;
    }
    
    this.demandeService.updateDemandeStatus(demande.id, 'REJECTED').subscribe({
      next: () => {
        console.log('Demande rejetée:', demande.id);
        demande.status = 'REJECTED';
        this.filterDemandes();
        this.closeModal();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Erreur lors du rejet:', err);
        this.error = 'Erreur lors du rejet de la demande';
      }
    });
  }

  sendComment() {
    if (this.comment.trim() && this.selectedDemande) {
      const newComment: Comment = {
        id: this.comments.length + 1,
        text: this.comment.trim(),
        author: this.getUserDisplayName() || 'Utilisateur actuel',
        createdAt: new Date()
      };
      
      this.comments.push(newComment);
      this.comment = '';
    }
  }

  private loadComments(demandeId: number) {
    if (!demandeId) {
      console.error('ID de demande non valide');
      this.comments = [];
      return;
    }
    this.comments = [];
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.loadDemandes(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.loadDemandes(this.currentPage + 1);
    }
  }

  goToPage(page: number) {
    if (page >= 0 && page < this.totalPages) {
      this.loadDemandes(page);
    }
  }

  getUserDisplayName(): string {
    return this.authService.getUserDisplayName() || 'Utilisateur inconnu';
  }

  debugUserInfo(): void {
    console.log('Current User:', this.authService.currentUser());
    console.log('BET ID:', this.betId);
    console.log('Is BET User:', this.isBETUser());
  }

  openCreateReportModal(): void {
    this.showCreateReportModal = true;
    this.resetNewReportForm();
    this.createReportError = null;
  }

  closeCreateReportModal(): void {
    this.showCreateReportModal = false;
    this.resetNewReportForm();
    this.createReportError = null;
    this.isCreatingReport = false;
  }

  private resetNewReportForm(): void {
    this.newReport = {
      title: '',
      version: '',
      file: null
    };
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.newReport.file = input.files[0];
    }
  }

  private isCreateReportFormValid(): boolean {
    return !!(
      this.newReport.title.trim() && 
      this.newReport.version.trim() && 
      this.newReport.file
    );
  }

  createReport(): void {
    if (!this.isCreateReportFormValid()) {
      this.createReportError = 'Veuillez remplir tous les champs obligatoires';
      return;
    }

    if (!this.selectedDemande) {
      this.createReportError = 'Aucune demande sélectionnée';
      return;
    }

    if (!this.newReport.file) {
      this.createReportError = 'Veuillez sélectionner un fichier';
      return;
    }

    if (!this.betId) {
      this.createReportError = 'ID utilisateur non disponible';
      return;
    }

    if (!this.authService.isAuthenticated()) {
      this.createReportError = 'Session expirée. Veuillez vous reconnecter.';
      return;
    }

    this.isCreatingReport = true;
    this.createReportError = null;

    const reportData = {
      title: this.newReport.title.trim(),
      versionNumber: parseInt(this.newReport.version),
      studyRequestId: this.selectedDemande.id,
      authorId: this.betId
    };

    const createSubscription = this.demandeService.createReport(reportData, this.newReport.file).subscribe({
      next: (response: Report) => {
        console.log('✅ Rapport créé avec succès:', response);
        this.handleReportCreationSuccess(response);
      },
      error: (error: HttpErrorResponse) => {
        console.error('❌ Erreur lors de la création du rapport:', error);
        this.handleReportCreationError(error);
      }
    });

    this.subscriptions.add(createSubscription);
  }

  private handleReportCreationSuccess(response: Report): void {
    if (this.selectedDemande) {
      if (!this.selectedDemande.reports) {
        this.selectedDemande.reports = [];
      }
      this.selectedDemande.reports.push(response);
    }
    
    this.closeCreateReportModal();
  }

  private handleReportCreationError(error: HttpErrorResponse): void {
    this.createReportError = 'Erreur lors de la création du rapport. Veuillez réessayer.';
    this.isCreatingReport = false;
  }

  cancelCreateReport(): void {
    this.closeCreateReportModal();
  }

  getFileName(): string {
    return this.newReport.file ? this.newReport.file.name : 'Aucun fichier choisi';
  }

  hasFileSelected(): boolean {
    return !!this.newReport.file;
  }
}