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
        result = handleLogin(payload.username, payload.password, payload.password_hash);
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
      case 'create_team':
        validateAuth(payload.token);
        result = handleCreateTeam(payload.team);
        break;
      case 'update_team':
        validateAuth(payload.token);
        result = handleUpdateTeam(payload.id, payload.team);
        break;
      case 'delete_team':
        validateAuth(payload.token);
        result = handleDeleteTeam(payload.id);
        break;
      case 'create_stadium':
        validateAuth(payload.token);
        result = handleCreateStadium(payload.stadium);
        break;
      case 'update_stadium':
        validateAuth(payload.token);
        result = handleUpdateStadium(payload.id, payload.stadium);
        break;
      case 'delete_stadium':
        validateAuth(payload.token);
        result = handleDeleteStadium(payload.id);
        break;
      case 'create_competition':
        validateAuth(payload.token);
        result = handleCreateCompetition(payload.competition);
        break;
      case 'update_competition':
        validateAuth(payload.token);
        result = handleUpdateCompetition(payload.id, payload.competition);
        break;
      case 'delete_competition':
        validateAuth(payload.token);
        result = handleDeleteCompetition(payload.id);
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
        if (headerKey === 'match_time') {
          cellVal = Utilities.formatDate(cellVal, 'Asia/Jakarta', 'HH:mm');
        } else {
          cellVal = Utilities.formatDate(cellVal, 'Asia/Jakarta', 'yyyy-MM-dd');
        }
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
function handleLogin(username, password, passwordHash) {
  var users = getSheetRowsAsObjects('users');
  var targetUser = String(username || '').trim().toLowerCase();
  var targetHash = String(passwordHash || '').trim().toLowerCase();
  var targetPass = String(password || '').trim();

  // Hitung hash di backend Apps Script juga untuk keamanan dan redundansi
  var backendHash = '';
  if (targetPass) {
    var rawBytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, targetPass, Utilities.Charset.UTF_8);
    backendHash = rawBytes.map(function(b) {
      var n = (b < 0 ? b + 256 : b).toString(16);
      return n.length === 1 ? '0' + n : n;
    }).join('').toLowerCase();
  }

  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    var sheetUser = String(u.username || '').trim().toLowerCase();
    var sheetPass = String(u.password_hash || '').trim();

    if (sheetUser === targetUser) {
      // Bandingkan dengan hash dari frontend, hash dari backend, atau teks jika ditulis plaintext di sheet
      var isMatch = (targetHash && sheetPass.toLowerCase() === targetHash) ||
                    (backendHash && sheetPass.toLowerCase() === backendHash) ||
                    (targetPass && sheetPass === targetPass);

      if (isMatch) {
        // Jika data di sheet masih plaintext, otomatis perbarui menjadi SHA-256 hash
        if (sheetPass === targetPass && backendHash) {
          try {
            var ss = getSpreadsheet();
            var sheet = ss.getSheetByName('users');
            var headers = sheet.getDataRange().getValues()[0];
            var passCol = headers.indexOf('password_hash');
            if (passCol !== -1) {
              sheet.getRange(i + 2, passCol + 1).setValue(backendHash);
            }
          } catch (e) {}
        }

        var token = 'GAS_TOKEN_' + Utilities.getUuid();
        CacheService.getScriptCache().put(token, u.username, 3600 * 8);
        return {
          status: 'success',
          token: token,
          user: { id: u.id, username: u.username, role: u.role }
        };
      }
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
  var newId = 'MATCH-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd') + '-' + Math.floor(100 + Math.random() * 900);
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  var homeScore = (m.home_score !== '' && m.home_score !== null && m.home_score !== undefined) ? Number(m.home_score) : '';
  var awayScore = (m.away_score !== '' && m.away_score !== null && m.away_score !== undefined) ? Number(m.away_score) : '';

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
    homeScore,
    awayScore,
    m.status || 'SCHEDULED',
    m.data_source || 'Manual Input',
    nowStr,
    nowStr
  ];

  sheet.appendRow(row);
  return { status: 'success', message: 'Pertandingan berhasil ditambahkan.', data: { id: newId } };
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
    if (String(data[i][idColIdx]) === String(id)) {
      var rowNum = i + 1;
      for (var key in m) {
        var colIdx = headers.indexOf(key);
        if (colIdx !== -1) {
          var val = m[key];
          if (key === 'home_score' || key === 'away_score') {
            val = (val !== '' && val !== null && val !== undefined) ? Number(val) : '';
          }
          sheet.getRange(rowNum, colIdx + 1).setValue(val);
        }
      }
      var updatedColIdx = headers.indexOf('updated_at');
      if (updatedColIdx !== -1) {
        sheet.getRange(rowNum, updatedColIdx + 1).setValue(nowStr);
      }
      return { status: 'success', message: 'Pertandingan berhasil diperbarui.', data: { id: id } };
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
    if (String(data[i][idColIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Pertandingan berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'ID pertandingan tidak ditemukan.' };
}

/**
 * ============================================================================
 * CRUD TIM LAWAN & LOGO (Sheet 'teams')
 * ============================================================================
 */
function handleCreateTeam(team) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('teams');
  var data = sheet.getDataRange().getValues();
  var count = data.length;
  var newId = 'T-' + String(count).padStart(3, '0');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  var name = (team.name || 'Tim Baru').trim();
  var logo = (team.logo || '').trim() || ('https://placehold.co/100x100/002B7F/ffffff?text=' + encodeURIComponent(name.substring(0, 3).toUpperCase()));

  var row = [
    newId,
    name,
    logo,
    nowStr,
    nowStr
  ];
  sheet.appendRow(row);
  return { status: 'success', message: 'Tim berhasil ditambahkan.', data: { id: newId, name: name, logo: logo } };
}

function handleUpdateTeam(id, team) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('teams');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = headers.indexOf('id');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      var rowNum = i + 1;
      if (team.name !== undefined) {
        var nameCol = headers.indexOf('name');
        if (nameCol !== -1) sheet.getRange(rowNum, nameCol + 1).setValue(String(team.name).trim());
      }
      if (team.logo !== undefined) {
        var logoCol = headers.indexOf('logo');
        if (logoCol !== -1) sheet.getRange(rowNum, logoCol + 1).setValue(String(team.logo).trim());
      }
      var updatedCol = headers.indexOf('updated_at');
      if (updatedCol !== -1) sheet.getRange(rowNum, updatedCol + 1).setValue(nowStr);
      return { status: 'success', message: 'Tim berhasil diperbarui.' };
    }
  }
  return { status: 'error', message: 'ID tim tidak ditemukan.' };
}

