import { environment } from '../../../environments/environment';

export const API = {
  auth: `${environment.apiV1Url}/auth`,
  users: `${environment.apiV1Url}/user`,

  subscriptions: `${environment.apiUrl}/subscriptions`,
  subscriptionPlans: `${environment.apiUrl}/subscription-plans`,

  tasks: `${environment.apiUrl}/tasks`,
  indicators: `${environment.apiUrl}/indicators`,
  budgets: `${environment.apiUrl}/budgets`,
  materials: `${environment.apiUrl}/materials`,
  incidents: `${environment.apiUrl}/incidents`,
  workers: `${environment.apiUrl}/workers`,
  progressAlbum: `${environment.apiUrl}/progress-album`,
  videoPromo: `${environment.apiUrl}/video-promo`,

  adminNotifications: `${environment.apiUrl}/admin-notifications`,
  adminNotificationsUnreadCount: `${environment.apiUrl}/admin-notifications/unread/count`,

  pointingAddresses: `${environment.apiUrl}/pointing-addresses`,

  pharmaAuth: `${environment.apiBaseUrl}/pharma-delivery/api/auth`,
  pharmaDelivery: `${environment.apiBaseUrl}/pharma-delivery/api`
} as const;
