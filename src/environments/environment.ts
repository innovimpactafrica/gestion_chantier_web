export const environment = {
  production: false,
  apiBaseUrl: 'https://api.btpcloud.sn',
  apiUrl: 'https://api.btpcloud.sn/api',
  apiUrlAddress: 'https://api.btpcloud.sn/api/pointing-addresses',
  filebaseUrl: 'https://api.btpcloud.sn/repertoire_chantier/',
  oneTouchScriptUrl: 'https://test.solinusteam.com/Scripts/form.js',
  endpoints: {
    // Dashboard Admin & Subscriptions
    subscriptions: 'https://api.btpcloud.sn/api/subscriptions',
    users: 'https://api.btpcloud.sn/api/v1/user',

    // Pharma Delivery Auth (ancien système)
    pharmaAuth: 'https://api.btpcloud.sn/pharma-delivery/api/auth',
    pharmaDelivery: 'https://api.btpcloud.sn/pharma-delivery/api',

    // Main Auth System
    auth: 'https://api.btpcloud.sn/api/v1/auth',
    user: 'https://api.btpcloud.sn/api/v1/user',

    // Dashboard & KPIs
    tasks: 'https://api.btpcloud.sn/api/tasks',
    indicators: 'https://api.btpcloud.sn/api/indicators',
    budgets: 'https://api.btpcloud.sn/api/budgets',
    materials: 'https://api.btpcloud.sn/api/materials',
    incidents: 'https://api.btpcloud.sn/api/incidents',
    progressAlbum: 'https://api.btpcloud.sn/api/progress-album',
    workers: 'https://api.btpcloud.sn/api/workers',
    videoPromo: 'https://api.btpcloud.sn/api/video-promo',

    // Admin Notifications
    adminNotifications: 'https://api.btpcloud.sn/api/admin-notifications',
    adminNotificationsUnreadCount: 'https://api.btpcloud.sn/api/admin-notifications/unread/count'
  }
};
