import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { BreadcrumbComponent } from "../../shared/components/breadcrumb/breadcrumb.component";
import { LayoutService } from '../../core/services/layout.service';

interface Tab {
  label: string;
   icon: string;
  route: string;
  active: boolean;
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, BreadcrumbComponent],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {
  tabs: Tab[] = [
    {
      label: 'Nos projets',
      icon: 'projets',
      route: '/projets',
      active: true
    },
    {
      label: 'Gestion des lots',
      icon: 'lots',
      route: '/lots',
      active: false
    },
    {
      label: 'Gestion des sous-traitants',
      icon: 'sous-traitants',
      route: '/sous-traitants',
      active: false
    },
    {
      label: 'Documents',
      icon: 'documents',
      route: '/documents',
      active: false
    }
  ];

  constructor(private layoutService: LayoutService) { }

  ngOnInit(): void {
  }

  toggleSidebar() {
    this.layoutService.toggleSidebar();
  }
}
