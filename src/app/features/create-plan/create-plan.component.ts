import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { PlanAbonnementService, SubscriptionPlan, CreatePlanRequest } from '../../../services/plan-abonnement.service';
import { LanguageService } from '../../core/services/language.service';
import { Subject, takeUntil } from 'rxjs';

@Component({
  selector: 'app-create-plan',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-plan.component.html',
  styleUrls: ['./create-plan.component.css']
})
export class CreatePlanComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Mode: 'create', 'edit', 'view'
  mode: 'create' | 'edit' | 'view' = 'create';
  planId: number | null = null;

  // États de chargement
  isLoading = false;
  isSaving = false;

  // Notification
  showNotification = false;
  notificationType: 'created' | 'updated' = 'created';
  planLabel = '';

  // Options pour les selects
  nameOptions = [
    { value: 'PROMOTEUR', label: 'Promoteur' },
    { value: 'SITE_MANAGER', label: 'Manager de site' },
    { value: 'MOA', label: 'Maître d\'ouvrage' },
    { value: 'BET', label: 'Bureau d\'études' },
    { value: 'SUPPLIER', label: 'Fournisseur' },
    { value: 'SUBCONTRACTOR', label: 'Sous-traitant' },
  ];

  labelOptions = [
    { value: 'BASIC', label: 'Basic' },
    { value: 'PREMIUM', label: 'Premium' }
  ];

  // Formulaire
  formData = {
    name: '',
    label: '',
    description: '',
    totalCost: null as number | null,
    installmentCount: 1,
    projectLimit: 0,
    unlimitedProjects: false,
    yearlyDiscountRate: 0,
    active: true
  };

  // Validation
  errors: { [key: string]: string } = {};

  constructor(
    private planService: PlanAbonnementService,
    private router: Router,
    private route: ActivatedRoute,
    public languageService: LanguageService
  ) {
    console.log('🚀 CreatePlanComponent initialisé');
  }

  // Helper pour la traduction
  t(key: string, params?: any): string {
    return this.languageService.translate(key, params);
  }

  ngOnInit(): void {
    // Récupérer le mode et l'ID du plan depuis les paramètres de route
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.mode = params['mode'] || 'create';
    });

    this.route.params.pipe(takeUntil(this.destroy$)).subscribe(params => {
      if (params['id']) {
        this.planId = +params['id'];
        this.loadPlan();
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Charge les données d'un plan existant
   */
  loadPlan(): void {
    if (!this.planId) return;

    this.isLoading = true;

    this.planService.getPlanAbonnementById(this.planId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (plan) => {
          console.log('✅ Plan chargé:', plan);
          this.formData = {
            name: plan.name,
            label: plan.label,
            description: plan.description,
            totalCost: plan.totalCost,
            installmentCount: plan.installmentCount,
            projectLimit: plan.projectLimit,
            unlimitedProjects: plan.unlimitedProjects,
            yearlyDiscountRate: plan.yearlyDiscountRate,
            active: plan.active
          };
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement du plan:', error);
          this.isLoading = false;
          alert(error.userMessage || 'Erreur lors du chargement du plan');
          this.goBack();
        }
      });
  }

  /**
   * Gère le changement du toggle "projets illimités"
   */
  onUnlimitedProjectsChange(): void {
    if (this.formData.unlimitedProjects) {
      this.formData.projectLimit = 0;
    }
  }

  /**
   * Validation du formulaire
   */
  validateForm(): boolean {
    this.errors = {};

    // Nom du plan (obligatoire)
    if (!this.formData.name) {
      this.errors['name'] = 'Le type de plan est obligatoire';
    }

    // Label (obligatoire)
    if (!this.formData.label) {
      this.errors['label'] = 'Le niveau est obligatoire';
    }

    // Description (obligatoire)
    if (!this.formData.description || !this.formData.description.trim()) {
      this.errors['description'] = 'La description est obligatoire';
    }

    // Coût total (obligatoire et positif)
    if (this.formData.totalCost === null || this.formData.totalCost <= 0) {
      this.errors['totalCost'] = 'Le coût total doit être supérieur à 0';
    }

    // Échéances (minimum 1)
    if (this.formData.installmentCount < 1) {
      this.errors['installmentCount'] = 'Le nombre d\'échéances doit être au moins 1';
    }

    // Limite de projets (si non illimité)
    if (!this.formData.unlimitedProjects && this.formData.projectLimit < 0) {
      this.errors['projectLimit'] = 'La limite de projets ne peut pas être négative';
    }

    // Remise annuelle (entre 0 et 100)
    if (this.formData.yearlyDiscountRate < 0 || this.formData.yearlyDiscountRate > 100) {
      this.errors['yearlyDiscountRate'] = 'La remise doit être entre 0 et 100%';
    }

    return Object.keys(this.errors).length === 0;
  }

  /**
   * Enregistre le plan (création ou modification)
   */
  savePlan(): void {
    if (this.mode === 'view') return;

    if (!this.validateForm()) {
      console.error('❌ Formulaire invalide:', this.errors);
      // Scroll vers le premier champ en erreur
      const firstErrorKey = Object.keys(this.errors)[0];
      const element = document.getElementById(firstErrorKey);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    this.isSaving = true;

    if (this.mode === 'create') {
      this.createPlan();
    } else if (this.mode === 'edit') {
      this.updatePlan();
    }
  }

  /**
   * Crée un nouveau plan
   */
  private createPlan(): void {
    const planData: CreatePlanRequest = {
      id: 0,
      name: this.formData.name,
      label: this.formData.label,
      description: this.formData.description.trim(),
      totalCost: this.formData.totalCost!,
      installmentCount: this.formData.installmentCount,
      projectLimit: this.formData.unlimitedProjects ? 0 : this.formData.projectLimit,
      unlimitedProjects: this.formData.unlimitedProjects,
      yearlyDiscountRate: this.formData.yearlyDiscountRate,
      active: this.formData.active
    };

    console.log('📝 Création du plan avec données:', planData);

    this.planService.createPlanAbonnement(planData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (createdPlan) => {
          console.log('✅ Plan créé avec succès:', createdPlan);
          this.isSaving = false;

          // Afficher la notification
          this.planLabel = createdPlan.label;
          this.notificationType = 'created';
          this.showNotification = true;

          // Masquer la notification et rediriger après 2 secondes
          setTimeout(() => {
            this.showNotification = false;
            this.goBack();
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la création:', error);
          this.isSaving = false;

          let errorMsg = 'Erreur lors de la création du plan';
          if (error.status === 400) {
            errorMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 409) {
            errorMsg = 'Un plan avec ces caractéristiques existe déjà.';
          }

          alert(error.userMessage || errorMsg);
        }
      });
  }

  /**
   * Met à jour un plan existant
   */
  private updatePlan(): void {
    if (!this.planId) return;

    const planData: CreatePlanRequest = {
      id: this.planId,
      name: this.formData.name,
      label: this.formData.label,
      description: this.formData.description.trim(),
      totalCost: this.formData.totalCost!,
      installmentCount: this.formData.installmentCount,
      projectLimit: this.formData.unlimitedProjects ? 0 : this.formData.projectLimit,
      unlimitedProjects: this.formData.unlimitedProjects,
      yearlyDiscountRate: this.formData.yearlyDiscountRate,
      active: this.formData.active
    };

    console.log('📝 Mise à jour du plan ID', this.planId, ':', planData);

    this.planService.putPlanAbonnement(this.planId, planData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ Plan mis à jour avec succès');
          this.isSaving = false;

          // Afficher la notification avec le label du formulaire
          this.planLabel = this.getLabelDisplay(this.formData.label);
          this.notificationType = 'updated';
          this.showNotification = true;

          // Masquer la notification et rediriger après 2 secondes
          setTimeout(() => {
            this.showNotification = false;
            this.goBack();
          }, 2000);
        },
        error: (error) => {
          console.error('❌ Erreur lors de la mise à jour:', error);
          this.isSaving = false;

          let errorMsg = 'Erreur lors de la mise à jour du plan';
          if (error.status === 400) {
            errorMsg = 'Données invalides. Vérifiez tous les champs.';
          } else if (error.status === 404) {
            errorMsg = 'Plan introuvable.';
          } else if (error.status === 409) {
            errorMsg = 'Un plan avec ces caractéristiques existe déjà.';
          }

          alert(error.userMessage || errorMsg);
        }
      });
  }

  /**
   * Retourne le label formaté pour l'affichage
   */
  private getLabelDisplay(label: string): string {
    const option = this.labelOptions.find(opt => opt.value === label);
    return option ? option.label : label;
  }

  /**
   * Annule et retourne à la liste
   */
  cancel(): void {
    if (confirm('Voulez-vous vraiment annuler ? Les modifications non enregistrées seront perdues.')) {
      this.goBack();
    }
  }

  /**
   * Retour à la liste des plans
   */
  goBack(): void {
    this.router.navigate(['/abonnements']);
  }

  /**
   * Retourne le titre de la page selon le mode
   */
  get pageTitle(): string {
    switch (this.mode) {
      case 'create':
        return 'Créer un nouveau plan';
      case 'edit':
        return 'Modifier le plan';
      case 'view':
        return 'Détails du plan';
      default:
        return 'Plan d\'abonnement';
    }
  }

  /**
   * Indique si le formulaire est en lecture seule
   */
  get isReadOnly(): boolean {
    return this.mode === 'view';
  }
}