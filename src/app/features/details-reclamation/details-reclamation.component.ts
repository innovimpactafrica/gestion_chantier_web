import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';

interface Message {
  type: 'user' | 'admin';
  auteur: string;
  initiales?: string;
  contenu: string;
  timestamp: string;
}

@Component({
  selector: 'app-details-reclamation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './details-reclamation.component.html',
  styleUrls: ['./details-reclamation.component.css']
})
export class DetailsReclamationComponent implements OnInit {
  reclamationId: number = 1;
  
  // Informations de la réclamation
  utilisateur = {
    nom: 'Alpha Dieye',
    email: 'ad1@gmail.com',
    avatar: '👨🏾‍💼',
    pointStatut: 'green'
  };

  reclamation = {
    categorie: 'Paiement',
    statut: 'En cours',
    date: 'Illimité',
    pieceJointe: 'document.jpg',
    sujet: 'Problème de paiement'
  };

  // Messages de la conversation
  messages: Message[] = [
    {
      type: 'user',
      auteur: 'Alpha Dieye',
      contenu: "Je n'ai pas pu effectuer le paiement de mon abonnement. J'ai essayé plusieurs fois mais je reçois toujours une erreur. Pouvez-vous m'aider ?",
      timestamp: '12/04/2023 14:30'
    },
    {
      type: 'admin',
      auteur: 'Lamine Niang',
      initiales: 'LN',
      contenu: "Je n'ai pas pu effectuer le paiement de mon abonnement. J'ai essayé plusieurs fois mais je reçois toujours une erreur. Pouvez-vous m'aider ?",
      timestamp: '12/04/2023 15:45'
    },
    {
      type: 'user',
      auteur: 'Alpha Dieye',
      contenu: 'L\'erreur est "Transaction refusée". J\'ai vérifié avec ma banque et il n\'y a pas de problème de mon côté.',
      timestamp: '12/04/2023 16:20'
    },
    {
      type: 'admin',
      auteur: 'Lamine Niang',
      initiales: 'LN',
      contenu: 'Merci pour ces précisions. Je vais vérifier notre système de paiement et je reviens vers vous rapidement.',
      timestamp: '12/04/2023 16:45'
    }
  ];

  nouvelleReponse: string = '';

  // Modales
  showConfirmationModal: boolean = false;
  showReassignModal: boolean = false;
  
  // Réassignation
  agentActuel: string = 'Lamine Niang';
  nouvelAgent: string = '';
  searchAgent: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.reclamationId = +params['id'];
    });
  }

  getPointColor(color: string): string {
    switch (color) {
      case 'green':
        return 'bg-green-500';
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-gray-500';
    }
  }

  getStatutClass(statut: string): string {
    return statut === 'En cours' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700';
  }

  goBack(): void {
    this.router.navigate(['/reclamations']);
  }

  openConfirmationModal(): void {
    this.showConfirmationModal = true;
  }

  closeConfirmationModal(): void {
    this.showConfirmationModal = false;
  }

  confirmerResolution(): void {
    this.reclamation.statut = 'Résolue';
    this.closeConfirmationModal();
  }

  openReassignModal(): void {
    this.showReassignModal = true;
  }

  closeReassignModal(): void {
    this.showReassignModal = false;
    this.nouvelAgent = '';
    this.searchAgent = '';
  }

  reassignerReclamation(): void {
    if (this.nouvelAgent || this.searchAgent) {
      this.agentActuel = this.nouvelAgent || this.searchAgent;
      this.closeReassignModal();
    }
  }

  envoyerReponse(): void {
    if (this.nouvelleReponse.trim()) {
      const timestamp = new Date().toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      this.messages.push({
        type: 'admin',
        auteur: 'Lamine Niang',
        initiales: 'LN',
        contenu: this.nouvelleReponse,
        timestamp: timestamp
      });

      this.nouvelleReponse = '';
    }
  }

  attachFile(): void {
  }
}