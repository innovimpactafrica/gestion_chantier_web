// project-detail-header.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskBoardComponent } from "../task-board/task-board.component";
import { TeamListComponent } from '../team-list/team-list.component';
import { DocumentsComponent } from '../documents/documents.component';
import { LotsSubcontractorsComponent } from '../lots-subcontractors/lots-subcontractors.component';
import { ActivatedRoute } from '@angular/router';
import { BreadcrumbService } from '../../core/services/breadcrumb-service.service';
import { StockComponent } from "../components/project/stock/stock.component";
import { ProjectPresentationComponent } from '../components/project/project-presentation/project-presentation.component';
import { ProjectAlertComponent } from "../components/project/project-alert/project-alert.component";
import { EtudeBetComponent } from "../components/project/etude-bet/etude-bet.component";

@Component({
  selector: 'app-project-detail-header',
  standalone: true,
  imports: [
    CommonModule,
    TaskBoardComponent,
    TeamListComponent,
    DocumentsComponent,
    LotsSubcontractorsComponent,
    StockComponent,
    ProjectPresentationComponent,
    ProjectAlertComponent,
    EtudeBetComponent
  ],
  templateUrl: './project-detail-header.component.html',
  styleUrl: './project-detail-header.component.css'
})
export class ProjectDetailHeaderComponent implements OnInit {
  activeTab: string = 'presentation';
  projectId: string | null = null;
  stockAlerts: any;

  // 👉 Nouveau : pour contrôler l’ouverture du modal
  showQrModal: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    this.projectId = this.route.snapshot.paramMap.get('id');
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Projets', path: '/projects' },
      { label: `Détail projet ${this.projectId}`, path: `/projects/${this.projectId}` }
    ]);
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // 👉 Méthodes pour ouvrir/fermer le modal
  openQrModal(): void {
    this.showQrModal = true;
  }

  closeQrModal(): void {
    this.showQrModal = false;
  }
}
