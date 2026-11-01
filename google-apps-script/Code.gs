/**
 * ============================================================================
 * PERSIB BANDUNG MATCH SCHEDULE & MANAGEMENT
 * Backend Web App API (Google Apps Script)
 * ============================================================================
 * 
 * Petunjuk Instalasi:
 * 1. Buka Google Sheets baru di https://sheets.new
 * 2. Masuk ke Extensions > Apps Script
 * 3. Salin seluruh isi file Code.gs ini ke dalam editor Apps Script
 * 4. Tambahkan file setup-database.gs, import-data.gs, dan football-api.gs
 * 5. Jalankan fungsi setupDatabase() satu kali untuk inisialisasi sheet dan tabel
 * 6. Klik Deploy > New Deployment > Web App (Execute as: Me, Who has access: Anyone)
 * 7. Salin Web App URL ke assets/js/config.js atau melalui modal di website frontend
 */

// Konfigurasi Database Spreadsheet
function getSpreadsheet() {
  var props = PropertiesService.getScriptProperties();
  var sheetId = props.getProperty('SPREADSHEET_ID');
  if (sheetId && sheetId.trim() !== '') {
    return SpreadsheetApp.openById(sheetId.trim());
  }
  // Fallback ke active spreadsheet jika script terikat langsung (container-bound)
  try {
    return SpreadsheetApp.getActiveSpreadsheet();
  } catch (e) {
    throw new Error('SPREADSHEET_ID belum dikonfigurasi di Script Properties.');
  }
}

/**
 * Endpoint Utama HTTP GET
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) ? e.parameter.action : 'matches';
  var params = e ? e.parameter : {};

  try {
    var result;
    switch (action) {
      case 'matches':
        result = handleGetMatches(params);
        break;
      case 'match_detail':
        result = handleGetMatchDetail(params.id);
        break;
      case 'statistics':
        result = handleGetStatistics(params.season_id);
        break;
      case 'teams':
        result = handleGetSheetData('teams');
        break;
      case 'competitions':
        result = handleGetSheetData('competitions');
        break;
      case 'seasons':
        result = handleGetSheetData('seasons');
        break;
      case 'stadiums':
        result = handleGetSheetData('stadiums');
        break;
      case 'sync_logs':
        result = handleGetSyncLogs();
        break;
      case 'api_settings':
        result = handleGetSheetData('api_settings');
        break;
      default:
        result = { status: 'error', message: 'Action tidak dikenal: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Endpoint Utama HTTP POST
 */
function doPost(e) {
  try {
    var payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else {
      payload = e.parameter || {};
    }

    var action = payload.action || 'unknown';
    var result;

    switch (action) {
      case 'login':
        result = handleLogin(payload.username, payload.password_hash);
        break;
      case 'create_match':
        validateAuth(payload.token);
        result = handleCreateMatch(payload.match);
        break;
      case 'update_match':
        validateAuth(payload.token);
        result = handleUpdateMatch(payload.id, payload.match);
        break;
      case 'delete_match':
        validateAuth(payload.token);
        result = handleDeleteMatch(payload.id);
        break;
      case 'sync':
        validateAuth(payload.token);
        result = runFootballApiSync('MANUAL_ADMIN');
        break;
      default:
        result = { status: 'error', message: 'Action POST tidak dikenal: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ status: 'error', message: err.toString() });
  }
}

/**
 * Helper JSON Response
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Mengambil data sheet sebagai array of objects (Header-based)
 */
function getSheetRowsAsObjects(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  var headers = data[0];
  var rows = [];

  for (var i = 1; i < data.length; i++) {
    var row = data[i];
    var obj = {};
    for (var j = 0; j < headers.length; j++) {
      var headerKey = String(headers[j]).trim();
      var cellVal = row[j];
      if (cellVal instanceof Date) {
        // Format YYYY-MM-DD jika tanggal
        cellVal = Utilities.formatDate(cellVal, 'Asia/Jakarta', 'yyyy-MM-dd');
      }
      obj[headerKey] = cellVal;
    }
    rows.push(obj);
  }
  return rows;
}

/**
 * Mengambil daftar pertandingan dengan relasi entitas
 */
function handleGetMatches(params) {
  var matches = getSheetRowsAsObjects('matches');
  var teams = getSheetRowsAsObjects('teams');
  var competitions = getSheetRowsAsObjects('competitions');
  var stadiums = getSheetRowsAsObjects('stadiums');
  var seasons = getSheetRowsAsObjects('seasons');

  var teamMap = {};
  teams.forEach(function(t) { teamMap[t.id] = t; });

  var compMap = {};
  competitions.forEach(function(c) { compMap[c.id] = c; });

  var stadiumMap = {};
  stadiums.forEach(function(s) { stadiumMap[s.id] = s; });

  var seasonMap = {};
  seasons.forEach(function(seas) { seasonMap[seas.id] = seas; });

  var enriched = matches.map(function(m) {
    return {
      id: m.id,
      external_match_id: m.external_match_id,
      home_team_id: m.home_team_id,
      away_team_id: m.away_team_id,
      competition_id: m.competition_id,
      season_id: m.season_id,
      stadium_id: m.stadium_id,
      match_date: m.match_date,
      match_time: m.match_time,
      home_score: m.home_score !== '' ? Number(m.home_score) : null,
      away_score: m.away_score !== '' ? Number(m.away_score) : null,
      status: m.status,
      data_source: m.data_source,
      homeTeam: teamMap[m.home_team_id] || { id: m.home_team_id, name: 'Home' },
      awayTeam: teamMap[m.away_team_id] || { id: m.away_team_id, name: 'Away' },
      competition: compMap[m.competition_id] || { id: m.competition_id, name: '-' },
      stadium: stadiumMap[m.stadium_id] || { id: m.stadium_id, name: '-' },
      season: seasonMap[m.season_id] || { id: m.season_id, name: '-' }
    };
  });

  // Filter opsional
  if (params && params.competition_id && params.competition_id !== 'all') {
    enriched = enriched.filter(function(m) { return m.competition_id === params.competition_id; });
  }

  // Sort berdasarkan tanggal
  enriched.sort(function(a, b) {
    return (a.match_date + (a.match_time || '')) > (b.match_date + (b.match_time || '')) ? 1 : -1;
  });

  return { status: 'success', data: enriched };
}

/**
 * Mengambil detail pertandingan berdasarkan ID
 */
function handleGetMatchDetail(id) {
  var res = handleGetMatches({});
  var list = res.data || [];
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return { status: 'success', data: list[i] };
    }
  }
  return { status: 'error', message: 'Pertandingan tidak ditemukan.' };
}

