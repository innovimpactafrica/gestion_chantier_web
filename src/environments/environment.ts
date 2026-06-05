export const environment = {
  production: false,
  apiBaseUrl: 'https://btp.innovimpactdev.cloud',
  apiUrl: 'https://btp.innovimpactdev.cloud/api',
  apiUrlAddress: 'https://btp.innovimpactdev.cloud/api/pointing-addresses',
  filebaseUrl: 'https://btp.innovimpactdev.cloud/repertoire_chantier/',
  oneTouchScriptUrl: 'https://test.solinusteam.com/Scripts/form.js',
  endpoints: {
    // Dashboard Admin & Subscriptions
    subscriptions: 'https://btp.innovimpactdev.cloud/api/subscriptions',
    users: 'https://btp.innovimpactdev.cloud/api/v1/user',

    // Pharma Delivery Auth (ancien système)
    pharmaAuth: 'https://btp.innovimpactdev.cloud/pharma-delivery/api/auth',
    pharmaDelivery: 'https://btp.innovimpactdev.cloud/pharma-delivery/api',

    // Main Auth System
    auth: 'https://btp.innovimpactdev.cloud/api/v1/auth',
    user: 'https://btp.innovimpactdev.cloud/api/v1/user',

    // Dashboard & KPIs
    tasks: 'https://btp.innovimpactdev.cloud/api/tasks',
    indicators: 'https://btp.innovimpactdev.cloud/api/indicators',
    budgets: 'https://btp.innovimpactdev.cloud/api/budgets',
    materials: 'https://btp.innovimpactdev.cloud/api/materials',
    incidents: 'https://btp.innovimpactdev.cloud/api/incidents',
    progressAlbum: 'https://btp.innovimpactdev.cloud/api/progress-album',
    workers: 'https://btp.innovimpactdev.cloud/api/workers',
    videoPromo: 'https://btp.innovimpactdev.cloud/api/video-promo',

    // Admin Notifications
    adminNotifications: 'https://btp.innovimpactdev.cloud/api/admin-notifications',
    adminNotificationsUnreadCount: 'https://btp.innovimpactdev.cloud/api/admin-notifications/unread/count'
  }
};
