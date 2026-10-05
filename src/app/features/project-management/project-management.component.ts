import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectManagementService, ManagementRole, ManagementUser, ManagementView } from './project-management.service';

@Component({
  selector: 'app-project-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './project-management.component.html'
})
export class ProjectManagementComponent implements OnInit {
  @Input({ required: true }) projectId!: number;
  management: ManagementView | null = null;
  loading = true;
  saving = false;
  error = '';
  success = '';
  selectedRole: ManagementRole = 'PROMOTEUR';
  form = { nom: '', prenom: '', email: '', telephone: '' };
  candidates: Record<ManagementRole, ManagementUser[]> = { PROMOTEUR: [], MOA: [], SITE_MANAGER: [] };

  readonly roles: { key: ManagementRole; label: string }[] = [
    { key: 'PROMOTEUR', label: 'Promoteur' },
    { key: 'MOA', label: 'Maître d’ouvrage' },
    { key: 'SITE_MANAGER', label: 'Site manager' }
  ];

  constructor(private service: ProjectManagementService) {}

  ngOnInit(): void {
    this.load();
    this.roles.forEach(role => this.service.users(this.projectId, role.key).subscribe({ next: users => this.candidates[role.key] = users }));
  }

  load(): void {
    this.loading = true;
    this.service.get(this.projectId).subscribe({
      next: value => { this.management = value; this.loading = false; },
      error: err => { this.error = err?.error?.message || 'Impossible de charger les responsables.'; this.loading = false; }
    });
  }

  user(role: ManagementRole): ManagementUser | null {
    if (!this.management) return null;
    return role === 'PROMOTEUR' ? this.management.promoter : role === 'MOA' ? this.management.moa : this.management.siteManager;
  }

  isCreator(role: ManagementRole): boolean {
    const current = this.user(role);
    return !!current && current.id === this.management?.creatorId;
  }

  assign(role: ManagementRole, event: Event): void {
    const value = Number((event.target as HTMLSelectElement).value);
    this.save(this.service.assign(this.projectId, role, value || null));
  }

  create(): void {
    this.save(this.service.create(this.projectId, { ...this.form, profil: this.selectedRole }));
  }

  private save(request: ReturnType<ProjectManagementService['get']>): void {
    this.saving = true;
    this.error = '';
    this.success = '';
    request.subscribe({
      next: value => { this.management = value; this.saving = false; this.success = 'Responsable enregistré. Les identifiants ont été envoyés par email.'; },
      error: err => { this.saving = false; this.error = err?.error?.message || 'La modification a été refusée.'; }
    });
  }
}
