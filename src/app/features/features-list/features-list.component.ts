import { Component, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { VideoPromo } from '../../models/video-promo';
import { SanitizePipe } from '../../shared/sanitize.pipe';
import { VideoPromoService } from '../../../services/video-promo.service';

type Language = 'FR' | 'EN';

@Component({
    selector: 'app-features-list',
    standalone: true,
    imports: [CommonModule, SanitizePipe],
    templateUrl: './features-list.component.html',
    styleUrls: ['./features-list.component.css'],
    animations: [
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(20px)' }),
                animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ]),
        trigger('modalFade', [
            transition(':enter', [
                style({ opacity: 0 }),
                animate('200ms ease-out', style({ opacity: 1 }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0 }))
            ])
        ]),
        trigger('modalSlide', [
            transition(':enter', [
                style({ opacity: 0, transform: 'scale(0.9)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
            ])
        ])
    ]
})
export class FeaturesListComponent implements OnInit {
    private router = inject(Router);
    private platformId = inject(PLATFORM_ID);
    private videoPromoService = inject(VideoPromoService);

    currentLang: Language = 'FR';
    selectedFeature: VideoPromo | null = null;
    showModal = false;

    videos: VideoPromo[] = [];
    filteredVideos: VideoPromo[] = [];
    loading = false;
    error: string | null = null;

    // Profiles
    profiles: string[] = ['ALL', 'WORKER', 'SUPPLIER', 'MOA', 'PROMOTEUR', 'BET'];
    selectedProfile = 'ALL';

    // Pagination
    page = 0;
    size = 8;
    totalPages = 0;
    totalElements = 0;

    ngOnInit(): void {
        // Récupérer la langue depuis localStorage si disponible
        if (isPlatformBrowser(this.platformId)) {
            const savedLang = localStorage.getItem('btpconnect_lang');
            if (savedLang === 'EN' || savedLang === 'FR') {
                this.currentLang = savedLang as Language;
            }
        }
        this.loadVideos();
    }

    loadVideos(page: number = 0): void {
        this.loading = true;
        this.error = null;
        this.page = page;

        this.videoPromoService.getVideos(this.page, this.size).subscribe({
            next: (response) => {
                if (response && response.content && response.content.length > 0) {
                    this.videos = response.content;
                } else {
                    // Fallback test videos if API is empty
                    this.videos = this.getMockVideos();
                }
                this.filterVideos();
                this.totalPages = response.totalPages || 1;
                this.totalElements = response.totalElements || this.videos.length;
                this.loading = false;
            },
            error: (err) => {
                // Fallback test videos on error for demonstration
                this.videos = this.getMockVideos();
                this.filterVideos();
                this.loading = false;
            }
        });
    }

    private getMockVideos(): VideoPromo[] {
        return [
            {
                id: 1,
                libelle: 'Suivi de Chantier - Ouvrier',
                description: 'Application mobile pour le pointage et le suivi quotidien des tâches sur le terrain.',
                profil: 'WORKER',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
                id: 2,
                libelle: 'Gestion de Bureau d\'Études',
                description: 'Plateforme de coordination des plans et validations techniques pour les BET.',
                profil: 'BET',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
                id: 3,
                libelle: 'Catalogue Fournisseur',
                description: 'Gérez vos stocks et commandes de matériaux directement depuis notre plateforme.',
                profil: 'SUPPLIER',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
                id: 4,
                libelle: 'Tableau de Bord MOA',
                description: 'Vision globale de l\'avancement des projets pour les Maîtres d\'Ouvrage.',
                profil: 'MOA',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            },
            {
                id: 5,
                libelle: 'Gestion Foncière',
                description: 'Outils dédiés à la promotion immobilière et à la vente.',
                profil: 'PROMOTEUR',
                link: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
            }
        ];
    }

