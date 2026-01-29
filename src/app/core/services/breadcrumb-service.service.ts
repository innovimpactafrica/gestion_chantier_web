import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface BreadcrumbItem {
  label: string;
  path: string;
}

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService {
  private breadcrumbsSubject = new BehaviorSubject<BreadcrumbItem[]>([
    { label: 'breadcrumb.home', path: '/dashboard' },
    { label: 'breadcrumb.dashboard', path: '/dashboard' }
  ]);

  breadcrumbs$ = this.breadcrumbsSubject.asObservable();

  constructor() { }

  // Met à jour le fil d'Ariane avec un nouveau chemin
  setBreadcrumbs(items: BreadcrumbItem[]): void {
    // Toujours commencer par Accueil
    const breadcrumbs = [
      { label: 'breadcrumb.home', path: '/#' },
      ...items
    ];
    this.breadcrumbsSubject.next(breadcrumbs);
  }

  // Ajoute un niveau au fil d'Ariane actuel
  addBreadcrumb(item: BreadcrumbItem): void {
    const currentBreadcrumbs = this.breadcrumbsSubject.value;
    // Vérifie si l'élément existe déjà pour éviter la duplication
    if (!currentBreadcrumbs.some(b => b.path === item.path)) {
      this.breadcrumbsSubject.next([...currentBreadcrumbs, item]);
    }
  }

  // Réinitialise le fil d'Ariane à son état initial (Accueil/Tableau de Bord)
  reset(): void {
    this.breadcrumbsSubject.next([
      { label: 'breadcrumb.home', path: '/#' },
      { label: 'breadcrumb.dashboard', path: '/dashboard' }
    ]);
  }

  // Nouvelle méthode pour définir le breadcrumb du dashboard
  setDashboardBreadcrumb(): void {
    this.breadcrumbsSubject.next([
      { label: 'breadcrumb.home', path: '/' },
      { label: 'breadcrumb.dashboard', path: '/dashboard' }
    ]);
  }
}