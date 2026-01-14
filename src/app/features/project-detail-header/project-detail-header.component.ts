// project-detail-header.component.ts
import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
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
import { RealestateService } from '../../core/services/realestate.service';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import * as QRCode from 'qrcode';
import { PointingAddressComponent } from "../components/project/pointing-adress/pointing-adress.component";

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
    EtudeBetComponent,
    PointingAddressComponent
  ],
  templateUrl: './project-detail-header.component.html',
  styleUrl: './project-detail-header.component.css'
})
export class ProjectDetailHeaderComponent implements OnInit {
  private isBrowser: boolean;
  activeTab: string = 'presentation';
  projectId: number | null = null;
  stockAlerts: any;

  // Données du projet
  projectDetails: any = null;
  isLoadingProject = false;
  projectError: string | null = null;

  // QR Code
  showQrModal: boolean = false;
  qrCodeDataUrl: SafeUrl | null = null;
  qrCodeValue: string = '';

  constructor(
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private realestateService: RealestateService,
    private sanitizer: DomSanitizer,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.projectId = +id;
      this.loadProjectDetails();
      this.breadcrumbService.setBreadcrumbs([
        { label: 'Projets', path: '/projects' },
        { label: `Détail projet ${this.projectId}`, path: `/projects/${this.projectId}` }
      ]);
    }
  }

  loadProjectDetails(): void {
    if (!this.projectId) return;

    this.isLoadingProject = true;
    this.projectError = null;

    this.realestateService.getRealEstateDetails(this.projectId).subscribe({
      next: (response) => {
        console.log('📋 Réponse complète du serveur:', response);

        // Extraire realEstateProperty de la réponse
        if (response && response.realEstateProperty) {
          this.projectDetails = response.realEstateProperty;
          console.log('✅ Données du projet extraites:', this.projectDetails);
          console.log('📌 Nom du projet:', this.projectDetails.name);
          console.log('📌 QR Code:', this.projectDetails.qrcode);
        } else {
          this.projectDetails = response;
        }

        this.isLoadingProject = false;

        // Générer le QR code si le projet est chargé
        if (this.projectDetails) {
          this.generateQrCode();
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du projet:', error);
        this.projectError = 'Erreur lors du chargement des détails du projet';
        this.isLoadingProject = false;
      }
    });
  }

  /**
   * Génère le QR code à partir de la clé retournée par le backend
   */
  private async generateQrCode(): Promise<void> {
    try {
      if (!this.projectDetails?.qrcode) {
        console.warn('⚠️ Aucun QR code disponible pour ce projet');
        this.qrCodeDataUrl = null;
        return;
      }

      // Utiliser la clé du backend comme valeur du QR code
      const qrCodeValue = this.projectDetails.qrcode;

      // OU créer une URL complète si nécessaire
      // const qrCodeValue = `${window.location.origin}/projects/${this.projectId}`;

      console.log('🔄 Génération du QR code pour:', qrCodeValue);

      // Générer le QR code en data URL
      const qrCodeUrl = await QRCode.toDataURL(qrCodeValue, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        errorCorrectionLevel: 'M'
      });

      this.qrCodeDataUrl = this.sanitizer.bypassSecurityTrustUrl(qrCodeUrl);
      this.qrCodeValue = qrCodeValue;

      console.log('✅ QR Code généré avec succès');
    } catch (error) {
      console.error('❌ Erreur lors de la génération du QR code:', error);
      this.qrCodeDataUrl = null;
    }
  }

  /**
   * Mapper le statut de construction
   */
  getConstructionStatus(): { label: string; class: string } {
    if (!this.projectDetails?.constructionStatus) {
      return { label: 'Non défini', class: 'bg-gray-100 text-gray-700' };
    }

    const statusMap: { [key: string]: { label: string; class: string } } = {
      'IN_PROGRESS': { label: 'En cours', class: 'bg-yellow-100 text-yellow-700' },
      'EN_COURS': { label: 'En cours', class: 'bg-yellow-100 text-yellow-700' },
      'COMPLETED': { label: 'Terminé', class: 'bg-green-100 text-green-700' },
      'TERMINE': { label: 'Terminé', class: 'bg-green-100 text-green-700' },
      'NOT_STARTED': { label: 'Non démarré', class: 'bg-gray-100 text-gray-700' },
      'NON_DEMARRE': { label: 'Non démarré', class: 'bg-gray-100 text-gray-700' },
      'PENDING': { label: 'En attente', class: 'bg-blue-100 text-blue-700' },
      'EN_ATTENTE': { label: 'En attente', class: 'bg-blue-100 text-blue-700' },
      'SUSPENDED': { label: 'Suspendu', class: 'bg-red-100 text-red-700' },
      'SUSPENDU': { label: 'Suspendu', class: 'bg-red-100 text-red-700' }
    };

    const status = this.projectDetails.constructionStatus.toUpperCase();
    return statusMap[status] || { label: this.projectDetails.constructionStatus, class: 'bg-gray-100 text-gray-700' };
  }

  /**
   * Formater la date de mise à jour
   */
  getLastUpdateDate(): string {
    if (!this.projectDetails?.endDate) {
      return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }

    try {
      // Gérer le format de date tableau [2025, 12, 13, 0, 0]
      const dateArray = this.projectDetails.endDate;
      let date: Date;

      if (Array.isArray(dateArray)) {
        date = new Date(dateArray[0], dateArray[1] - 1, dateArray[2]);
      } else {
        date = new Date(this.projectDetails.endDate);
      }

      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    }
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  openQrModal(): void {
    this.showQrModal = true;
  }

  closeQrModal(): void {
    this.showQrModal = false;
  }

  /**
  * Télécharger le QR code
  */
  downloadQrCode(): void {
    if (!this.qrCodeDataUrl || !this.projectDetails || !this.isBrowser) return;

    try {
      // Créer un nom de fichier sécurisé
      const projectName = this.projectDetails.name || 'projet';
      const safeFileName = projectName.replace(/[^a-z0-9]/gi, '_').toLowerCase();

      const link = document.createElement('a');
      link.href = this.qrCodeDataUrl as string;
      link.download = `qrcode-${safeFileName}-${this.projectId}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      console.log('✅ QR Code téléchargé');
    } catch (error) {
      console.error('❌ Erreur lors du téléchargement:', error);
    }
  }
  /**
   * Gère les erreurs de chargement du QR code
   */
  handleQrCodeError(): void {
    console.error('❌ Erreur lors du chargement de l\'image QR code');
    this.qrCodeDataUrl = null;
  }

  /**
   * Imprimer le QR code
   */
  printQrCode(): void {
    if (!this.qrCodeDataUrl || !this.isBrowser) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - ${this.projectDetails?.name || 'Projet'}</title>
          <style>
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              margin: 0;
              font-family: Arial, sans-serif;
            }
            img {
              max-width: 400px;
              margin-bottom: 20px;
            }
            .info {
              text-align: center;
            }
            h2 {
              margin: 10px 0;
            }
          </style>
        </head>
        <body>
          <div class="info">
            <h2>${this.projectDetails?.name || 'Projet'}</h2>
            <p>Date: ${this.getLastUpdateDate()}</p>
          </div>
          <img src="${this.qrCodeDataUrl}" alt="QR Code" />
          <script>
            window.onload = function() {
              window.print();
              window.onafterprint = function() {
                window.close();
              };
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }
}