// 📁 Fichier 1 : src/environments/environment.ts
export const environment = {
  production: true,
  apiBaseUrl: 'https://wakana.online',
  apiUrl: 'https://wakana.online/api',

  filebaseUrl: 'https://wakana.online/repertoire_chantier/',
  endpoints: {
    // Dashboard Admin & Subscriptions
    subscriptions: 'https://wakana.online/api/subscriptions',
    users: 'https://wakana.online/api/v1/user',
    
    // Pharma Delivery Auth (ancien système)
    pharmaAuth: 'https://wakana.online/pharma-delivery/api/auth',
    pharmaDelivery: 'https://wakana.online/pharma-delivery/api',
    
    // Main Auth System (nouveau système)
    auth: 'https://wakana.online/api/v1/auth',
    user: 'https://wakana.online/api/v1/user',
    
    // Dashboard & KPIs
    tasks: 'https://wakana.online/api/tasks',
    indicators: 'https://wakana.online/api/indicators',
    budgets: 'https://wakana.online/api/budgets',
    materials: 'https://wakana.online/api/materials',
    incidents: 'https://wakana.online/api/incidents',
    progressAlbum: 'https://wakana.online/api/progress-album',
    workers: 'https://wakana.online/api/workers'
  }
};