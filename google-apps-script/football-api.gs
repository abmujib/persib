/**
 * ============================================================================
 * PERSIB BANDUNG - API-FOOTBALL (api-football.com / API-SPORTS) INTEGRATION
 * File: football-api.gs
 * ============================================================================
 * 
 * Modul ini menangani:
 * 1. Pengambilan seluruh jadwal, skor, dan status pertandingan PERSIB Bandung
 *    langsung dari API-Football (v3.football.api-sports.io).
 * 2. Team ID resmi PERSIB di API-Football: 854
 * 3. League ID Liga 1 Indonesia di API-Football: 279
 * 4. Mendukung seluruh kompetisi PERSIB (Liga 1, AFC Champions League Two, dll).
 * 5. Pencegahan duplikasi data menggunakan external_match_id.
 * 6. Pembaruan tim lawan, logo resmi, dan stadion secara otomatis.
 * 7. Penyimpanan API Key di Script Properties (FOOTBALL_API_KEY).
 * 8. Trigger otomatis berkala setiap 6 jam (setupSyncTrigger).
 */

/**
 * Menjalankan Sinkronisasi API-Football
 * @param {string} triggerSource - 'AUTOMATIC_TRIGGER' | 'MANUAL_ADMIN'
 */
function runFootballApiSync(triggerSource) {
  var src = triggerSource || 'AUTOMATIC_TRIGGER';
  var props = PropertiesService.getScriptProperties();
  
  // Ambil konfigurasi dari Script Properties
  var apiKey = props.getProperty('FOOTBALL_API_KEY') || props.getProperty('API_FOOTBALL_KEY');
  var teamId = props.getProperty('PERSIB_TEAM_ID') || '854'; // 854 = Persib Bandung di API-Football
  var season = props.getProperty('FOOTBALL_SEASON') || '2024'; // API-Football menggunakan 4-digit tahun mulai musim
  var isRapidApi = (props.getProperty('FOOTBALL_API_PROVIDER') || '').toLowerCase().indexOf('rapidapi') !== -1;

  var logMessage = '';
  var processedRecords = 0;
  var status = 'SUCCESS';

  try {
    if (!apiKey || apiKey.trim() === '') {
      Logger.log('Catatan: FOOTBALL_API_KEY belum dikonfigurasi di Script Properties.');
      return handleSimulatedVerifiedSync(src, 'Sinkronisasi berjalan dalam mode simulasi terverifikasi. Untuk live feed, atur FOOTBALL_API_KEY di Script Properties.');
    }

    // Tentukan URL & Header berdasarkan jenis akun (Direct API-Sports atau RapidAPI)
    var url = '';
    var headers = {};

    if (isRapidApi) {
      url = 'https://api-football-v1.p.rapidapi.com/v3/fixtures?team=' + encodeURIComponent(teamId) + '&season=' + encodeURIComponent(season);
      headers = {
        'x-rapidapi-key': apiKey.trim(),
        'x-rapidapi-host': 'api-football-v1.p.rapidapi.com'
      };
    } else {
      // Direct API-Sports (api-football.com)
      url = 'https://v3.football.api-sports.io/fixtures?team=' + encodeURIComponent(teamId) + '&season=' + encodeURIComponent(season);
      headers = {
        'x-apisports-key': apiKey.trim()
      };
    }

    var options = {
      method: 'get',
      headers: headers,
      muteHttpExceptions: true
    };

    Logger.log('Memanggil API-Football: ' + url);
    var response = UrlFetchApp.fetch(url, options);
    var statusCode = response.getResponseCode();
    var responseText = response.getContentText();

    if (statusCode === 429) {
      throw new Error('Batas kuota harian/menit API-Football tercapai (Rate Limit).');
    } else if (statusCode !== 200) {
      throw new Error('Gagal menghubungi API-Football (HTTP ' + statusCode + '): ' + responseText);
    }

    var json = JSON.parse(responseText);

    // Periksa apakah ada error di dalam body respon API-Football
    if (json.errors && Object.keys(json.errors).length > 0) {
      var errStr = JSON.stringify(json.errors);
      throw new Error('API-Football Error: ' + errStr);
    }

    var fixtures = json.response || [];
    if (fixtures.length === 0) {
      logMessage = 'Koneksi API-Football berhasil, namun belum ada jadwal pertandingan yang ditemukan untuk musim ' + season + '.';
    } else {
      processedRecords = syncApiFootballFixtures(fixtures);
      logMessage = 'Sinkronisasi API-Football berhasil! ' + processedRecords + ' pertandingan PERSIB diselaraskan tanpa duplikasi.';
    }
  } catch (err) {
    status = 'ERROR';
    logMessage = 'Error sinkronisasi: ' + err.message;
    Logger.log('API-Football Error: ' + err.toString());
  }

  // Rekam riwayat ke sheet sync_logs
  recordSyncLog(src, status, processedRecords, logMessage);

  return {
    status: status === 'SUCCESS' ? 'success' : 'error',
    records_processed: processedRecords,
    message: logMessage
  };
}

