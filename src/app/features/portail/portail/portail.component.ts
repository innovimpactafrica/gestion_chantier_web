import { Component, HostListener, OnInit, OnDestroy, AfterViewInit, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { PlanAbonnementService, SubscriptionPlan } from '../../../../services/plan-abonnement.service';
import { PartnerService, Partner } from '../../../../services/partner.service';
import { LanguageService, Language } from '../../../core/services/language.service';
import { Subject, takeUntil, interval } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface Profil {
  titre: string;
  sousTitre: string;
  descriptionCourte: string;
  descriptionComplete: string;
  image: string;
  expanded: boolean;
}

interface Translations {
  FR: { [key: string]: string };
  EN: { [key: string]: string };
}

interface AiCategory {
  id: string;
  title: string;
  svgPath: string;
  iconImage: string;
  features: string[];
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
        style({ opacity: 0 }),
        animate('400ms ease-out', style({ opacity: 1 }))
      ])
    ])
  ]
})
export class PortailComponent implements OnInit, AfterViewInit, OnDestroy {
  private destroy$ = new Subject<void>();

  isScrolled = false;
  mobileMenuOpen = false;
  isLoadingPlans = true;
  currentLang: Language = 'FR';

  private languageService = inject(LanguageService);

  // Partenaires
  partners = signal<Partner[]>([]);
  isLoadingPartners = signal(false);
  duplicatedPartners = signal<Partner[]>([]);
  pauseSlider = false;
  baseUrl = environment.filebaseUrl;

  private planService = inject(PlanAbonnementService);
  private partnerService = inject(PartnerService);
  private router = inject(Router);
  private platformId = inject(PLATFORM_ID);

  // Plans d'abonnement actuels affichés
  currentPremiumPlan: SubscriptionPlan | null = null;
  currentBasicPlan: SubscriptionPlan | null = null;

  // Tous les plans groupés par name
  allPlansByName: { [key: string]: { premium: SubscriptionPlan | null, basic: SubscriptionPlan | null } } = {};
  planNames: string[] = [];
  currentNameIndex: number = 0;
  animationKey: number = 0;

  showHelpModal = false;
  emailAddress = 'contact@btpcloud.app';
  phoneNumber = '+ 221 33 971 41 12';

  // AI Features Section
  activeAiCategoryIndex = 0;
  aiAnimKey = 0;
  private aiIntervalId: ReturnType<typeof setInterval> | null = null;

