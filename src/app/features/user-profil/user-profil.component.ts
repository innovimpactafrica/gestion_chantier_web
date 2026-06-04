// import { Component, OnInit } from '@angular/core';
// import { CommonModule } from '@angular/common';
// // import { AuthService } from './auth.service';
// import { AuthService } from '../auth/services/auth.service';

// @Component({
//   selector: 'app-user-profile',
//   standalone: true,
//   imports: [CommonModule],
//   template: `
//     <div class="user-profile-container" *ngIf="authService.isAuthenticated()">
//       <!-- Loading State -->
//       <div *ngIf="authService.isLoading()" class="loading-container">
//         <div class="spinner"></div>
//         <p>Chargement du profil...</p>
//       </div>

//       <!-- User Profile Content -->
//       <div *ngIf="!authService.isLoading() && authService.currentUser()" class="profile-content">
//         <!-- Header avec photo et nom -->
//         <div class="profile-header">
//           <div class="avatar-container">
//             <img 
//               *ngIf="authService.userPhoto(); else defaultAvatar"
//               [src]="authService.userPhoto()" 
//               [alt]="authService.userName()"
//               class="avatar"
//               (error)="onImageError($event)"
//             >
//             <ng-template #defaultAvatar>
//               <div class="default-avatar">
//                 {{ getInitials() }}
//               </div>
//             </ng-template>
//           </div>
          
//           <div class="user-info">
//             <h2 class="user-name">{{ authService.userName() }}</h2>
//             <p class="user-email">{{ authService.currentUser()?.email }}</p>
//             <span class="user-role" [class]="'role-' + authService.userRole()?.toLowerCase()">
//               {{ getRoleLabel() }}
//             </span>
//           </div>
          
//           <button class="refresh-btn" (click)="refreshProfile()" [disabled]="authService.isLoading()">
//             <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
//               <path d="M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
//             </svg>
//             Actualiser
//           </button>
//         </div>

//         <!-- Informations détaillées -->
//         <div class="profile-details">
//           <div class="detail-section">
//             <h3>Informations personnelles</h3>
//             <div class="detail-grid">
//               <div class="detail-item">
//                 <label>Nom complet</label>
//                 <span>{{ authService.currentUser()?.prenom }} {{ authService.currentUser()?.nom }}</span>
//               </div>
//               <div class="detail-item">
//                 <label>Email</label>
//                 <span>{{ authService.currentUser()?.email }}</span>
//               </div>
//               <div class="detail-item">
//                 <label>Téléphone</label>
//                 <span>{{ authService.currentUser()?.telephone || 'Non renseigné' }}</span>
//               </div>
//               <div class="detail-item">
//                 <label>Adresse</label>
//                 <span>{{ authService.currentUser()?.adress || 'Non renseignée' }}</span>
//               </div>
//             </div>
//           </div>

//           <!-- Entreprise -->
//           <div class="detail-section" *ngIf="authService.userCompany()">
//             <h3>Entreprise</h3>
//             <div class="company-info">
//               <div class="company-header">
//                 <img 
//                   *ngIf="authService.userCompany()?.logo"
//                   [src]="authService.userCompany()?.logo" 
//                   [alt]="authService.userCompany()?.name"
//                   class="company-logo"
//                 >
//                 <span class="company-name">{{ authService.userCompany()?.name }}</span>
//               </div>
//               <div class="company-colors">
//                 <div class="color-preview">
//                   <div 
//                     class="color-swatch" 
//                     [style.background-color]="authService.userCompany()?.primaryColor"
//                     title="Couleur principale"
//                   ></div>
//                   <div 
//                     class="color-swatch" 
//                     [style.background-color]="authService.userCompany()?.secondaryColor"
//                     title="Couleur secondaire"
//                   ></div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           <!-- Abonnement -->
//           <!-- <div class="detail-section" *ngIf="authService.activeSubscription()">
//             <h3>Abonnement</h3>
//             <div class="subscription-info">
//               <div class="subscription-plan">
//                 <span class="plan-name">{{ authService.activeSubscription()?.subscriptionPlan.name }}</span>
//                 <span class="plan-status" [class]="'status-' + authService.activeSubscription()?.status.toLowerCase()">
//                   {{ getStatusLabel() }}
//                 </span>
//               </div>
//               <div class="subscription-details">
//                 <div class="detail-item">
//                   <label>Date de début</label>
//                   <span>{{ formatDate(authService.activeSubscription()?.startDate) }}</span>
//                 </div>
//                 <div class="detail-item">
//                   <label>Date de fin</label>
//                   <span>{{ formatDate(authService.activeSubscription()?.endDate) }}</span>
//                 </div>
//                 <div class="detail-item">
//                   <label>Coût total</label>
//                   <span>{{ authService.activeSubscription()?.subscriptionPlan.totalCost }} €</span>
//                 </div>
//                 <div class="detail-item">
//                   <label>Montant payé</label>
//                   <span>{{ authService.activeSubscription()?.paidAmount }} €</span>
//                 </div>
//               </div>
//             </div>
//           </div> -->