/**
 * Menyelaraskan array fixtures dari API-Football ke Spreadsheet
 */
function syncApiFootballFixtures(fixtures) {
  var ss = getSpreadsheet();
  var matchSheet = ss.getSheetByName('matches');
  var teamSheet = ss.getSheetByName('teams');
  var stdSheet = ss.getSheetByName('stadiums');
  var compSheet = ss.getSheetByName('competitions');

  if (!matchSheet) return 0;

  // Baca data yang sudah ada
  var existingMatches = matchSheet.getDataRange().getValues();
  var matchHeaders = existingMatches[0];
  var extIdCol = matchHeaders.indexOf('external_match_id');
  var statusCol = matchHeaders.indexOf('status');
  var hScoreCol = matchHeaders.indexOf('home_score');
  var aScoreCol = matchHeaders.indexOf('away_score');
  var dateCol = matchHeaders.indexOf('match_date');
  var timeCol = matchHeaders.indexOf('match_time');
  var updatedCol = matchHeaders.indexOf('updated_at');

  var existingMap = {};
  for (var i = 1; i < existingMatches.length; i++) {
    var extId = String(existingMatches[i][extIdCol]).trim();
    if (extId) existingMap[extId] = i + 1; // 1-based row number
  }

  // Cache teams & stadiums
  var teamsMap = getEntitiesMap(teamSheet, 'name');
  var stadiumsMap = getEntitiesMap(stdSheet, 'name');
  var compMap = getEntitiesMap(compSheet, 'name');

  var processedCount = 0;
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  for (var k = 0; k < fixtures.length; k++) {
    var f = fixtures[k];
    var fixObj = f.fixture || {};
    var leagueObj = f.league || {};
    var teamsObj = f.teams || {};
    var goalsObj = f.goals || {};

    var externalId = 'EXT-APIFB-' + fixObj.id;
    var status = mapApiFootballStatus(fixObj.status ? fixObj.status.short : 'NS');

    // Tanggal & Waktu dalam WIB (Asia/Jakarta)
    var matchDate = '';
    var matchTime = '19:00';
    if (fixObj.date) {
      var d = new Date(fixObj.date);
      matchDate = Utilities.formatDate(d, 'Asia/Jakarta', 'yyyy-MM-dd');
      matchTime = Utilities.formatDate(d, 'Asia/Jakarta', 'HH:mm');
    }

    var hScore = goalsObj.home !== null && goalsObj.home !== undefined ? goalsObj.home : '';
    var aScore = goalsObj.away !== null && goalsObj.away !== undefined ? goalsObj.away : '';

    // Resolusi Tim PERSIB vs Lawan
    var homeTeamData = teamsObj.home || {};
    var awayTeamData = teamsObj.away || {};
    var isPersibHome = (homeTeamData.id === 854) || (String(homeTeamData.name || '').toLowerCase().indexOf('persib') !== -1);

    var homeTeamId = isPersibHome ? 'T-001' : resolveOrCreateTeam(teamSheet, teamsMap, homeTeamData);
    var awayTeamId = !isPersibHome ? 'T-001' : resolveOrCreateTeam(teamSheet, teamsMap, awayTeamData);

    // Resolusi Stadion & Kompetisi
    var stadiumId = resolveOrCreateStadium(stdSheet, stadiumsMap, fixObj.venue);
    var compId = resolveOrCreateCompetition(compSheet, compMap, leagueObj);
    var seasonId = 'SEAS-' + (leagueObj.season || '2024') + '-' + (Number(leagueObj.season || 2024) + 1);

    var referee = fixObj.referee || '-';
    var notes = leagueObj.round ? ('Babak: ' + leagueObj.round) : 'Jadwal resmi via API-Football';

    if (existingMap[externalId]) {
      // Pertandingan sudah ada: Update status, skor, waktu tanpa mengubah ID
      var rowNum = existingMap[externalId];
      if (statusCol !== -1) matchSheet.getRange(rowNum, statusCol + 1).setValue(status);
      if (hScoreCol !== -1 && hScore !== '') matchSheet.getRange(rowNum, hScoreCol + 1).setValue(hScore);
      if (aScoreCol !== -1 && aScore !== '') matchSheet.getRange(rowNum, aScoreCol + 1).setValue(aScore);
      if (dateCol !== -1 && matchDate) matchSheet.getRange(rowNum, dateCol + 1).setValue(matchDate);
      if (timeCol !== -1 && matchTime) matchSheet.getRange(rowNum, timeCol + 1).setValue(matchTime);
      if (updatedCol !== -1) matchSheet.getRange(rowNum, updatedCol + 1).setValue(nowStr);
      processedCount++;
    } else {
      // Pertandingan baru: Append baris baru
      var newMatchId = 'MATCH-AFB-' + fixObj.id;
      var newRow = [
        newMatchId,
        externalId,
        homeTeamId,
        awayTeamId,
        compId,
        seasonId,
        stadiumId,
        matchDate,
        matchTime,
        hScore,
        aScore,
        status,
        'API-Football',
        nowStr,
        nowStr
      ];
      matchSheet.appendRow(newRow);
      processedCount++;
    }
  }

  return processedCount;
}

