import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { DevisService, ConstructionQuote, QuoteStatus } from '../../../services/devis.service';
import { LanguageService } from '../../core/services/language.service';
import { AuthService } from '../auth/services/auth.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-devis',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './devis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DevisComponent implements OnInit, OnDestroy {
  quotes: ConstructionQuote[] = [];
  filteredQuotes: ConstructionQuote[] = [];

  isLoading = false;
  isDeleting = false;

  searchTerm = '';
  activeFilter: 'all' | QuoteStatus = 'all';

  showDeleteModal = false;
  quoteToDelete: ConstructionQuote | null = null;

  totalElements = 0;

  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();
  private languageService = inject(LanguageService);
  private userId: number | null = null;

  constructor(
    public devisService: DevisService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userId = this.authService.currentUser()?.id ?? null;

    this.searchSubject.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(term => {
      if (term.trim().length >= 2) {
        this.runSearch(term);
      } else if (term.trim().length === 0) {
        this.loadByFilter();
      }
    });

    this.loadQuotes();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  t(key: string): string { return this.languageService.translate(key); }

  loadQuotes(): void {
    this.searchTerm = '';
    this.loadByFilter();
  }

  private loadByFilter(): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.cdr.markForCheck();

    const req$ = this.activeFilter === 'all'
      ? this.devisService.getUserQuotes(this.userId)
      : this.devisService.filterByStatus(this.userId, this.activeFilter as QuoteStatus);

    req$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (page) => {
        this.quotes = page.content ?? [];
        this.filteredQuotes = [...this.quotes];
        this.totalElements = page.totalElements;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = this.extractError(err);
        this.toastService.showError(msg);
        this.quotes = [];
        this.filteredQuotes = [];
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  private runSearch(term: string): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.cdr.markForCheck();

    this.devisService.searchQuotes(this.userId, term).pipe(takeUntil(this.destroy$)).subscribe({
      next: (page) => {
        this.filteredQuotes = page.content ?? [];
        this.totalElements = page.totalElements;
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        this.toastService.showError(this.extractError(err));
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  onSearchChange(): void {
    this.searchSubject.next(this.searchTerm);
  }

  clearSearch(): void {
    this.searchTerm = '';
    this.loadByFilter();
  }

  setFilter(filter: 'all' | QuoteStatus): void {
    this.activeFilter = filter;
    this.searchTerm = '';
    this.loadByFilter();
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────
  get totalCount(): number { return this.quotes.length; }
  get draftCount(): number { return this.quotes.filter(q => q.status === 'DRAFT').length; }
  get acceptedCount(): number { return this.quotes.filter(q => q.status === 'ACCEPTED').length; }
  get thisMonthCount(): number {
    const now = new Date();
    return this.quotes.filter(q => {
      const d = this.devisService.parseDate(q.createdAt);
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
  }

  // ─── Navigation ───────────────────────────────────────────────────────────────
  navigateToNew(): void { this.router.navigate(['/devis/nouveau']); }
  viewQuote(quote: ConstructionQuote): void { this.router.navigate(['/devis', quote.id]); }

  // ─── Delete ───────────────────────────────────────────────────────────────────
  confirmDeleteQuote(quote: ConstructionQuote): void {
    this.quoteToDelete = quote;
    this.showDeleteModal = true;
    this.cdr.markForCheck();
  }

  closeDeleteModal(): void {
    this.showDeleteModal = false;
    this.quoteToDelete = null;
    this.cdr.markForCheck();
  }

  deleteQuote(): void {
    if (!this.quoteToDelete || !this.userId) return;
    this.isDeleting = true;
    this.cdr.markForCheck();

    this.devisService.delete(this.quoteToDelete.id, this.userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.isDeleting = false;
        this.toastService.showSuccess('Devis supprimé avec succès');
        this.closeDeleteModal();
        this.loadByFilter();
      },
      error: (err: any) => {
        this.isDeleting = false;
        this.toastService.showError(this.extractError(err));
        this.closeDeleteModal();
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon', SENT: 'Envoyé', ACCEPTED: 'Accepté', REJECTED: 'Rejeté'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const c: Record<string, string> = {
      DRAFT: 'bg-amber-100 text-amber-700 border border-amber-200',
      SENT: 'bg-blue-100 text-blue-700 border border-blue-200',
      ACCEPTED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      REJECTED: 'bg-red-100 text-red-700 border border-red-200'
    };
    return c[status] || 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  getProjectTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      VILLA: 'Villa', IMMEUBLE: 'Immeuble', COMMERCE: 'Commerce',
      BUREAU: 'Bureau', ENTREPOT: 'Entrepôt', AUTRE: 'Autre'
    };
    return labels[type] || type;
  }

  getProjectTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      VILLA: '🏡', IMMEUBLE: '🏢', COMMERCE: '🏪',
      BUREAU: '🏬', ENTREPOT: '🏭', AUTRE: '🏗️'
    };
    return icons[type] || '🏗️';
  }

  formatCost(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(arr: number[] | string | undefined | null): string {
    const d = this.devisService.parseDate(arr);
    return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
  }

  getOptionsIcons(quote: ConstructionQuote): string[] {
    const opts: string[] = [];
    if (quote.hasBasement) opts.push('⬇️ Sous-sol');
    if (quote.hasParking) opts.push('🚗 Parking');
    if (quote.hasPool) opts.push('🏊 Piscine');
    if (quote.hasGarden) opts.push('🌿 Jardin');
    if (quote.hasElevator) opts.push('🛗 Ascenseur');
    return opts;
  }

  trackByQuote(_: number, q: ConstructionQuote): number { return q.id; }

  private extractError(err: any): string {
    if (err?.status === 400) return 'Données invalides';
    if (err?.status === 401) return 'Utilisateur non authentifié';
    if (err?.status === 403) return 'Accès refusé';
    if (err?.status === 404) return 'Ressource introuvable';
    if (err?.status === 500) return 'Erreur serveur — veuillez réessayer';
    const msg = err?.error?.message || err?.error || err?.message;
    return typeof msg === 'string' ? msg : 'Erreur de connexion au serveur';
  }
}
