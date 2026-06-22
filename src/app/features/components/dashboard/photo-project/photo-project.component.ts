// import { CommonModule } from '@angular/common';
// import { Component, inject, Input } from '@angular/core';
// import { DahsboardService } from '../../../../core/services/dahsboard.service';
// import { AuthService } from '../../../auth/services/auth.service';

// export interface ProjectPhoto {
//   url: string;
//   titre: string;
//   date: string;
//   photo: string;

// }

// @Component({
//   selector: 'app-photo-project',
//   standalone: true,
//   imports: [CommonModule],
//   templateUrl: './photo-project.component.html',
//   styleUrl: './photo-project.component.css'
// })
// export class PhotoProjectComponent {

//   @Input() photos: ProjectPhoto[] = [];

//   private dashboardService = inject(DahsboardService);
//   private authService = inject(AuthService);
// pickture: any;

//   ngOnInit(): void {
//     this.authService.getCurrentUser().subscribe({
//       next: (user) => {
//         if (!user?.id) {
//           console.error('Utilisateur non connecté');
//           return;
//         }

//         const promoterId = user.id;

//         this.dashboardService.getRecentProgressAlbums(promoterId).subscribe({
//           next: (data: ProjectPhoto[]) => {
//             this.photos = data;
//           },
//           error: (err) => {
//             console.error('Erreur lors du chargement des photos :', err);
//           }
//         });
//       },
//       error: (err) => {
//         console.error('Erreur lors de la récupération de l’utilisateur :', err);
//       }
//     });
//   }
// }

import { CommonModule } from '@angular/common';
import { Component, inject, Input, OnInit } from '@angular/core';
import { DahsboardService } from '../../../../core/services/dahsboard.service';
import { AuthService } from '../../../auth/services/auth.service';

export interface ProjectPhoto {
  url: string;
  titre: string;
  date: string;
  photo: string;
}

@Component({
  selector: 'app-photo-project',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './photo-project.component.html',
  styleUrl: './photo-project.component.css'
})
export class PhotoProjectComponent implements OnInit {
  @Input() photos: ProjectPhoto[] = [];

  private dashboardService = inject(DahsboardService);
  private authService = inject(AuthService);

  isLoading = false;
  error: string | null = null;

  // Modal state
  showModal = false;
  currentPhotoIndex = 0;
  currentPhoto: ProjectPhoto | null = null;

  ngOnInit(): void {
    this.loadPhotos();
  }

  private loadPhotos(): void {
    this.isLoading = true;
    this.error = null;

    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user?.id) {
          this.error = 'Utilisateur non connecté';
          this.isLoading = false;
          return;
        }

        const promoterId = user.id;
        this.dashboardService.getRecentProgressAlbums(promoterId).subscribe({
          next: (data: any) => {
            const albums = Array.isArray(data) ? data : (data?.content || []);
            this.photos = albums.map((album: any) => {
              const picture = album.pictures && album.pictures.length > 0 ? album.pictures[0] : '';
              return {
                url: picture,
                photo: picture,
                titre: album.phaseName || '',
                date: this.formatDateFromArray(album.lastUpdated)
              };
            });
            this.isLoading = false;
          },
          error: (err) => {
            this.error = 'Erreur lors du chargement des photos';
            this.isLoading = false;
          }
        });
      },
      error: (err) => {
        // console.error('Erreur lors de la récupération de l'utilisateur :', err);
        this.error = 'Erreur de connexion utilisateur';
        this.isLoading = false;
      }
    });
  }

  /** Le backend renvoie lastUpdated en tableau [année, mois, jour, ...] plutôt qu'en chaîne ISO */
  private formatDateFromArray(dateArray: number[]): string {
    if (!dateArray || dateArray.length < 3) {
      return '';
    }
    const [year, month, day] = dateArray;
    return new Date(year, month - 1, day).toLocaleDateString('fr-FR');
  }

  onImageError(event: Event): void {
    const img = event.target as HTMLImageElement;
    // Image de fallback en cas d'erreur
    img.src = 'assets/images/placeholder-image.png';
  }

  retryLoad(): void {
    this.loadPhotos();
  }

  /**
   * Open modal with selected photo
   */
  openModal(index: number): void {
    if (this.photos && this.photos.length > 0) {
      this.currentPhotoIndex = index;
      this.currentPhoto = this.photos[index];
      this.showModal = true;
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * Close modal
   */
  closeModal(): void {
    this.showModal = false;
    this.currentPhoto = null;
    // Restore body scroll
    document.body.style.overflow = '';
  }

  /**
   * Navigate to next photo
   */
  nextPhoto(): void {
    if (this.photos && this.photos.length > 0) {
      this.currentPhotoIndex = (this.currentPhotoIndex + 1) % this.photos.length;
      this.currentPhoto = this.photos[this.currentPhotoIndex];
    }
  }

  /**
   * Navigate to previous photo
   */
  previousPhoto(): void {
    if (this.photos && this.photos.length > 0) {
      this.currentPhotoIndex = (this.currentPhotoIndex - 1 + this.photos.length) % this.photos.length;
      this.currentPhoto = this.photos[this.currentPhotoIndex];
    }
  }

  /**
   * Handle backdrop click to close modal
   */
  handleBackdropClick(event: MouseEvent): void {
    // Only close if clicking the backdrop itself, not the image
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  /**
   * Handle keyboard navigation
   */
  handleKeydown(event: KeyboardEvent): void {
    if (!this.showModal) return;

    switch (event.key) {
      case 'Escape':
        this.closeModal();
        break;
      case 'ArrowLeft':
        this.previousPhoto();
        break;
      case 'ArrowRight':
        this.nextPhoto();
        break;
    }
  }
}
