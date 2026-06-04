import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  EtudeBetService, EtudeBet, EtudeBetResponse, CreateEtudeRequest,
  UpdateBetRequest, StudyDocument, StudyIAReport
} from '../../../../../services/etude-bet.service';
import { UserService } from '../../../../../services/user.service';
import { AuthService } from '../../../auth/services/auth.service';
import { DemandeService } from '../../../../../services/demande.service';
import { LanguageService } from '../../../../core/services/language.service';
import { inject } from '@angular/core';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { environment } from '../../../../../environments/environment';

// ─── Interfaces locales ──────────────────────────────────────────────────────

interface EtudeBET {
  id: number;
  titre: string;
  description: string;
  studyType: string;
  objective: string;
  problemObserved: string;
  nomBET: string;
  dateCreation: string;
  statut: 'En attente' | 'En cours' | 'Livrée' | 'Validée' | 'Rejetée';
  propertyId: number;
  propertyName: string;
  moaId: number;
  moaName: string;
  betId: number;
  documents: StudyDocument[];
  rapports?: { id: number; nom: string; taille: string; dateSubmission: string; url: string; versionNumber: number }[];
}

interface Comment {
  id: number;
  content: string;
  authorName: string;
  createdAt: number[];
}

interface User {
  id: number;
  nom: string;
  prenom: string;
  email: string;
  profil: string;
}

interface UserPageResponse {
  content: User[];
  totalElements: number;
  totalPages: number;
  number: number;
}

interface DocumentEntry {
  type: string;
  file: File | null;
  fileName: string;
}

// ─── Types d'études ──────────────────────────────────────────────────────────

const STUDY_TYPES = [
  { value: 'STRUCTURAL_ANALYSIS',       label: 'Analyse structurelle' },
  { value: 'FOUNDATION_RECALCULATION',  label: 'Recalcul de fondation' },
  { value: 'CRACK_ANALYSIS',            label: 'Analyse de fissures' },
  { value: 'SOIL_ANALYSIS',             label: 'Analyse de sol' },
  { value: 'LOAD_VERIFICATION',         label: 'Vérification des charges' },
  { value: 'STRUCTURAL_REINFORCEMENT',  label: 'Renforcement structurel' },
  { value: 'OTHER',                     label: 'Autre' },
];

const DOCUMENT_TYPES = [
  { value: 'ARCHITECTURAL_PLAN', label: 'Plan architectural' },
  { value: 'STRUCTURAL_PLAN', label: 'Plan structurel' },
  { value: 'FOUNDATION_PLAN', label: 'Plan de fondations' },
  { value: 'EXECUTION_PLAN', label: "Plan d'exécution" },
  { value: 'SECTION', label: 'Coupe' },
  { value: 'ELEVATION', label: 'Élévation' },
  { value: 'GEOTECHNICAL_REPORT', label: 'Rapport géotechnique' },
  { value: 'OTHER', label: 'Autre' },
];

// ─── Composant ────────────────────────────────────────────────────────────────

@Component({
  standalone: true,
  imports: [CommonModule, FormsModule],
  selector: 'app-etude-bet',
  templateUrl: './etude-bet.component.html',
  styleUrls: ['./etude-bet.component.css']
})
export class EtudeBetComponent implements OnInit, OnDestroy {
  private languageService = inject(LanguageService);
  t = (key: string, params?: any) => this.languageService.translate(key, params);

  getIAText(field: { en: string; fr: string } | null | undefined): string {
    if (!field) return 'Non disponible';
    const lang = this.languageService.currentLang()?.toLowerCase() || 'fr';
    return field[lang as 'en' | 'fr'] || field['fr'] || field['en'] || 'Non disponible';
  }

  // Constantes exposées au template
  readonly studyTypes = STUDY_TYPES;
  readonly documentTypes = DOCUMENT_TYPES;
  readonly fileBaseUrl = environment.filebaseUrl;
  readonly Math = Math;

  // ── Données ──────────────────────────────────────────────────────────────
  etudes: EtudeBET[] = [];
  filteredEtudes: EtudeBET[] = [];
  searchTerm = '';
  isLoading = false;

