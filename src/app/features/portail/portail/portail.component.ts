import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { PlanAbonnementService, SubscriptionPlan } from '../../../../services/plan-abonnement.service';
import { Subject, takeUntil, interval } from 'rxjs';

interface Profil {
  titre: string;
  sousTitre: string;
  descriptionCourte: string;
  descriptionComplete: string;
  image: string;
  expanded: boolean;
}

@Component({
  selector: 'app-portail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './portail.component.html',
  styleUrls: ['./portail.component.css'],
  animations: [
    trigger('fadeInLeft', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('fadeInRight', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ])
    ]),
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('slideDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0 }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('planFade', [
      transition('* => *', [
        style({ opacity: 0, transform: 'scale(0.95)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class PortailComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();
  
  isScrolled = false;
  mobileMenuOpen = false;
  isLoadingPlans = true;

  // Plans d'abonnement actuels affichés
  currentPremiumPlan: SubscriptionPlan | null = null;
  currentBasicPlan: SubscriptionPlan | null = null;

  // Tous les plans groupés par name
  allPlansByName: { [key: string]: { premium: SubscriptionPlan | null, basic: SubscriptionPlan | null } } = {};
  planNames: string[] = [];
  currentNameIndex: number = 0;
  animationKey: number = 0;

  features = [
    {
      title: 'Suivi en temps réel',
      description: 'Suivez l\'avancement de vos chantiers en temps réel avec des mises à jour instantanées.',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Pointages digitaux',
      description: 'Gérez les pointages de vos équipes facilement depuis le terrain.',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Planning interactif',
      description: 'Organisez et visualisez tous vos projets avec des plannings intelligents.',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      title: 'Rapports PDF',
      description: 'Générez automatiquement des rapports professionnels en format PDF.',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      title: 'Gestion des coûts',
      description: 'Suivez et contrôlez les budgets de vos projets en toute transparence.',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      title: 'Photos & Documents',
      description: 'Centralisez tous vos documents et photos de chantier au même endroit.',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    }
  ];

  // Profils avec descriptions courtes et complètes
  profils: Profil[] = [
    {
      titre: 'MOA (Maître d\'Ouvrage)',
      sousTitre: 'Pilotage de projet',
      descriptionCourte: 'Suivi budgétaire, planning, validation des phases...',
      descriptionComplete: 'Le Maître d\'Ouvrage pilote l\'ensemble du projet de construction. Il bénéficie d\'un tableau de bord complet pour le suivi budgétaire, la gestion du planning, la validation des différentes phases du projet, le contrôle qualité et la coordination entre tous les intervenants. Des outils de reporting et d\'analyse permettent une prise de décision éclairée à chaque étape.',
      image: 'assets/images/ouvrier1.png',
      expanded: false
    },
    {
      titre: 'BET (Bureau d\'Études Techniques)',
      sousTitre: 'Coordination technique',
      descriptionCourte: 'Documents, visas, plans, conformité, fil de validation.',
      descriptionComplete: 'Le Bureau d\'Études Techniques assure la coordination technique du projet. Il gère l\'ensemble des documents techniques, les visas et approbations, les plans de construction, la vérification de conformité aux normes, le suivi du fil de validation et la coordination avec les différents corps de métier. Un système de gestion documentaire centralisé facilite le partage et le versioning des documents.',
      image: 'assets/images/ouvrier2.png',
      expanded: false
    },
    {
      titre: 'Chef de Chantier',
      sousTitre: 'Gestion opérationnelle',
      descriptionCourte: 'Suivi équipes, sécurité, avancement, planning terrain...',
      descriptionComplete: 'Le Chef de Chantier gère les opérations quotidiennes sur le terrain. Il supervise les équipes, assure le respect des normes de sécurité, suit l\'avancement des travaux en temps réel, gère le planning terrain, coordonne les approvisionnements, rédige les rapports d\'activité et communique avec tous les intervenants. Des outils mobiles permettent un suivi en direct depuis le chantier.',
      image: 'assets/images/ouvrier3.png',
      expanded: false
    },
    {
      titre: 'Ouvrier / Artisan',
      sousTitre: 'Exécution des travaux',
      descriptionCourte: 'Tâches assignées, matériaux, pointage, sécurité...',
      descriptionComplete: 'Les Ouvriers et Artisans accèdent facilement à leurs tâches assignées, consultent les plans et instructions, gèrent les demandes de matériaux, effectuent leur pointage quotidien, signalent les problèmes ou incidents, consultent les consignes de sécurité et communiquent avec leur chef d\'équipe. Une interface simplifiée et mobile facilite l\'utilisation au quotidien.',
      image: 'assets/images/ouvrier4.png',
      expanded: false
    }
  ];

  constructor(
    private router: Router,
    private planService: PlanAbonnementService
  ) {}

  ngOnInit(): void {
    console.log('🚀 PortailComponent initialisé');
    this.loadPlans();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Toggle la description d'un profil (Lire plus / Lire moins)
   */
  toggleDescription(index: number): void {
    this.profils[index].expanded = !this.profils[index].expanded;
  }

  /**
   * Charge tous les plans d'abonnement et lance l'animation
   */
  loadPlans(): void {
    this.isLoadingPlans = true;
    
    this.planService.getAllPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {
          console.log('✅ Tous les plans chargés:', plans);
          
          this.groupPlansByName(plans);
          this.planNames = Object.keys(this.allPlansByName);
          console.log('📋 Names disponibles:', this.planNames);
          
          if (this.planNames.length > 0) {
            this.showPlansForName(0);
            this.startPlanRotation();
          }
          
          this.isLoadingPlans = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des plans:', error);
          this.isLoadingPlans = false;
        }
      });
  }

  private groupPlansByName(plans: SubscriptionPlan[]): void {
    this.allPlansByName = {};
    
    plans.forEach(plan => {
      if (!this.allPlansByName[plan.name]) {
        this.allPlansByName[plan.name] = {
          premium: null,
          basic: null
        };
      }
      
      if (plan.label === 'PREMIUM') {
        this.allPlansByName[plan.name].premium = plan;
      } else if (plan.label === 'BASIC') {
        this.allPlansByName[plan.name].basic = plan;
      }
    });
    
    console.log('📊 Plans groupés par name:', this.allPlansByName);
  }

  private showPlansForName(index: number): void {
    const name = this.planNames[index];
    if (!name) return;
    
    const planGroup = this.allPlansByName[name];
    this.currentPremiumPlan = planGroup.premium;
    this.currentBasicPlan = planGroup.basic;
    this.currentNameIndex = index;
    this.animationKey++;
    
    console.log(`🔄 Affichage des plans pour: ${name}`, {
      premium: this.currentPremiumPlan?.label,
      basic: this.currentBasicPlan?.label
    });
  }

  private startPlanRotation(): void {
    interval(2000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const nextIndex = (this.currentNameIndex + 1) % this.planNames.length;
        this.showPlansForName(nextIndex);
      });
  }

  getCurrentName(): string {
    return this.planNames[this.currentNameIndex] || '';
  }

  truncateDescription(description: string): string {
    if (!description) return '';
    
    const lines = description.split('\n').filter(line => line.trim() !== '');
    const truncated = lines.slice(0, 2).join('\n');
    
    return truncated;
  }

  formatAmount(amount: number): string {
    return `${amount.toLocaleString('fr-FR')} FCFA`;
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    this.isScrolled = window.scrollY > 20;
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });

      this.mobileMenuOpen = false;
    }
  }
}