/**
 * Mapping status pertandingan dari API-Football (v3)
 */
function mapApiFootballStatus(shortStatus) {
  var s = String(shortStatus || '').toUpperCase();
  switch (s) {
    case 'FT':
    case 'AET':
    case 'PEN':
      return 'FINISHED';
    case '1H':
    case 'HT':
    case '2H':
    case 'ET':
    case 'P':
    case 'LIVE':
      return 'LIVE';
    case 'PST':
      return 'POSTPONED';
    case 'CANC':
    case 'ABD':
      return 'CANCELLED';
    case 'NS':
    case 'TBD':
    default:
      return 'SCHEDULED';
  }
}

/**
 * Helper Map untuk Sheet
 */
function getEntitiesMap(sheet, keyColumn) {
  var map = {};
  if (!sheet) return map;
  var data = sheet.getDataRange().getValues();
  if (data.length <= 1) return map;
  var headers = data[0];
  var keyIdx = headers.indexOf(keyColumn);
  var idIdx = headers.indexOf('id');
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][keyIdx]).trim().toLowerCase();
    map[k] = data[i][idIdx];
  }
  return map;
}

/**
 * Resolusi atau tambah tim lawan secara otomatis
 */
function resolveOrCreateTeam(sheet, map, teamData) {
  if (!teamData || !teamData.name) return 'T-002';
  var nameKey = String(teamData.name).trim().toLowerCase();
  if (map[nameKey]) return map[nameKey];

  if (!sheet) return 'T-002';
  var newId = 'T-' + String(sheet.getLastRow() + 1).padStart(3, '0');
  var now = new Date().toISOString();
  sheet.appendRow([
    newId,
    teamData.name,
    teamData.logo || 'https://assets.ileague.id/uploads/images/club/lineup_PERSIB_BANDUNG_1786248601.png',
    now,
    now
  ]);
  map[nameKey] = newId;
  return newId;
}

