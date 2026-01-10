import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter } from 'rxjs/operators';
import { BreadcrumbItem, BreadcrumbService } from '../../../core/services/breadcrumb-service.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-breadcrumb',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class BreadcrumbComponent implements OnInit {
  breadcrumbs: BreadcrumbItem[] = [];
  showHelpModal = false;
  emailAddress = 'contact@btpconnect.sn';
  phoneNumber = '+221 33 971 41 12';

  constructor(
    private router: Router,
    private activatedRoute: ActivatedRoute,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    // Cas 1 : on recharge manuellement les breadcrumbs à l'initialisation
    const initialBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
    this.breadcrumbService.setBreadcrumbs(initialBreadcrumbs);
  
    // Cas 2 : on écoute aussi les changements de navigation (navigations ultérieures)
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        const routeBreadcrumbs = this.createBreadcrumbs(this.activatedRoute.root);
        this.breadcrumbService.setBreadcrumbs(routeBreadcrumbs);
      });
  
    // S'abonne pour affichage
    this.breadcrumbService.breadcrumbs$.subscribe(breadcrumbs => {
      this.breadcrumbs = breadcrumbs;
    });
  }
  
  // Génère le fil d’Ariane à partir des données des routes
  private createBreadcrumbs(
    route: ActivatedRoute,
    url: string = '',
    breadcrumbs: BreadcrumbItem[] = []
  ): BreadcrumbItem[] {
    const children: ActivatedRoute[] = route.children;

    if (children.length === 0) {
      return breadcrumbs;
    }

    for (const child of children) {
      const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
      if (routeURL !== '') {
        url += `/${routeURL}`;
      }

      const label = child.snapshot.data['breadcrumb'];
      if (label) {
        breadcrumbs.push({ label, path: url });
      }

      return this.createBreadcrumbs(child, url, breadcrumbs);
    }

    return breadcrumbs;
  }

  /**
   * Ouvre la modal Aide & Support
   */
  openHelpModal(): void {
    this.showHelpModal = true;
  }

  /**
   * Ferme la modal Aide & Support
   */
  closeHelpModal(): void {
    this.showHelpModal = false;
  }

  /**
   * Copie le texte dans le presse-papiers
   */
  copyToClipboard(text: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        console.log('Copié dans le presse-papiers:', text);
      }).catch(err => {
        console.error('Erreur lors de la copie:', err);
      });
    } else {
      // Fallback pour les anciens navigateurs
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        console.log('Copié dans le presse-papiers:', text);
      } catch (err) {
        console.error('Erreur lors de la copie:', err);
      }
      document.body.removeChild(textarea);
    }
  }
}
