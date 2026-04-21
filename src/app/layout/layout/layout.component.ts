import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { HeaderComponent } from '../header/header.component';
import { CommonModule } from '@angular/common';
import { LayoutService } from '../../core/services/layout.service';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [HeaderComponent, SidebarComponent, RouterOutlet, CommonModule],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.css'
})
export class LayoutComponent {
  sidebarOpen$: Observable<boolean>;

  constructor(private layoutService: LayoutService) {
    this.sidebarOpen$ = this.layoutService.sidebarOpen$;
  }

  closeSidebar() {
    this.layoutService.closeSidebar();
  }
}