  aiCategories: AiCategory[] = [
    {
      id: 'pointage-rh', title: 'Pointage & RH',
      svgPath: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
      iconImage: 'assets/images/ICONE POINTAGE & RH.png',
      features: [
        'Détection de fraude au pointage (GPS, anomalies)',
        'Reconnaissance faciale pour pointage automatique',
        'Prédiction d\'absentéisme',
        'Optimisation des plannings d\'équipes',
        'Analyse de productivité par ouvrier / équipe',
        'Détection de fatigue (heures excessives, alertes)',
        'Suggestion de rotation des équipes',
        'Calcul automatique des salaires et primes selon pointage'
      ]
    },
    {
      id: 'budget-finance', title: 'Budget & Finance',
      svgPath: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      iconImage: 'assets/images/ICONE BUDGET & FINANCE.png',
      features: [
        'Prévision du coût final du projet',
        'Détection d\'anomalies de dépenses',
        'Alertes dépassement budgétaire prédictif',
        'Analyse des écarts budget prévu vs réel',
        'Optimisation des achats groupés entre chantiers',
        'Scoring de rentabilité par lot / sous-traitant',
        'Génération automatique de situations de travaux',
        'Prévision de trésorerie chantier'
      ]
    },
    {
      id: 'avancement-planning', title: 'Avancement & Planning',
      svgPath: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      iconImage: 'assets/images/ICONE AVANCEMENT & PLANNING.png',
      features: [
        'Prédiction de retard chantier',
        'Analyse des photos pour détecter le % d\'avancement',
        'Détection de malfaçons sur les photos',
        'Suggestion de réorganisation des tâches critiques',
        'Analyse du chemin critique automatique (CPM)',
        'Comparaison avancement prévu vs réel avec alertes',
        'Génération automatique du planning à partir des tâches',
        'Prévision de la date de livraison'
      ]
    },
    {
      id: 'gestion-taches', title: 'Gestion des Tâches',
      svgPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
      iconImage: 'assets/images/ICONE GESTION DES TACHES.png',
      features: [
        'Priorisation automatique des tâches selon criticité',
        'Détection de blocages et dépendances',
        'Suggestion d\'affectation ouvrier → tâche selon compétences',
        'Estimation automatique de la durée des tâches',
        'Alerte tâches en retard avec impact sur le planning',
        'Génération de tâches automatique depuis un plan BET',
        'Suivi intelligent des tâches récurrentes'
      ]
    },
    {
      id: 'stocks', title: 'Stocks & Approvisionnement',
      svgPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      iconImage: 'assets/images/ICONESTOCKS & APPROVISIONNEMENT.png',
      features: [
        'Prévision des besoins en matériaux',
        'Alerte rupture de stock anticipée',
        'Optimisation des commandes fournisseurs',
        'Détection de surconsommation anormale',
        'Traçabilité intelligente des matériaux',
        'Suggestion de substitution de matériaux',
        'Analyse des pertes et gaspillages',
        'Comparaison prix fournisseurs automatique'
      ]
    },
    {
      id: 'sous-traitants', title: 'Sous-traitants & Lots',
      svgPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
      iconImage: 'assets/images/ICONE SOUS-TRAITANTS& LOTS.png',
      features: [
        'Scoring automatique des sous-traitants',
        'Analyse des performances par lot',
        'Détection de risques contractuels (délais, pénalités)',
        'Recommandation de sous-traitants selon profil chantier',
        'Suivi intelligent des situations de paiement',
        'Alertes dépassement de plafond sous-traitance',
        'Analyse des litiges récurrents par sous-traitant'
      ]
    },
    {
      id: 'qualite-securite', title: 'Qualité & Sécurité',
      svgPath: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      iconImage: "assets/images/ICONE BUREAU D'ETUDES & ETUDES TECHNIQUES.png",
      features: [
        'Détection automatique de non-conformités sur photos',
        'Analyse prédictive des incidents de sécurité',
        'Reconnaissance d\'EPI sur les photos (casque, gilet...)',
        'Génération automatique de fiches incident',
        'Analyse des causes racines d\'incidents',
        'Score de risque chantier en temps réel',
        'Suivi des visites de sécurité avec IA',
        'Détection de zones dangereuses sur plans'
      ]
    },
    {
      id: 'documents', title: 'Documents & Rapports',
      svgPath: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      iconImage: 'assets/images/ICONE DOCUMENTS & RAPPORTS.png',
      features: [
        'Génération automatique de rapports de chantier',
        'Analyse et extraction de données depuis des plans PDF',
        'Résumé automatique des réunions de chantier',
        'Génération de PPSPS assistée par IA',
        'Analyse automatique des appels d\'offres',
        'Rédaction assistée de courriers / mises en demeure',
        'Classification automatique des documents',
        'Extraction automatique des métrés depuis les plans'
      ]
    },
    {
      id: 'environnement', title: 'Environnement & Logistique',
      svgPath: 'M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      iconImage: 'assets/images/ICONE ENVIRONNEMENT & LOGISTIQUE.png',
      features: [
        'Intégration météo + réorganisation automatique des tâches',
        'Optimisation des tournées d\'engins et camions',
        'Prévision de consommation énergétique du chantier',
        'Détection d\'impact environnemental (bruit, poussière)',
        'Optimisation de l\'utilisation des engins',
        'Planification intelligente des livraisons'
      ]
    },
    {
      id: 'chatbot', title: 'Assistance & Chatbot',
      svgPath: 'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z',
      iconImage: 'assets/images/ICONE ASSISTANCE & CHATBOT.png',
      features: [
        'Chatbot chantier en langage naturel',
        'Assistant devis / métré intelligent',
        'Assistant réglementaire BTP (normes, DTU)',
        'Recherche intelligente dans les documents du projet',
        'Suggestions contextuelles selon l\'état du chantier',
        'Assistant onboarding nouveaux ouvriers'
      ]
    }
  ];

