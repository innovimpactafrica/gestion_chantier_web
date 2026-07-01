import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RealestateService } from '../../core/services/realestate.service';
import { AuthService } from '../auth/services/auth.service';
import { GestionSalaireComponent } from '../components/project/gestion-salaire/gestion-salaire.component';

interface SelectableProperty {
  id: number;
  title: string;
}

/**
 * Page autonome "Gestion salaire" (accessible uniquement depuis la sidebar — l'onglet
 * correspondant a été retiré du détail de chantier). Permet de choisir un chantier puis
 * monte directement <app-gestion-salaire>, qui lit son propertyId depuis la route héritée
 * (`gestion-salaire/:id`), exactement comme lorsqu'il était imbriqué dans un onglet.
 */
@Component({
  selector: 'app-gestion-salaire-home',
  standalone: true,
  imports: [CommonModule, FormsModule, GestionSalaireComponent],
  templateUrl: './gestion-salaire-home.component.html',
  styleUrls: ['./gestion-salaire-home.component.css']
})
export class GestionSalaireHomeComponent implements OnInit {
  properties: SelectableProperty[] = [];
  loadingProperties = false;
  selectedPropertyId: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private realestateService: RealestateService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const idFromUrl = this.route.snapshot.paramMap.get('id');
    this.selectedPropertyId = idFromUrl ? +idFromUrl : null;
    this.loadProperties();
  }

  private loadProperties(): void {
    const userId = this.authService.currentUser()?.id;
    if (!userId) return;

    this.loadingProperties = true;
    this.realestateService.getAllProjectsPaginated(userId, 0, 100).subscribe({
      next: (response) => {
        this.properties = (response.content || []).map((p: any) => ({ id: p.id, title: p.title || p.name }));
        this.loadingProperties = false;
      },
      error: () => { this.loadingProperties = false; }
    });
  }

  onPropertyChange(): void {
    if (this.selectedPropertyId) {
      this.router.navigate(['/gestion-salaire', this.selectedPropertyId]);
    } else {
      this.router.navigate(['/gestion-salaire']);
    }
  }

  openPropertySelector(): void {
    const select = document.getElementById('salaire-property-select') as HTMLSelectElement | null;
    select?.focus();
    select?.click();
  }
}
