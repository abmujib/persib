/**
 * PERSIB Bandung Match Schedule & Management
 * Full-stack Express Backend Server with Vite Middleware
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MatchDataService,
  SEED_TEAMS,
  SEED_COMPETITIONS,
  SEED_STADIUMS,
  SEED_SEASONS
} from './src/services/matchData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const HOST = '0.0.0.0';
  const isProduction = process.env.NODE_ENV === 'production';

  // Middleware
  app.use(express.json());

  // Universal CORS & Security Headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // =========================================================================
  // RESTful JSON API Router (/api/v1/)
  // =========================================================================
  const apiV1Router = express.Router();

  // Helper meta response
  const sendSuccess = (res: Response, data: any, extraMeta: Record<string, any> = {}) => {
    return res.status(200).json({
      status: 'success',
      meta: {
        api_version: '1.0.0',
        club: 'PERSIB Bandung',
        timezone: 'Asia/Jakarta (WIB)',
        generated_at: new Date().toISOString(),
        ...extraMeta
      },
      data
    });
  };

  /**
   * GET /api/v1/
   * API Overview and Endpoint Directory
   */
  apiV1Router.get('/', (req: Request, res: Response) => {
    const protocol = req.protocol;
    const host = req.get('host') || `localhost:${PORT}`;
    const baseUrl = `${protocol}://${host}/api/v1`;

    return res.status(200).json({
      status: 'success',
      api: {
        name: 'PERSIB Bandung Match Schedule & Scores JSON API',
        version: '1.0.0',
        club: 'PERSIB Bandung',
        nickname: 'Maung Bandung / Pangeran Biru',
        established: 1933,
        timezone: 'Asia/Jakarta (WIB)',
        documentation: 'RESTful API untuk konsumsi jadwal, skor, statistik, dan pertandingan PERSIB Bandung.'
      },
      endpoints: {
        all_matches: {
          url: `${baseUrl}/matches`,
          method: 'GET',
          description: 'Seluruh data pertandingan (mendatang dan selesai)',
          query_parameters: {
            status: 'Filter status (SCHEDULED, FINISHED, LIVE, CANCELLED)',
            competition: 'Filter berdasarkan ID kompetisi (e.g. COMP-01)',
            search: 'Pencarian nama lawan, stadion, atau catatan',
            limit: 'Jumlah data maksimal yang ditampilkan',
            sort: 'Urutan tanggal (asc atau desc)'
          }
        },
        schedule: {
          url: `${baseUrl}/schedule`,
          method: 'GET',
          description: 'Jadwal pertandingan mendatang PERSIB Bandung beserta countdown waktu WIB'
        },
        scores: {
          url: `${baseUrl}/scores`,
          method: 'GET',
          description: 'Hasil dan skor pertandingan PERSIB Bandung yang telah selesai'
        },
        next_match: {
          url: `${baseUrl}/next-match`,
          method: 'GET',
          description: 'Pertandingan terdekat berikutnya yang akan dihadapi PERSIB beserta countdown waktu'
        },
        live_matches: {
          url: `${baseUrl}/matches/live`,
          method: 'GET',
          description: 'Pertandingan yang saat ini sedang berlangsung'
        },
        single_match: {
          url: `${baseUrl}/matches/:id`,
          method: 'GET',
          description: 'Detail satu pertandingan berdasarkan ID (e.g. MATCH-001)'
        },
        statistics: {
          url: `${baseUrl}/stats`,
          method: 'GET',
          description: 'Statistik performa PERSIB (Main, Menang, Seri, Kalah, Gol GF:GA, Poin, Form)'
        },
        teams: {
          url: `${baseUrl}/teams`,
          method: 'GET',
          description: 'Daftar klub sepak bola dan lawan'
        },
        competitions: {
          url: `${baseUrl}/competitions`,
          method: 'GET',
          description: 'Daftar kompetisi resmi (Liga 1, ACL Two, dll)'
        },
        stadiums: {
          url: `${baseUrl}/stadiums`,
          method: 'GET',
          description: 'Daftar stadion dan kota lokasi pertandingan'
        }
      }
    });
  });

  /**
   * GET /api/v1/matches
   * All matches with optional filtering and sorting
   */
  apiV1Router.get('/matches', async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string;
      const competition_id = (req.query.competition || req.query.competition_id) as string;
      const search = req.query.search as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
      const sort = req.query.sort === 'desc' ? 'desc' : 'asc';

      const matches = await MatchDataService.getAllMatches({
        status,
        competition_id,
        search,
        limit,
        sort
      });

      return sendSuccess(res, matches, {
        total: matches.length,
        filters: {
          status: status || 'all',
          competition: competition_id || 'all',
          search: search || null,
          sort
        }
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat pertandingan' });
    }
  });

  /**
   * GET /api/v1/schedule OR GET /api/v1/matches/upcoming
   * Upcoming match schedule
   */
  const handleScheduleRequest = async (req: Request, res: Response) => {
    try {
      const competition_id = (req.query.competition || req.query.competition_id) as string;
      const search = req.query.search as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const schedule = await MatchDataService.getSchedule({
        competition_id,
        search,
        limit
      });

      return sendSuccess(res, schedule, {
        total_upcoming: schedule.length,
        type: 'SCHEDULED_FIXTURES'
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat jadwal' });
    }
  };

  apiV1Router.get('/schedule', handleScheduleRequest);
  apiV1Router.get('/matches/upcoming', handleScheduleRequest);

  /**
   * GET /api/v1/scores OR GET /api/v1/matches/results
   * Completed match results and scores
   */
  const handleScoresRequest = async (req: Request, res: Response) => {
    try {
      const competition_id = (req.query.competition || req.query.competition_id) as string;
      const search = req.query.search as string;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;

      const scores = await MatchDataService.getScores({
        competition_id,
        search,
        limit
      });

      return sendSuccess(res, scores, {
        total_completed: scores.length,
        type: 'FINISHED_SCORES'
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat skor' });
    }
  };

  apiV1Router.get('/scores', handleScoresRequest);
  apiV1Router.get('/matches/results', handleScoresRequest);

  /**
   * GET /api/v1/next-match
   * Nearest upcoming match with real-time countdown
   */
  apiV1Router.get('/next-match', async (req: Request, res: Response) => {
    try {
      const nextMatchResult = await MatchDataService.getNextMatch();
      return sendSuccess(res, nextMatchResult);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat next match' });
    }
  });

  /**
   * GET /api/v1/matches/live
   * Live in-play matches
   */
  apiV1Router.get('/matches/live', async (req: Request, res: Response) => {
    try {
      const liveMatches = await MatchDataService.getAllMatches({ status: 'LIVE' });
      return sendSuccess(res, liveMatches, {
        is_live_active: liveMatches.length > 0,
        total_live: liveMatches.length
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat live matches' });
    }
  });

  /**
   * GET /api/v1/stats
   * Statistics and performance overview
   */
  apiV1Router.get('/stats', async (req: Request, res: Response) => {
    try {
      const stats = await MatchDataService.getStatistics();
      return sendSuccess(res, stats);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal memuat statistik' });
    }
  });

  /**
   * GET /api/v1/teams
   * List of teams
   */
  apiV1Router.get('/teams', (req: Request, res: Response) => {
    return sendSuccess(res, SEED_TEAMS, { total: SEED_TEAMS.length });
  });

  /**
   * GET /api/v1/competitions
   * List of competitions
   */
  apiV1Router.get('/competitions', (req: Request, res: Response) => {
    return sendSuccess(res, SEED_COMPETITIONS, { total: SEED_COMPETITIONS.length });
  });

  /**
   * GET /api/v1/stadiums
   * List of stadiums
   */
  apiV1Router.get('/stadiums', (req: Request, res: Response) => {
    return sendSuccess(res, SEED_STADIUMS, { total: SEED_STADIUMS.length });
  });

  /**
   * GET /api/v1/matches/:id
   * Single match detail
   */
  apiV1Router.get('/matches/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const match = await MatchDataService.getMatchById(id);
      if (!match) {
        return res.status(404).json({
          status: 'error',
          message: `Pertandingan dengan ID "${id}" tidak ditemukan`
        });
      }
      return sendSuccess(res, match);
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message || 'Gagal mengambil detail' });
    }
  });

  /**
   * POST /api/v1/refresh
   * Force refresh cache from Google Apps Script
   */
  apiV1Router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const refreshedMatches = await MatchDataService.getRawMatches(true);
      return sendSuccess(res, {
        refreshed: true,
        total_records: refreshedMatches.length
      });
    } catch (err: any) {
      return res.status(500).json({ status: 'error', message: err.message });
    }
  });

  // Mount API router under /api/v1
  app.use('/api/v1', apiV1Router);

  // Fallback for root /api route
  app.get('/api', (req: Request, res: Response) => {
    res.redirect('/api/v1');
  });

  // =========================================================================
  // Frontend Serving (Vite dev middlewares or Production static)
  // =========================================================================
  if (isProduction) {
    // Production: serve built static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));

    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development: mount Vite middlewares
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  }

  // Start listening
  app.listen(PORT, HOST, () => {
    console.log(`[PERSIB App] Server running at http://${HOST}:${PORT}`);
    console.log(`[PERSIB App] JSON API available at http://${HOST}:${PORT}/api/v1/`);
    console.log(`[PERSIB App] Schedule: http://${HOST}:${PORT}/api/v1/schedule`);
    console.log(`[PERSIB App] Scores: http://${HOST}:${PORT}/api/v1/scores`);
  });
}

startServer().catch(err => {
  console.error('[PERSIB App] Server startup error:', err);
  process.exit(1);
});
