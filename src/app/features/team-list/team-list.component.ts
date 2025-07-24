import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UtilisateurService, Worker, WorkersResponse } from '../../../services/utilisateur.service';

interface TeamMember {
  id: number;
  name: string;
  role: string;
  phone: string;
  address: string;
  email: string;
  avatar: string;
}

@Component({
  selector: 'app-team-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './team-list.component.html',
  styleUrls: ['./team-list.component.css']
})
export class TeamListComponent implements OnInit {
  teamMembers: TeamMember[] = [];
  currentPage = 1;
  totalPages = 1;
  totalElements = 0;
  pageSize = 5; // Nombre d'éléments par page
  isLoading = false;
  error: string | null = null;

  constructor(private utilisateurService: UtilisateurService) {}

  ngOnInit(): void {
    this.loadTeamMembers();
  }

  /**
   * Charge la liste des membres de l'équipe
   */
  loadTeamMembers(): void {
    this.isLoading = true;
    this.error = null;

    // L'API utilise une pagination basée sur 0, mais l'UI utilise une pagination basée sur 1
    const apiPage = this.currentPage - 1;

    this.utilisateurService.listUsers(apiPage, this.pageSize).subscribe({
      next: (response: WorkersResponse) => {
        this.teamMembers = this.mapWorkersToTeamMembers(response.content);
        this.totalPages = response.totalPages;
        this.totalElements = response.totalElements;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des utilisateurs:', error);
        this.error = 'Erreur lors du chargement des membres de l\'équipe';
        this.isLoading = false;
        // En cas d'erreur, on peut garder les données de test
        this.loadTestData();
      }
    });
  }

  /**
   * Mappe les Workers de l'API vers les TeamMembers pour l'affichage
   */
  private mapWorkersToTeamMembers(workers: Worker[]): TeamMember[] {
    return workers.map(worker => ({
      id: worker.id,
      name: `${worker.prenom} ${worker.nom}`,
      role: this.mapRole(worker.profil),
      phone: worker.telephone,
      address: worker.adress,
      email: worker.email,
      avatar: worker.photo || this.getDefaultAvatar()
    }));
  }

  /**
   * Mappe les rôles de l'API vers des libellés plus lisibles
   */
  private mapRole(profil: string): string {
    const roleMap: { [key: string]: string } = {
      'WORKER': 'Ouvrier',
      'CHEF_CHANTIER': 'Chef de chantier',
      'MAITRE_OEUVRE': 'Maître d\'œuvre',
      'MAITRE_OUVRAGE': 'Maître d\'ouvrage',
      'ARCHITECTE': 'Architecte',
      'INGENIEUR': 'Ingénieur'
    };
    return roleMap[profil] || profil;
  }

  /**
   * Retourne un avatar par défaut
   */
  private getDefaultAvatar(): string {
    const defaultAvatars = [
      'assets/images/av1.svg',
      'assets/images/av2.svg',
      'assets/images/av3.png',
      'assets/images/av6.png',
      'assets/images/av9.svg'
    ];
    return defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
  }

  /**
   * Navigue vers une page spécifique
   */
  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadTeamMembers();
    }
  }

  /**
   * Navigue vers la page suivante
   */
  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadTeamMembers();
    }
  }

  /**
   * Navigue vers la page précédente
   */
  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadTeamMembers();
    }
  }

  /**
   * Vérifie si la page suivante est disponible
   */
  hasNextPage(): boolean {
    return this.currentPage < this.totalPages;
  }

  /**
   * Vérifie si la page précédente est disponible
   */
  hasPreviousPage(): boolean {
    return this.currentPage > 1;
  }

  /**
   * Retourne le texte de pagination
   */
  getPaginationText(): string {
    const start = (this.currentPage - 1) * this.pageSize + 1;
    const end = Math.min(this.currentPage * this.pageSize, this.totalElements);
    return `Voir ${start}-${end} sur ${this.totalElements}`;
  }

  /**
   * Génère un tableau de numéros de pages à afficher
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      // Afficher toutes les pages si elles sont peu nombreuses
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logique pour afficher les pages avec des ellipses
      const halfRange = Math.floor(maxPagesToShow / 2);
      let startPage = Math.max(1, this.currentPage - halfRange);
      let endPage = Math.min(this.totalPages, this.currentPage + halfRange);
      
      // Ajuster si on est près du début ou de la fin
      if (endPage - startPage < maxPagesToShow - 1) {
        if (startPage === 1) {
          endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);
        } else {
          startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  /**
   * Charge des données de test en cas d'erreur
   */
  private loadTestData(): void {
    this.teamMembers = [
      {
        id: 1,
        name: 'Alpha Dieye',
        role: 'Maître d\'ouvrage',
        phone: '706458792',
        address: 'Medina, Dakar',
        email: 'contact@immobilieralpha.sn',
        avatar: 'assets/images/av3.png'
      },
      {
        id: 2,
        name: 'Maguette Ndiaye',
        role: 'Maître d\'œuvre',
        phone: '777178294',
        address: 'Yoff,Dakar',
        email: 'maguette@gmail.com',
        avatar: 'assets/images/av6.png'
      },
      {
        id: 3,
        name: 'Aziz Diop',
        role: 'Ouvrier',
        phone: '786547890',
        address: 'Grand Mbao, Rufisque',
        email: 'aziz@gmail.com',
        avatar: 'assets/images/av1.svg'
      },
      {
        id: 4,
        name: 'Lamine Niang',
        role: 'Chef de chantier',
        phone: '776453281',
        address: 'Thiaroye, Dakar',
        email: 'lamine@gmail.com',
        avatar: 'assets/images/av2.svg'
      },
      {
        id: 5,
        name: 'Youssoupha Dieme',
        role: 'Ouvrier',
        phone: '775431629',
        address: 'Medina, Dakar',
        email: 'youssoupha@gmail.com',
        avatar: 'assets/images/av9.svg'
      }
    ];
    this.totalElements = this.teamMembers.length;
    this.totalPages = 1;
  }

  /**
   * Recharge les données
   */
  refresh(): void {
    this.currentPage = 1;
    this.loadTeamMembers();
  }
}