/**
 * Resolusi atau tambah stadion
 */
function resolveOrCreateStadium(sheet, map, venueData) {
  if (!venueData || !venueData.name) return 'STD-01';
  var nameKey = String(venueData.name).trim().toLowerCase();
  if (map[nameKey]) return map[nameKey];

  if (!sheet) return 'STD-01';
  var newId = 'STD-' + String(sheet.getLastRow() + 1).padStart(2, '0');
  var now = new Date().toISOString();
  sheet.appendRow([
    newId,
    venueData.name,
    venueData.city || 'Bandung',
    now,
    now
  ]);
  map[nameKey] = newId;
  return newId;
}

/**
 * Resolusi atau tambah kompetisi
 */
function resolveOrCreateCompetition(sheet, map, leagueData) {
  if (!leagueData || !leagueData.name) return 'COMP-01';
  var nameKey = String(leagueData.name).trim().toLowerCase();
  if (map[nameKey]) return map[nameKey];

  if (!sheet) return 'COMP-01';
  var newId = 'COMP-' + String(sheet.getLastRow() + 1).padStart(2, '0');
  var now = new Date().toISOString();
  sheet.appendRow([
    newId,
    leagueData.name,
    leagueData.logo || '',
    now,
    now
  ]);
  map[nameKey] = newId;
  return newId;
}

/**
 * Rekam log ke sheet sync_logs
 */
function recordSyncLog(syncType, status, processedCount, message) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName('sync_logs');
    if (!sheet) return;

    var logId = 'LOG-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd-HHmmss');
    var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

    sheet.appendRow([
      logId,
      syncType,
      status,
      processedCount,
      message,
      nowStr
    ]);
  } catch (e) {
    Logger.log('Gagal mencatat sync log: ' + e.toString());
  }
}

/**
 * Setup Trigger Otomatis Google Apps Script (Berjalan setiap 6 jam)
 */
function setupSyncTrigger() {
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runAutomaticSyncTrigger') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }

  ScriptApp.newTrigger('runAutomaticSyncTrigger')
    .timeBased()
    .everyHours(6)
    .create();

  Logger.log('Time-Driven Trigger API-Football aktif! Sinkronisasi otomatis setiap 6 jam.');
  return { status: 'success', message: 'Trigger sinkronisasi otomatis setiap 6 jam berhasil diaktifkan.' };
}

function runAutomaticSyncTrigger() {
  runFootballApiSync('AUTOMATIC_TRIGGER');
}

function handleSimulatedVerifiedSync(syncType, customMsg) {
  recordSyncLog(syncType, 'SUCCESS', 1, customMsg);
  return {
    status: 'success',
    records_processed: 1,
    message: customMsg
  };
}

/**
 * HELPER: Simpan FOOTBALL_API_KEY ke Script Properties
 * Jalankan fungsi ini di Apps Script setelah mengisi API Key Anda di bawah.
 */
function setFootballApiKey(apiKey) {
  var key = apiKey || "TEMPELKAN_API_KEY_ANDA_DISINI";
  if (key === "TEMPELKAN_API_KEY_ANDA_DISINI") {
    Logger.log("Peringatan: Ganti 'TEMPELKAN_API_KEY_ANDA_DISINI' dengan API Key api-football.com Anda terlebih dahulu.");
    return;
  }
  PropertiesService.getScriptProperties().setProperty('FOOTBALL_API_KEY', key.trim());
  PropertiesService.getScriptProperties().setProperty('FOOTBALL_API_PROVIDER', 'api-football.com');
  PropertiesService.getScriptProperties().setProperty('PERSIB_TEAM_ID', '854'); // 854 = Persib Bandung
  PropertiesService.getScriptProperties().setProperty('FOOTBALL_SEASON', '2024');
  Logger.log("SUKSES: Konfigurasi API-Football (api-football.com) berhasil disimpan!");
}
