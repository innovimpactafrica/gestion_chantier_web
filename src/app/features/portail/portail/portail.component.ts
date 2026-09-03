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

interface ProfilPilotage {
  roleKey: string;
  titleKey: string;
  taglineKey: string;
  bulletKeys: string[];
  image: string;
  altKey: string;
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
  heroStat1 = 0;
  heroStat2 = 0;
  heroStat3 = 0;
  private heroCounterFrameId: number | null = null;
  activeProfil = 0;

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

  get orbitRotationDeg(): number {
    return this.activeAiCategoryIndex * (360 / this.aiCategories.length);
  }

  getIconPosition(index: number): { [key: string]: string } {
    const total = this.aiCategories.length;
    const baseAngle = (360 / total) * index - 90;
    const angle = baseAngle + this.orbitRotationDeg;
    const rad = (angle * Math.PI) / 180;
    const x = 230 + 175 * Math.cos(rad) - 88;
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
      'btn.siteManagement': 'Gestion chantier',
      'btn.pilotage': 'Espace pilotage',
      'btn.tryFree': 'Essayer gratuitement',

      // Hero Section
      'hero.title.first': 'Du premier coup de pioche',
      'hero.title.second': 'à la remise des clés.',
      'hero.description': 'Pointages, plannings, appels d’offres, pénalités, états des lieux et livraison des acquéreurs. Une seule plateforme pour le promoteur, le chef de projet, les entreprises et les équipes terrain.',
      'hero.stat1.value': '12',
      'hero.stat1.label': 'étapes de suivi',
      'hero.stat2.value': '3',
      'hero.stat2.label': 'procédures SAV',
      'hero.stat3.value': '4',
      'hero.stat3.label': 'profils métier',

      // About Section
      'about.badge': 'Présentation',
      'about.title': 'À propos',
      'about.description': 'BTP CLOUD centralise le pilotage des projets : suivi du terrain, coordination documentaire et reporting. Conçu pour réduire les frictions et accélérer la prise de décision.',
      'about.feature1': 'Suivi des chantiers en temps réel',
      'about.feature2': 'Gestion des équipes et des tâches',
      'about.feature3': 'Partage de documents et rapports',
      'about.feature4': 'Suivi des dépenses et plannings',

      // Profiles Section
      'profiles.badge': 'Profils de pilotage',
      'profiles.title': 'Une interface par métier',
      'profiles.description': 'Chaque intervenant voit ce qui le concerne, et valide les étapes qui lui reviennent.',
      'profile1.title': 'Directeur de projet',
      'profile1.role': 'Direction générale',
      'profile1.tagline': 'Il décide et arbitre.',
      'profile1.b1': 'Suit tous ses programmes depuis un tableau de bord unique : avancement, retards, montants engagés.',
      'profile1.b2': 'Génère un chantier complet depuis un modèle, puis fige un planning de référence.',
      'profile1.b3': 'Valide les marchés signés et les paiements en fin de cycle.',
      'profile1.alt': 'Directeur de projet tenant un plan roulé devant un immeuble en construction',
      'profile2.title': 'Chef de projet',
      'profile2.role': 'Conduite de travaux',
      'profile2.tagline': 'Il fait avancer le chantier.',
      'profile2.b1': 'Crée et replanifie les tâches, propage un décalage sur toute la chaîne en aval.',
      'profile2.b2': 'Lance les appels d’offres, enregistre les offres reçues et compare prix et délais.',
      'profile2.b3': 'Valide les réceptions qui lui reviennent, chaque action restant horodatée.',
      'profile2.alt': 'Chef de projet en gilet de sécurité consultant son planning sur une tablette',
      'profile3.title': 'Responsable commercial',
      'profile3.role': 'Direction commerciale',
      'profile3.tagline': 'Il livre et suit les acquéreurs.',
      'profile3.b1': 'Réceptionne les ouvrages après le chef de projet, avant présentation au client.',
      'profile3.b2': 'Ouvre les états des lieux et les dossiers de service après-vente.',
      'profile3.b3': 'Remet les clés : fiche d’état des lieux, procès-verbal et échéancier des charges.',
      'profile3.alt': 'Responsable commercial remettant les clés d’un logement neuf',
      'profile4.title': 'Architecte',
      'profile4.role': 'Maîtrise d’œuvre',
      'profile4.tagline': 'Il contrôle la conformité.',
      'profile4.b1': 'Teste les ouvrages livrés avant toute réception, et rejette avec motif si nécessaire.',
      'profile4.b2': 'Pose les diagnostics des états des lieux et des demandes après-vente.',
      'profile4.b3': 'Accompagne le technicien sur place et chiffre les reprises.',
      'profile4.alt': 'Architecte examinant un ouvrage technique sur le chantier',

      // Features Section
      'features.badge': 'Fonctionnalités clés',
      'features.title': 'Tout ce dont vous avez besoin, du terrain à la remise des clés',
      'features.description': 'BTP Cloud accompagne un programme de sa conception à la livraison de ses acquéreurs, sans changer d’outil.',
      'features.feature1.title': 'Suivi en temps réel',
      'features.feature1.description': 'Suivez l’avancement de vos chantiers avec des mises à jour instantanées depuis le terrain.',
      'features.feature2.title': 'Pointage digital',
      'features.feature2.description': 'Enregistrez les présences de vos équipes, calculez les heures et préparez les salaires.',
      'features.feature3.title': 'Planning et Gantt',
      'features.feature3.description': 'Chaque tâche suit douze étapes horodatées, du lancement de l’appel d’offres au paiement validé.',
      'features.feature4.title': 'Appels d’offres',
      'features.feature4.description': 'Publiez un dossier, saisissez les offres reçues, comparez prix et délais, attribuez le marché.',
      'features.feature5.title': 'Pénalités de retard',
      'features.feature5.description': 'Calcul automatique chaque nuit, règle paramétrable, simulateur avant application.',
      'features.feature6.title': 'Stocks et approvisionnement',
      'features.feature6.description': 'Suivez les mouvements de matériaux, recevez une alerte avant la rupture.',
      'features.feature7.title': 'États des lieux et SAV',
      'features.feature7.description': 'Trois procédures : état des lieux interne, état des lieux client, service après-vente.',
      'features.feature8.title': 'Livraison des acquéreurs',
      'features.feature8.description': 'La remise des clés produit la fiche d’état des lieux, le procès-verbal et l’échéancier des charges.',
      'features.feature9.title': 'Espace acquéreur',
      'features.feature9.description': 'Votre client suit son logement, confirme ses rendez-vous et valide les devis.',
      'features.feature10.title': 'Études et documents',
      'features.feature10.description': 'Plans, visas, rapports et albums d’avancement, centralisés et versionnés.',
      'features.feature11.title': 'Budgets et coûts',
      'features.feature11.description': 'Suivez les dépenses par lot, comparez le prévu et le réel, anticipez les dépassements.',
      'features.feature12.title': 'Alertes multicanal',
      'features.feature12.description': 'Application, courriel et WhatsApp, réglables alerte par alerte.',

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

      'partners.empty': 'Nos partenaires arrivent bientôt',
    },
    EN: {
      // Header
      'nav.home': 'Home',
      'nav.about': 'About',
      'nav.features': 'Features',
      'nav.profiles': 'Profiles',
      'nav.contact': 'Contact',
      'btn.siteManagement': 'Site management',
      'btn.pilotage': 'Project management space',
      'btn.tryFree': 'Try for free',

      // Hero Section
      'hero.title.first': 'From the first groundbreaking',
      'hero.title.second': 'to key handover.',
      'hero.description': 'Time logging, scheduling, tenders, penalties, inspections and buyer handover. One platform for developers, project managers, contractors and field teams.',
      'hero.stat1.value': '12',
      'hero.stat1.label': 'tracked milestones',
      'hero.stat2.value': '3',
      'hero.stat2.label': 'after-sales procedures',
      'hero.stat3.value': '4',
      'hero.stat3.label': 'professional roles',
      'partners.empty': 'Our partners are coming soon',

      // About Section
      'about.badge': 'Presentation',
      'about.title': 'About',
      'about.description': 'BTP CLOUD centralizes project management: field monitoring, document coordination and reporting. Designed to reduce friction and accelerate decision-making.',
      'about.feature1': 'Real-time site tracking',
      'about.feature2': 'Team and task management',
      'about.feature3': 'Document and report sharing',
      'about.feature4': 'Expense and schedule tracking',

      // Profiles Section
      'profiles.badge': 'Management roles',
      'profiles.title': 'One interface per role',
      'profiles.description': 'Everyone sees what concerns them, and signs off on the steps they own.',
      'profile1.title': 'Project director',
      'profile1.role': 'Executive',
      'profile1.tagline': 'Decides and arbitrates.',
      'profile1.b1': 'Follows every programme from a single dashboard: progress, delays, committed amounts.',
      'profile1.b2': 'Generates a full site from a template, then locks a baseline schedule.',
      'profile1.b3': 'Approves signed contracts and releases final payments.',
      'profile1.alt': 'Project director holding rolled plans in front of a building under construction',
      'profile2.title': 'Project manager',
      'profile2.role': 'Site management',
      'profile2.tagline': 'Keeps the site moving.',
      'profile2.b1': 'Creates and reschedules tasks, cascading any shift down the chain.',
      'profile2.b2': 'Opens tenders, records incoming bids and compares price against lead time.',
      'profile2.b3': 'Signs off the acceptances they own, with every action time stamped.',
      'profile2.alt': 'Project manager in a safety vest checking the schedule on a tablet',
      'profile3.title': 'Sales manager',
      'profile3.role': 'Sales management',
      'profile3.tagline': 'Hands over and follows up.',
      'profile3.b1': 'Accepts the work after the project manager, before it reaches the buyer.',
      'profile3.b2': 'Opens condition reports and after sales cases.',
      'profile3.b3': 'Hands over the keys: condition report, handover certificate and charges schedule.',
      'profile3.alt': 'Sales manager handing over the keys to a new home',
      'profile4.title': 'Architect',
      'profile4.role': 'Design supervision',
      'profile4.tagline': 'Checks that it complies.',
      'profile4.b1': 'Tests delivered work before any acceptance, and rejects with a reason when needed.',
      'profile4.b2': 'Diagnoses condition reports and after sales requests.',
      'profile4.b3': 'Works alongside the technician on site and prices the remedial work.',
      'profile4.alt': 'Architect inspecting technical work on the construction site',

      // Features Section
      'features.badge': 'Key features',
      'features.title': 'Everything you need, from the field to key handover',
      'features.description': 'BTP Cloud supports a development from design through to buyer handover, without changing tools.',
      'features.feature1.title': 'Real-time tracking',
      'features.feature1.description': 'Track construction-site progress with instant updates from the field.',
      'features.feature2.title': 'Digital time logging',
      'features.feature2.description': 'Record team attendance, calculate hours and prepare payroll.',
      'features.feature3.title': 'Scheduling and Gantt',
      'features.feature3.description': 'Every task follows twelve time-stamped stages, from tender launch through to validated payment.',
      'features.feature4.title': 'Tenders',
      'features.feature4.description': 'Publish a tender dossier, enter received bids, compare prices and timelines, and award the contract.',
      'features.feature5.title': 'Late-payment penalties',
      'features.feature5.description': 'Calculated automatically every night, with configurable rules and a simulator before application.',
      'features.feature6.title': 'Inventory and procurement',
      'features.feature6.description': 'Track material movements and receive an alert before stock runs out.',
      'features.feature7.title': 'Inspections and after-sales service',
      'features.feature7.description': 'Three procedures: internal inspection, buyer inspection and after-sales service.',
      'features.feature8.title': 'Buyer handover',
      'features.feature8.description': 'Key handover produces the inspection report, handover record and service-charge schedule.',
      'features.feature9.title': 'Buyer portal',
      'features.feature9.description': 'Buyers track their home, confirm appointments and approve quotations.',
      'features.feature10.title': 'Studies and documents',
      'features.feature10.description': 'Plans, approvals, reports and progress albums, centralized and versioned.',
      'features.feature11.title': 'Budgets and costs',
      'features.feature11.description': 'Track expenses by work package, compare planned and actual figures, and anticipate overruns.',
      'features.feature12.title': 'Multichannel alerts',
      'features.feature12.description': 'In-app, email and WhatsApp alerts, configurable one alert at a time.',

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

    }
  };

  features = [
    { titleKey: 'features.feature1.title', descriptionKey: 'features.feature1.description', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { titleKey: 'features.feature2.title', descriptionKey: 'features.feature2.description', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { titleKey: 'features.feature3.title', descriptionKey: 'features.feature3.description', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    { titleKey: 'features.feature4.title', descriptionKey: 'features.feature4.description', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { titleKey: 'features.feature5.title', descriptionKey: 'features.feature5.description', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
    { titleKey: 'features.feature6.title', descriptionKey: 'features.feature6.description', icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
    {
      titleKey: 'features.feature7.title',
      descriptionKey: 'features.feature7.description',
      icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
    },
    {
      titleKey: 'features.feature8.title',
      descriptionKey: 'features.feature8.description',
      icon: 'M5 13l4 4L19 7M3 5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5z'
    },
    {
      titleKey: 'features.feature9.title',
      descriptionKey: 'features.feature9.description',
      icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 011-6 0z'
    },
    {
      titleKey: 'features.feature10.title',
      descriptionKey: 'features.feature10.description',
      icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    },
    {
      titleKey: 'features.feature11.title',
      descriptionKey: 'features.feature11.description',
      icon: 'M3 3v18h18M7 16l4-5 3 3 5-7'
    },
    {
      titleKey: 'features.feature12.title',
      descriptionKey: 'features.feature12.description',
      icon: 'M18 8a3 3 0 01-3 3H9l-4 4v-4a3 3 0 01-2-3V6a3 3 0 013-3h9a3 3 0 013 3v2zM8 17h7a3 3 0 003-3v-1'
    }
  ];

  profils: ProfilPilotage[] = [
    {
      titleKey: 'profile1.title',
      roleKey: 'profile1.role',
      taglineKey: 'profile1.tagline',
      bulletKeys: ['profile1.b1', 'profile1.b2', 'profile1.b3'],
      image: 'assets/images/profils/directeur de projet.png',
      altKey: 'profile1.alt',
    },
    {
      titleKey: 'profile2.title',
      roleKey: 'profile2.role',
      taglineKey: 'profile2.tagline',
      bulletKeys: ['profile2.b1', 'profile2.b2', 'profile2.b3'],
      image: 'assets/images/profils/chefe de projet.jpeg',
      altKey: 'profile2.alt',
    },
    {
      titleKey: 'profile3.title',
      roleKey: 'profile3.role',
      taglineKey: 'profile3.tagline',
      bulletKeys: ['profile3.b1', 'profile3.b2', 'profile3.b3'],
      image: 'assets/images/profils/responsable commerciale.jpeg',
      altKey: 'profile3.alt',
    },
    {
      titleKey: 'profile4.title',
      roleKey: 'profile4.role',
      taglineKey: 'profile4.tagline',
      bulletKeys: ['profile4.b1', 'profile4.b2', 'profile4.b3'],
      image: 'assets/images/profils/architect.jpeg',
      altKey: 'profile4.alt',
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
    if (this.heroCounterFrameId !== null && isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.heroCounterFrameId);
    }
  }

  selectProfil(index: number): void {
    this.activeProfil = index;
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
      this.animateHeroCounters();
    }
  }

  private animateHeroCounters(): void {
    const startedAt = performance.now();
    const duration = 1200;
    const update = (timestamp: number): void => {
      const progress = Math.min((timestamp - startedAt) / duration, 1);
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      this.heroStat1 = Math.round(12 * easedProgress);
      this.heroStat2 = Math.round(3 * easedProgress);
      this.heroStat3 = Math.round(4 * easedProgress);
      if (progress < 1) {
        this.heroCounterFrameId = requestAnimationFrame(update);
      }
    };
    this.heroCounterFrameId = requestAnimationFrame(update);
  }

  private initIntersectionObserver(): void {
    const observerOptions = {
      threshold: 0.12,
      rootMargin: '0px 0px -80px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
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