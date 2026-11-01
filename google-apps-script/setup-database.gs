/**
 * ============================================================================
 * PERSIB BANDUNG - AUTOMATED DATABASE SETUP & VALIDATION
 * File: setup-database.gs
 * ============================================================================
 * 
 * Script ini mengotomatiskan pembuatan dan validasi struktur 8 Sheet di Google Sheets:
 * 1. users
 * 2. matches
 * 3. teams
 * 4. competitions
 * 5. seasons
 * 6. stadiums
 * 7. api_settings
 * 8. sync_logs
 * 
 * KETENTUAN PENTING:
 * - Bersifat IDEMPOTENT: Aman dijalankan berulang kali tanpa merusak data yang ada.
 * - Jika sheet sudah ada dan berisi data, data TIDAK AKAN DIHAPUS.
 * - Header yang hilang akan ditambahkan secara otomatis di baris pertama.
 */

// Definisi Struktur Seluruh Sheet & Kolom Wajib
var DATABASE_SCHEMA = {
  users: [
    'id', 'username', 'password_hash', 'role', 'created_at', 'updated_at'
  ],
  matches: [
    'id', 'external_match_id', 'home_team_id', 'away_team_id', 'competition_id',
    'season_id', 'stadium_id', 'match_date', 'match_time', 'home_score',
    'away_score', 'status', 'data_source', 'created_at', 'updated_at'
  ],
  teams: [
    'id', 'name', 'logo', 'created_at', 'updated_at'
  ],
  competitions: [
    'id', 'name', 'logo', 'created_at', 'updated_at'
  ],
  seasons: [
    'id', 'name', 'start_date', 'end_date', 'created_at', 'updated_at'
  ],
  stadiums: [
    'id', 'name', 'city', 'created_at', 'updated_at'
  ],
  api_settings: [
    'id', 'provider', 'enabled', 'updated_at'
  ],
  sync_logs: [
    'id', 'sync_type', 'status', 'records_processed', 'message', 'created_at'
  ]
};

/**
 * Fungsi Utama: Menyiapkan seluruh struktur database Google Sheets
 */
function setupDatabase() {
  var ss;
  var props = PropertiesService.getScriptProperties();
  var existingId = props.getProperty('SPREADSHEET_ID');

  if (existingId) {
    try {
      ss = SpreadsheetApp.openById(existingId);
      Logger.log('Menggunakan spreadsheet terdaftar: ' + ss.getName() + ' (' + existingId + ')');
    } catch (e) {
      Logger.log('Spreadsheet ID di properties tidak valid, mencari active spreadsheet...');
    }
  }

  if (!ss) {
    try {
      ss = SpreadsheetApp.getActiveSpreadsheet();
    } catch (e) {
      // Jika dijalankan standalone, buat spreadsheet baru secara otomatis
      ss = SpreadsheetApp.create('PERSIB Bandung - Database Pertandingan Resmi');
      props.setProperty('SPREADSHEET_ID', ss.getId());
      Logger.log('Spreadsheet baru berhasil dibuat otomatis! ID: ' + ss.getId());
      Logger.log('URL: ' + ss.getUrl());
    }
  }

  // Iterasi setiap skema tabel
  for (var sheetName in DATABASE_SCHEMA) {
    var expectedHeaders = DATABASE_SCHEMA[sheetName];
    var sheet = ss.getSheetByName(sheetName);

    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      Logger.log('+ Sheet baru dibuat: ' + sheetName);
      // Pasang Header
      sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
      formatHeaderRow(sheet, expectedHeaders.length);
      // Seed data awal jika sheet baru
      seedInitialData(sheetName, sheet);
    } else {
      Logger.log('= Sheet sudah ada: ' + sheetName + '. Memeriksa kesesuaian header...');
      validateAndRepairHeaders(sheet, expectedHeaders);
    }
  }

  // Hapus sheet default "Sheet1" jika kosong dan bukan bagian skema
  var defaultSheet = ss.getSheetByName('Sheet1');
  if (defaultSheet && ss.getSheets().length > 1) {
    if (defaultSheet.getLastRow() <= 1) {
      try {
        ss.deleteSheet(defaultSheet);
      } catch (err) {
        // Abaikan jika tidak bisa dihapus
      }
    }
  }

  Logger.log('====================================================');
  Logger.log('SETUP DATABASE SELESAI DENGAN SUKSES!');
  Logger.log('Spreadsheet ID : ' + ss.getId());
  Logger.log('Spreadsheet URL: ' + ss.getUrl());
  Logger.log('====================================================');
  return { status: 'success', spreadsheetId: ss.getId(), url: ss.getUrl() };
}

/**
 * Format baris header agar rapi dan profesional di Google Sheets
 */
function formatHeaderRow(sheet, colCount) {
  var headerRange = sheet.getRange(1, 1, 1, colCount);
  headerRange.setBackground('#002B7F'); // PERSIB Royal Navy
  headerRange.setFontColor('#FFFFFF');
  headerRange.setFontWeight('bold');
  headerRange.setHorizontalAlignment('center');
  sheet.setFrozenRows(1);
}

/**
 * Memeriksa dan memperbaiki header tanpa menghapus data yang ada
 */
