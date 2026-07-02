import { Component, HostListener, OnInit } from '@angular/core';
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
  showProjectDropdown = false;
  showCenterDropdown = false;
  centerDropdownSearch = '';

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

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    if (!target.closest('.project-dropdown-container')) this.showProjectDropdown = false;
  }

  @HostListener('document:keydown.escape')
  onEscapeKey(): void {
    this.showProjectDropdown = false;
    this.showCenterDropdown = false;
    this.centerDropdownSearch = '';
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

  toggleProjectDropdown(): void {
    this.showProjectDropdown = !this.showProjectDropdown;
  }

  toggleCenterDropdown(): void {
    this.showCenterDropdown = !this.showCenterDropdown;
    if (this.showCenterDropdown) this.centerDropdownSearch = '';
  }

  selectProject(id: number | null): void {
    this.selectedPropertyId = id;
    this.showProjectDropdown = false;
    this.showCenterDropdown = false;
    this.centerDropdownSearch = '';
    this.onPropertyChange();
  }

  get filteredPropertiesForCenter(): SelectableProperty[] {
    if (!this.centerDropdownSearch.trim()) return this.properties;
    const q = this.centerDropdownSearch.toLowerCase();
    return this.properties.filter(p => p.title.toLowerCase().includes(q));
  }

  get selectedPropertyName(): string {
    if (!this.selectedPropertyId) return '-- Sélectionner un chantier --';
    return this.properties.find(p => p.id === this.selectedPropertyId)?.title ?? '-- Sélectionner un chantier --';
  }
}
