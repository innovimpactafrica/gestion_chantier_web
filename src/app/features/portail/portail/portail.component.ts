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

type Language = 'FR' | 'EN';

interface Translations {
  FR: { [key: string]: string };
  EN: { [key: string]: string };
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
  currentLang: Language = 'FR';

  // Plans d'abonnement actuels affichés
  currentPremiumPlan: SubscriptionPlan | null = null;
  currentBasicPlan: SubscriptionPlan | null = null;

  // Tous les plans groupés par name
  allPlansByName: { [key: string]: { premium: SubscriptionPlan | null, basic: SubscriptionPlan | null } } = {};
  planNames: string[] = [];
  currentNameIndex: number = 0;
  animationKey: number = 0;

  // Traductions statiques
  private translations: Translations = {
    FR: {
      // Header
      'nav.home': 'Accueil',
      'nav.about': 'À propos',
      'nav.features': 'Fonctionnalités',
      'nav.profiles': 'Profils',
      'nav.contact': 'Contact',
      'btn.login': 'Se connecter',
      'btn.tryFree': 'Essayer gratuitement',
      
      // Hero Section
      'hero.title': 'Simplifiez la gestion de vos chantiers, du bureau au terrain.',
      'hero.description': 'Suivi en temps réel, pointages, plannings, rapports PDF, coûts et photos — le tout dans une seule plateforme prête pour le MOA, le BET, le chef de chantier et les équipes terrain.',
      'hero.btn.features': 'Voir les fonctionnalités',
      'hero.btn.download': 'Télécharger l\'application',
      
      // About Section
      'about.badge': 'Présentation',
      'about.title': 'À propos',
      'about.description': 'BTP CONNECT centralise le pilotage des projets : suivi du terrain, coordination documentaire et reporting. Conçu pour réduire les frictions et accélérer la prise de décision.',
      'about.feature1': 'Suivi des chantiers en temps réel',
      'about.feature2': 'Gestion des équipes et des tâches',
      'about.feature3': 'Partage de documents et rapports',
      'about.feature4': 'Suivi des dépenses et plannings',
      
      // Profiles Section
      'profiles.badge': 'Profils utilisateurs',
      'profiles.title': 'Une solution adaptée à chaque intervenant',
      'profiles.description': 'BTP CONNECT. propose des fonctionnalités spécifiques pour chaque profil impliqué dans vos projets de construction',
      'profiles.readMore': 'Lire plus',
      'profiles.readLess': 'Lire moins',
      
      // Features Section
      'features.badge': 'Fonctionnalités clés',
      'features.title': 'Tout ce dont vous avez besoin pour gérer vos chantiers',
      'features.description': 'BTP CONNECT, centralise tous les outils nécessaires pour gérer efficacement vos projets de construction dans une interface intuitive et accessible',
      
      // Pricing Section
      'pricing.badge': 'Offres et abonnements',
      'pricing.title': 'Des formules adaptées à vos ambitions',
      'pricing.description': 'Choisissez la formule qui correspond le mieux à la taille de votre entreprise et à vos projets',
      'pricing.free.title': 'Gratuit (essai)',
      'pricing.free.description': 'Essai limité à 1 projet',
      'pricing.free.feature1': '1 projet',
      'pricing.free.feature2': 'Profils Chef & Ouvrier',
      'pricing.free.feature3': 'Rapports PDF',
      'pricing.free.feature4': 'Autres Rapports',
      'pricing.free.btn': 'Commencer gratuitement',
      'pricing.recommended': 'Recommandé',
      'pricing.unlimited': 'Projets illimités',
      'pricing.projects': 'projets',
      'pricing.premium.feature2': 'MOA, BET, Chef & Ouvrier',
      'pricing.premium.feature3': 'Support prioritaire',
      'pricing.discount': '-{{rate}}% sur l\'abonnement annuel',
      'pricing.basic.feature2': 'Fonctionnalités de base',
      'pricing.basic.feature3': 'Support standard',
      'pricing.btn.subscribe': 'Souscrire',
      'pricing.btn.basic': 'Aller au Basic',
      'pricing.notAvailable.premium': 'Plan Premium non disponible',
      'pricing.notAvailable.basic': 'Plan Basic non disponible',
      
      // Download Section
      'download.title': 'Téléchargez l\'application',
      'download.description': 'Badgez, suivez et documentez depuis le terrain. Synchronisation en temps réel avec le web.',
      'download.feature1': 'Suivi des chantiers en temps réel',
      'download.feature2': 'Gestion des équipes et des tâches',
      'download.feature3': 'Partage de documents et rapports',
      'download.feature4': 'Suivi des dépenses et plannings',
      'download.btn.appstore': 'Télécharger sur',
      'download.btn.appstore.text': 'App Store',
      'download.btn.playstore': 'Télécharger sur',
      'download.btn.playstore.text': 'Google Play',
      
      // Testimonials Section
      'testimonials.badge': 'Témoignages clients',
      'testimonials.title': 'Ce que nos clients disent de nous',
      'testimonials.description': 'Découvrez comment BTP CONNECT. transforme la gestion des projets de construction pour des entreprises comme la vôtre',
      
      // Footer
      'footer.description': 'La solution complète pour la gestion de vos projets de construction. Simplifiez votre quotidien et optimisez la rentabilité de vos chantiers.',
      'footer.product': 'Produit',
      'footer.contact': 'Contact',
      'footer.copyright': '© 2025 BTP. Tous droits réservés.',
      'footer.legal': 'Mentions légales',
      'footer.privacy': 'Politique de confidentialité',
      'footer.terms': 'CGU',
      'footer.cookies': 'Cookies',

        // Témoignages - Contenu des cartes
    'testimonial1.text': 'Depuis que nous utilisons BTP CONNECT, nous avons réduit nos délais de 20% et amélioré la communication entre nos équipes. Un outil indispensable pour notre entreprise.',
    'testimonial1.name': 'Jean Dupont',
    'testimonial1.position': 'Directeur de projets, Construction Moderne',
    
    'testimonial2.text': 'La plateforme nous permet de suivre en temps réel l\'avancement de nos chantiers et d\'anticiper les problèmes avant qu\'ils ne surviennent. L\'application mobile est particulièrement pratique sur le terrain.',
    'testimonial2.name': 'Marie Lambert',
    'testimonial2.position': 'Chef de chantier, Bâtiments du Sud',
    
    'testimonial3.text': 'BTP CONNECT a transformé notre façon de gérer les projets. La gestion des tâches et le traitement des rapports sont devenus beaucoup plus simples et efficaces.. Je recommande vivement cette solution à toutes les entreprises du BTP.',
    'testimonial3.name': 'Thomas Martin',
    'testimonial3.position': 'PDG, Constructions MTG',
      // ✅ AJOUTE CES LIGNES POUR LES FEATURES
      'features.feature1.title': 'Suivi en temps réel',
      'features.feature1.description': 'Suivez l\'avancement de vos chantiers en temps réel avec des mises à jour instantanées.',
      'features.feature2.title': 'Pointages digitaux',
      'features.feature2.description': 'Gérez les pointages de vos équipes facilement depuis le terrain.',
      'features.feature3.title': 'Planning interactif',
      'features.feature3.description': 'Organisez et visualisez tous vos projets avec des plannings intelligents.',
      'features.feature4.title': 'Rapports PDF',
      'features.feature4.description': 'Générez automatiquement des rapports professionnels en format PDF.',
      'features.feature5.title': 'Gestion des coûts',
      'features.feature5.description': 'Suivez et contrôlez les budgets de vos projets en toute transparence.',
      'features.feature6.title': 'Photos & Documents',
      'features.feature6.description': 'Centralisez tous vos documents et photos de chantier au même endroit.',
      
      // ✅ AJOUTE CES LIGNES POUR LES PROFILS
      'profile1.title': 'MOA (Maître d\'Ouvrage)',
      'profile1.subtitle': 'Pilotage de projet',
      'profile1.short': 'Suivi budgétaire, planning, validation des phases...',
      'profile1.full': 'Le Maître d\'Ouvrage pilote l\'ensemble du projet de construction. Il bénéficie d\'un tableau de bord complet pour le suivi budgétaire, la gestion du planning, la validation des différentes phases du projet, le contrôle qualité et la coordination entre tous les intervenants. Des outils de reporting et d\'analyse permettent une prise de décision éclairée à chaque étape.',
      
      'profile2.title': 'BET (Bureau d\'Études Techniques)',
      'profile2.subtitle': 'Coordination technique',
      'profile2.short': 'Documents, visas, plans, conformité, fil de validation.',
      'profile2.full': 'Le Bureau d\'Études Techniques assure la coordination technique du projet. Il gère l\'ensemble des documents techniques, les visas et approbations, les plans de construction, la vérification de conformité aux normes, le suivi du fil de validation et la coordination avec les différents corps de métier. Un système de gestion documentaire centralisé facilite le partage et le versioning des documents.',
      
      'profile3.title': 'Chef de Chantier',
      'profile3.subtitle': 'Gestion opérationnelle',
      'profile3.short': 'Suivi équipes, sécurité, avancement, planning terrain...',
      'profile3.full': 'Le Chef de Chantier gère les opérations quotidiennes sur le terrain. Il supervise les équipes, assure le respect des normes de sécurité, suit l\'avancement des travaux en temps réel, gère le planning terrain, coordonne les approvisionnements, rédige les rapports d\'activité et communique avec tous les intervenants. Des outils mobiles permettent un suivi en direct depuis le chantier.',
      
      'profile4.title': 'Ouvrier / Artisan',
      'profile4.subtitle': 'Exécution des travaux',
      'profile4.short': 'Tâches assignées, matériaux, pointage, sécurité...',
      'profile4.full': 'Les Ouvriers et Artisans accèdent facilement à leurs tâches assignées, consultent les plans et instructions, gèrent les demandes de matériaux, effectuent leur pointage quotidien, signalent les problèmes ou incidents, consultent les consignes de sécurité et communiquent avec leur chef d\'équipe. Une interface simplifiée et mobile facilite l\'utilisation au quotidien.',
    
    },
    EN: {
      // Header
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.features': 'Features',
      'nav.profiles': 'Profiles',
      'nav.contact': 'Contact',
      'btn.login': 'Sign in',
      'btn.tryFree': 'Try for free',
      
      // Hero Section
      'hero.title': 'Simplify your construction site management, from office to field.',
      'hero.description': 'Real-time tracking, time logging, scheduling, PDF reports, costs and photos — all in one platform ready for project owners, technical offices, site managers and field teams.',
      'hero.btn.features': 'View features',
      'hero.btn.download': 'Download the app',
      
      // About Section
      'about.badge': 'Presentation',
      'about.title': 'About',
      'about.description': 'BTP CONNECT centralizes project management: field monitoring, document coordination and reporting. Designed to reduce friction and accelerate decision-making.',
      'about.feature1': 'Real-time site tracking',
      'about.feature2': 'Team and task management',
      'about.feature3': 'Document and report sharing',
      'about.feature4': 'Expense and schedule tracking',
      
      // Profiles Section
      'profiles.badge': 'User profiles',
      'profiles.title': 'A solution tailored to each stakeholder',
      'profiles.description': 'BTP CONNECT. offers specific features for each profile involved in your construction projects',
      'profiles.readMore': 'Read more',
      'profiles.readLess': 'Read less',
      
      // Features Section
      'features.badge': 'Key features',
      'features.title': 'Everything you need to manage your construction sites',
      'features.description': 'BTP CONNECT. centralizes all the tools needed to effectively manage your construction projects in an intuitive and accessible interface',
      
      // Pricing Section
      'pricing.badge': 'Plans and subscriptions',
      'pricing.title': 'Plans adapted to all needs',
      'pricing.description': 'Choose the plan that best suits your company size and projects',
      'pricing.free.title': 'Free (trial)',
      'pricing.free.description': 'Trial limited to 1 project',
      'pricing.free.feature1': '1 project',
      'pricing.free.feature2': 'Manager & Worker profiles',
      'pricing.free.feature3': 'PDF reports',
      'pricing.free.feature4': 'Other reports',
      'pricing.free.btn': 'Start for free',
      'pricing.recommended': 'Recommended',
      'pricing.unlimited': 'Unlimited projects',
      'pricing.projects': 'projects',
      'pricing.premium.feature2': 'Owner, Technical, Manager & Worker',
      'pricing.premium.feature3': 'Priority support',
      'pricing.discount': '-{{rate}}% on annual subscription',
      'pricing.basic.feature2': 'Basic features',
      'pricing.basic.feature3': 'Standard support',
      'pricing.btn.subscribe': 'Subscribe',
      'pricing.btn.basic': 'Go to Basic',
      'pricing.notAvailable.premium': 'Premium plan not available',
      'pricing.notAvailable.basic': 'Basic plan not available',
      
      // Download Section
      'download.title': 'Download the app',
      'download.description': 'Clock in, track and document from the field. Real-time sync with the web.',
      'download.feature1': 'Real-time site tracking',
      'download.feature2': 'Team and task management',
      'download.feature3': 'Document and report sharing',
      'download.feature4': 'Expense and schedule tracking',
      'download.btn.appstore': 'Download on',
      'download.btn.appstore.text': 'App Store',
      'download.btn.playstore': 'Download on',
      'download.btn.playstore.text': 'Google Play',
      
      // Testimonials Section
      'testimonials.badge': 'Customer testimonials',
      'testimonials.title': 'What our customers say about us',
      'testimonials.description': 'Discover how BTP CONNECT. transforms construction project management for companies like yours',
      
      // Footer
      'footer.description': 'The complete solution for managing your construction projects. Simplify your daily work and optimize your site profitability.',
      'footer.product': 'Product',
      'footer.contact': 'Contact',
      'footer.copyright': '© 2025 BTP. All rights reserved.',
      'footer.legal': 'Legal notice',
      'footer.privacy': 'Privacy policy',
      'footer.terms': 'Terms of use',
      'footer.cookies': 'Cookies',

       // Testimonials - Card content
    'testimonial1.text': 'Since we started using BTP CONNECT, we have reduced our timelines by 20% and improved communication between our teams. An essential tool for our company.',
    'testimonial1.name': 'Jean Dupont',
    'testimonial1.position': 'Project Director, Construction Moderne',
    
    'testimonial2.text': 'The platform allows us to track our construction sites in real-time and anticipate problems before they occur. The mobile application is particularly convenient in the field.',
    'testimonial2.name': 'Marie Lambert',
    'testimonial2.position': 'Site Manager, Bâtiments du Sud',
    
    'testimonial3.text': 'BTP CONNECT has transformed the way we manage projects. Task management and report processing has become much simpler and more efficient. I highly recommend this solution to all construction companies.',
    'testimonial3.name': 'Thomas Martin',
    'testimonial3.position': 'CEO, Constructions MTG',

     // ✅ AJOUTE CES LIGNES POUR LES FEATURES
     'features.feature1.title': 'Real-time tracking',
     'features.feature1.description': 'Track the progress of your construction sites in real-time with instant updates.',
     'features.feature2.title': 'Digital time logging',
     'features.feature2.description': 'Easily manage your team\'s time logging from the field.',
     'features.feature3.title': 'Interactive planning',
     'features.feature3.description': 'Organize and visualize all your projects with smart schedules.',
     'features.feature4.title': 'PDF reports',
     'features.feature4.description': 'Automatically generate professional reports in PDF format.',
     'features.feature5.title': 'Cost management',
     'features.feature5.description': 'Track and control your project budgets with complete transparency.',
     'features.feature6.title': 'Photos & Documents',
     'features.feature6.description': 'Centralize all your construction site documents and photos in one place.',
     
     // ✅ AJOUTE CES LIGNES POUR LES PROFILS
     'profile1.title': 'Project Owner (MOA)',
     'profile1.subtitle': 'Project Management',
     'profile1.short': 'Budget tracking, planning, phase validation...',
     'profile1.full': 'The Project Owner oversees the entire construction project. They benefit from a complete dashboard for budget tracking, schedule management, validation of different project phases, quality control and coordination between all stakeholders. Reporting and analysis tools enable informed decision-making at every stage.',
     
     'profile2.title': 'Technical Office (BET)',
     'profile2.subtitle': 'Technical Coordination',
     'profile2.short': 'Documents, approvals, plans, compliance, validation flow.',
     'profile2.full': 'The Technical Office ensures the technical coordination of the project. It manages all technical documents, approvals and authorizations, construction plans, compliance verification with standards, validation flow tracking and coordination with different trades. A centralized document management system facilitates sharing and versioning of documents.',
     
     'profile3.title': 'Site Manager',
     'profile3.subtitle': 'Operational Management',
     'profile3.short': 'Team tracking, safety, progress, field planning...',
     'profile3.full': 'The Site Manager handles daily operations in the field. They supervise teams, ensure compliance with safety standards, track work progress in real-time, manage field planning, coordinate supplies, write activity reports and communicate with all stakeholders. Mobile tools enable direct tracking from the site.',
     
     'profile4.title': 'Worker / Craftsman',
     'profile4.subtitle': 'Work Execution',
     'profile4.short': 'Assigned tasks, materials, time logging, safety...',
     'profile4.full': 'Workers and Craftsmen easily access their assigned tasks, review plans and instructions, manage material requests, perform daily time logging, report problems or incidents, review safety instructions and communicate with their team leader. A simplified and mobile interface facilitates daily use.',
  
    }
  };

