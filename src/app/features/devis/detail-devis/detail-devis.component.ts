import { Component, OnInit, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { DevisService, ConstructionQuoteDetail, QuoteLot } from '../../../../services/devis.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { LanguageService } from '../../../core/services/language.service';

@Component({
  selector: 'app-detail-devis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './detail-devis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DetailDevisComponent implements OnInit, OnDestroy {
  quote: ConstructionQuoteDetail | null = null;
  isLoading = true;
  error: string | null = null;
  expandedLots = new Set<number>();
  isDeleting = false;
  showDeleteModal = false;

  private destroy$ = new Subject<void>();
  private languageService = inject(LanguageService);

  constructor(
    public devisService: DevisService,
    private authService: AuthService,
    private toastService: ToastService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    const userId = this.authService.currentUser()?.id;
    if (!id || !userId) {
      this.error = 'Paramètres invalides';
      this.isLoading = false;
      this.cdr.markForCheck();
      return;
    }
    this.loadQuote(id, userId);
  }

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  t(key: string): string { return this.languageService.translate(key); }

  private loadQuote(id: number, userId: number): void {
    this.isLoading = true;
    this.devisService.getById(id, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (q) => {
        this.quote = q;
        // Expand all lots by default
        q.lots?.forEach(l => this.expandedLots.add(l.lotNumber));
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err: any) => {
        const msg = this.extractError(err);
        this.error = msg;
        this.toastService.showError(msg);
        this.isLoading = false;
        this.cdr.markForCheck();
      }
    });
  }

  toggleLot(lotNumber: number): void {
    if (this.expandedLots.has(lotNumber)) {
      this.expandedLots.delete(lotNumber);
    } else {
      this.expandedLots.add(lotNumber);
    }
    this.cdr.markForCheck();
  }

  isLotExpanded(lotNumber: number): boolean {
    return this.expandedLots.has(lotNumber);
  }

  expandAll(): void {
    this.quote?.lots?.forEach(l => this.expandedLots.add(l.lotNumber));
    this.cdr.markForCheck();
  }

  collapseAll(): void {
    this.expandedLots.clear();
    this.cdr.markForCheck();
  }

  goBack(): void { this.router.navigate(['/devis']); }

  downloadPdf(): void {
    if (!this.quote) return;
    const url = this.devisService.getPdfUrlWithToken(this.quote.id);
    window.open(url, '_blank');
  }

  confirmDelete(): void { this.showDeleteModal = true; this.cdr.markForCheck(); }
  closeDeleteModal(): void { this.showDeleteModal = false; this.cdr.markForCheck(); }

  deleteQuote(): void {
    if (!this.quote) return;
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;
    this.isDeleting = true;
    this.cdr.markForCheck();
    this.devisService.delete(this.quote.id, userId).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toastService.showSuccess('Devis supprimé avec succès');
        this.router.navigate(['/devis']);
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
  formatCost(v: number | undefined): string {
    if (v === undefined || v === null) return '-';
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency', currency: 'XOF', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(v);
  }

  formatQty(qty: number, unit: string): string {
    return `${new Intl.NumberFormat('fr-FR').format(qty)} ${unit}`;
  }

  formatPct(rate: number): string {
    return `${(rate * 100).toFixed(0)} %`;
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

  getLotWeight(lot: QuoteLot): number {
    if (!this.quote?.totalHT || !lot.lotTotal) return 0;
    return (lot.lotTotal / this.quote.totalHT) * 100;
  }

  getLotColor(index: number): string {
    const colors = [
      'bg-orange-500', 'bg-blue-500', 'bg-emerald-500', 'bg-purple-500',
      'bg-rose-500', 'bg-amber-500', 'bg-teal-500', 'bg-indigo-500'
    ];
    return colors[index % colors.length];
  }

  getLotBadgeColor(index: number): string {
    const colors = [
      'bg-orange-100 text-orange-700 border-orange-200',
      'bg-blue-100 text-blue-700 border-blue-200',
      'bg-emerald-100 text-emerald-700 border-emerald-200',
      'bg-purple-100 text-purple-700 border-purple-200',
      'bg-rose-100 text-rose-700 border-rose-200',
      'bg-amber-100 text-amber-700 border-amber-200',
      'bg-teal-100 text-teal-700 border-teal-200',
      'bg-indigo-100 text-indigo-700 border-indigo-200'
    ];
    return colors[index % colors.length];
  }

  trackByLot(_: number, l: QuoteLot): number { return l.lotNumber; }
  trackByLine(_: number, l: any): string { return l.designation; }

  private extractError(err: any): string {
    if (err?.status === 401) return 'Utilisateur non authentifié';
    if (err?.status === 403) return 'Accès refusé';
    if (err?.status === 404) return 'Devis introuvable';
    if (err?.status === 500) return 'Erreur serveur — veuillez réessayer';
    const msg = err?.error?.message || err?.message;
    return typeof msg === 'string' ? msg : 'Erreur de chargement';
  }
}
