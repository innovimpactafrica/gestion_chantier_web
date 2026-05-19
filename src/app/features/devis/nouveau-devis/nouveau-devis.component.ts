import { Component, OnDestroy, ChangeDetectionStrategy, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { DevisService, GenerateQuoteRequest } from '../../../../services/devis.service';
import { LanguageService } from '../../../core/services/language.service';
import { AuthService } from '../../auth/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

interface StepForm {
  // Step 1 — Localisation & projet
  projectName: string;
  projectType: string;
  country: string;
  city: string;
  neighborhood: string;
  address: string;
  latitude: string;
  longitude: string;
  // Step 2 — Caractéristiques techniques
  totalArea: number | null;
  numberOfFloors: number | null;
  numberOfRooms: number | null;
  numberOfApartments: number | null;
  finishingLevel: string;
  soilType: string;
  accessDifficulty: string;
  existingStructure: boolean;
  hasBasement: boolean;
  hasParking: boolean;
  hasPool: boolean;
  hasGarden: boolean;
  hasElevator: boolean;
  // Step 3 — Planification
  desiredStartDate: string;
  estimatedDurationMonths: number | null;
  additionalNotes: string;
}

@Component({
  selector: 'app-nouveau-devis',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './nouveau-devis.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NouveauDevisComponent implements OnDestroy {
  currentStep = 1;
  readonly totalSteps = 3;
  isSubmitting = false;
  isLocating = false;
  formErrors: Record<string, string> = {};

  form: StepForm = {
    projectName: '',
    projectType: '',
    country: 'Senegal',
    city: '',
    neighborhood: '',
    address: '',
    latitude: '',
    longitude: '',
    totalArea: null,
    numberOfFloors: null,
    numberOfRooms: null,
    numberOfApartments: null,
    finishingLevel: '',
    soilType: '',
    accessDifficulty: '',
    existingStructure: false,
    hasBasement: false,
    hasParking: false,
    hasPool: false,
    hasGarden: false,
    hasElevator: false,
    desiredStartDate: '',
    estimatedDurationMonths: null,
    additionalNotes: ''
  };

  readonly projectTypes = [
    { value: 'VILLA',    label: 'Villa',    path: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { value: 'IMMEUBLE', label: 'Immeuble', path: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { value: 'COMMERCE', label: 'Commerce', path: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z' },
    { value: 'BUREAU',   label: 'Bureau',   path: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { value: 'ENTREPOT', label: 'Entrepôt', path: 'M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z' },
    { value: 'AUTRE',    label: 'Autre',    path: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5' }
  ];

  readonly finishingLevels = [
    { value: 'ECONOMIQUE',   label: 'Économique',   desc: 'Finitions de base' },
    { value: 'STANDARD',     label: 'Standard',     desc: 'Finitions classiques' },
    { value: 'HAUT_STANDING',label: 'Haut standing',desc: 'Finitions premium' },
    { value: 'LUXE',         label: 'Luxe',         desc: 'Finitions exceptionnelles' }
  ];

  readonly soilTypes = [
    { value: 'NORMAL',   label: 'Normal' },
    { value: 'ROCHEUX',  label: 'Rocheux' },
    { value: 'SABLEUX',  label: 'Sableux' },
    { value: 'ARGILEUX', label: 'Argileux' }
  ];

  readonly accessDifficulties = [
    { value: 'FACILE',    label: 'Facile' },
    { value: 'MOYEN',     label: 'Moyen' },
    { value: 'DIFFICILE', label: 'Difficile' }
  ];

  readonly options: Array<{ field: keyof StepForm; label: string }> = [
    { field: 'hasBasement', label: 'Sous-sol' },
    { field: 'hasParking',  label: 'Parking' },
    { field: 'hasPool',     label: 'Piscine' },
    { field: 'hasGarden',   label: 'Jardin' },
    { field: 'hasElevator', label: 'Ascenseur' }
  ];

  private destroy$ = new Subject<void>();
  private languageService = inject(LanguageService);

  constructor(
    private devisService: DevisService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnDestroy(): void { this.destroy$.next(); this.destroy$.complete(); }

  t(key: string): string { return this.languageService.translate(key); }

  get stepProgress(): number { return (this.currentStep / this.totalSteps) * 100; }
  get showApartments(): boolean { return this.form.projectType === 'IMMEUBLE'; }

  nextStep(): void {
    if (!this.validateCurrentStep()) return;
    if (this.currentStep < this.totalSteps) { this.currentStep++; this.cdr.markForCheck(); }
  }

  prevStep(): void {
    if (this.currentStep > 1) { this.currentStep--; this.formErrors = {}; this.cdr.markForCheck(); }
  }

  goToStep(step: number): void {
    if (step < this.currentStep) { this.currentStep = step; this.formErrors = {}; this.cdr.markForCheck(); }
  }

  private validateCurrentStep(): boolean {
    this.formErrors = {};
    let valid = true;

    if (this.currentStep === 1) {
      if (!this.form.projectName.trim()) { this.formErrors['projectName'] = 'Le nom du projet est requis'; valid = false; }
      else if (this.form.projectName.trim().length < 3) { this.formErrors['projectName'] = 'Au moins 3 caractères'; valid = false; }
      if (!this.form.projectType) { this.formErrors['projectType'] = 'Le type de projet est requis'; valid = false; }
      if (!this.form.city.trim()) { this.formErrors['city'] = 'La ville est requise'; valid = false; }
      if (!this.form.country.trim()) { this.formErrors['country'] = 'Le pays est requis'; valid = false; }
    } else if (this.currentStep === 2) {
      if (!this.form.totalArea || this.form.totalArea <= 0) { this.formErrors['totalArea'] = 'La superficie doit être > 0'; valid = false; }
      if (!this.form.finishingLevel) { this.formErrors['finishingLevel'] = 'Le niveau de finition est requis'; valid = false; }
      if (!this.form.soilType) { this.formErrors['soilType'] = 'Le type de sol est requis'; valid = false; }
      if (!this.form.accessDifficulty) { this.formErrors['accessDifficulty'] = 'La difficulté d\'accès est requise'; valid = false; }
    }

    this.cdr.markForCheck();
    return valid;
  }

  geolocate(): void {
    if (!navigator.geolocation) {
      this.toastService.showWarning('Géolocalisation non supportée par ce navigateur');
      return;
    }
    this.isLocating = true;
    this.cdr.markForCheck();
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.form.latitude  = pos.coords.latitude.toFixed(6);
        this.form.longitude = pos.coords.longitude.toFixed(6);
        this.isLocating = false;
        this.toastService.showSuccess('Position GPS capturée');
        this.cdr.markForCheck();
      },
      () => {
        this.isLocating = false;
        this.toastService.showError('Impossible d\'obtenir votre position');
        this.cdr.markForCheck();
      }
    );
  }

  toggleOption(field: 'hasBasement' | 'hasParking' | 'hasPool' | 'hasGarden' | 'hasElevator'): void {
    (this.form[field] as boolean) = !(this.form[field] as boolean);
    this.cdr.markForCheck();
  }

  hasError(f: string): boolean { return !!this.formErrors[f]; }
  getError(f: string): string { return this.formErrors[f] || ''; }
  onInput(f: string): void { if (this.formErrors[f]) { delete this.formErrors[f]; this.cdr.markForCheck(); } }

  submit(): void {
    if (!this.validateCurrentStep()) return;
    const userId = this.authService.currentUser()?.id;
    if (!userId) { this.toastService.showError('Utilisateur non authentifié'); return; }

    this.isSubmitting = true;
    this.cdr.markForCheck();

    const payload: GenerateQuoteRequest = {
      userId,
      projectName:            this.form.projectName.trim(),
      projectType:            this.form.projectType as any,
      country:                this.form.country.trim(),
      city:                   this.form.city.trim(),
      neighborhood:           this.form.neighborhood.trim() || null,
      address:                this.form.address.trim() || null,
      latitude:               this.form.latitude || null,
      longitude:              this.form.longitude || null,
      totalArea:              this.form.totalArea!,
      numberOfFloors:         this.form.numberOfFloors,
      numberOfRooms:          this.form.numberOfRooms,
      numberOfApartments:     this.showApartments ? this.form.numberOfApartments : null,
      finishingLevel:         this.form.finishingLevel as any,
      soilType:               this.form.soilType as any,
      accessDifficulty:       this.form.accessDifficulty as any,
      existingStructure:      this.form.existingStructure,
      hasBasement:            this.form.hasBasement,
      hasParking:             this.form.hasParking,
      hasPool:                this.form.hasPool,
      hasGarden:              this.form.hasGarden,
      hasElevator:            this.form.hasElevator,
      desiredStartDate:       this.form.desiredStartDate || null,
      estimatedDurationMonths:this.form.estimatedDurationMonths,
      additionalNotes:        this.form.additionalNotes.trim() || null
    };

    this.devisService.generate(payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (quote) => {
        this.isSubmitting = false;
        this.toastService.showSuccess('Devis généré avec succès !');
        this.router.navigate(['/devis']);
      },
      error: (err: any) => {
        this.isSubmitting = false;
        const msg = this.extractError(err);
        this.toastService.showError(msg);
        this.cdr.markForCheck();
      }
    });
  }

  cancel(): void { this.router.navigate(['/devis']); }

  getFinishingLabel(v: string): string { return this.finishingLevels.find(f => f.value === v)?.label || v; }
  getSoilLabel(v: string): string      { return this.soilTypes.find(s => s.value === v)?.label || v; }
  getAccessLabel(v: string): string    { return this.accessDifficulties.find(a => a.value === v)?.label || v; }
  getTypeLabel(v: string): string      { return this.projectTypes.find(p => p.value === v)?.label || v; }

  getSelectedOptions(): string[] {
    return this.options.filter(o => (this.form[o.field] as boolean)).map(o => o.label);
  }

  private extractError(err: any): string {
    if (err?.status === 400) return 'Données invalides — vérifiez le formulaire';
    if (err?.status === 401) return 'Utilisateur non authentifié';
    if (err?.status === 403) return 'Accès refusé';
    if (err?.status === 404) return 'Ressource introuvable';
    if (err?.status === 500) return 'Erreur serveur — veuillez réessayer';
    const msg = err?.error?.message || err?.error || err?.message;
    return typeof msg === 'string' ? msg : 'Erreur lors de la génération du devis';
  }
}
