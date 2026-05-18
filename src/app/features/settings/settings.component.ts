import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

interface ParametreCard {
  titre: string;
  description: string;
  lien: string;
  icone: string;
  couleur: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './settings.component.html',
  styleUrl: './settings.component.css'
})
export class SettingsComponent {
  parametres: ParametreCard[] = [
    {
      titre: 'Unités de mesure',
      description: 'Gérez les unités utilisées pour les matériaux et ressources',
      lien: '/parametres/unite-mesure',
      icone: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 19h16a2 2 0 002-2V7a2 2 0 00-2-2H4a2 2 0 00-2 2v10a2 2 0 002 2z',
      couleur: 'orange'
    },
    {
      titre: 'Types de matériaux',
      description: 'Configurez les types de matériaux utilisés dans les stocks',
      lien: '/parametres/types-materiaux',
      icone: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      couleur: 'blue'
    },
    {
      titre: 'Catégories de matériaux',
      description: 'Organisez vos matériaux par catégories',
      lien: '/parametres/categories',
      icone: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      couleur: 'green'
    },
    {
      titre: 'Types de bien',
      description: 'Définissez les types de propriétés et biens immobiliers',
      lien: '/parametres/typebien',
      icone: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      couleur: 'purple'
    },
    {
      titre: 'Types de documents',
      description: 'Gérez les catégories de documents acceptés',
      lien: '/parametres/documents',
      icone: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      couleur: 'yellow'
    }
  ];
}
