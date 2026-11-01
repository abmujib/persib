/**
 * PERSIB Bandung Match Schedule & Management
 * Unified API Client for Google Apps Script Web App with Offline/Local Database Simulator
 */

const ApiService = (function() {
  // Initial default seed data for all 8 Google Sheets
  const INITIAL_TEAMS = [
    { id: 'T-001', name: 'PERSIB Bandung', code: 'PERSIB', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/0/05/Logo_Persib_Bandung.svg/200px-Logo_Persib_Bandung.svg.png', is_persib: true },
    { id: 'T-002', name: 'Persija Jakarta', code: 'PSJA', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/5/53/Persija_Jakarta_logo.svg/200px-Persija_Jakarta_logo.svg.png', is_persib: false },
    { id: 'T-003', name: 'Arema FC', code: 'AREMA', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/4/44/Arema_FC_2017_logo.svg/200px-Arema_FC_2017_logo.svg.png', is_persib: false },
    { id: 'T-004', name: 'Persebaya Surabaya', code: 'PBYA', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/7/75/Persebaya_Logo.svg/200px-Persebaya_Logo.svg.png', is_persib: false },
    { id: 'T-005', name: 'Bali United', code: 'BALI', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/7/7b/Bali_United_logo.svg/200px-Bali_United_logo.svg.png', is_persib: false },
    { id: 'T-006', name: 'Borneo FC Samarinda', code: 'BFC', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/3/3d/Borneo_FC_logo.svg/200px-Borneo_FC_logo.svg.png', is_persib: false },
    { id: 'T-007', name: 'PSIS Semarang', code: 'PSIS', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/1/14/PSIS_Semarang_logo.svg/200px-PSIS_Semarang_logo.svg.png', is_persib: false },
    { id: 'T-008', name: 'Madura United', code: 'MDR', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/8/87/Madura_United_FC_logo.svg/200px-Madura_United_FC_logo.svg.png', is_persib: false },
    { id: 'T-009', name: 'Port FC (Thailand)', code: 'PORT', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/e/eb/Port_F.C._logo.svg/200px-Port_F.C._logo.svg.png', is_persib: false },
    { id: 'T-010', name: 'Zhejiang FC (China)', code: 'ZHJ', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/2/23/Zhejiang_Professional_F.C._logo.svg/200px-Zhejiang_Professional_F.C._logo.svg.png', is_persib: false },
    { id: 'T-011', name: 'Lion City Sailors (Singapura)', code: 'LCS', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/f/f6/Lion_City_Sailors_FC.svg/200px-Lion_City_Sailors_FC.svg.png', is_persib: false },
    { id: 'T-012', name: 'Persik Kediri', code: 'PSIK', logo: 'https://upload.wikimedia.org/wikipedia/id/thumb/5/52/Logo_Persik_Kediri_2022.svg/200px-Logo_Persik_Kediri_2022.svg.png', is_persib: false }
  ];

  const INITIAL_COMPETITIONS = [
    { id: 'COMP-01', name: 'BRI Liga 1 Indonesia', code: 'LIGA1', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Liga_1_%28Indonesia%29_logo.svg/200px-Liga_1_%28Indonesia%29_logo.svg.png' },
    { id: 'COMP-02', name: 'AFC Champions League Two', code: 'ACL2', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/AFC_Champions_League_Two_logo.svg/200px-AFC_Champions_League_Two_logo.svg.png' },
    { id: 'COMP-03', name: 'Piala Presiden', code: 'PPR', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Piala_Presiden_logo.png/200px-Piala_Presiden_logo.png' }
  ];

  const INITIAL_SEASONS = [
    { id: 'SEAS-2024-2025', name: 'Musim 2024/2025', start_date: '2024-08-01', end_date: '2025-05-31' },
    { id: 'SEAS-2025-2026', name: 'Musim 2025/2026', start_date: '2025-08-01', end_date: '2026-05-31' }
  ];

  const INITIAL_STADIUMS = [
    { id: 'STD-01', name: 'Stadion Gelora Bandung Lautan Api (GBLA)', city: 'Bandung' },
    { id: 'STD-02', name: 'Stadion Si Jalak Harupat', city: 'Kabupaten Bandung' },
    { id: 'STD-03', name: 'Stadion Utama Gelora Bung Karno (SUGBK)', city: 'Jakarta' },
    { id: 'STD-04', name: 'Stadion Kapten I Wayan Dipta', city: 'Gianyar, Bali' },
    { id: 'STD-05', name: 'Stadion Gelora Bung Tomo', city: 'Surabaya' },
    { id: 'STD-06', name: 'Stadion Segiri', city: 'Samarinda' },
    { id: 'STD-07', name: 'PAT Stadium', city: 'Bangkok, Thailand' },
    { id: 'STD-08', name: 'Bishan Stadium', city: 'Singapura' }
  ];

  // Helper date generators for past and upcoming matches relative to current time
  const now = new Date();
  const makeDateString = (offsetDays) => {
    const d = new Date(now.getTime() + offsetDays * 86400000);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const INITIAL_MATCHES = [
    // Completed Matches
    {
      id: 'MATCH-001',
      external_match_id: 'EXT-L1-001',
      home_team_id: 'T-001', // PERSIB
      away_team_id: 'T-003', // Arema
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-02',
      match_date: makeDateString(-25),
      match_time: '19:00',
      home_score: 2,
      away_score: 0,
      status: 'FINISHED',
      data_source: 'Football API',
      referee: 'Fariq Hitaba',
      broadcast: 'Indosiar & Vidio',
      notes: 'Kemenangan solid di kandang. Gol dicetak Ciro Alves dan David da Silva.'
    },
    {
      id: 'MATCH-002',
      external_match_id: 'EXT-L1-002',
      home_team_id: 'T-004', // Persebaya
      away_team_id: 'T-001', // PERSIB
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-05',
      match_date: makeDateString(-18),
      match_time: '15:30',
      home_score: 1,
      away_score: 1,
      status: 'FINISHED',
      data_source: 'Football API',
      referee: 'Thoriq Alkatiri',
      broadcast: 'Indosiar & Vidio',
      notes: 'Laga sengit di Surabaya berakhir imbang dengan perjuangan maksimal.'
    },
    {
      id: 'MATCH-003',
      external_match_id: 'EXT-ACL-001',
      home_team_id: 'T-001', // PERSIB
      away_team_id: 'T-011', // Lion City Sailors
      competition_id: 'COMP-02',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-02',
      match_date: makeDateString(-10),
      match_time: '20:00',
      home_score: 3,
      away_score: 1,
      status: 'FINISHED',
      data_source: 'Manual Input',
      referee: 'Kim Dae-yong (KOR)',
      broadcast: 'RCTI & Vision+',
      notes: 'Laga penyisihan grup AFC Champions League Two. Performa gemilang lini serang Pangeran Biru.'
    },
    {
      id: 'MATCH-004',
      external_match_id: 'EXT-L1-003',
      home_team_id: 'T-008', // Madura United
      away_team_id: 'T-001', // PERSIB
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-04',
      match_date: makeDateString(-4),
      match_time: '19:00',
      home_score: 1,
      away_score: 2,
      status: 'FINISHED',
      data_source: 'Football API',
      referee: 'Yudi Nurcahya',
      broadcast: 'Indosiar',
      notes: 'Tiga poin krusial tandang diraih berkat gol penalti di menit akhir.'
    },

    // Next Matches (Upcoming)
    {
      id: 'MATCH-005',
      external_match_id: 'EXT-L1-004',
      home_team_id: 'T-001', // PERSIB
      away_team_id: 'T-002', // Persija Jakarta (EL CLASICO INDONESIA)
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-01', // GBLA
      match_date: makeDateString(3),
      match_time: '15:30',
      home_score: null,
      away_score: null,
      status: 'SCHEDULED',
      data_source: 'Football API',
      referee: 'Thoriq Alkatiri',
      broadcast: 'Indosiar & Vidio Exclusive',
      notes: 'Super Big Match El Clasico Indonesia! Laga sarat gengsi di Stadion Gelora Bandung Lautan Api.'
    },
    {
      id: 'MATCH-006',
      external_match_id: 'EXT-ACL-002',
      home_team_id: 'T-009', // Port FC
      away_team_id: 'T-001', // PERSIB
      competition_id: 'COMP-02',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-07',
      match_date: makeDateString(9),
      match_time: '19:00',
      home_score: null,
      away_score: null,
      status: 'SCHEDULED',
      data_source: 'Football API',
      referee: 'Omar Al-Yaqoubi (OMA)',
      broadcast: 'RCTI & Vision+',
      notes: 'Pertandingan tandang krusial Grup F AFC Champions League Two di Bangkok.'
    },
    {
      id: 'MATCH-007',
      external_match_id: 'EXT-L1-005',
      home_team_id: 'T-005', // Bali United
      away_team_id: 'T-001', // PERSIB
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-04',
      match_date: makeDateString(16),
      match_time: '19:00',
      home_score: null,
      away_score: null,
      status: 'SCHEDULED',
      data_source: 'Manual Input',
      referee: 'TBD',
      broadcast: 'Indosiar',
      notes: 'Lanjutan BRI Liga 1 pekan ke-24 di Stadion Kapten I Wayan Dipta.'
    },
    {
      id: 'MATCH-008',
      external_match_id: 'EXT-L1-006',
      home_team_id: 'T-001', // PERSIB
      away_team_id: 'T-006', // Borneo FC
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-01',
      match_date: makeDateString(23),
      match_time: '20:30',
      home_score: null,
      away_score: null,
      status: 'SCHEDULED',
      data_source: 'Football API',
      referee: 'TBD',
      broadcast: 'Indosiar & Vidio',
      notes: 'Duel perebutan puncak klasemen papan atas Liga 1.'
    },
    {
      id: 'MATCH-009',
      external_match_id: 'EXT-ACL-003',
      home_team_id: 'T-001', // PERSIB
      away_team_id: 'T-010', // Zhejiang FC
      competition_id: 'COMP-02',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-01',
      match_date: makeDateString(32),
      match_time: '19:30',
      home_score: null,
      away_score: null,
      status: 'SCHEDULED',
      data_source: 'Football API',
      referee: 'TBD',
      broadcast: 'RCTI',
      notes: 'Pekan pamungkas fase grup AFC Champions League Two.'
    }
  ];

  const INITIAL_USERS = [
    {
      id: 'USR-001',
      username: 'admin',
      // SHA-256 for 'persib1933'
      password_hash: 'd175b225791739c36ba8f070ef60b1348c59f200c822e176bc5c9527ec56c703',
      role: 'administrator',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  const INITIAL_API_SETTINGS = [
    {
      id: 'SET-001',
      provider: 'Football-Data.org',
      enabled: true,
      api_endpoint: 'https://api.football-data.org/v4/competitions/IDN1/matches',
      league_code: 'IDN1',
      sync_interval_hours: 6,
      updated_at: new Date().toISOString()
    }
  ];

  const INITIAL_SYNC_LOGS = [
    {
      id: 'LOG-001',
      sync_type: 'AUTOMATIC_TRIGGER',
      status: 'SUCCESS',
      records_processed: 8,
      message: 'Sinkronisasi otomatis berhasil. 8 jadwal dan status pertandingan diperbarui dari Football API.',
      created_at: new Date(Date.now() - 3600000 * 2).toISOString()
    },
    {
      id: 'LOG-002',
      sync_type: 'MANUAL_ADMIN',
      status: 'SUCCESS',
      records_processed: 5,
      message: 'Sinkronisasi manual oleh administrator selesai. Tidak ada duplikasi data (dicek via external_match_id).',
      created_at: new Date(Date.now() - 86400000).toISOString()
    }
  ];

  // Initialize and load Local Storage Database
  function getLocalDb() {
    try {
      const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.LOCAL_DB);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not parse stored local DB, re-initializing', e);
    }

    const newDb = {
      users: INITIAL_USERS,
      matches: INITIAL_MATCHES,
      teams: INITIAL_TEAMS,
      competitions: INITIAL_COMPETITIONS,
      seasons: INITIAL_SEASONS,
      stadiums: INITIAL_STADIUMS,
      api_settings: INITIAL_API_SETTINGS,
      sync_logs: INITIAL_SYNC_LOGS,
      last_updated: new Date().toISOString()
    };
    saveLocalDb(newDb);
    return newDb;
  }

  function saveLocalDb(db) {
    db.last_updated = new Date().toISOString();
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.LOCAL_DB, JSON.stringify(db));
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }
  }

  // Helper: SHA-256 Hash using subtle crypto
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Network Fetch with Google Apps Script Web App Support
  async function callGas(action, params = {}, method = 'GET') {
    const baseUrl = CONFIG.GAS_API_URL;
    if (!baseUrl) {
      throw new Error('Google Apps Script URL is not configured. Falling back to local database.');
    }

    let url = baseUrl;
    let options = {
      method: method,
      headers: {
        'Accept': 'application/json'
      }
    };

    if (method === 'GET') {
      const queryParams = new URLSearchParams({ action, ...params });
      url += (url.includes('?') ? '&' : '?') + queryParams.toString();
    } else {
      // GAS doPost expects application/x-www-form-urlencoded or text/plain to avoid preflight CORS complications
      options.headers['Content-Type'] = 'text/plain;charset=utf-8';
      options.body = JSON.stringify({ action, ...params });
    }

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  }

  // Public Interface for Matches
  async function getMatches(filters = {}) {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('matches', filters, 'GET');
        if (res.status === 'success' && res.data) {
          return { success: true, data: res.data, source: 'Google Apps Script (Google Sheets)' };
        }
      } catch (err) {
        console.warn('GAS fetch failed, falling back to local persistent DB:', err.message);
      }
    }

    // Local DB execution
    const db = getLocalDb();
    let matches = [...db.matches];

    // Filter by competition
    if (filters.competition_id && filters.competition_id !== 'all') {
      matches = matches.filter(m => m.competition_id === filters.competition_id);
    }

    // Filter by season
    if (filters.season_id && filters.season_id !== 'all') {
      matches = matches.filter(m => m.season_id === filters.season_id);
    }

    // Filter by status (upcoming vs finished)
    if (filters.status_type === 'upcoming') {
      matches = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'LIVE' || m.status === 'IN_PLAY');
    } else if (filters.status_type === 'results') {
      matches = matches.filter(m => m.status === 'FINISHED');
    }

    // Search query (team or stadium)
    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      matches = matches.filter(m => {
        const homeTeam = db.teams.find(t => t.id === m.home_team_id)?.name.toLowerCase() || '';
        const awayTeam = db.teams.find(t => t.id === m.away_team_id)?.name.toLowerCase() || '';
        const stadium = db.stadiums.find(s => s.id === m.stadium_id)?.name.toLowerCase() || '';
        return homeTeam.includes(q) || awayTeam.includes(q) || stadium.includes(q);
      });
    }

    // Enrich match objects with referenced data (Teams, Competition, Stadium)
    const enriched = matches.map(m => enrichMatchData(m, db));

    // Sort: Upcoming ascending by date, Results descending by date
    enriched.sort((a, b) => {
      const dateA = new Date(`${a.match_date}T${a.match_time || '00:00'}:00`);
      const dateB = new Date(`${b.match_date}T${b.match_time || '00:00'}:00`);
      return dateA - dateB;
    });

    return {
      success: true,
      data: enriched,
      source: CONFIG.GAS_API_URL ? 'Live GAS' : 'Local Persistent Database (Google Sheets Structure)'
    };
  }

  // Enrich match with entity objects
  function enrichMatchData(m, db) {
    const homeTeam = db.teams.find(t => t.id === m.home_team_id) || { id: m.home_team_id, name: 'Tuan Rumah', logo: '' };
    const awayTeam = db.teams.find(t => t.id === m.away_team_id) || { id: m.away_team_id, name: 'Tim Tamu', logo: '' };
    const competition = db.competitions.find(c => c.id === m.competition_id) || { id: m.competition_id, name: 'Kompetisi', logo: '' };
    const stadium = db.stadiums.find(s => s.id === m.stadium_id) || { id: m.stadium_id, name: 'Stadion Utama', city: 'Bandung' };
    const season = db.seasons.find(s => s.id === m.season_id) || { id: m.season_id, name: 'Musim 2024/2025' };

    return {
      ...m,
      homeTeam,
      awayTeam,
      competition,
      stadium,
      season
    };
  }

  // Match detail by ID
  async function getMatchDetail(id) {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('match_detail', { id }, 'GET');
        if (res.status === 'success' && res.data) {
          return { success: true, data: res.data };
        }
      } catch (err) {
        console.warn('GAS fetch failed:', err.message);
      }
    }

    const db = getLocalDb();
    const match = db.matches.find(m => m.id === id);
    if (!match) {
      return { success: false, message: 'Pertandingan tidak ditemukan' };
    }
    return { success: true, data: enrichMatchData(match, db) };
  }

  // Calculate Statistics (W-D-L, GF, GA, GD, Points, Winrate)
  async function getStatistics(seasonId = null) {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('statistics', { season_id: seasonId }, 'GET');
        if (res.status === 'success' && res.data) {
          return { success: true, data: res.data };
        }
      } catch (err) {
        console.warn('GAS statistics failed, computing locally:', err);
      }
    }

    const db = getLocalDb();
    let matches = db.matches.filter(m => m.status === 'FINISHED');
    if (seasonId) {
      matches = matches.filter(m => m.season_id === seasonId);
    }

    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let cleanSheets = 0;

    matches.forEach(m => {
      const isHome = m.home_team_id === 'T-001';
      const isAway = m.away_team_id === 'T-001';

      if (!isHome && !isAway) return;

      const pScore = isHome ? (m.home_score || 0) : (m.away_score || 0);
      const oScore = isHome ? (m.away_score || 0) : (m.home_score || 0);

      goalsFor += pScore;
      goalsAgainst += oScore;

      if (oScore === 0) cleanSheets++;

      if (pScore > oScore) {
        won++;
      } else if (pScore === oScore) {
        drawn++;
      } else {
        lost++;
      }
    });

    const played = won + drawn + lost;
    const points = (won * 3) + (drawn * 1);
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
    const goalDifference = goalsFor - goalsAgainst;

    return {
      success: true,
      data: {
        played,
        won,
        drawn,
        lost,
        goalsFor,
        goalsAgainst,
        goalDifference,
        points,
        winRate,
        cleanSheets
      }
    };
  }

  // Get Teams
  async function getTeams() {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('teams', {}, 'GET');
        if (res.status === 'success' && res.data) return { success: true, data: res.data };
      } catch (e) {
        console.warn('Teams GAS failed, local fallback:', e);
      }
    }
    const db = getLocalDb();
    return { success: true, data: db.teams };
  }

  // Get Competitions
  async function getCompetitions() {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('competitions', {}, 'GET');
        if (res.status === 'success' && res.data) return { success: true, data: res.data };
      } catch (e) {
        console.warn('Competitions GAS failed, local fallback:', e);
      }
    }
    const db = getLocalDb();
    return { success: true, data: db.competitions };
  }

  // Get Stadiums
  async function getStadiums() {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('stadiums', {}, 'GET');
        if (res.status === 'success' && res.data) return { success: true, data: res.data };
      } catch (e) {
        console.warn('Stadiums GAS failed, local fallback:', e);
      }
    }
    const db = getLocalDb();
    return { success: true, data: db.stadiums };
  }

  // Get Seasons
  async function getSeasons() {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('seasons', {}, 'GET');
        if (res.status === 'success' && res.data) return { success: true, data: res.data };
      } catch (e) {
        console.warn('Seasons GAS failed, local fallback:', e);
      }
    }
    const db = getLocalDb();
    return { success: true, data: db.seasons };
  }

  // Admin Login
  async function login(username, password) {
    const inputHash = await sha256(password);

    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('login', { username, password_hash: inputHash }, 'POST');
        if (res.status === 'success' && res.token) {
          sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, res.token);
          sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(res.user));
          return { success: true, user: res.user, token: res.token };
        } else {
          return { success: false, message: res.message || 'Login gagal' };
        }
      } catch (e) {
        console.warn('Remote login failed, testing local:', e);
      }
    }

    const db = getLocalDb();
    const user = db.users.find(u => u.username === username);

    // Verify against SHA-256 hash only
    if (user && user.password_hash === inputHash) {
      const token = 'LOCAL_AUTH_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
      const sessionUser = { id: user.id, username: user.username, role: user.role };
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
      sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_USER, JSON.stringify(sessionUser));
      return { success: true, user: sessionUser, token };
    }

    return { success: false, message: 'Username atau password tidak sesuai.' };
  }

  function logout() {
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_USER);
  }

  function getAuthUser() {
    try {
      const u = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_USER);
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  function isAuthenticated() {
    return !!sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
  }

  // Create Match
  async function createMatch(matchData) {
    if (CONFIG.GAS_API_URL) {
      try {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const res = await callGas('create_match', { match: matchData, token }, 'POST');
        if (res.status === 'success') return { success: true, match: res.data };
      } catch (e) {
        console.warn('GAS create_match failed:', e);
      }
    }

    const db = getLocalDb();
    const id = 'MATCH-' + String(db.matches.length + 1).padStart(3, '0') + '-' + Math.random().toString(36).substring(2, 5);
    const newMatch = {
      id,
      external_match_id: matchData.external_match_id || ('MANUAL-' + Date.now()),
      home_team_id: matchData.home_team_id,
      away_team_id: matchData.away_team_id,
      competition_id: matchData.competition_id,
      season_id: matchData.season_id || 'SEAS-2024-2025',
      stadium_id: matchData.stadium_id,
      match_date: matchData.match_date,
      match_time: matchData.match_time,
      home_score: matchData.home_score !== '' && matchData.home_score !== null ? Number(matchData.home_score) : null,
      away_score: matchData.away_score !== '' && matchData.away_score !== null ? Number(matchData.away_score) : null,
      status: matchData.status || 'SCHEDULED',
      data_source: 'Manual Input',
      referee: matchData.referee || '-',
      broadcast: matchData.broadcast || '-',
      notes: matchData.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    db.matches.push(newMatch);
    saveLocalDb(db);
    return { success: true, match: newMatch };
  }

  // Update Match
  async function updateMatch(matchId, matchData) {
    if (CONFIG.GAS_API_URL) {
      try {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const res = await callGas('update_match', { id: matchId, match: matchData, token }, 'POST');
        if (res.status === 'success') return { success: true, match: res.data };
      } catch (e) {
        console.warn('GAS update_match failed:', e);
      }
    }

    const db = getLocalDb();
    const index = db.matches.findIndex(m => m.id === matchId);
    if (index === -1) {
      return { success: false, message: 'Pertandingan tidak ditemukan' };
    }

    const existing = db.matches[index];
    db.matches[index] = {
      ...existing,
      ...matchData,
      id: existing.id,
      home_score: matchData.home_score !== '' && matchData.home_score !== null ? Number(matchData.home_score) : null,
      away_score: matchData.away_score !== '' && matchData.away_score !== null ? Number(matchData.away_score) : null,
      updated_at: new Date().toISOString()
    };
    saveLocalDb(db);
    return { success: true, match: db.matches[index] };
  }

  // Quick Score & Status Updater
  async function updateScore(matchId, homeScore, awayScore, status) {
    return updateMatch(matchId, {
      home_score: homeScore,
      away_score: awayScore,
      status: status || 'FINISHED'
    });
  }

  // Delete Match
  async function deleteMatch(matchId) {
    if (CONFIG.GAS_API_URL) {
      try {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const res = await callGas('delete_match', { id: matchId, token }, 'POST');
        if (res.status === 'success') return { success: true };
      } catch (e) {
        console.warn('GAS delete_match failed:', e);
      }
    }

    const db = getLocalDb();
    const initialLen = db.matches.length;
    db.matches = db.matches.filter(m => m.id !== matchId);
    if (db.matches.length === initialLen) {
      return { success: false, message: 'Pertandingan tidak ditemukan' };
    }
    saveLocalDb(db);
    return { success: true };
  }

  // Teams CRUD
  async function createTeam(teamData) {
    const db = getLocalDb();
    const id = 'T-' + String(db.teams.length + 1).padStart(3, '0');
    const newTeam = {
      id,
      name: teamData.name,
      code: teamData.code || teamData.name.substring(0, 4).toUpperCase(),
      logo: teamData.logo || 'https://placehold.co/100x100/002B7F/ffffff?text=' + encodeURIComponent(teamData.name.substring(0, 3)),
      is_persib: false,
      created_at: new Date().toISOString()
    };
    db.teams.push(newTeam);
    saveLocalDb(db);
    return { success: true, data: newTeam };
  }

  async function updateTeam(teamId, teamData) {
    const db = getLocalDb();
    const index = db.teams.findIndex(t => t.id === teamId);
    if (index === -1) return { success: false, message: 'Tim tidak ditemukan' };
    db.teams[index] = { ...db.teams[index], ...teamData, updated_at: new Date().toISOString() };
    saveLocalDb(db);
    return { success: true, data: db.teams[index] };
  }

  async function deleteTeam(teamId) {
    const db = getLocalDb();
    db.teams = db.teams.filter(t => t.id !== teamId);
    saveLocalDb(db);
    return { success: true };
  }

  // Stadiums CRUD
  async function createStadium(stadiumData) {
    const db = getLocalDb();
    const id = 'STD-' + String(db.stadiums.length + 1).padStart(2, '0');
    const item = { id, name: stadiumData.name, city: stadiumData.city, created_at: new Date().toISOString() };
    db.stadiums.push(item);
    saveLocalDb(db);
    return { success: true, data: item };
  }

  async function updateStadium(stadiumId, stadiumData) {
    const db = getLocalDb();
    const index = db.stadiums.findIndex(s => s.id === stadiumId);
    if (index === -1) return { success: false, message: 'Stadion tidak ditemukan' };
    db.stadiums[index] = { ...db.stadiums[index], ...stadiumData, updated_at: new Date().toISOString() };
    saveLocalDb(db);
    return { success: true, data: db.stadiums[index] };
  }

  async function deleteStadium(stadiumId) {
    const db = getLocalDb();
    db.stadiums = db.stadiums.filter(s => s.id !== stadiumId);
    saveLocalDb(db);
    return { success: true };
  }

  // Competitions CRUD
  async function createCompetition(compData) {
    const db = getLocalDb();
    const id = 'COMP-' + String(db.competitions.length + 1).padStart(2, '0');
    const item = { id, name: compData.name, code: compData.code, logo: compData.logo, created_at: new Date().toISOString() };
    db.competitions.push(item);
    saveLocalDb(db);
    return { success: true, data: item };
  }

  // Football API Sync & Settings
  async function getApiSettings() {
    const db = getLocalDb();
    return { success: true, data: db.api_settings[0] || {} };
  }

  async function updateApiSettings(settings) {
    const db = getLocalDb();
    db.api_settings[0] = {
      ...db.api_settings[0],
      ...settings,
      updated_at: new Date().toISOString()
    };
    saveLocalDb(db);
    return { success: true, data: db.api_settings[0] };
  }

  async function getSyncLogs() {
    if (CONFIG.GAS_API_URL) {
      try {
        const res = await callGas('sync_logs', {}, 'GET');
        if (res.status === 'success' && res.data) return { success: true, data: res.data };
      } catch (e) {
        console.warn('Sync logs GAS failed:', e);
      }
    }
    const db = getLocalDb();
    return { success: true, data: db.sync_logs };
  }

  // Run Manual Sync with Football API
  async function triggerSync() {
    if (CONFIG.GAS_API_URL) {
      try {
        const token = sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        const res = await callGas('sync', { token }, 'POST');
        if (res.status === 'success') {
          return { success: true, message: res.message, records_processed: res.records_processed };
        }
      } catch (e) {
        console.warn('Remote sync failed, running simulated sync:', e);
      }
    }

    // Simulated sync in local database
    const db = getLocalDb();

    // Check if new match can be added or updated without duplicate
    const newSyncFixture = {
      id: 'MATCH-SYNC-' + Date.now().toString().slice(-4),
      external_match_id: 'EXT-API-SYNC-L1-099',
      home_team_id: 'T-001',
      away_team_id: 'T-012', // Persik Kediri
      competition_id: 'COMP-01',
      season_id: 'SEAS-2024-2025',
      stadium_id: 'STD-01',
      match_date: makeDateString(40),
      match_time: '19:00',
      home_score: null,
      away_score: null,
      status: 'SCHEDULED',
      data_source: 'Football API',
      referee: 'TBD',
      broadcast: 'Indosiar',
      notes: 'Jadwal pekan 28 tersinkronisasi otomatis via Football API feed.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Prevent duplicate by external_match_id
    const existingIndex = db.matches.findIndex(m => m.external_match_id === newSyncFixture.external_match_id);
    let processedCount = 0;

    if (existingIndex >= 0) {
      db.matches[existingIndex] = { ...db.matches[existingIndex], ...newSyncFixture, id: db.matches[existingIndex].id };
      processedCount = 1;
    } else {
      db.matches.push(newSyncFixture);
      processedCount = 1;
    }

    // Log the sync event
    const newLog = {
      id: 'LOG-' + Date.now().toString().slice(-6),
      sync_type: 'MANUAL_ADMIN',
      status: 'SUCCESS',
      records_processed: processedCount,
      message: `Sinkronisasi Football API selesai dengan sukses. ${processedCount} pertandingan baru diverifikasi dan diperbarui tanpa duplikasi.`,
      created_at: new Date().toISOString()
    };

    db.sync_logs.unshift(newLog);
    saveLocalDb(db);

    return {
      success: true,
      records_processed: processedCount,
      message: newLog.message
    };
  }

  // Reset database back to default initial seed
  function resetLocalDb() {
    localStorage.removeItem(CONFIG.STORAGE_KEYS.LOCAL_DB);
    return getLocalDb();
  }

  // Export all database tables as JSON (for Google Sheets migration/backup)
  function exportDatabaseAsJson() {
    return JSON.stringify(getLocalDb(), null, 2);
  }

  return {
    getMatches,
    getMatchDetail,
    getStatistics,
    getTeams,
    getCompetitions,
    getStadiums,
    getSeasons,
    login,
    logout,
    getAuthUser,
    isAuthenticated,
    createMatch,
    updateMatch,
    updateScore,
    deleteMatch,
    createTeam,
    updateTeam,
    deleteTeam,
    createStadium,
    updateStadium,
    deleteStadium,
    createCompetition,
    getApiSettings,
    updateApiSettings,
    getSyncLogs,
    triggerSync,
    resetLocalDb,
    exportDatabaseAsJson
  };
})();

// Expose globally
window.ApiService = ApiService;