//           <!-- Statistiques -->
//           <div class="detail-section">
//             <h3>Statistiques</h3>
//             <div class="stats-grid">
//               <div class="stat-item">
//                 <span class="stat-value">{{ authService.currentUser()?.funds || 0 }}</span>
//                 <span class="stat-label">Fonds (€)</span>
//               </div>
//               <div class="stat-item">
//                 <span class="stat-value">{{ authService.currentUser()?.note || 0 }}/5</span>
//                 <span class="stat-label">Note</span>
//               </div>
//               <div class="stat-item">
//                 <span class="stat-value">{{ formatDate(authService.currentUser()?.createdAt) }}</span>
//                 <span class="stat-label">Membre depuis</span>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>

//       <!-- État non connecté -->
//       <div *ngIf="!authService.isAuthenticated()" class="not-authenticated">
//         <p>Veuillez vous connecter pour voir votre profil.</p>
//       </div>
//     </div>
//   `,
//   styles: [`
//     .user-profile-container {
//       max-width: 800px;
//       margin: 0 auto;
//       padding: 20px;
//       font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
//     }

//     .loading-container {
//       display: flex;
//       flex-direction: column;
//       align-items: center;
//       padding: 40px;
//       color: #666;
//     }

//     .spinner {
//       width: 32px;
//       height: 32px;
//       border: 3px solid #f3f3f3;
//       border-top: 3px solid #007bff;
//       border-radius: 50%;
//       animation: spin 1s linear infinite;
//       margin-bottom: 16px;
//     }

//     @keyframes spin {
//       0% { transform: rotate(0deg); }
//       100% { transform: rotate(360deg); }
//     }

//     .profile-header {
//       display: flex;
//       align-items: center;
//       gap: 20px;
//       padding: 24px;
//       background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
//       border-radius: 12px;
//       color: white;
//       margin-bottom: 24px;
//       position: relative;
//     }

//     .avatar-container {
//       flex-shrink: 0;
//     }

//     .avatar, .default-avatar {
//       width: 80px;
//       height: 80px;
//       border-radius: 50%;
//       object-fit: cover;
//       border: 3px solid rgba(255, 255, 255, 0.3);
//     }

//     .default-avatar {
//       background: rgba(255, 255, 255, 0.2);
//       display: flex;
//       align-items: center;
//       justify-content: center;
//       font-size: 28px;
//       font-weight: 600;
//     }

//     .user-info {
//       flex: 1;
//     }

//     .user-name {
//       margin: 0 0 8px 0;
//       font-size: 24px;
//       font-weight: 600;
//     }

//     .user-email {
//       margin: 0 0 12px 0;
//       opacity: 0.9;
//       font-size: 16px;
//     }

//     .user-role {
//       display: inline-block;
//       padding: 4px 12px;
//       border-radius: 20px;
//       font-size: 12px;
//       font-weight: 500;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//     }

//     .role-promoteur {
//       background: rgba(52, 211, 153, 0.2);
//       color: #10b981;
//       border: 1px solid rgba(52, 211, 153, 0.3);
//     }

//     .role-admin {
//       background: rgba(248, 113, 113, 0.2);
//       color: #ef4444;
//       border: 1px solid rgba(248, 113, 113, 0.3);
//     }

//     .refresh-btn {
//       display: flex;
//       align-items: center;
//       gap: 8px;
//       padding: 8px 16px;
//       background: rgba(255, 255, 255, 0.2);
//       border: 1px solid rgba(255, 255, 255, 0.3);
//       border-radius: 8px;
//       color: white;
//       cursor: pointer;
//       transition: all 0.2s;
//       font-size: 14px;
//     }

//     .refresh-btn:hover:not(:disabled) {
//       background: rgba(255, 255, 255, 0.3);
//     }

//     .refresh-btn:disabled {
//       opacity: 0.5;
//       cursor: not-allowed;
//     }

//     .profile-details {
//       display: flex;
//       flex-direction: column;
//       gap: 24px;
//     }

//     .detail-section {
//       background: white;
//       border-radius: 12px;
//       padding: 24px;
//       box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
//       border: 1px solid #e5e7eb;
//     }

//     .detail-section h3 {
//       margin: 0 0 20px 0;
//       color: #1f2937;
//       font-size: 18px;
//       font-weight: 600;
//       border-bottom: 2px solid #f3f4f6;
//       padding-bottom: 8px;
//     }

//     .detail-grid {
//       display: grid;
//       grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
//       gap: 16px;
//     }

//     .detail-item {
//       display: flex;
//       flex-direction: column;
//       gap: 4px;
//     }