  // ── Pagination ───────────────────────────────────────────────────────────
  currentPage = 0;
  pageSize = 5;
  totalElements = 0;
  totalPages = 0;
  currentPropertyId!: number;

  // ── Etude Status Dropdowns ──────────────────────────────────────────────────
  showEtudeStatusDropdown: number | null = null;
  successMessage = '';
  errorMessage = '';
  showErrorModal = false;
  errorModalMessage = '';
  errorModalTitle = 'Une erreur est survenue';

  availableEtudeStatuses = [
    { value: 'PENDING',     label: 'En attente', class: 'bg-yellow-100 text-yellow-800', cssClass: 'bg-yellow-100 text-yellow-800' },
    { value: 'IN_PROGRESS', label: 'En cours',   class: 'bg-blue-100 text-blue-800', cssClass: 'bg-blue-100 text-blue-800' },
    { value: 'DELIVERED',   label: 'Livrée',     class: 'bg-purple-100 text-purple-800', cssClass: 'bg-purple-100 text-purple-800' },
    { value: 'VALIDATED',   label: 'Validée',    class: 'bg-green-100 text-green-800', cssClass: 'bg-green-100 text-green-800' },
    { value: 'REJECTED',    label: 'Rejetée',    class: 'bg-red-100 text-red-800', cssClass: 'bg-red-100 text-red-800' },
  ];

  toggleEtudeStatusDropdown(etudeId: number, event: Event): void {
    event.stopPropagation();
    this.showEtudeStatusDropdown = this.showEtudeStatusDropdown === etudeId ? null : etudeId;
  }

// GARDER UNIQUEMENT CETTE VERSION — retourne le bon type union
mapStatus(apiStatus: string): 'En attente' | 'En cours' | 'Livrée' | 'Validée' | 'Rejetée' {
  const map: Record<string, any> = {
    PENDING: 'En attente',
    IN_PROGRESS: 'En cours',
    DELIVERED: 'Livrée',
    VALIDATED: 'Validée',
    REJECTED: 'Rejetée'
  };
  return map[apiStatus] || 'En attente';
}

  changeEtudeStatus(etudeId: number, newStatus: string, event: Event): void {
    event.stopPropagation();
    this.isLoading = true;

    this.etudeBetService.changeEtudeStatus(etudeId, newStatus).subscribe({
      next: () => {
        const etude = this.etudes.find(e => e.id === etudeId);
        if (etude) {
         etude.statut = this.mapStatus(newStatus);
        }
        this.showEtudeStatusDropdown = null;
        this.isLoading = false;
        this.successMessage = 'Statut mis à jour avec succès';
        setTimeout(() => this.successMessage = '', 2500);
      },
      error: (err) => {
        this.showEtudeStatusDropdown = null;
        this.isLoading = false;
        this.showErrorModal = true;
        this.errorModalMessage = err.error?.message || 'Erreur lors du changement de statut';
      }
    });
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.showEtudeStatusDropdown = null;
  }

  // ── Modaux ───────────────────────────────────────────────────────────────
  showCreateModal = false;
  showEditModal = false;
  showDetailModal = false;
  showValidateModal = false;
  showRejectModal = false;
  showEditReportModal = false;
  showCommentsModal = false;
  showCreateReportModal = false;

  // ── Modal IA ─────────────────────────────────────────────────────────────
  showIAModal = false;
  iaReport: StudyIAReport | null = null;
  isLoadingIA = false;
  iaError: string | null = null;
  selectedEtudeForIA: EtudeBET | null = null;

  // ── Commentaires ─────────────────────────────────────────────────────────
  comments: Comment[] = [];
  selectedEtudeForComments: EtudeBET | null = null;
  newComment = '';

  // ── Sélection ────────────────────────────────────────────────────────────
  selectedEtude: EtudeBET | null = null;
  selectedReport: { id: number; nom: string; taille: string; dateSubmission: string; url: string; versionNumber: number } | null = null;

