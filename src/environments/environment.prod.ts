// 📁 Fichier 1 : src/environments/environment.ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://btpconnect.app/btpconnect',
  apiUrl: 'https://btpconnect.app/btpconnect/api',
  apiUrlAddress:'https://btpconnect.app/btpconnect/api/pointing-addresses',
  filebaseUrl: 'https://btpconnect.app/btpconnect/repertoire_chantier/',
  endpoints: {
    // Dashboard Admin & Subscriptions
    subscriptions: 'https://btpconnect.app/btpconnect/api/subscriptions',
    users: 'https://btpconnect.app/btpconnect/api/v1/user',
  
    
    // Pharma Delivery Auth (ancien système)
    pharmaAuth: 'https://btpconnect.app/btpconnect/pharma-delivery/api/auth',
    pharmaDelivery: 'https://btpconnect.app/btpconnect/pharma-delivery/api',
    
    // Main Auth System (nouveau système)
    auth: 'https://btpconnect.app/btpconnect/api/v1/auth',
    user: 'https://btpconnect.app/btpconnect/api/v1/user',
    
    // Dashboard & KPIs
    tasks: 'https://btpconnect.app/btpconnect/api/tasks',
    indicators: 'https://btpconnect.app/btpconnect/api/indicators',
    budgets: 'https://btpconnect.app/btpconnect/api/budgets',
    materials: 'https://btpconnect.app/btpconnect/api/materials',
    incidents: 'https://btpconnect.app/btpconnect/api/incidents',
    progressAlbum: 'https://btpconnect.app/btpconnect/api/progress-album',
    workers: 'https://btpconnect.app/btpconnect/api/workers'
  }
};