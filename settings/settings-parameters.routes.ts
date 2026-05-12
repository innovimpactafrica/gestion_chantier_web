import { Routes } from '@angular/router';
import { UnitComponent } from './unit/unit.component';
import { DocumentComponent } from './document/document.component';
import { MaterialCategoryComponent } from './material-category/material-category.component';

export const PARAMETERS_ROUTES: Routes = [
  {
    path: 'unit-parameters',
    children: [
      {
        path: '',
        redirectTo: 'unit',
        pathMatch: 'full'
      },
      {
        path: 'unit',
        component: UnitComponent,
        data: { type: 'UNIT' }
      },
      {
        path: 'document',
        component: DocumentComponent,
        data: { type: 'DOCUMENT' }
      },
      {
        path: 'material-category',
        component: MaterialCategoryComponent,
        data: { type: 'MATERIAL_CATEGORY' }
      }
    ]
  }
];