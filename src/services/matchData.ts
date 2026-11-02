/**
 * PERSIB Bandung Match Schedule & Management
 * Server-side Data Service & API Provider
 */

export interface Team {
  id: string;
  name: string;
  code?: string;
  logo: string;
  is_persib?: boolean;
}

export interface Competition {
  id: string;
  name: string;
  code?: string;
  logo: string;
}

export interface Stadium {
  id: string;
  name: string;
  city: string;
}

export interface Season {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
}

export interface RawMatch {
  id: string;
  external_match_id?: string;
  home_team_id: string;
  away_team_id: string;
  competition_id: string;
  season_id?: string;
  stadium_id?: string;
  match_date: string;
  match_time: string;
  home_score?: number | null | string;
  away_score?: number | null | string;
  status: 'SCHEDULED' | 'TIMED' | 'LIVE' | 'IN_PLAY' | 'PAUSED' | 'FINISHED' | 'POSTPONED' | 'CANCELLED' | string;
  data_source?: string;
  referee?: string;
  broadcast?: string;
  notes?: string;
  homeTeam?: Team;
  awayTeam?: Team;
  competition?: Competition;
  stadium?: Stadium;
  season?: Season;
}

export interface FormattedMatch {
  id: string;
  external_match_id?: string;
  match_date: string;
  match_time: string;
  datetime_wib: string;
  formatted_date: string;
  home_team: Team;
  away_team: Team;
  is_home_match: boolean;
  opponent: Team;
  competition: Competition;
  stadium: Stadium;
  season?: Season;
  status: string;
  status_label: string;
  score?: {
    home: number | null;
    away: number | null;
    scoreline: string;
    persib_score: number | null;
    opponent_score: number | null;
    result?: 'WIN' | 'DRAW' | 'LOSS' | null;
    result_badge?: 'Menang' | 'Seri' | 'Kalah' | null;
    points?: number;
    goal_difference?: number;
    clean_sheet?: boolean;
  };
  broadcast?: string;
  referee?: string;
  notes?: string;
  data_source?: string;
}

const DEFAULT_GAS_URL = 'https://script.google.com/macros/s/AKfycbzEROJjyEg-WLTGYzCFUx0X8S4TL_WuxAMzEyJkmOYNV2twJ_553EBRVHysoNVG9RcDMw/exec';