  // ── Formulaire de création ────────────────────────────────────────────────
  newEtude: CreateEtudeRequest = {
    title: '',
    description: '',
    studyType: '',
    objective: '',
    problemObserved: '',
    propertyId: 0,
    clientId: 0,
    betId: 0,
    documentTypes: [],
    files: []
  };

  // Paires documentType + fichier dynamiques
  documentEntries: DocumentEntry[] = [];

  // ── Formulaire d'édition ──────────────────────────────────────────────────
  editEtude: CreateEtudeRequest = {
    title: '',
    description: '',
    studyType: '',
    objective: '',
    problemObserved: '',
    propertyId: 0,
    clientId: 0,
    betId: 0,
    documentTypes: [],
    files: []
  };

  editReport: UpdateBetRequest = {
    title: '',
    file: '',
    versionNumber: 1,
    studyRequestId: 0,
    authorId: 0
  };

  rejectReason = '';

  // ── Création rapport ──────────────────────────────────────────────────────
  isCreatingReport = false;
  createReportError: string | null = null;
  newReport = { title: '', version: '', file: null as File | null };

  // ── BET auto-complétion ───────────────────────────────────────────────────
  availableBETs: User[] = [];
  loadingBETs = false;
  betSearchKeyword = '';
  betSearchSubject = new Subject<string>();
  betPage = 0;
  betPageSize = 10;
  betHasMore = true;
  betLoading = false;
  showBetDropdown = false;
  private searchSubscription?: Subscription;

  // BET auto-complétion pour modal EDIT
  editBetSearchKeyword = '';
  showEditBetDropdown = false;
  editSelectedBET: User | null = null;

  // ── Utilisateur courant ───────────────────────────────────────────────────
  currentUserId = 0;

  constructor(
    private etudeBetService: EtudeBetService,
    private route: ActivatedRoute,
    private userService: UserService,
    private authService: AuthService,
    private demandeService: DemandeService
  ) { }

  ngOnInit() {
    this.getPropertyIdFromRoute();
    this.loadCurrentUser();
    this.setupBETSearch();
    this.loadBETUsers();
  }

  ngOnDestroy() {
    this.searchSubscription?.unsubscribe();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utilisateur / BET
  // ═══════════════════════════════════════════════════════════════════════════

  private loadCurrentUser(): void {
    const currentUser = this.authService.currentUser();
    if (currentUser?.id) {
      this.currentUserId = currentUser.id;
      this.newEtude.clientId = currentUser.id;
      this.editEtude.clientId = currentUser.id;
    } else {
      this.authService.getCurrentUser().subscribe({
        next: (user) => {
          if (user?.id) {
            this.currentUserId = user.id;
            this.newEtude.clientId = user.id;
            this.editEtude.clientId = user.id;
          }
        },
        error: (_err) => {}
      });
    }
  }

  private setupBETSearch(): void {
    this.searchSubscription = this.betSearchSubject
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => {
        this.betPage = 0;
        this.availableBETs = [];
        this.betHasMore = true;
        this.loadBETUsers();
      });
  }

  onBETSearchChange(): void {
    this.betSearchSubject.next(this.betSearchKeyword);
    this.showBetDropdown = true;
  }

  selectBET(bet: User): void {
    this.newEtude.betId = bet.id;
    this.betSearchKeyword = `${bet.prenom} ${bet.nom}`;
    this.showBetDropdown = false;
  }

  onBETScroll(event: Event): void {
    const el = event.target as HTMLElement;
    if (el.scrollHeight - el.scrollTop <= el.clientHeight + 50 && this.betHasMore && !this.betLoading) {
      this.betPage++;
      this.loadBETUsers();
    }
  }

  focusBETInput(): void {
    this.showBetDropdown = true;
    if (this.availableBETs.length === 0) this.loadBETUsers();
  }

  focusEditBETInput(): void {
    this.showEditBetDropdown = true;
    if (this.availableBETs.length === 0) {
      this.betPage = 0;
      this.loadBETUsers();
    }
  }

