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



interface ProjectInfo {
  title: string;
  status: {
    label: string;
    percentage: number;
  };
  tasks: {
    completed: number;
    total: number;
  };
  dueDate: string;
  budget: string;
}
@Component({
  selector: 'app-project-detail-header',
  standalone: true,
  imports: [CommonModule,
    TaskBoardComponent,
    TeamListComponent,
    DocumentsComponent,
    LotsSubcontractorsComponent, StockComponent,
    ProjectPresentationComponent, ProjectAlertComponent],
  templateUrl: './project-detail-header.component.html',
  styleUrl: './project-detail-header.component.css'
})

export class ProjectDetailHeaderComponent implements OnInit {
  activeTab: string = 'presentation'; 
  // projectInfo: ProjectInfo = {
  //   title: 'Construction d\'un immeuble résidentiel de 10 Étages',
  //   status: {
  //     label: 'En progression',
  //     percentage: 42.31
  //   },
  //   tasks: {
  //     completed: 33,
  //     total: 78
  //   },
  //   dueDate: '28 mars 2025',
  //   budget: 'Fcfa 700.000'
  // };

  tabs = [
    { name: 'Présentation du projet', active: true, link: '#' },
    { name: 'Tâches', active: false, link: '#', highlight: true },
    { name: 'Équipe', active: false, link: '#' },
    { name: 'Lots et sous-traitants', active: false, link: '#' },
    { name: 'Documents', active: false, link: '#' },
    { name: 'Stock', active: false, link: '#' },
    { name: 'Signalenment', active: false, link: '#' },
  ];

 

  projectId: string | null = null;
stockAlerts: any;
  
  constructor(
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService
  ) {}

  ngOnInit(): void {
    // Récupère l'ID du projet depuis les paramètres de l'URL
    this.projectId = this.route.snapshot.paramMap.get('id');
    
    // Met à jour le fil d'Ariane pour inclure la page de détail du projet
    this.breadcrumbService.setBreadcrumbs([
      { label: 'Projets', path: '/projects' },
      { label: `Détail projet ${this.projectId}`, path: `/projects/${this.projectId}` }
    ]);
  }
  

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }
  }