    getProfileLabel(profil: string): string {
        if (!profil) return '';
        const profilUpper = profil.toUpperCase();
        switch (profilUpper) {
            case 'WORKER':
                return this.currentLang === 'FR' ? 'OUVRIER' : 'WORKER';
            case 'SUPPLIER':
                return this.currentLang === 'FR' ? 'FOURNISSEUR' : 'SUPPLIER';
            case 'MOA':
                return this.currentLang === 'FR' ? "Maitre d'Ouvrage" : 'Client (MOA)';
            case 'PROMOTEUR':
                return 'PROMOTEUR';
            case 'BET':
                return 'BET';
            default:
                return profil;
        }
    }

    selectProfile(profile: string): void {
        this.selectedProfile = profile;
        this.filterVideos();
    }

    private filterVideos(): void {
        if (this.selectedProfile === 'ALL') {
            this.filteredVideos = this.videos;
        } else {
            this.filteredVideos = this.videos.filter(v => v.profil?.toUpperCase() === this.selectedProfile.toUpperCase());
        }
    }

    getTitle(video: VideoPromo): string {
        return video.libelle;
    }

    getDescription(video: VideoPromo): string {
        return video.description;
    }

    getEmbedUrl(link: string): string {
        if (!link) return '';

        // Handle standard Youtube URL
        if (link.includes('youtube.com/watch?v=')) {
            const videoId = link.split('v=')[1]?.split('&')[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }

        // Handle short Youtube URL
        if (link.includes('youtu.be/')) {
            const videoId = link.split('youtu.be/')[1]?.split('?')[0];
            return `https://www.youtube.com/embed/${videoId}`;
        }

        return link;
    }

    getThumbnail(video: VideoPromo): string {
        if (video.link.includes('youtube.com') || video.link.includes('youtu.be')) {
            const videoId = this.extractVideoId(video.link);
            if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
            }
        }
        return 'assets/images/btp.png';
    }

    private extractVideoId(link: string): string | null {
        if (link.includes('youtube.com/watch?v=')) {
            return link.split('v=')[1]?.split('&')[0];
        }
        if (link.includes('youtu.be/')) {
            return link.split('youtu.be/')[1]?.split('?')[0];
        }
        if (link.includes('youtube.com/embed/')) {
            return link.split('embed/')[1]?.split('?')[0];
        }
        return null;
    }


    openFeature(video: VideoPromo): void {
        this.selectedFeature = video;
        this.showModal = true;

        // Empêcher le scroll du body
        if (isPlatformBrowser(this.platformId)) {
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(): void {
        this.showModal = false;
        this.selectedFeature = null;

        // Réactiver le scroll du body
        if (isPlatformBrowser(this.platformId)) {
            document.body.style.overflow = 'auto';
        }
    }

    openExternalLink(url: string): void {
        if (isPlatformBrowser(this.platformId)) {
            window.open(url, '_blank', 'noopener,noreferrer');
        }
    }

    goBack(): void {
        this.router.navigate(['/portail']);
    }

    handleImageError(event: any): void {
        event.target.src = 'assets/images/placeholder.jpg';
    }

    getPageTitle(): string {
        return this.currentLang === 'FR' ? 'Démonstrastions' : 'Our Features';
    }

    getPageDescription(): string {
        return this.currentLang === 'FR'
            ? 'Découvrez toutes les fonctionnalités de BTP CLOUD pour gérer vos chantiers efficacement'
            : 'Discover all BTP CLOUD features to manage your construction sites efficiently';
    }

    getBackButton(): string {
        return this.currentLang === 'FR' ? 'Retour au portail' : 'Back to portal';
    }

    getLearnMore(): string {
        return this.currentLang === 'FR' ? 'En savoir plus' : 'Learn more';
    }

    getWatchVideo(): string {
        return this.currentLang === 'FR' ? 'Voir la vidéo' : 'Watch video';
    }

    getCloseButton(): string {
        return this.currentLang === 'FR' ? 'Fermer' : 'Close';
    }
}