  onEditBETSearchChange(): void {
    this.betPage = 0;
    this.availableBETs = [];
    this.betHasMore = true;
    this.betSearchSubject.next(this.editBetSearchKeyword);
    this.showEditBetDropdown = true;
  }

  selectEditBET(bet: User): void {
    this.editSelectedBET = bet;
    this.editEtude.betId = bet.id;
    this.editBetSearchKeyword = '';
    this.showEditBetDropdown = false;
  }

  clearEditBET(): void {
    this.editSelectedBET = null;
    this.editEtude.betId = 0;
    this.editBetSearchKeyword = '';
    this.availableBETs = [];
  }

  private loadBETUsers(): void {
    if (this.betLoading) return;
    this.betLoading = true;
    this.loadingBETs = true;

    const keyword = this.editBetSearchKeyword || this.betSearchKeyword;
    this.userService.getUserByProfil('BET', keyword, this.betPage, this.betPageSize).subscribe({
      next: (response: UserPageResponse) => {
        if (this.betPage === 0) {
          this.availableBETs = response.content;
        } else {
          this.availableBETs = [...this.availableBETs, ...response.content];
        }
        this.betHasMore = response.number < response.totalPages - 1;
        this.betLoading = false;
        this.loadingBETs = false;
      },
      error: (_err) => {
        this.betLoading = false;
        this.loadingBETs = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Données / route
  // ═══════════════════════════════════════════════════════════════════════════

  private getPropertyIdFromRoute(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.currentPropertyId = +id;
      this.newEtude.propertyId = this.currentPropertyId;
      this.loadEtudes();
    } else {
    }
  }

  loadEtudes(): void {
    this.isLoading = true;
    this.etudeBetService.getEtude(this.currentPropertyId, this.currentPage, this.pageSize).subscribe({
      next: (response: EtudeBetResponse) => {
        this.etudes = this.transformEtudesFromAPI(response.content);
        this.totalElements = response.totalElements;
        this.totalPages = response.totalPages;
        this.onSearch();
        this.isLoading = false;
      },
      error: (_err) => {
        this.isLoading = false;
      }
    });
  }

  transformEtudesFromAPI(apiEtudes: EtudeBet[]): EtudeBET[] {
    return apiEtudes.map(etude => ({
      id: etude.id,
      titre: etude.title,
      description: etude.description,
      studyType: etude.studyType || '',
      objective: etude.objective || '',
      problemObserved: etude.problemObserved || '',
      nomBET: etude.betName,
      dateCreation: this.formatDate(etude.createdAt),
     statut: this.mapStatus(etude.status) as 'En attente' | 'En cours' | 'Livrée' | 'Validée' | 'Rejetée',
      propertyId: etude.propertyId,
      propertyName: etude.propertyName,
      moaId: etude.moaId,
      moaName: etude.moaName,
      betId: etude.betId,
      documents: etude.documents || [],
      rapports: etude.reports?.map(report => ({
        id: report.id,
        nom: report.title,
        taille: '',
        dateSubmission: this.formatDate(report.submittedAt),
        url: report.fileUrl,
        versionNumber: report.versionNumber
      })) || []
    }));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Gestion des paires documentType + fichier
  // ═══════════════════════════════════════════════════════════════════════════

  addDocumentEntry(): void {
    this.documentEntries.push({ type: '', file: null, fileName: '' });
  }

  removeDocumentEntry(index: number): void {
    this.documentEntries.splice(index, 1);
  }

  onDocumentTypeChange(index: number, value: string): void {
    this.documentEntries[index].type = value;
  }

  onDocumentFileChange(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.documentEntries[index].file = input.files[0];
      this.documentEntries[index].fileName = input.files[0].name;
    }
  }

  isDocumentEntriesValid(): boolean {
    return this.documentEntries.every(e => e.type && e.file);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Modal IA
  // ═══════════════════════════════════════════════════════════════════════════

  openIAModal(etude: EtudeBET): void {

    // Fermer tous les autres modaux pour éviter les conflits d'affichage
    this.showDetailModal = false;
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showValidateModal = false;
    this.showRejectModal = false;
    this.showCreateReportModal = false;
    this.showCommentsModal = false;

    this.selectedEtudeForIA = etude;
    this.showIAModal = true;
    this.iaReport = null;
    this.iaError = null;
    this.isLoadingIA = true;


    this.etudeBetService.getDetailsFromIA(etude.id).subscribe({
      next: (report) => {
        this.iaReport = report;
        this.isLoadingIA = false;
      },
      error: (_err) => {
        this.iaError = 'Rapport IA non disponible pour cette étude.';
        this.isLoadingIA = false;
      }
    });
  }

  closeIAModal(): void {
    this.showIAModal = false;
    this.iaReport = null;
    this.iaError = null;
    this.selectedEtudeForIA = null;
  }

  getSeverityClass(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'bg-red-100 text-red-800 border border-red-200';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800 border border-orange-200';
      case 'LOW': return 'bg-green-100 text-green-800 border border-green-200';
      default: return 'bg-gray-100 text-gray-800 border border-gray-200';
    }
  }

  getSeverityLabel(severity: string): string {
    switch (severity?.toUpperCase()) {
      case 'HIGH': return 'Élevée';
      case 'MEDIUM': return 'Moyenne';
      case 'LOW': return 'Faible';
      default: return severity || 'Inconnue';
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Formatage / helpers
  // ═══════════════════════════════════════════════════════════════════════════

  formatDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
    return date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  formatCommentDate(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) return '';
    const date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2], dateArray[3] || 0, dateArray[4] || 0);
    return date.toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }



  getStudyTypeLabel(type: string): string {
    return STUDY_TYPES.find(t => t.value === type)?.label || type;
  }

  getDocTypeLabel(type: string): string {
    return DOCUMENT_TYPES.find(t => t.value === type)?.label || type;
  }

  getDocumentUrl(fileUrl: string): string {
    if (!fileUrl) return '';
    if (fileUrl.startsWith('http')) return fileUrl;
    return this.fileBaseUrl + fileUrl;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Recherche / pagination
  // ═══════════════════════════════════════════════════════════════════════════

  onSearch(): void {
    if (!this.searchTerm.trim()) {
      this.filteredEtudes = [...this.etudes];
      return;
    }
    const term = this.searchTerm.toLowerCase();
    this.filteredEtudes = this.etudes.filter(e =>
      e.titre.toLowerCase().includes(term) ||
      e.description.toLowerCase().includes(term) ||
      e.nomBET.toLowerCase().includes(term)
    );
  }

  goToPage(page: number): void {
    if (page >= 0 && page < this.totalPages) {
      this.currentPage = page;
      this.loadEtudes();
    }
  }

  nextPage(): void { this.goToPage(this.currentPage + 1); }
  previousPage(): void { this.goToPage(this.currentPage - 1); }

  getPageNumbers(): number[] {
    return Array.from({ length: this.totalPages }, (_, i) => i);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Statut / styles
  // ═══════════════════════════════════════════════════════════════════════════

  getStatusClass(statut: string): string {
    const map: Record<string, string> = {
      'En attente': 'bg-yellow-100 text-yellow-800',
      'En cours': 'bg-blue-100 text-blue-800',
      'Résolu': 'bg-green-100 text-green-800',
      'Fermé': 'bg-gray-100 text-gray-800',
      'Livrée': 'bg-blue-100 text-blue-800',
      'Validée': 'bg-green-100 text-green-800',
      'Rejetée': 'bg-red-100 text-red-800',
    };
    return map[statut] || 'bg-gray-100 text-gray-800';
  }


  getProgressSteps(statut: string): { step: number; isCompleted: boolean; isCurrent: boolean; label: string; showCheck: boolean }[] {
    const steps = [
      { step: 1, label: 'En attente de réponse', isCompleted: false, isCurrent: false, showCheck: false },
      { step: 2, label: "En cours d'acceptation", isCompleted: false, isCurrent: false, showCheck: false },
      { step: 3, label: 'En cours de livraison', isCompleted: false, isCurrent: false, showCheck: false },
      { step: 4, label: 'Validation/Rejet', isCompleted: false, isCurrent: false, showCheck: false }
    ];
    const idx = { 'En attente': 0, 'En cours': 1, 'Livrée': 2, 'Validée': 3, 'Rejetée': 3 }[statut] ?? 0;
    for (let i = 0; i < idx; i++) { steps[i].isCompleted = true; steps[i].showCheck = true; }
    steps[idx].isCurrent = true;
    return steps;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Modaux — ouverture / fermeture
  // ═══════════════════════════════════════════════════════════════════════════

  openCreateModal(): void {
    this.newEtude = {
      title: '', description: '', studyType: '', objective: '', problemObserved: '',
      propertyId: this.currentPropertyId, clientId: this.currentUserId, betId: 0,
      documentTypes: [], files: []
    };
    this.documentEntries = [];
    this.betSearchKeyword = '';
    this.betPage = 0;
    this.availableBETs = [];
    this.betHasMore = true;
    this.showCreateModal = true;
  }

  openEditModal(etude: EtudeBET): void {
    this.editEtude = {
      title: etude.titre, description: etude.description, studyType: etude.studyType,
      objective: etude.objective, problemObserved: etude.problemObserved,
      propertyId: etude.propertyId, clientId: this.currentUserId, betId: etude.betId,
      documentTypes: [], files: []
    };
    this.documentEntries = []; // reset les documents
    this.selectedEtude = etude;
    this.editSelectedBET = {
      id: etude.betId,
      nom: etude.nomBET.split(' ').slice(1).join(' ') || etude.nomBET,
      prenom: etude.nomBET.split(' ')[0] || '',
      email: '', profil: 'BET'
    };
    this.editBetSearchKeyword = '';
    this.showEditBetDropdown = false;
    this.betPage = 0;
    this.availableBETs = [];
    this.showEditModal = true;
  }

  openDetailModal(etude: EtudeBET): void {
    this.selectedEtude = etude;
    this.showDetailModal = true;
    this.loadCommentsForDetail(etude);
  }

  private loadCommentsForDetail(etude: EtudeBET): void {
    this.etudeBetService.getComment(etude.id).subscribe({
      next: (comments) => { this.comments = comments; },
      error: (_err) => { this.comments = []; }
    });
  }

  loadComments(etude: EtudeBET): void {
    this.selectedEtudeForComments = etude;
    this.etudeBetService.getComment(etude.id).subscribe({
      next: (comments) => { this.comments = comments; this.showCommentsModal = true; },
      error: (_err) => { this.comments = []; this.showCommentsModal = true; }
    });
  }

  openValidateModal(etude: EtudeBET): void { this.selectedEtude = etude; this.showValidateModal = true; }
  openRejectModal(etude: EtudeBET): void { this.selectedEtude = etude; this.rejectReason = ''; this.showRejectModal = true; }

  openEditReportModal(rapport: any, etude: EtudeBET): void {
    this.selectedReport = rapport;
    this.selectedEtude = etude;
    this.editReport = { title: rapport.nom, file: '', versionNumber: rapport.versionNumber + 1, studyRequestId: etude.id, authorId: this.currentPropertyId };
    this.showEditReportModal = true;
  }

  closeAllModals(): void {
    this.showCreateModal = false;
    this.showEditModal = false;
    this.showDetailModal = false;
    this.showValidateModal = false;
    this.showRejectModal = false;
    this.showEditReportModal = false;
    this.showCommentsModal = false;
    this.selectedEtude = null;
    this.selectedReport = null;
    this.selectedEtudeForComments = null;
    this.rejectReason = '';
    this.newComment = '';
    this.comments = [];
    this.documentEntries = [];
  }

  openCreateReportModal(): void {
    if (!this.selectedEtude) return;
    this.newReport = { title: '', version: '', file: null };
    this.createReportError = null;
    this.showCreateReportModal = true;
  }

  closeCreateReportModal(): void {
    this.showCreateReportModal = false;
    this.isCreatingReport = false;
    this.createReportError = null;
    this.newReport = { title: '', version: '1', file: null };
  }

  cancelCreateReport(): void { this.closeCreateReportModal(); }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  createEtude(): void {
    const valid = this.newEtude.title && this.newEtude.description && this.newEtude.studyType &&
      this.newEtude.objective && this.newEtude.problemObserved && this.newEtude.betId;
    if (!valid) return;
    if (this.documentEntries.length > 0 && !this.isDocumentEntriesValid()) {
      alert('Veuillez remplir le type et le fichier pour chaque document.');
      return;
    }

    this.newEtude.documentTypes = this.documentEntries.map(e => e.type);
    this.newEtude.files = this.documentEntries.map(e => e.file!);

    this.isLoading = true;
    this.etudeBetService.createEtude(this.newEtude).subscribe({
      next: () => { this.loadEtudes(); this.closeAllModals(); this.isLoading = false; },
      error: (_err) => {this.isLoading = false; }
    });
  }

  updateEtude(): void {
    const valid = this.editEtude.title && this.editEtude.description && this.editEtude.studyType &&
      this.editEtude.objective && this.editEtude.problemObserved && this.editEtude.betId;
    if (!this.selectedEtude || !valid) return;
    
    if (this.documentEntries.length > 0 && !this.isDocumentEntriesValid()) {
      alert('Veuillez remplir le type et le fichier pour chaque document.');
      return;
    }

    this.editEtude.documentTypes = this.documentEntries.map(e => e.type);
    this.editEtude.files = this.documentEntries.map(e => e.file!);

    this.isLoading = true;
    this.etudeBetService.updateEtude(this.selectedEtude.id, this.editEtude).subscribe({
      next: () => { this.loadEtudes(); this.closeAllModals(); this.isLoading = false; },
      error: (_err) => {this.isLoading = false; }
    });
  }

  updateReport(): void {
    if (!this.selectedReport || !this.editReport.title || !this.editReport.studyRequestId) return;
    this.isLoading = true;
    this.editReport.authorId = this.currentPropertyId;
    this.etudeBetService.updateReport(this.selectedReport.id, this.editReport).subscribe({
      next: () => { this.loadEtudes(); this.closeAllModals(); this.isLoading = false; },
      error: (_err) => {this.isLoading = false; }
    });
  }

  deleteReport(rapport: { id: number; nom: string }, etude: EtudeBET): void {
    if (confirm(`Supprimer le rapport "${rapport.nom}" ?`)) {
      this.isLoading = true;
      this.etudeBetService.deleteReport(rapport.id).subscribe({
        next: () => { this.loadEtudes(); this.isLoading = false; },
        error: (_err) => {this.isLoading = false; }
      });
    }
  }

  validateEtude(): void {
    if (!this.selectedEtude) return;
    this.isLoading = true;
    this.etudeBetService.acceptEtude(this.selectedEtude.id).subscribe({
      next: () => { this.loadEtudes(); this.closeAllModals(); this.isLoading = false; },
      error: (_err) => {this.isLoading = false; }
    });
  }

  rejectEtude(): void {
    if (!this.selectedEtude) return;
    this.isLoading = true;
    this.etudeBetService.rejectEtude(this.selectedEtude.id).subscribe({
      next: () => { this.loadEtudes(); this.closeAllModals(); this.isLoading = false; },
      error: (_err) => {this.isLoading = false; }
    });
  }

  deleteEtude(etude: EtudeBET): void {
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Commentaires
  // ═══════════════════════════════════════════════════════════════════════════

  addCommentDetail(content: string): void {
    if (!content?.trim() || !this.selectedEtude?.id) return;
    const currentUser = this.authService.currentUser();
    if (!currentUser?.id) { alert('Vous devez être connecté pour commenter.'); return; }

    this.isLoading = true;
    this.demandeService.createComment(this.selectedEtude.id, currentUser.id, { content: content.trim() }).subscribe({
      next: () => { if (this.selectedEtude) this.loadCommentsForDetail(this.selectedEtude); this.isLoading = false; },
      error: (_err) => {this.isLoading = false; }
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Rapport
  // ═══════════════════════════════════════════════════════════════════════════

  onReportFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) this.newReport.file = input.files[0];
  }

  getReportFileName(): string { return this.newReport.file?.name || 'Aucun fichier choisi'; }
  hasReportFileSelected(): boolean { return !!this.newReport.file; }

  createReport(): void {
    if (!this.newReport.title?.trim() || !this.newReport.version?.trim() || !this.newReport.file) {
      this.createReportError = 'Veuillez remplir tous les champs obligatoires.';
      return;
    }
    if (!this.selectedEtude) { this.createReportError = 'Aucune étude sélectionnée.'; return; }
    const currentUser = this.authService.currentUser();
    if (!currentUser?.id) { this.createReportError = 'Utilisateur non connecté.'; return; }

    this.isCreatingReport = true;
    this.createReportError = null;

    this.demandeService.createReport({
      title: this.newReport.title.trim(),
      versionNumber: parseInt(this.newReport.version),
      studyRequestId: this.selectedEtude.id,
      authorId: currentUser.id
    }, this.newReport.file).subscribe({
      next: (response) => {
        if (this.selectedEtude) {
          if (!this.selectedEtude.rapports) this.selectedEtude.rapports = [];
          this.selectedEtude.rapports.push({
            id: response.id, nom: response.title || this.newReport.title,
            taille: this.formatFileSize(this.newReport.file!.size),
            dateSubmission: this.getCurrentDateFormatted(),
            url: response.fileUrl || '', versionNumber: response.versionNumber || parseInt(this.newReport.version)
          });
        }
        this.loadEtudes();
        this.closeCreateReportModal();
        this.isCreatingReport = false;
      },
      error: (err) => {
        this.createReportError = err.status === 413 ? 'Fichier trop volumineux.' : 'Erreur lors de la création du rapport.';
        this.isCreatingReport = false;
      }
    });
  }

  downloadReport(rapport: { id: number; nom: string; url: string }): void {
    if (rapport.url) window.open(rapport.url, '_blank');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Conditions d'affichage
  // ═══════════════════════════════════════════════════════════════════════════

  canEdit(statut: string): boolean { return ['En attente', 'En cours'].includes(statut); }
  canValidateOrReject(statut: string): boolean { return statut === 'Livrée'; }
  getBETNameById(betId: number): string { return this.availableBETs.find(b => b.id === betId)?.nom || ''; }

  // ═══════════════════════════════════════════════════════════════════════════
  // Utilitaires privés
  // ═══════════════════════════════════════════════════════════════════════════

  private getCurrentDateFormatted(): string {
    const now = new Date();
    return `${String(now.getDate()).padStart(2, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${now.getFullYear()}`;
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024, sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Badges studyType
  // ═══════════════════════════════════════════════════════════════════════════

  getStudyTypeBadgeClass(studyType: string): string {
    const map: Record<string, string> = {
      FOUNDATION_RECALCULATION: 'bg-orange-100 text-orange-800',
      SOIL_ANALYSIS:            'bg-yellow-100 text-yellow-800',
      STRUCTURAL_ANALYSIS:      'bg-blue-100 text-blue-800',
      CRACK_ANALYSIS:           'bg-red-100 text-red-800',
      LOAD_VERIFICATION:        'bg-cyan-100 text-cyan-800',
      STRUCTURAL_REINFORCEMENT: 'bg-purple-100 text-purple-800',
      OTHER:                    'bg-gray-100 text-gray-800',
    };
    return map[studyType] || 'bg-gray-100 text-gray-800';
  }

  // Alias exposés pour compatibilité avec les directives du template
  get iaErrorMessage(): string { return this.iaError ?? ''; }
  get selectedIAReport() { return this.iaReport; }

  /** Alias pour ouvrirRapportIA(id) appelé depuis le template */
  ouvrirRapportIA(studyId: number): void {
    const etude = this.etudes.find(e => e.id === studyId);
    if (etude) this.openIAModal(etude);
  }
}