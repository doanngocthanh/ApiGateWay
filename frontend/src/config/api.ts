
export const API_CONFIG = {
  BASE_URL: '', // Update with your API base URL
  ENDPOINTS: {
    AUTH: {
      LOGIN: '/api/auth/login',
      REGISTER: '/api/auth/register',
      ME: '/api/auth/me',
      CHANGE_PASSWORD: '/api/auth/change-password'
    },
    USERS: {
      PROFILE: '/api/users/profile',
      USAGE: '/api/users/usage-stats',
      SUBSCRIPTION: '/api/users/subscription'
    },
    KEYS: {
      LIST: '/api/keys',
      CREATE: '/api/keys',
      UPDATE: '/api/keys',
      DELETE: '/api/keys',
      STATS: '/api/keys'
    },
    PLANS: {
      LIST: '/api/plans'
    },
    PAYMENT: {
      CREATE_ORDER: '/api/payment/create-order',
      CALLBACK: '/api/payment/callback',
      HISTORY: '/api/payment/history'
    },
    PROXY: {
      OCR: '/proxy/ocr',
      REQUEST: '/proxy',
      API_REQUEST: '/api/proxy-request',
      ANALYTICS: '/api/proxy/analytics',
      ADMIN: {
        DESTINATIONS: '/api/proxy/admin/destinations',
        HEALTH_CHECK: '/api/proxy/admin/destinations'
      },
      MAPPINGS: '/api/proxy/mappings'
    },
    QUOTA: {
      STATS: '/api/quota/stats'
    },
    ADMIN: {
      ANALYTICS: '/api/admin/analytics/usage',
      PROXY_HEALTH: '/api/admin/proxy/health',
      PAYMENTS: '/api/payment/admin/all'
    }
  }
};

// Helper function to build full URL
export const buildApiUrl = (endpoint: string) => {
  return `${API_CONFIG.BASE_URL}${endpoint}`;
};

// Helper function to build API key endpoint with ID
export const buildApiKeyUrl = (keyId: string, action?: string) => {
  const base = `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.KEYS.DELETE}/${keyId}`;
  return action ? `${base}/${action}` : base;
};

// Helper function for quota stats with API key
export const buildQuotaStatsUrl = () => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.QUOTA.STATS}`;
};

// Standard headers for API requests
export const getAuthHeaders = (token?: string) => ({
  'Content-Type': 'application/json',
  ...(token && { 'Authorization': `Bearer ${token}` })
});

// Headers for API key requests
export const getApiKeyHeaders = (apiKey: string) => ({
  'X-API-Key': apiKey,
  'Content-Type': 'application/json'
});