/**
 * Menghitung Statistik W-D-L, GF, GA, Points
 */
function handleGetStatistics(seasonId) {
  var matches = getSheetRowsAsObjects('matches');
  var won = 0, drawn = 0, lost = 0, gf = 0, ga = 0, cleanSheets = 0;

  matches.forEach(function(m) {
    if (m.status !== 'FINISHED') return;
    if (seasonId && m.season_id !== seasonId) return;

    var isHome = m.home_team_id === 'T-001';
    var isAway = m.away_team_id === 'T-001';
    if (!isHome && !isAway) return;

    var pScore = isHome ? Number(m.home_score || 0) : Number(m.away_score || 0);
    var oScore = isHome ? Number(m.away_score || 0) : Number(m.home_score || 0);

    gf += pScore;
    ga += oScore;
    if (oScore === 0) cleanSheets++;

    if (pScore > oScore) won++;
    else if (pScore === oScore) drawn++;
    else lost++;
  });

  var played = won + drawn + lost;
  var points = (won * 3) + (drawn * 1);
  var winRate = played > 0 ? Math.round((won / played) * 100) : 0;

  return {
    status: 'success',
    data: {
      played: played,
      won: won,
      drawn: drawn,
      lost: lost,
      goalsFor: gf,
      goalsAgainst: ga,
      goalDifference: gf - ga,
      points: points,
      winRate: winRate,
      cleanSheets: cleanSheets
    }
  };
}

/**
 * Mengambil data sheet sederhana
 */
function handleGetSheetData(sheetName) {
  var data = getSheetRowsAsObjects(sheetName);
  return { status: 'success', data: data };
}

/**
 * Mengambil Sync Logs
 */
function handleGetSyncLogs() {
  var logs = getSheetRowsAsObjects('sync_logs');
  logs.reverse(); // Terbaru di atas
  return { status: 'success', data: logs };
}

/**
 * Handler Login Administrator
 */
function handleLogin(username, passwordHash) {
  var users = getSheetRowsAsObjects('users');
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (u.username === username && u.password_hash === passwordHash) {
      var token = 'GAS_TOKEN_' + Utilities.getUuid();
      // Simpan token di ScriptCache agar dapat divalidasi oleh Web App (8 jam)
      CacheService.getScriptCache().put(token, username, 3600 * 8);
      return {
        status: 'success',
        token: token,
        user: { id: u.id, username: u.username, role: u.role }
      };
    }
  }
  return { status: 'error', message: 'Kombinasi username atau password salah.' };
}

/**
 * Validasi Token Administrator (Wajib untuk Operasi CRUD & Sync)
 */
function validateAuth(token) {
  if (!token) throw new Error('Akses ditolak: Token autentikasi tidak disertakan.');
  var username = CacheService.getScriptCache().get(token);
  if (!username) {
    throw new Error('Akses ditolak: Token tidak valid atau sesi login telah berakhir.');
  }
  return username;
}

/**
 * Tambah Pertandingan Baru ke Sheet 'matches'
 */
function handleCreateMatch(m) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('matches');
  var newId = 'MATCH-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd') + '-' + Math.floor(Math.random() * 1000);
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  var row = [
    newId,
    m.external_match_id || ('MANUAL-' + Date.now()),
    m.home_team_id,
    m.away_team_id,
    m.competition_id,
    m.season_id || 'SEAS-2024-2025',
    m.stadium_id,
    m.match_date,
    m.match_time || '19:00',
    m.home_score !== '' && m.home_score !== null ? m.home_score : '',
    m.away_score !== '' && m.away_score !== null ? m.away_score : '',
    m.status || 'SCHEDULED',
    'Manual Input',
    nowStr,
    nowStr
  ];

  sheet.appendRow(row);
  return { status: 'success', data: { id: newId } };
}

/**
 * Update Pertandingan di Sheet 'matches'
 */
function handleUpdateMatch(id, m) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('matches');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = headers.indexOf('id');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIdx] === id) {
      // Temukan baris
      var rowNum = i + 1;
      for (var key in m) {
        var colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          sheet.getRange(rowNum, colIdx + 1).setValue(m[key]);
        }
      }
      var updatedColIdx = headers.indexOf('updated_at');
      if (updatedColIdx !== -1) {
        sheet.getRange(rowNum, updatedColIdx + 1).setValue(nowStr);
      }
      return { status: 'success', message: 'Pertandingan berhasil diperbarui.' };
    }
  }
  return { status: 'error', message: 'Pertandingan tidak ditemukan.' };
}

/**
 * Hapus Pertandingan dari Sheet 'matches'
 */
function handleDeleteMatch(id) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('matches');
  var data = sheet.getDataRange().getValues();
  var idColIdx = data[0].indexOf('id');

  for (var i = 1; i < data.length; i++) {
    if (data[i][idColIdx] === id) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Pertandingan berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'ID pertandingan tidak ditemukan.' };
}