  features = [
    {
      titleKey: 'features.feature1.title',
      descriptionKey: 'features.feature1.description',
      icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      titleKey: 'features.feature2.title',
      descriptionKey: 'features.feature2.description',
      icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      titleKey: 'features.feature3.title',
      descriptionKey: 'features.feature3.description',
      icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z'
    },
    {
      titleKey: 'features.feature4.title',
      descriptionKey: 'features.feature4.description',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      titleKey: 'features.feature5.title',
      descriptionKey: 'features.feature5.description',
      icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    },
    {
      titleKey: 'features.feature6.title',
      descriptionKey: 'features.feature6.description',
      icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z'
    }
  ];

  profils = [
    {
      titleKey: 'profile1.title',
      subtitleKey: 'profile1.subtitle',
      shortKey: 'profile1.short',
      fullKey: 'profile1.full',
      image: 'assets/images/ouvrier1.png',
      expanded: false
    },
    {
      titleKey: 'profile2.title',
      subtitleKey: 'profile2.subtitle',
      shortKey: 'profile2.short',
      fullKey: 'profile2.full',
      image: 'assets/images/ouvrier2.png',
      expanded: false
    },
    {
      titleKey: 'profile3.title',
      subtitleKey: 'profile3.subtitle',
      shortKey: 'profile3.short',
      fullKey: 'profile3.full',
      image: 'assets/images/ouvrier3.png',
      expanded: false
    },
    {
      titleKey: 'profile4.title',
      subtitleKey: 'profile4.subtitle',
      shortKey: 'profile4.short',
      fullKey: 'profile4.full',
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

  toggleDescription(index: number): void {
    this.profils[index].expanded = !this.profils[index].expanded;
  }
 
  // Méthode pour obtenir la traduction
  t(key: string): string {
    const translation = this.translations[this.currentLang][key];
    if (!translation) {
      console.warn(`Translation missing for key: ${key} in language: ${this.currentLang}`);
      return key;
    }
    return translation;
  }

  // Méthode pour obtenir la traduction avec remplacement de variables
  tReplace(key: string, replacements: { [key: string]: string | number }): string {
    let translation = this.t(key);
    Object.keys(replacements).forEach(replaceKey => {
      translation = translation.replace(`{{${replaceKey}}}`, String(replacements[replaceKey]));
    });
    return translation;
  }

  // Toggle de langue
  toggleLanguage(): void {
    this.currentLang = this.currentLang === 'FR' ? 'EN' : 'FR';
    console.log('🌐 Langue changée:', this.currentLang);
  }

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

  goToSubscription(planType: 'free' | 'basic' | 'premium'): void {
    console.log('🎯 Intention d\'abonnement:', planType);
    
    sessionStorage.setItem('subscription_intent', planType);
    sessionStorage.setItem('redirect_after_login', '/mon-compte');
    sessionStorage.setItem('compte_tab', 'abonnements');
    
    console.log('✅ SessionStorage enregistré:', {
      subscription_intent: sessionStorage.getItem('subscription_intent'),
      redirect_after_login: sessionStorage.getItem('redirect_after_login'),
      compte_tab: sessionStorage.getItem('compte_tab')
    });
    
    this.router.navigate(['/login']);
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