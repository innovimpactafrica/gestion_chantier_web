import { Component, EventEmitter, Output, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LanguageService } from '../../../core/services/language.service';
import { Router } from '@angular/router';
import { AuthService, User } from '../../../features/auth/services/auth.service';
import { SubscriptionService, SubscriptionPlan } from '../../../../services/subscription.service';

@Component({
    selector: 'app-plan-selection-popup',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './plan-selection-popup.component.html',
    styleUrls: ['./plan-selection-popup.component.scss']
})
export class PlanSelectionPopupComponent implements OnInit {
    @Output() close = new EventEmitter<void>();
    @Output() planSelected = new EventEmitter<string>();

    public languageService = inject(LanguageService);
    private router = inject(Router);
    private authService = inject(AuthService);
    private subscriptionService = inject(SubscriptionService);

    isVisible = signal<boolean>(true);

    // Plans d'abonnement
    basicPlan = signal<SubscriptionPlan | null>(null);
    premiumPlan = signal<SubscriptionPlan | null>(null);
    isYearlyBilling = signal(false);
    isLoadingPlans = signal(false);

    // État du traitement de paiement
    isProcessingBasic = signal(false);
    isProcessingPremium = signal(false);

    errorMessage = signal<string | null>(null);
    paymentPlan = signal<SubscriptionPlan | null>(null);
    paymentPhone = signal('');
    paymentError = signal<string | null>(null);

    ngOnInit(): void {
        this.loadSubscriptionPlans();
    }

    t(key: string): string {
        return this.languageService.translate(key);
    }

    /**
     * Charge les plans d'abonnement disponibles
     */
    private loadSubscriptionPlans(): void {
        const user = this.authService.currentUser();
        if (!user) {
            this.errorMessage.set(this.t('popup.error.loginRequired'));
            return;
        }

        this.isLoadingPlans.set(true);
        this.errorMessage.set(null);

        // Déterminer le profil utilisateur
        let userProfile = '';
        if (Array.isArray(user.profil) && user.profil.length > 0) {
            userProfile = user.profil[0];
        } else if (user.profils && typeof user.profils === 'string') {
            userProfile = user.profils;
        } else if (typeof user.profil === 'string') {
            userProfile = user.profil as any;
        }


        this.subscriptionService.getPlanSubscription(userProfile).subscribe({
            next: (plans: SubscriptionPlan[]) => {

                const premium = plans.find(plan =>
                    plan.label?.toUpperCase() === 'PREMIUM' ||
                    plan.name?.toUpperCase() === 'PREMIUM'
                );
                const basic = plans.find(plan =>
                    plan.label?.toUpperCase() === 'BASIC' ||
                    plan.name?.toUpperCase() === 'BASIC'
                );

                this.premiumPlan.set(premium || null);
                this.basicPlan.set(basic || null);
                this.isLoadingPlans.set(false);
            },
            error: (error) => {
                this.errorMessage.set(this.t('popup.error.loadPlans'));
                this.isLoadingPlans.set(false);
            }
        });
    }

    /**
     * Toggle entre facturation mensuelle et annuelle
     */
    toggleBillingPeriod(): void {
        this.isYearlyBilling.set(!this.isYearlyBilling());
    }

    /**
     * Calcule le prix avec réduction annuelle si applicable
     */
    calculatePrice(plan: SubscriptionPlan): number {
        if (!this.isYearlyBilling()) {
            return plan.totalCost;
        }

        if (plan.yearlyDiscountRate > 0) {
            const yearlyPrice = plan.totalCost * 12;
            const discount = yearlyPrice * (plan.yearlyDiscountRate / 100);
            return Math.round((yearlyPrice - discount) / 12);
        }

        return plan.totalCost;
    }

    /**
     * Formate le prix pour l'affichage
     */
    formatPrice(plan: SubscriptionPlan): string {
        const price = this.calculatePrice(plan);
        return price.toLocaleString('fr-FR');
    }

    /**
     * Gère la sélection d'un plan et initie le paiement
     */
    async onSelectPlan(planType: 'basic' | 'premium'): Promise<void> {
        const user = this.authService.currentUser();

        if (!user) {
            this.errorMessage.set(this.t('popup.error.loginRequired'));
            setTimeout(() => {
                this.router.navigate(['/login']);
            }, 2000);
            return;
        }

        const plan = planType === 'premium' ? this.premiumPlan() : this.basicPlan();

        if (!plan) {
            this.errorMessage.set(this.t('popup.error.loadPlans'));
            return;
        }

        // Définir l'état de traitement
        if (planType === 'premium') {
            this.isProcessingPremium.set(true);
        } else {
            this.isProcessingBasic.set(true);
        }

        try {
            this.paymentPlan.set(plan);
            this.paymentPhone.set(user.telephone || '');
            this.paymentError.set(null);
            return;

        } catch (error: any) {
            this.errorMessage.set(error.message || this.t('popup.error.payment'));
        } finally {
            if (planType === 'premium') {
                this.isProcessingPremium.set(false);
            } else {
                this.isProcessingBasic.set(false);
            }
        }
    }

    async confirmWavePayment(): Promise<void> {
        const user = this.authService.currentUser();
        const plan = this.paymentPlan();
        const phone = this.paymentPhone().trim();
        if (!user || !plan || !phone) {
            this.paymentError.set('Veuillez saisir un numéro Wave.');
            return;
        }
        try {
            const url = await this.subscriptionService.initiateSubscriptionPayment(
                user, plan, this.isYearlyBilling(), phone);
            window.location.assign(url);
        } catch (error: any) {
            this.paymentError.set(error?.message || this.t('popup.error.payment'));
        }
    }

    closeWavePayment(): void {
        this.paymentPlan.set(null);
        this.paymentError.set(null);
    }

    onClose(): void {
        this.isVisible.set(false);
        setTimeout(() => {
            this.close.emit();
        }, 300); // Wait for animation to complete
    }

    onOverlayClick(event: MouseEvent): void {
        // Close popup when clicking on overlay (not on modal content)
        if (event.target === event.currentTarget) {
            this.onClose();
        }
    }
}