function handleDeleteTeam(id) {
  if (id === 'T-001') {
    return { status: 'error', message: 'Tim utama PERSIB Bandung tidak dapat dihapus!' };
  }
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('teams');
  var data = sheet.getDataRange().getValues();
  var idColIdx = data[0].indexOf('id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Tim berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'ID tim tidak ditemukan.' };
}

/**
 * ============================================================================
 * CRUD STADION & LOKASI (Sheet 'stadiums')
 * ============================================================================
 */
function handleCreateStadium(stadium) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('stadiums');
  var data = sheet.getDataRange().getValues();
  var count = data.length;
  var newId = 'STD-' + String(count).padStart(2, '0');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  var name = (stadium.name || 'Stadion Baru').trim();
  var city = (stadium.city || 'Indonesia').trim();

  var row = [
    newId,
    name,
    city,
    nowStr,
    nowStr
  ];
  sheet.appendRow(row);
  return { status: 'success', message: 'Stadion berhasil ditambahkan.', data: { id: newId, name: name, city: city } };
}

function handleUpdateStadium(id, stadium) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('stadiums');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = headers.indexOf('id');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      var rowNum = i + 1;
      if (stadium.name !== undefined) {
        var nameCol = headers.indexOf('name');
        if (nameCol !== -1) sheet.getRange(rowNum, nameCol + 1).setValue(String(stadium.name).trim());
      }
      if (stadium.city !== undefined) {
        var cityCol = headers.indexOf('city');
        if (cityCol !== -1) sheet.getRange(rowNum, cityCol + 1).setValue(String(stadium.city).trim());
      }
      var updatedCol = headers.indexOf('updated_at');
      if (updatedCol !== -1) sheet.getRange(rowNum, updatedCol + 1).setValue(nowStr);
      return { status: 'success', message: 'Stadion berhasil diperbarui.' };
    }
  }
  return { status: 'error', message: 'ID stadion tidak ditemukan.' };
}

function handleDeleteStadium(id) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('stadiums');
  var data = sheet.getDataRange().getValues();
  var idColIdx = data[0].indexOf('id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Stadion berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'ID stadion tidak ditemukan.' };
}

/**
 * ============================================================================
 * CRUD KOMPETISI & TURNAMEN (Sheet 'competitions')
 * ============================================================================
 */
function handleCreateCompetition(comp) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('competitions');
  var data = sheet.getDataRange().getValues();
  var count = data.length;
  var newId = 'COMP-' + String(count).padStart(2, '0');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  var name = (comp.name || 'Kompetisi Baru').trim();
  var logo = (comp.logo || '').trim() || ('https://placehold.co/100x100/002B7F/ffffff?text=' + encodeURIComponent((comp.code || name).substring(0, 4).toUpperCase()));

  var row = [
    newId,
    name,
    logo,
    nowStr,
    nowStr
  ];
  sheet.appendRow(row);
  return { status: 'success', message: 'Kompetisi berhasil ditambahkan.', data: { id: newId, name: name, logo: logo } };
}

function handleUpdateCompetition(id, comp) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('competitions');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idColIdx = headers.indexOf('id');
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      var rowNum = i + 1;
      if (comp.name !== undefined) {
        var nameCol = headers.indexOf('name');
        if (nameCol !== -1) sheet.getRange(rowNum, nameCol + 1).setValue(String(comp.name).trim());
      }
      if (comp.logo !== undefined) {
        var logoCol = headers.indexOf('logo');
        if (logoCol !== -1) sheet.getRange(rowNum, logoCol + 1).setValue(String(comp.logo).trim());
      }
      var updatedCol = headers.indexOf('updated_at');
      if (updatedCol !== -1) sheet.getRange(rowNum, updatedCol + 1).setValue(nowStr);
      return { status: 'success', message: 'Kompetisi berhasil diperbarui.' };
    }
  }
  return { status: 'error', message: 'ID kompetisi tidak ditemukan.' };
}

function handleDeleteCompetition(id) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName('competitions');
  var data = sheet.getDataRange().getValues();
  var idColIdx = data[0].indexOf('id');

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idColIdx]) === String(id)) {
      sheet.deleteRow(i + 1);
      return { status: 'success', message: 'Kompetisi berhasil dihapus.' };
    }
  }
  return { status: 'error', message: 'ID kompetisi tidak ditemukan.' };
}
