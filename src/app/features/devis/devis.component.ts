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
  quotes: ConstructionQuote[] = [];        // table data (filter/search)
  filteredQuotes: ConstructionQuote[] = [];
  allQuotes: ConstructionQuote[] = [];     // always full list — used only for stats

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
        this.applyFilter();
      }
    });

    this.loadAll();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  t(key: string): string { return this.languageService.translate(key); }

  loadQuotes(): void {
    this.searchTerm = '';
    this.loadAll();
  }

  private loadAll(): void {
    if (!this.userId) return;
    this.isLoading = true;
    this.cdr.markForCheck();
    this.devisService.getUserQuotes(this.userId, 0, 100)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (page) => {
          this.allQuotes = page.content ?? [];
          this.applyFilter();
          this.isLoading = false;
          this.cdr.markForCheck();
        },
        error: (err: any) => {
          this.toastService.showError(this.extractError(err));
          this.allQuotes = [];
          this.isLoading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private applyFilter(): void {
    if (this.activeFilter === 'all') {
      this.filteredQuotes = [...this.allQuotes];
    } else {
      this.filteredQuotes = this.allQuotes.filter(q => q.status === this.activeFilter);
    }
    this.quotes = [...this.filteredQuotes];
    this.totalElements = this.filteredQuotes.length;
    this.cdr.markForCheck();
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
    this.applyFilter();
  }

  setFilter(filter: 'all' | QuoteStatus): void {
    this.activeFilter = filter;
    this.searchTerm = '';
    this.applyFilter();
  }

  // ─── Stats (basés sur allQuotes — indépendant du filtre actif) ───────────────
  get totalCount(): number { return this.allQuotes.length; }
  get draftCount(): number { return this.allQuotes.filter(q => q.status === 'DRAFT').length; }
  get acceptedCount(): number { return this.allQuotes.filter(q => q.status === 'APPROVED').length; }

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
        this.loadAll();
      },
      error: (err: any) => {
        this.isDeleting = false;
        this.toastService.showError(this.extractError(err));
        this.closeDeleteModal();
        this.cdr.markForCheck();
      }
    });
  }

  // ─── Stats ────────────────────────────────────────────────────────────────────
  get totalTTCSum(): number {
    return this.allQuotes.reduce((sum, q) => sum + (q.totalTTC || 0), 0);
  }

  get averageDuration(): number {
    const durations = this.allQuotes.map(q => this.getDurationMonths(q)).filter(d => d > 0);
    if (!durations.length) return 0;
    return Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
  }

  getDurationMonths(quote: ConstructionQuote): number {
    if (quote.estimatedDurationMonths) return quote.estimatedDurationMonths;
    if (quote.executionDelay) {
      const m = quote.executionDelay.match(/(\d+)/);
      return m ? parseInt(m[1], 10) : 0;
    }
    return 0;
  }

  // ─── Formatting ───────────────────────────────────────────────────────────────
  formatBigNumber(value: number): string {
    return new Intl.NumberFormat('fr-FR').format(Math.round(value));
  }

  formatCost(value: number | undefined): string {
    if (value === undefined || value === null) return '-';
    return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
  }

  formatDate(arr: number[] | string | undefined | null): string {
    const d = this.devisService.parseDate(arr);
    return d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '-';
  }

  getLocation(quote: ConstructionQuote): string {
    return quote.neighborhood ? `${quote.neighborhood}, ${quote.city}` : `${quote.city}, ${quote.country}`;
  }

  // ─── Status ───────────────────────────────────────────────────────────────────
  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      DRAFT: 'Brouillon', SENT: 'Soumis', APPROVED: 'Approuvé', REJECTED: 'Rejeté'
    };
    return labels[status] || status;
  }

  getStatusClass(status: string): string {
    const c: Record<string, string> = {
      DRAFT:    'bg-amber-100 text-amber-700 border border-amber-200',
      SENT:     'bg-blue-100 text-blue-700 border border-blue-200',
      APPROVED: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
      REJECTED: 'bg-red-100 text-red-700 border border-red-200'
    };
    return c[status] || 'bg-gray-100 text-gray-600 border border-gray-200';
  }

  // ─── Filter button class ──────────────────────────────────────────────────────
  filterBtnClass(filter: 'all' | QuoteStatus): string {
    const base = 'px-4 py-2 rounded-lg text-sm font-medium border transition-colors';
    return this.activeFilter === filter
      ? `${base} bg-orange-500 border-orange-500 text-white shadow-sm`
      : `${base} bg-white border-gray-200 text-gray-600 hover:border-gray-300 hover:text-gray-800`;
  }

  // ─── Project type icon path ───────────────────────────────────────────────────
  getProjectTypePath(type: string): string {
    const paths: Record<string, string> = {
      VILLA:    'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      IMMEUBLE: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      COMMERCE: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      BUREAU:   'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
      ENTREPOT: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z',
      AUTRE:    'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5'
    };
    return paths[type] || paths['AUTRE'];
  }

  // ─── Finishing level badge ────────────────────────────────────────────────────
  getFinishingLevelClass(level: string): string {
    const c: Record<string, string> = {
      HAUT_STANDING: 'bg-amber-100 text-amber-700 border border-amber-200',
      LUXE:          'bg-purple-100 text-purple-700 border border-purple-200',
      STANDARD:      'bg-gray-100 text-gray-600 border border-gray-200',
      ECONOMIQUE:    'bg-teal-100 text-teal-700 border border-teal-200'
    };
    return c[level] || 'bg-gray-100 text-gray-600 border border-gray-200';
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