  get activeAiCategory(): AiCategory {
    return this.aiCategories[this.activeAiCategoryIndex];
  }

  selectAiCategory(index: number): void {
    this.activeAiCategoryIndex = index;
    this.aiAnimKey++;
    this.resetAiRotation();
  }

  private resetAiRotation(): void {
    if (this.aiIntervalId !== null) {
      clearInterval(this.aiIntervalId);
      this.aiIntervalId = null;
    }
    if (isPlatformBrowser(this.platformId)) {
      this.aiIntervalId = setInterval(() => {
        this.activeAiCategoryIndex = (this.activeAiCategoryIndex + 1) % this.aiCategories.length;
        this.aiAnimKey++;
      }, 4000);
    }
  }

  getIconPosition(index: number): { [key: string]: string } {
    const angle = (360 / this.aiCategories.length) * index - 90;
    const rad = (angle * Math.PI) / 180;
    const x = 230 + 175 * Math.cos(rad) - 88; // halfButton = 88 (176px / 2)
    const y = 230 + 175 * Math.sin(rad) - 88;
    return { left: `${x}px`, top: `${y}px` };
  }

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
      'hero.btn.features': 'Voir Démos',
      'hero.btn.download': 'Télécharger l\'application',

      // About Section
      'about.badge': 'Présentation',
      'about.title': 'À propos',
      'about.description': 'BTP CLOUD centralise le pilotage des projets : suivi du terrain, coordination documentaire et reporting. Conçu pour réduire les frictions et accélérer la prise de décision.',
      'about.feature1': 'Suivi des chantiers en temps réel',
      'about.feature2': 'Gestion des équipes et des tâches',
      'about.feature3': 'Partage de documents et rapports',
      'about.feature4': 'Suivi des dépenses et plannings',

      // Profiles Section
      'profiles.badge': 'Profils utilisateurs',
      'profiles.title': 'Une solution adaptée à chaque intervenant',
      'profiles.description': 'BTP CLOUD propose des fonctionnalités spécifiques pour chaque profil impliqué dans vos projets de construction',
      'profiles.readMore': 'Lire plus',
      'profiles.readLess': 'Lire moins',

      // Features Section
      'features.badge': 'Fonctionnalités clés',
      'features.title': 'Tout ce dont vous avez besoin pour gérer vos chantiers',
      'features.description': 'BTP CLOUD centralise tous les outils nécessaires pour gérer efficacement vos projets de construction dans une interface intuitive et accessible',

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
      'testimonials.description': 'Découvrez comment BTP CLOUD transforme la gestion des projets de construction pour des entreprises comme la vôtre',

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
      'testimonial1.text': 'Depuis que nous utilisons BTP CLOUD, nous avons réduit nos délais de 20% et amélioré la communication entre nos équipes. Un outil indispensable pour notre entreprise.',
      'testimonial1.name': 'Jean Dupont',
      'testimonial1.position': 'Directeur de projets, Construction Moderne',

      'testimonial2.text': 'La plateforme nous permet de suivre en temps réel l\'avancement de nos chantiers et d\'anticiper les problèmes avant qu\'ils ne surviennent. L\'application mobile est particulièrement pratique sur le terrain.',
      'testimonial2.name': 'Marie Lambert',
      'testimonial2.position': 'Chef de chantier, Bâtiments du Sud',

      'testimonial3.text': 'BTP CLOUD a transformé notre façon de gérer les projets. La gestion des tâches et le traitement des rapports sont devenus beaucoup plus simples et efficaces. Je recommande vivement cette solution à toutes les entreprises du BTP.',
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
      'partners.empty': 'Nos partenaires arrivent bientôt',
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
      'partners.empty': 'Our partners are coming soon',
      'hero.btn.download': 'Download the app',

      // About Section
      'about.badge': 'Presentation',
      'about.title': 'About',
      'about.description': 'BTP CLOUD centralizes project management: field monitoring, document coordination and reporting. Designed to reduce friction and accelerate decision-making.',
      'about.feature1': 'Real-time site tracking',
      'about.feature2': 'Team and task management',
      'about.feature3': 'Document and report sharing',
      'about.feature4': 'Expense and schedule tracking',

