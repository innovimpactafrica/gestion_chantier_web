import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { SubscriptionService, PaymentHistory, PaymentHistoryFilters, toJsDate } from '../../../../services/subscription.service';

@Component({
  selector: 'app-admin-payment-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-payment-history.component.html',
  styleUrls: ['./admin-payment-history.component.css']
})
export class AdminPaymentHistoryComponent implements OnInit, OnDestroy {
  payments: PaymentHistory[] = [];

  // Pagination (gérée par le backend)
  currentPage: number = 0; // 0-indexé côté API
  pageSize: number = 10;
  pageSizeOptions: number[] = [10, 25, 50, 100];
  totalPages: number = 1;
  totalElements: number = 0;

  // Filtres
  statusFilter: 'ALL' | 'PENDING' | 'SUCCESS' | 'FAILED' = 'ALL';
  dateFrom: string = ''; // format 'YYYY-MM-DD' (input type="date")
  dateTo: string = '';
  orderNumberFilter: string = '';

  loading: boolean = true;
  error: string | null = null;

  private orderNumberSearch$ = new Subject<string>();

  constructor(private subscriptionService: SubscriptionService) {}

  ngOnInit(): void {
    this.orderNumberSearch$
      .pipe(debounceTime(400), distinctUntilChanged())
      .subscribe(() => {
        this.currentPage = 0;
        this.loadPayments();
      });

    this.loadPayments();
  }

  ngOnDestroy(): void {
    this.orderNumberSearch$.complete();
  }

  loadPayments(): void {
    this.loading = true;
    this.error = null;

    const filters: PaymentHistoryFilters = {
      page: this.currentPage,
      size: this.pageSize
    };

    if (this.statusFilter !== 'ALL') {
      filters.status = this.statusFilter;
    }

    if (this.dateFrom) {
      filters.from = `${this.dateFrom}T00:00:00`;
    }

    if (this.dateTo) {
      filters.to = `${this.dateTo}T23:59:59`;
    }

    const orderNumber = Number(this.orderNumberFilter.trim());
    if (this.orderNumberFilter.trim() && !isNaN(orderNumber)) {
      filters.orderNumber = orderNumber;
    }

    this.subscriptionService.getPaymentHistory(filters).subscribe({
      next: (response) => {
        this.payments = response.content;
        this.totalPages = response.totalPages || 1;
        this.totalElements = response.totalElements;
        this.loading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement de l\'historique des paiements', err);
        this.error = err.userMessage || 'Impossible de charger l\'historique des paiements.';
        this.loading = false;
      }
    });
  }

  onStatusFilterChange(): void {
    this.currentPage = 0;
    this.loadPayments();
  }

  onDateFilterChange(): void {
    this.currentPage = 0;
    this.loadPayments();
  }

  onOrderNumberFilterChange(): void {
    this.orderNumberSearch$.next(this.orderNumberFilter);
  }

  resetFilters(): void {
    this.statusFilter = 'ALL';
    this.dateFrom = '';
    this.dateTo = '';
    this.orderNumberFilter = '';
    this.currentPage = 0;
    this.loadPayments();
  }

  onPageSizeChange(): void {
    this.currentPage = 0;
    this.loadPayments();
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.loadPayments();
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.loadPayments();
    }
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'bg-green-100 text-green-700';
      case 'PENDING': return 'bg-yellow-100 text-yellow-700';
      case 'FAILED': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'SUCCESS': return 'Réussi';
      case 'PENDING': return 'En attente';
      case 'FAILED': return 'Échoué';
      default: return status;
    }
  }

  /** Convertit initiatedAt/confirmedAt (tableau backend ou chaîne ISO) en Date JS pour le pipe `date` */
  toDate(value: PaymentHistory['initiatedAt'] | PaymentHistory['confirmedAt']): Date | null {
    return toJsDate(value);
  }
}
