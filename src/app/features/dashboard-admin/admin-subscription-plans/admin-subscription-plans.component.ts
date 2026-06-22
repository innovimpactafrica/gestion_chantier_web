import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { UserService, User } from '../../../../services/user.service';
import { SubscriptionService, UserSubscription, toJsDate } from '../../../../services/subscription.service';

@Component({
  selector: 'app-admin-subscription-plans',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-subscription-plans.component.html',
  styleUrls: ['./admin-subscription-plans.component.css']
})
export class AdminSubscriptionPlansComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];

  // Abonnement réel de chaque utilisateur (récupéré via un appel dédié,
  // le endpoint liste des utilisateurs ne renvoie pas cette donnée)
  private subscriptionsByUserId = new Map<number, UserSubscription | null>();

  // Pagination
  currentPage: number = 1;
  pageSize: number = 5;
  totalPages: number = 1;

  // Filters
  searchTerm: string = '';
  statusFilter: string = 'ALL'; // 'ALL', 'ACTIVE', 'INACTIVE'

  loading: boolean = true;
  error: string | null = null;
  Math = Math; // Expose Math to template

  constructor(
    private userService: UserService,
    private subscriptionService: SubscriptionService
  ) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.error = null;

    // Taille large : la recherche/le filtrage/la pagination se font côté client
    this.userService.getAllUsers('', undefined, 0, 1000).subscribe({
      next: (response) => {
        this.users = response.content;
        this.loadSubscriptions();
      },
      error: (err) => {
        console.error('Erreur lors du chargement des utilisateurs', err);
        this.error = "Impossible de charger l'historique d'abonnement.";
        this.loading = false;
      }
    });
  }

  /**
   * Récupère l'abonnement de chaque utilisateur en parallèle.
   * Un 404 (pas d'abonnement) n'est pas une erreur bloquante.
   */
  private loadSubscriptions(): void {
    if (this.users.length === 0) {
      this.applyFilters();
      this.loading = false;
      return;
    }

    const requests = this.users.map(user =>
      this.subscriptionService.getSubscriptionByUser(user.id).pipe(
        catchError(() => of(null))
      )
    );

    forkJoin(requests).subscribe(subscriptions => {
      subscriptions.forEach((sub, index) => {
        this.subscriptionsByUserId.set(this.users[index].id, sub);
      });
      this.applyFilters();
      this.loading = false;
    });
  }

  applyFilters(): void {
    let result = this.users;

    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(u =>
        (u.nom && u.nom.toLowerCase().includes(term)) ||
        (u.prenom && u.prenom.toLowerCase().includes(term)) ||
        (u.profil && u.profil.toLowerCase().includes(term))
      );
    }

    if (this.statusFilter === 'ACTIVE') {
      result = result.filter(u => this.isActive(u));
    } else if (this.statusFilter === 'INACTIVE') {
      result = result.filter(u => !this.isActive(u));
    }

    this.filteredUsers = result;
    this.totalPages = Math.ceil(this.filteredUsers.length / this.pageSize) || 1;
    if (this.currentPage > this.totalPages) {
      this.currentPage = 1;
    }
  }

  get paginatedUsers(): User[] {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    return this.filteredUsers.slice(start, end);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  getFullName(user: User): string {
    return `${user.prenom || ''} ${user.nom || ''}`.trim() || 'N/A';
  }

  private getSubscription(user: User): UserSubscription | null {
    return this.subscriptionsByUserId.get(user.id) ?? null;
  }

  getPlanLabel(user: User): string {
    return this.getSubscription(user)?.subscriptionPlan?.label || '-';
  }

  getCost(user: User): number | null {
    return this.getSubscription(user)?.subscriptionPlan?.totalCost ?? null;
  }

  getProjectLimit(user: User): string {
    const plan = this.getSubscription(user)?.subscriptionPlan;
    if (!plan) return '-';
    return plan.unlimitedProjects ? 'Illimité' : `${plan.projectLimit}`;
  }

  isActive(user: User): boolean {
    const endDate = toJsDate(this.getSubscription(user)?.endDate);
    if (!endDate) return false;
    return endDate.getTime() > Date.now();
  }

  getExpirationDate(user: User): string {
    const date = toJsDate(this.getSubscription(user)?.endDate);
    if (!date) return '-';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }
}