      // Profiles Section
      'profiles.badge': 'User profiles',
      'profiles.title': 'A solution tailored to each stakeholder',
      'profiles.description': 'BTP CLOUD offers specific features for each profile involved in your construction projects',
      'profiles.readMore': 'Read more',
      'profiles.readLess': 'Read less',

      // Features Section
      'features.badge': 'Key features',
      'features.title': 'Everything you need to manage your construction sites',
      'features.description': 'BTP CLOUD centralizes all the tools needed to effectively manage your construction projects in an intuitive and accessible interface',

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
      'testimonials.description': 'Discover how BTP CLOUD transforms construction project management for companies like yours',

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
      'testimonial1.text': 'Since we started using BTP CLOUD, we have reduced our timelines by 20% and improved communication between our teams. An essential tool for our company.',
      'testimonial1.name': 'Jean Dupont',
      'testimonial1.position': 'Project Director, Construction Moderne',

      'testimonial2.text': 'The platform allows us to track our construction sites in real-time and anticipate problems before they occur. The mobile application is particularly convenient in the field.',
      'testimonial2.name': 'Marie Lambert',
      'testimonial2.position': 'Site Manager, Bâtiments du Sud',

      'testimonial3.text': 'BTP CLOUD has transformed the way we manage projects. Task management and report processing has become much simpler and more efficient. I highly recommend this solution to all construction companies.',
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

  constructor() { }

  ngOnInit(): void {

    // Synchroniser avec le LanguageService centralisé
    this.currentLang = this.languageService.currentLang();

    this.loadPlans();
    this.loadPartners();
    this.resetAiRotation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    if (this.aiIntervalId !== null) {
      clearInterval(this.aiIntervalId);
    }
  }

  toggleDescription(index: number): void {
    this.profils[index].expanded = !this.profils[index].expanded;
  }

