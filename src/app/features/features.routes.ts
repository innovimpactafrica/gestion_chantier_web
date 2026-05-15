import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';

export const FEATURES_ROUTES: Routes = [
  {
    path: '',
    component: DashboardComponent,
    children: [
      {
        path: 'humanresources',
        loadChildren: () => import('./humanresources/humanresource.routes').then(m => m.HUMANRESOURCES_ROUTES)
      },
      // { path: 'financial', loadChildren: () => import('./sub-contractor/financial.routes').then(m => m.FINANCIAL_ROUTES) },
      {
        path: 'projects',
        loadChildren: () => import('./projects/projects.routes').then(m => m.PROJECTS_ROUTES)
      },
      {
        path: 'communication',
        loadChildren: () => import('./communication/communication.routes').then(m => m.COMMUNICATION_ROUTES)
      },
      {
        path: 'settings',
        loadChildren: () => import('./settings/settings.routes').then(m => m.SETTINGS_ROUTES)
      },
      { path: '', redirectTo: 'humanresources', pathMatch: 'full' }
    ]
  }
];