//     .detail-item label {
//       font-size: 12px;
//       font-weight: 500;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//       color: #6b7280;
//     }

//     .detail-item span {
//       font-size: 14px;
//       color: #1f2937;
//       font-weight: 500;
//     }

//     .company-info {
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     .company-header {
//       display: flex;
//       align-items: center;
//       gap: 12px;
//     }

//     .company-logo {
//       width: 40px;
//       height: 40px;
//       border-radius: 8px;
//       object-fit: cover;
//     }

//     .company-name {
//       font-size: 16px;
//       font-weight: 600;
//       color: #1f2937;
//     }

//     .color-preview {
//       display: flex;
//       gap: 8px;
//     }

//     .color-swatch {
//       width: 24px;
//       height: 24px;
//       border-radius: 6px;
//       border: 2px solid #e5e7eb;
//     }

//     .subscription-info {
//       display: flex;
//       flex-direction: column;
//       gap: 16px;
//     }

//     .subscription-plan {
//       display: flex;
//       align-items: center;
//       gap: 12px;
//     }

//     .plan-name {
//       font-size: 16px;
//       font-weight: 600;
//       color: #1f2937;
//     }

//     .plan-status {
//       padding: 4px 8px;
//       border-radius: 12px;
//       font-size: 11px;
//       font-weight: 500;
//       text-transform: uppercase;
//     }

//     .status-active {
//       background: #dcfce7;
//       color: #16a34a;
//     }

//     .status-pending {
//       background: #fef3c7;
//       color: #d97706;
//     }

//     .status-expired {
//       background: #fee2e2;
//       color: #dc2626;
//     }

//     .subscription-details {
//       display: grid;
//       grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
//       gap: 16px;
//     }

//     .stats-grid {
//       display: grid;
//       grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
//       gap: 16px;
//     }

//     .stat-item {
//       text-align: center;
//       padding: 16px;
//       background: #f9fafb;
//       border-radius: 8px;
//     }

//     .stat-value {
//       display: block;
//       font-size: 20px;
//       font-weight: 700;
//       color: #1f2937;
//       margin-bottom: 4px;
//     }

//     .stat-label {
//       font-size: 12px;
//       color: #6b7280;
//       text-transform: uppercase;
//       letter-spacing: 0.5px;
//     }

//     .not-authenticated {
//       text-align: center;
//       padding: 40px;
//       color: #6b7280;
//     }

//     @media (max-width: 768px) {
//       .user-profile-container {
//         padding: 16px;
//       }
      
//       .profile-header {
//         flex-direction: column;
//         text-align: center;
//         gap: 16px;
//       }
      
//       .detail-grid {
//         grid-template-columns: 1fr;
//       }
      
//       .subscription-details {
//         grid-template-columns: 1fr;
//       }
      
//       .stats-grid {
//         grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
//       }
//     }
//   `]
// })
// export class UserProfileComponent implements OnInit {
  
//   constructor(public authService: AuthService) {}

//   ngOnInit(): void {
//     // Charger les données utilisateur si connecté
//     if (this.authService.isAuthenticated() && !this.authService.currentUser()) {
//       this.authService.loadCurrentUser().subscribe({
//         error: (error) => {
////         }
//       });
//     }
//   }

//   refreshProfile(): void {
//     this.authService.refreshUser().subscribe({
//       next: () => {
////       },
//       error: (error) => {
////       }
//     });
//   }

//   getInitials(): string {
//     const user = this.authService.currentUser();
//     if (!user) return '';
    
//     const firstInitial = user.prenom?.charAt(0).toUpperCase() || '';
//     const lastInitial = user.nom?.charAt(0).toUpperCase() || '';
    
//     return firstInitial + lastInitial;
//   }

//   getRoleLabel(): string {
//     const role = this.authService.userRole();
//     switch (role) {
//       case 'PROMOTEUR': return 'Promoteur';
//       case 'ADMIN': return 'Administrateur';
//       default: return role || 'Utilisateur';
//     }
//   }

//   getStatusLabel(): string {
//     const status = this.authService.activeSubscription()?.status;
//     switch (status) {
//       case 'ACTIVE': return 'Actif';
//       case 'PENDING': return 'En attente';
//       case 'EXPIRED': return 'Expiré';
//       default: return status || 'Inconnu';
//     }
//   }

//   formatDate(dateString: string | undefined): string {
//     if (!dateString) return 'Non défini';
    
//     try {
//       return new Date(dateString).toLocaleDateString('fr-FR', {
//         day: '2-digit',
//         month: '2-digit',
//         year: 'numeric'
//       });
//     } catch {
//       return 'Date invalide';
//     }
//   }

//   onImageError(event: any): void {
//     // Masquer l'image en cas d'erreur de chargement
//     event.target.style.display = 'none';
//   }
// }