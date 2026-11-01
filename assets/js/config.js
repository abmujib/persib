/**
 * PERSIB Bandung Match Schedule & Management
 * Configuration & Environment Settings
 */

const CONFIG = {
  // Application Information
  APP_NAME: 'PERSIB Bandung Match Schedule',
  CLUB_NAME: 'PERSIB Bandung',
  CLUB_NICKNAME: 'Maung Bandung',
  ESTABLISHED: '1933',
  HOME_STADIUM: 'Stadion Gelora Bandung Lautan Api (GBLA)',
  TIMEZONE: 'Asia/Jakarta',
  TIMEZONE_LABEL: 'WIB',

  // Google Apps Script Web App API URL
  // Replace this with your published Google Apps Script Web App URL
  // Example: 'https://script.google.com/macros/s/AKfycbx.../exec'
  GAS_API_URL: 'https://script.google.com/macros/s/AKfycbzEROJjyEg-WLTGYzCFUx0X8S4TL_WuxAMzEyJkmOYNV2twJ_553EBRVHysoNVG9RcDMw/exec',

  // Storage Keys for Browser Cache and Session
  STORAGE_KEYS: {
    API_URL: 'persib_gas_api_url',
    AUTH_TOKEN: 'persib_admin_token',
    AUTH_USER: 'persib_admin_user',
    LOCAL_DB: 'persib_sheets_db_v1',
    USE_LOCAL_FALLBACK: 'persib_use_local_db',
    ACTIVE_SEASON: 'persib_active_season'
  },

  // Football API Provider Configurations
  FOOTBALL_API: {
    DEFAULT_PROVIDER: 'api-football.com',
    PERSIB_TEAM_ID: 854, // Official Team ID for Persib Bandung on api-football.com
    DEFAULT_SEASON: 2024,
    PROVIDERS: [
      { id: 'api-football', name: 'API-Football (api-football.com)', docUrl: 'https://www.api-football.com/' },
      { id: 'rapidapi', name: 'API-Football via RapidAPI', docUrl: 'https://rapidapi.com/api-sports/api/api-football' }
    ]
  },

  // Match Status Constants
  STATUS: {
    SCHEDULED: 'SCHEDULED',
    TIMED: 'TIMED',
    LIVE: 'LIVE',
    IN_PLAY: 'IN_PLAY',
    PAUSED: 'PAUSED',
    FINISHED: 'FINISHED',
    POSTPONED: 'POSTPONED',
    CANCELLED: 'CANCELLED'
  },

  // Status Labels in Bahasa Indonesia
  STATUS_LABELS: {
    SCHEDULED: 'Terjadwal',
    TIMED: 'Terjadwal',
    LIVE: 'Sedang Berlangsung',
    IN_PLAY: 'Sedang Berlangsung',
    PAUSED: 'Jeda Babak',
    FINISHED: 'Selesai',
    POSTPONED: 'Ditunda',
    CANCELLED: 'Dibatalkan'
  },

  // Badge Status Colors
  STATUS_CLASSES: {
    SCHEDULED: 'status-scheduled',
    TIMED: 'status-scheduled',
    LIVE: 'status-live',
    IN_PLAY: 'status-live',
    PAUSED: 'status-warning',
    FINISHED: 'status-finished',
    POSTPONED: 'status-warning',
    CANCELLED: 'status-danger'
  }
};

// Check if a custom GAS URL was saved in localStorage
(function initConfig() {
  const savedUrl = localStorage.getItem(CONFIG.STORAGE_KEYS.API_URL);
  if (savedUrl && savedUrl.trim() !== '') {
    CONFIG.GAS_API_URL = savedUrl.trim();
  }
})();

// Helper to update the GAS URL dynamically
function updateGasUrl(newUrl) {
  if (newUrl && newUrl.trim()) {
    CONFIG.GAS_API_URL = newUrl.trim();
    localStorage.setItem(CONFIG.STORAGE_KEYS.API_URL, newUrl.trim());
  } else {
    CONFIG.GAS_API_URL = '';
    localStorage.removeItem(CONFIG.STORAGE_KEYS.API_URL);
  }
}

// Expose globally
window.CONFIG = CONFIG;
window.updateGasUrl = updateGasUrl;