function validateAndRepairHeaders(sheet, expectedHeaders) {
  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();

  if (lastRow === 0) {
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    formatHeaderRow(sheet, expectedHeaders.length);
    return;
  }

  var currentHeaders = sheet.getRange(1, 1, 1, Math.max(lastCol, expectedHeaders.length)).getValues()[0];
  var needsUpdate = false;

  for (var i = 0; i < expectedHeaders.length; i++) {
    if (currentHeaders[i] !== expectedHeaders[i]) {
      needsUpdate = true;
      break;
    }
  }

  if (needsUpdate) {
    Logger.log('Memperbarui header untuk sheet ' + sheet.getName());
    sheet.getRange(1, 1, 1, expectedHeaders.length).setValues([expectedHeaders]);
    formatHeaderRow(sheet, expectedHeaders.length);
  }
}

/**
 * Mengisi Data Awal Resmi (Seed Data)
 */
function seedInitialData(sheetName, sheet) {
  var now = new Date().toISOString();

  if (sheetName === 'users') {
    // Admin default: 'admin' / 'persib1933' (SHA-256 hash)
    sheet.appendRow([
      'USR-001',
      'admin',
      'd175b225791739c36ba8f070ef60b1348c59f200c822e176bc5c9527ec56c703',
      'administrator',
      now,
      now
    ]);
  } else if (sheetName === 'competitions') {
    sheet.appendRow(['COMP-01', 'BRI Liga 1 Indonesia', 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cf/Liga_1_%28Indonesia%29_logo.svg/200px-Liga_1_%28Indonesia%29_logo.svg.png', now, now]);
    sheet.appendRow(['COMP-02', 'AFC Champions League Two', 'https://upload.wikimedia.org/wikipedia/en/thumb/d/d4/AFC_Champions_League_Two_logo.svg/200px-AFC_Champions_League_Two_logo.svg.png', now, now]);
    sheet.appendRow(['COMP-03', 'Piala Presiden', 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Piala_Presiden_logo.png/200px-Piala_Presiden_logo.png', now, now]);
  } else if (sheetName === 'seasons') {
    sheet.appendRow(['SEAS-2024-2025', 'Musim 2024/2025', '2024-08-01', '2025-05-31', now, now]);
    sheet.appendRow(['SEAS-2025-2026', 'Musim 2025/2026', '2025-08-01', '2026-05-31', now, now]);
  } else if (sheetName === 'stadiums') {
    sheet.appendRow(['STD-01', 'Stadion Gelora Bandung Lautan Api (GBLA)', 'Bandung', now, now]);
    sheet.appendRow(['STD-02', 'Stadion Si Jalak Harupat', 'Kabupaten Bandung', now, now]);
    sheet.appendRow(['STD-03', 'Stadion Utama Gelora Bung Karno (SUGBK)', 'Jakarta', now, now]);
    sheet.appendRow(['STD-04', 'Stadion Kapten I Wayan Dipta', 'Gianyar, Bali', now, now]);
    sheet.appendRow(['STD-05', 'Stadion Gelora Bung Tomo', 'Surabaya', now, now]);
  } else if (sheetName === 'teams') {
    sheet.appendRow(['T-001', 'PERSIB Bandung', 'https://upload.wikimedia.org/wikipedia/id/thumb/0/05/Logo_Persib_Bandung.svg/200px-Logo_Persib_Bandung.svg.png', now, now]);
    sheet.appendRow(['T-002', 'Persija Jakarta', 'https://upload.wikimedia.org/wikipedia/id/thumb/5/53/Persija_Jakarta_logo.svg/200px-Persija_Jakarta_logo.svg.png', now, now]);
    sheet.appendRow(['T-003', 'Arema FC', 'https://upload.wikimedia.org/wikipedia/id/thumb/4/44/Arema_FC_2017_logo.svg/200px-Arema_FC_2017_logo.svg.png', now, now]);
    sheet.appendRow(['T-004', 'Persebaya Surabaya', 'https://upload.wikimedia.org/wikipedia/id/thumb/7/75/Persebaya_Logo.svg/200px-Persebaya_Logo.svg.png', now, now]);
    sheet.appendRow(['T-005', 'Bali United', 'https://upload.wikimedia.org/wikipedia/id/thumb/7/7b/Bali_United_logo.svg/200px-Bali_United_logo.svg.png', now, now]);
  } else if (sheetName === 'api_settings') {
    sheet.appendRow(['SET-001', 'Football-Data.org', true, now]);
  }
}

/**
 * Validasi integritas struktur database
 */
function validateDatabase() {
  var ss = getSpreadsheet();
  var report = {
    valid: true,
    sheets_found: 0,
    missing_sheets: [],
    details: {}
  };

  for (var name in DATABASE_SCHEMA) {
    var sheet = ss.getSheetByName(name);
    if (!sheet) {
      report.valid = false;
      report.missing_sheets.push(name);
    } else {
      report.sheets_found++;
      var rowCount = sheet.getLastRow() - 1;
      report.details[name] = {
        total_records: Math.max(0, rowCount),
        last_column: sheet.getLastColumn()
      };
    }
  }

  Logger.log('Laporan Validasi Database: ' + JSON.stringify(report, null, 2));
  return report;
}

/**
 * Generate ID unik
 */
function generateUniqueId(prefix) {
  var p = prefix || 'ID';
  return p + '-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMdd-HHmmss') + '-' + Math.floor(Math.random() * 1000);
}
