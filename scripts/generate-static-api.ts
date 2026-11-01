import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  MatchDataService,
  SEED_TEAMS,
  SEED_COMPETITIONS,
  SEED_STADIUMS
} from '../src/services/matchData.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateStaticApi() {
  console.log('[Static API Generator] Fetching latest match data for static export...');

  const publicApiDir = path.resolve(__dirname, '../public/api/v1');
  if (!fs.existsSync(publicApiDir)) {
    fs.mkdirSync(publicApiDir, { recursive: true });
  }

  const sendFormat = (data: any, extraMeta = {}) => JSON.stringify({
    status: 'success',
    meta: {
      api_version: '1.0.0',
      club: 'PERSIB Bandung',
      timezone: 'Asia/Jakarta (WIB)',
      generated_at: new Date().toISOString(),
      ...extraMeta
    },
    data
  }, null, 2);

  const saveEndpoint = (endpointName: string, jsonContent: string) => {
    // 1. Save as filename.json (e.g., matches.json)
    fs.writeFileSync(path.join(publicApiDir, `${endpointName}.json`), jsonContent);

    // 2. Save inside subdirectory folder /endpointName/index.json (for domain.com/api/v1/matches/ access on GitHub Pages)
    const subDir = path.join(publicApiDir, endpointName);
    if (!fs.existsSync(subDir)) {
      fs.mkdirSync(subDir, { recursive: true });
    }
    fs.writeFileSync(path.join(subDir, 'index.json'), jsonContent);
  };

  try {
    const matches = await MatchDataService.getAllMatches();
    const schedule = await MatchDataService.getSchedule();
    const scores = await MatchDataService.getScores();
    const nextMatch = await MatchDataService.getNextMatch();
    const stats = await MatchDataService.getStatistics();

    const apiOverview = JSON.stringify({
      status: 'success',
      api: {
        name: 'PERSIB Bandung Match Schedule & Scores JSON API',
        version: '1.0.0',
        club: 'PERSIB Bandung',
        timezone: 'Asia/Jakarta (WIB)',
        documentation: 'RESTful API Publik untuk data jadwal, skor, statistik PERSIB Bandung.'
      },
      endpoints: [
        { path: '/api/v1/schedule.json', description: 'Jadwal pertandingan mendatang' },
        { path: '/api/v1/scores.json', description: 'Hasil skor pertandingan selesai' },
        { path: '/api/v1/next-match.json', description: 'Pertandingan terdekat' },
        { path: '/api/v1/matches.json', description: 'Semua pertandingan' },
        { path: '/api/v1/stats.json', description: 'Statistik musim klub' },
        { path: '/api/v1/teams.json', description: 'Daftar tim lawan' },
        { path: '/api/v1/competitions.json', description: 'Daftar kompetisi' },
        { path: '/api/v1/stadiums.json', description: 'Daftar stadion' }
      ]
    }, null, 2);
    fs.writeFileSync(path.join(publicApiDir, 'index.json'), apiOverview);

    saveEndpoint('matches', sendFormat(matches, { total: matches.length }));
    saveEndpoint('schedule', sendFormat(schedule, { total_upcoming: schedule.length }));
    saveEndpoint('scores', sendFormat(scores, { total_completed: scores.length }));
    saveEndpoint('next-match', sendFormat(nextMatch));
    saveEndpoint('stats', sendFormat(stats));
    saveEndpoint('teams', sendFormat(SEED_TEAMS, { total: SEED_TEAMS.length }));
    saveEndpoint('competitions', sendFormat(SEED_COMPETITIONS, { total: SEED_COMPETITIONS.length }));
    saveEndpoint('stadiums', sendFormat(SEED_STADIUMS, { total: SEED_STADIUMS.length }));

    console.log('[Static API Generator] Successfully generated static JSON files for both static hosts and Node servers!');
  } catch (err) {
    console.error('[Static API Generator] Error generating static API:', err);
  }
}

generateStaticApi();