// High-fidelity fallback database
export const SEED_TEAMS: Team[] = [
  { id: 'T-001', name: 'PERSIB Bandung', code: 'PERSIB', logo: 'https://assets.ileague.id/uploads/images/club/lineup_PERSIB_BANDUNG_1786248601.png', is_persib: true },
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

export const SEED_COMPETITIONS: Competition[] = [
  { id: 'COMP-01', name: 'BRI Liga 1 Indonesia', code: 'LIGA1', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Liga_1_%28Indonesia%29_logo.svg/200px-Liga_1_%28Indonesia%29_logo.svg.png' },
  { id: 'COMP-02', name: 'AFC Champions League Two', code: 'ACL2', logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/AFC_Champions_League_Two_logo.svg/200px-AFC_Champions_League_Two_logo.svg.png' },
  { id: 'COMP-03', name: 'Piala Presiden', code: 'PPR', logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Piala_Presiden_logo.png/200px-Piala_Presiden_logo.png' }
];

export const SEED_STADIUMS: Stadium[] = [
  { id: 'STD-01', name: 'Stadion Gelora Bandung Lautan Api (GBLA)', city: 'Bandung' },
  { id: 'STD-02', name: 'Stadion Si Jalak Harupat', city: 'Kabupaten Bandung' },
  { id: 'STD-03', name: 'Stadion Utama Gelora Bung Karno (SUGBK)', city: 'Jakarta' },
  { id: 'STD-04', name: 'Stadion Kapten I Wayan Dipta', city: 'Gianyar, Bali' },
  { id: 'STD-05', name: 'Stadion Gelora Bung Tomo', city: 'Surabaya' },
  { id: 'STD-06', name: 'Stadion Segiri', city: 'Samarinda' },
  { id: 'STD-07', name: 'PAT Stadium', city: 'Bangkok, Thailand' },
  { id: 'STD-08', name: 'Bishan Stadium', city: 'Singapura' }
];

export const SEED_SEASONS: Season[] = [
  { id: 'SEAS-2024-2025', name: 'Musim 2024/2025', start_date: '2024-08-01', end_date: '2025-05-31' },
  { id: 'SEAS-2025-2026', name: 'Musim 2025/2026', start_date: '2025-08-01', end_date: '2026-05-31' },
  { id: 'SEAS-2026-2027', name: 'Musim 2026/2027', start_date: '2026-08-01', end_date: '2027-05-31' }
];

// In-memory cache for live matches from Google Sheets
let cachedMatches: RawMatch[] | null = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 30 * 1000; // 30 seconds TTL

export class MatchDataService {
  /**
   * Fetch raw matches from Google Apps Script Web App or fallback to seed data
   */
  static async getRawMatches(forceRefresh = false): Promise<RawMatch[]> {
    const now = Date.now();
    if (!forceRefresh && cachedMatches && now - lastCacheTime < CACHE_TTL_MS) {
      return cachedMatches;
    }

    const gasUrl = process.env.GAS_API_URL || DEFAULT_GAS_URL;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(`${gasUrl}?action=matches`, {
        signal: controller.signal,
        headers: { Accept: 'application/json' },
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const json = await response.json();
        if (json && Array.isArray(json.data) && json.data.length > 0) {
          cachedMatches = json.data;
          lastCacheTime = now;
          return cachedMatches!;
        }
      }
    } catch (err) {
      // Quietly fall back to local seed data or cached matches
      console.warn('GAS fetch failed or timed out, using cached/seed data.');
    }

    if (cachedMatches) {
      return cachedMatches;
    }

    return MatchDataService.getDefaultSeedMatches();
  }

  /**
   * Default seed matches in case GAS is unreachable
   */
  static getDefaultSeedMatches(): RawMatch[] {
    const today = new Date();
    const makeDate = (offsetDays: number) => {
      const d = new Date(today.getTime() + offsetDays * 86400000);
      return d.toISOString().split('T')[0];
    };

    return [
      {
        id: 'MATCH-001',
        external_match_id: 'EXT-L1-001',
        home_team_id: 'T-001',
        away_team_id: 'T-003',
        competition_id: 'COMP-01',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-02',
        match_date: makeDate(-25),
        match_time: '19:00',
        home_score: 2,
        away_score: 0,
        status: 'FINISHED',
        data_source: 'Football API',
        broadcast: 'Indosiar & Vidio',
        notes: 'Kemenangan kandang meyakinkan. Gol dicetak Ciro Alves dan David da Silva.'
      },
      {
        id: 'MATCH-002',
        external_match_id: 'EXT-L1-002',
        home_team_id: 'T-004',
        away_team_id: 'T-001',
        competition_id: 'COMP-01',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-05',
        match_date: makeDate(-18),
        match_time: '15:30',
        home_score: 1,
        away_score: 1,
        status: 'FINISHED',
        data_source: 'Football API',
        broadcast: 'Indosiar & Vidio',
        notes: 'Laga sengit di Surabaya berakhir imbang dengan perjuangan maksimal.'
      },
      {
        id: 'MATCH-003',
        external_match_id: 'EXT-ACL-001',
        home_team_id: 'T-001',
        away_team_id: 'T-011',
        competition_id: 'COMP-02',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-02',
        match_date: makeDate(-10),
        match_time: '20:00',
        home_score: 3,
        away_score: 1,
        status: 'FINISHED',
        data_source: 'Manual Input',
        broadcast: 'RCTI & Vision+',
        notes: 'Penyisihan grup AFC Champions League Two. Dominasi mutlak Pangeran Biru.'
      },
      {
        id: 'MATCH-004',
        external_match_id: 'EXT-L1-003',
        home_team_id: 'T-008',
        away_team_id: 'T-001',
        competition_id: 'COMP-01',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-04',
        match_date: makeDate(-4),
        match_time: '19:00',
        home_score: 1,
        away_score: 2,
        status: 'FINISHED',
        data_source: 'Football API',
        broadcast: 'Indosiar',
        notes: 'Tiga poin krusial tandang diraih berkat gol penalti di menit akhir.'
      },
      {
        id: 'MATCH-005',
        external_match_id: 'EXT-L1-004',
        home_team_id: 'T-001',
        away_team_id: 'T-002',
        competition_id: 'COMP-01',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-01',
        match_date: makeDate(3),
        match_time: '15:30',
        home_score: null,
        away_score: null,
        status: 'SCHEDULED',
        data_source: 'Football API',
        broadcast: 'Indosiar & Vidio Exclusive',
        notes: 'Super Big Match El Clasico Indonesia! Laga sarat gengsi di Stadion Gelora Bandung Lautan Api.'
      },
      {
        id: 'MATCH-006',
        external_match_id: 'EXT-ACL-002',
        home_team_id: 'T-009',
        away_team_id: 'T-001',
        competition_id: 'COMP-02',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-07',
        match_date: makeDate(9),
        match_time: '19:00',
        home_score: null,
        away_score: null,
        status: 'SCHEDULED',
        data_source: 'Football API',
        broadcast: 'RCTI & Vision+',
        notes: 'Matchday AFC Champions League Two tandang di Bangkok.'
      },
      {
        id: 'MATCH-007',
        external_match_id: 'EXT-L1-005',
        home_team_id: 'T-001',
        away_team_id: 'T-005',
        competition_id: 'COMP-01',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-01',
        match_date: makeDate(16),
        match_time: '19:00',
        home_score: null,
        away_score: null,
        status: 'SCHEDULED',
        data_source: 'Football API',
        broadcast: 'Indosiar & Vidio',
        notes: 'Duel sengit perebutan posisi papan atas klasemen Liga 1.'
      },
      {
        id: 'MATCH-008',
        external_match_id: 'EXT-L1-006',
        home_team_id: 'T-006',
        away_team_id: 'T-001',
        competition_id: 'COMP-01',
        season_id: 'SEAS-2024-2025',
        stadium_id: 'STD-06',
        match_date: makeDate(23),
        match_time: '19:00',
        home_score: null,
        away_score: null,
        status: 'SCHEDULED',
        data_source: 'Football API',
        broadcast: 'Indosiar & Vidio',
        notes: 'Laga tandang menantang ke markas Pesut Etam Samarinda.'
      }
    ];
  }

  /**
   * Enrich raw match into a full, clean formatted response
   */
  static formatMatch(m: RawMatch): FormattedMatch {
    const teamMap: Record<string, Team> = {};
    SEED_TEAMS.forEach(t => { teamMap[t.id] = t; });

    const compMap: Record<string, Competition> = {};
    SEED_COMPETITIONS.forEach(c => { compMap[c.id] = c; });

    const stdMap: Record<string, Stadium> = {};
    SEED_STADIUMS.forEach(s => { stdMap[s.id] = s; });

    const homeTeam: Team = m.homeTeam || teamMap[m.home_team_id] || {
      id: m.home_team_id,
      name: m.home_team_id === 'T-001' ? 'PERSIB Bandung' : `Tim ${m.home_team_id}`,
      logo: 'https://assets.ileague.id/uploads/images/club/lineup_PERSIB_BANDUNG_1786248601.png',
      is_persib: m.home_team_id === 'T-001'
    };

    const awayTeam: Team = m.awayTeam || teamMap[m.away_team_id] || {
      id: m.away_team_id,
      name: m.away_team_id === 'T-001' ? 'PERSIB Bandung' : `Tim ${m.away_team_id}`,
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Liga_1_%28Indonesia%29_logo.svg/200px-Liga_1_%28Indonesia%29_logo.svg.png',
      is_persib: m.away_team_id === 'T-001'
    };

    const competition: Competition = m.competition || compMap[m.competition_id] || {
      id: m.competition_id || 'COMP-01',
      name: 'BRI Liga 1 Indonesia',
      code: 'LIGA1',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Liga_1_%28Indonesia%29_logo.svg/200px-Liga_1_%28Indonesia%29_logo.svg.png'
    };

    const stadium: Stadium = m.stadium || stdMap[m.stadium_id || 'STD-01'] || {
      id: m.stadium_id || 'STD-01',
      name: 'Stadion Gelora Bandung Lautan Api (GBLA)',
      city: 'Bandung'
    };

    // Clean match time (ensure HH:mm format without 1899 spreadsheet dates)
    let cleanTime = '19:00';
    if (m.match_time) {
      const timeStr = String(m.match_time).trim();
      if (timeStr.includes('T')) {
        const parts = timeStr.split('T')[1];
        cleanTime = parts ? parts.substring(0, 5) : '19:00';
      } else if (timeStr.length >= 5) {
        cleanTime = timeStr.substring(0, 5);
      } else {
        cleanTime = timeStr;
      }
    }

    // Clean match date
    let cleanDate = String(m.match_date || '').trim();
    if (cleanDate.includes('T')) {
      cleanDate = cleanDate.split('T')[0];
    }

    const datetimeWib = `${cleanDate}T${cleanTime}:00+07:00`;

    // Indonesian day and month names
    const daysIndo = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const monthsIndo = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    let formattedDate = cleanDate;
    try {
      const [year, month, day] = cleanDate.split('-').map(Number);
      if (year && month && day) {
        const dt = new Date(year, month - 1, day);
        const dayName = daysIndo[dt.getDay()];
        const monthName = monthsIndo[month - 1];
        formattedDate = `${dayName}, ${day} ${monthName} ${year}`;
      }
    } catch {
      formattedDate = cleanDate;
    }

    const isHome = Boolean(m.home_team_id === 'T-001' || (homeTeam.name && homeTeam.name.toUpperCase().includes('PERSIB')));
    const opponent = isHome ? awayTeam : homeTeam;

    // Status label in Bahasa Indonesia
    const statusMap: Record<string, string> = {
      SCHEDULED: 'Terjadwal',
      TIMED: 'Terjadwal',
      LIVE: 'Sedang Berlangsung',
      IN_PLAY: 'Sedang Berlangsung',
      PAUSED: 'Jeda Babak',
      FINISHED: 'Selesai',
      POSTPONED: 'Ditunda',
      CANCELLED: 'Dibatalkan'
    };

    const statusLabel = statusMap[m.status] || m.status;

    // Calculate score details if match has scores or is finished
    const hasScore = m.home_score !== null && m.home_score !== undefined && m.home_score !== '' &&
                     m.away_score !== null && m.away_score !== undefined && m.away_score !== '';

    let scoreObj: FormattedMatch['score'] = undefined;

    if (hasScore || m.status === 'FINISHED') {
      const hScore = Number(m.home_score ?? 0);
      const aScore = Number(m.away_score ?? 0);
      const persibScore = isHome ? hScore : aScore;
      const oppScore = isHome ? aScore : hScore;

      let result: 'WIN' | 'DRAW' | 'LOSS' = 'DRAW';
      let resultBadge: 'Menang' | 'Seri' | 'Kalah' = 'Seri';
      let points = 1;

      if (persibScore > oppScore) {
        result = 'WIN';
        resultBadge = 'Menang';
        points = 3;
      } else if (persibScore < oppScore) {
        result = 'LOSS';
        resultBadge = 'Kalah';
        points = 0;
      }

      scoreObj = {
        home: hScore,
        away: aScore,
        scoreline: `${hScore} - ${aScore}`,
        persib_score: persibScore,
        opponent_score: oppScore,
        result,
        result_badge: resultBadge,
        points,
        goal_difference: persibScore - oppScore,
        clean_sheet: oppScore === 0
      };
    }

    return {
      id: m.id,
      external_match_id: m.external_match_id,
      match_date: cleanDate,
      match_time: cleanTime,
      datetime_wib: datetimeWib,
      formatted_date: formattedDate,
      home_team: homeTeam,
      away_team: awayTeam,
      is_home_match: isHome,
      opponent,
      competition,
      stadium,
      season: m.season,
      status: m.status,
      status_label: statusLabel,
      score: scoreObj,
      broadcast: m.broadcast || 'Indosiar & Vidio',
      referee: m.referee,
      notes: m.notes,
      data_source: m.data_source || 'Google Sheets'
    };
  }

  /**
   * Get all matches with optional filters
   */
  static async getAllMatches(filters: {
    status?: string;
    competition_id?: string;
    season_id?: string;
    search?: string;
    limit?: number;
    sort?: 'asc' | 'desc';
  } = {}): Promise<FormattedMatch[]> {
    const rawMatches = await MatchDataService.getRawMatches();
    let formatted = rawMatches.map(m => MatchDataService.formatMatch(m));

    if (filters.status) {
      const st = filters.status.toUpperCase();
      if (st === 'UPCOMING' || st === 'SCHEDULED') {
        formatted = formatted.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED');
      } else if (st === 'RESULTS' || st === 'FINISHED') {
        formatted = formatted.filter(m => m.status === 'FINISHED');
      } else if (st === 'LIVE') {
        formatted = formatted.filter(m => ['LIVE', 'IN_PLAY', 'PAUSED'].includes(m.status));
      } else {
        formatted = formatted.filter(m => m.status === st);
      }
    }

    if (filters.competition_id && filters.competition_id !== 'all') {
      formatted = formatted.filter(m => m.competition.id === filters.competition_id || m.competition.code === filters.competition_id);
    }

    if (filters.search && filters.search.trim() !== '') {
      const q = filters.search.toLowerCase().trim();
      formatted = formatted.filter(m =>
        m.opponent.name.toLowerCase().includes(q) ||
        m.home_team.name.toLowerCase().includes(q) ||
        m.away_team.name.toLowerCase().includes(q) ||
        m.stadium.name.toLowerCase().includes(q) ||
        m.competition.name.toLowerCase().includes(q) ||
        (m.notes && m.notes.toLowerCase().includes(q))
      );
    }

    // Sort order
    const isDesc = filters.sort === 'desc';
    formatted.sort((a, b) => {
      const keyA = `${a.match_date} ${a.match_time}`;
      const keyB = `${b.match_date} ${b.match_time}`;
      return isDesc ? (keyB.localeCompare(keyA)) : (keyA.localeCompare(keyB));
    });

    if (filters.limit && filters.limit > 0) {
      formatted = formatted.slice(0, filters.limit);
    }

    return formatted;
  }

  /**
   * Get upcoming schedule (Jadwal Pertandingan)
   */
  static async getSchedule(filters: { competition_id?: string; limit?: number; search?: string } = {}): Promise<any[]> {
    const upcoming = await MatchDataService.getAllMatches({
      status: 'SCHEDULED',
      competition_id: filters.competition_id,
      search: filters.search,
      limit: filters.limit,
      sort: 'asc'
    });

    const now = new Date();

    return upcoming.map(m => {
      // Calculate days until kickoff
      let daysUntil: number | null = null;
      let countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, is_past: false };

      try {
        const [y, mo, d] = m.match_date.split('-').map(Number);
        const [h, mi] = m.match_time.split(':').map(Number);
        // WIB is UTC+7
        const matchTimeUtc = Date.UTC(y, mo - 1, d, (h || 19) - 7, mi || 0, 0);
        const diff = matchTimeUtc - now.getTime();

        if (diff > 0) {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((diff % (1000 * 60)) / 1000);
          daysUntil = days;
          countdown = { days, hours, minutes, seconds, is_past: false };
        } else {
          countdown = { days: 0, hours: 0, minutes: 0, seconds: 0, is_past: true };
        }
      } catch {
        // Ignore date parsing failure
      }

      return {
        id: m.id,
        external_match_id: m.external_match_id,
        match_date: m.match_date,
        match_time: m.match_time,
        timezone: 'Asia/Jakarta (WIB)',
        datetime_wib: m.datetime_wib,
        formatted_date: m.formatted_date,
        match_type: m.is_home_match ? 'HOME' : 'AWAY',
        home_team: m.home_team,
        away_team: m.away_team,
        opponent: m.opponent,
        competition: m.competition,
        stadium: m.stadium,
        broadcast: m.broadcast,
        referee: m.referee,
        status: m.status,
        status_label: m.status_label,
        days_until: daysUntil,
        countdown,
        notes: m.notes
      };
    });
  }

  /**
   * Get finished match scores (Skor dan Hasil Pertandingan Selesai)
   */
  static async getScores(filters: { competition_id?: string; limit?: number; search?: string } = {}): Promise<any[]> {
    const finished = await MatchDataService.getAllMatches({
      status: 'FINISHED',
      competition_id: filters.competition_id,
      search: filters.search,
      limit: filters.limit,
      sort: 'desc'
    });

    return finished.map(m => ({
      id: m.id,
      external_match_id: m.external_match_id,
      match_date: m.match_date,
      match_time: m.match_time,
      timezone: 'Asia/Jakarta (WIB)',
      datetime_wib: m.datetime_wib,
      formatted_date: m.formatted_date,
      match_type: m.is_home_match ? 'HOME' : 'AWAY',
      home_team: m.home_team,
      away_team: m.away_team,
      opponent: m.opponent,
      score: {
        home: m.score?.home ?? 0,
        away: m.score?.away ?? 0,
        scoreline: m.score?.scoreline ?? '0 - 0',
        persib_score: m.score?.persib_score ?? 0,
        opponent_score: m.score?.opponent_score ?? 0,
        result: m.score?.result ?? 'DRAW',
        result_badge: m.score?.result_badge ?? 'Seri',
        points_earned: m.score?.points ?? 1,
        goal_difference: m.score?.goal_difference ?? 0,
        clean_sheet: m.score?.clean_sheet ?? false
      },
      competition: m.competition,
      stadium: m.stadium,
      broadcast: m.broadcast,
      notes: m.notes
    }));
  }

  /**
   * Get Next Match (Pertandingan Terdekat)
   */
  static async getNextMatch(): Promise<any> {
    const upcoming = await MatchDataService.getSchedule({ limit: 1 });
    if (!upcoming || upcoming.length === 0) {
      return {
        has_match: false,
        message: 'Belum ada jadwal pertandingan PERSIB mendatang yang terdaftar.'
      };
    }

    return {
      has_match: true,
      match: upcoming[0]
    };
  }

  /**
   * Get Performance Statistics for PERSIB Bandung
   */
  static async getStatistics(): Promise<any> {
    const rawMatches = await MatchDataService.getRawMatches();
    const formatted = rawMatches.map(m => MatchDataService.formatMatch(m));
    const finished = formatted.filter(m => m.status === 'FINISHED' && m.score);

    let won = 0;
    let drawn = 0;
    let lost = 0;
    let goalsFor = 0;
    let goalsAgainst = 0;
    let cleanSheets = 0;

    let homeWon = 0;
    let homeDrawn = 0;
    let homeLost = 0;
    let homeGF = 0;
    let homeGA = 0;

    let awayWon = 0;
    let awayDrawn = 0;
    let awayLost = 0;
    let awayGF = 0;
    let awayGA = 0;

    // Sort by date ascending to compute form
    const sortedFinished = [...finished].sort((a, b) => `${a.match_date} ${a.match_time}`.localeCompare(`${b.match_date} ${b.match_time}`));

    const form: Array<'W' | 'D' | 'L'> = [];

    sortedFinished.forEach(m => {
      const s = m.score!;
      goalsFor += s.persib_score ?? 0;
      goalsAgainst += s.opponent_score ?? 0;

      if (s.clean_sheet) cleanSheets++;

      if (s.result === 'WIN') {
        won++;
        form.push('W');
      } else if (s.result === 'DRAW') {
        drawn++;
        form.push('D');
      } else {
        lost++;
        form.push('L');
      }

      if (m.is_home_match) {
        homeGF += s.persib_score ?? 0;
        homeGA += s.opponent_score ?? 0;
        if (s.result === 'WIN') homeWon++;
        else if (s.result === 'DRAW') homeDrawn++;
        else homeLost++;
      } else {
        awayGF += s.persib_score ?? 0;
        awayGA += s.opponent_score ?? 0;
        if (s.result === 'WIN') awayWon++;
        else if (s.result === 'DRAW') awayDrawn++;
        else awayLost++;
      }
    });

    const played = finished.length;
    const points = (won * 3) + (drawn * 1);
    const winRate = played > 0 ? Math.round((won / played) * 100) : 0;
    const recentForm = form.slice(-5); // last 5 results

    return {
      club: 'PERSIB Bandung',
      season: '2024/2025 & 2026/2027',
      summary: {
        played,
        won,
        drawn,
        lost,
        points,
        win_rate_percent: winRate,
        goals_for: goalsFor,
        goals_against: goalsAgainst,
        goal_difference: goalsFor - goalsAgainst,
        clean_sheets: cleanSheets
      },
      home_record: {
        played: homeWon + homeDrawn + homeLost,
        won: homeWon,
        drawn: homeDrawn,
        lost: homeLost,
        goals_for: homeGF,
        goals_against: homeGA
      },
      away_record: {
        played: awayWon + awayDrawn + awayLost,
        won: awayWon,
        drawn: awayDrawn,
        lost: awayLost,
        goals_for: awayGF,
        goals_against: awayGA
      },
      recent_form: recentForm,
      form_display: recentForm.join('-')
    };
  }

  /**
   * Get single match by ID
   */
  static async getMatchById(id: string): Promise<FormattedMatch | null> {
    const rawMatches = await MatchDataService.getRawMatches();
    const found = rawMatches.find(m => m.id === id || m.external_match_id === id);
    if (!found) return null;
    return MatchDataService.formatMatch(found);
  }
}