  // Méthode pour obtenir la traduction
  t(key: string): string {
    const translation = this.translations[this.currentLang][key];
    if (!translation) {
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

    // Utiliser le service centralisé pour sauvegarder
    this.languageService.changeLanguage(this.currentLang);

  }

  // Changement de langue via select
  onLanguageChange(event: Event): void {
    const selectElement = event.target as HTMLSelectElement;
    this.currentLang = selectElement.value as Language;

    // Utiliser le service centralisé pour sauvegarder
    this.languageService.changeLanguage(this.currentLang);

  }


  loadPartners(): void {
    this.isLoadingPartners.set(true);
    this.partnerService.getPartners().subscribe({
      next: (data) => {
        this.partners.set(data);

        // Plain display as requested, no need for duplication
        this.duplicatedPartners.set([...data]);

        this.isLoadingPartners.set(false);
      },
      error: (error) => {
        this.isLoadingPartners.set(false);
      }
    });
  }
  goToFeaturesList(): void {
    this.router.navigate(['/fonctionnalites']);
  }
  handleLogoError(event: any): void {
    event.target.src = 'assets/images/placeholder-logo.png';
  }

  loadPlans(): void {
    this.isLoadingPlans = true;

    this.planService.getAllPlans()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plans) => {

          this.groupPlansByName(plans);
          this.planNames = Object.keys(this.allPlansByName);

          if (this.planNames.length > 0) {
            this.showPlansForName(0);
            this.startPlanRotation();
          }

          this.isLoadingPlans = false;
        },
        error: (error) => {
          this.isLoadingPlans = false;
        }
      });
  }

  private groupPlansByName(plans: SubscriptionPlan[]): void {
    this.allPlansByName = {};

    // ✅ Filtrer uniquement les profils MOA, PROMOTEUR et SITE_MANAGER
    const allowedProfiles = ['MOA', 'PROMOTEUR', 'SITE_MANAGER'];
    const profileOrder = ['PROMOTEUR', 'MOA', 'SITE_MANAGER']; // Ordre d'affichage

    // Mapping des noms de profils en français
    const profileNameMapping: { [key: string]: string } = {
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage',
      'SITE_MANAGER': 'Chef de Chantier'
    };

    plans.forEach(plan => {
      // Normaliser le nom pour le groupement
      let groupName = plan.name?.toUpperCase() || '';

      // Normalisation des noms
      if (groupName.includes('PROMOTEUR')) groupName = 'PROMOTEUR';
      else if (groupName.includes('MOA') || groupName.includes('MAITRE') || groupName.includes('OUVRAGE')) groupName = 'MOA';
      else if (groupName.includes('SITE_MANAGER') || groupName.includes('CHEF') || groupName.includes('CHANTIER')) groupName = 'SITE_MANAGER';
      else if (groupName.includes('MANAGER')) groupName = 'SITE_MANAGER';

      // ✅ Filtrer : n'accepter que les profils autorisés
      if (!allowedProfiles.includes(groupName)) {
        return; // Ignorer ce plan
      }

      if (!this.allPlansByName[groupName]) {
        this.allPlansByName[groupName] = {
          premium: null,
          basic: null
        };
      }

      const label = plan.label?.toUpperCase() || '';

      if (label === 'PREMIUM') {
        this.allPlansByName[groupName].premium = plan;
      } else if (label === 'BASIC') {
        this.allPlansByName[groupName].basic = plan;
      }
    });

    // Reconstruire planNames selon l'ordre souhaité (uniquement les profils autorisés)
    const availableNames = Object.keys(this.allPlansByName);
    this.planNames = profileOrder.filter(name => availableNames.includes(name));

    if (isPlatformBrowser(this.platformId)) {
    }
  }

  private showPlansForName(index: number): void {
    const name = this.planNames[index];
    if (!name) return;

    const planGroup = this.allPlansByName[name];
    this.currentPremiumPlan = planGroup.premium;
    this.currentBasicPlan = planGroup.basic;
    this.currentNameIndex = index;
    this.animationKey++;

}

  private startPlanRotation(): void {
    // Rotation toutes les 5 secondes (au lieu de 2 secondes)
    interval(5000)
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        const nextIndex = (this.currentNameIndex + 1) % this.planNames.length;
        this.showPlansForName(nextIndex);
      });
  }

  getCurrentName(): string {
    const profileKey = this.planNames[this.currentNameIndex] || '';

    // Mapping des noms de profils en français
    const profileNameMapping: { [key: string]: string } = {
      'PROMOTEUR': 'Promoteur',
      'MOA': 'Maître d\'Ouvrage',
      'SITE_MANAGER': 'Chef de Chantier'
    };

    return profileNameMapping[profileKey] || profileKey;
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

    if (isPlatformBrowser(this.platformId)) {
      sessionStorage.setItem('subscription_intent', planType);
      sessionStorage.setItem('redirect_after_login', '/mon-compte');
      sessionStorage.setItem('compte_tab', 'abonnements');

}

    this.router.navigate(['/login']);
  }

  goToLogin(): void {
    this.router.navigate(['/login']);
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    if (isPlatformBrowser(this.platformId)) {
      this.isScrolled = window.scrollY > 20;
    }
  }

  toggleMobileMenu() {
    this.mobileMenuOpen = !this.mobileMenuOpen;
  }

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initIntersectionObserver();
    }
  }

  private initIntersectionObserver(): void {
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -100px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-fade-in-up, .animate-fade-in-left, .animate-fade-in-right').forEach(el => {
      (el as HTMLElement).style.opacity = '0';
      (el as HTMLElement).style.transform = 'translateY(20px)';
      observer.observe(el);
    });
  }

  scrollToSection(sectionId: string, event: Event) {
    event.preventDefault();
    if (isPlatformBrowser(this.platformId)) {
      const element = document.getElementById(sectionId);
      if (element) {
        const headerOffset = 80;
        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
      }
    }
    this.mobileMenuOpen = false;
  }

  /**
   * Ouvre la modal Aide & Support
   */
  openHelpModal(): void {
    this.showHelpModal = true;
  }

  /**
   * Ferme la modal Aide & Support
   */
  closeHelpModal(): void {
    this.showHelpModal = false;
  }

  /**
   * Copie le texte dans le presse-papiers
   */
  copyToClipboard(text: string): void {
    if (isPlatformBrowser(this.platformId)) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
        }).catch(err => {
        });
      } else {
        // Fallback pour les anciens navigateurs
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        try {
          document.execCommand('copy');
        } catch (err) {
        }
        document.body.removeChild(textarea);
      }
    }
  }
}