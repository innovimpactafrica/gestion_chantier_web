import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { RealestateService } from '../../core/services/realestate.service';
import { AuthService } from '../auth/services/auth.service';
import { ProjectBudgetComponent } from '../components/project/project-budget/project-budget.component';

interface SelectableProperty {
  id: number;
  title: string;
}

@Component({
  selector: 'app-finance-home',
  standalone: true,
  imports: [CommonModule, FormsModule, ProjectBudgetComponent],
  templateUrl: './finance-home.component.html'
})
export class FinanceHomeComponent implements OnInit {
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
        this.properties = (response.content || []).map((property: any) => ({
          id: property.id,
          title: property.title || property.name
        }));
        this.loadingProperties = false;
      },
      error: () => { this.loadingProperties = false; }
    });
  }

  onPropertyChange(): void {
    if (this.selectedPropertyId) {
      this.router.navigate(['/finance', this.selectedPropertyId]);
    } else {
      this.router.navigate(['/finance']);
    }
  }
}
