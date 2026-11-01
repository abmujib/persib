/**
 * ============================================================================
 * PERSIB BANDUNG - DATA IMPORT & EXPORT ENGINE (CSV / JSON)
 * File: import-data.gs
 * ============================================================================
 * 
 * Fitur:
 * - Mengimpor data CSV / JSON ke sheet sasaran dengan validasi kolom wajib.
 * - Mode Dry-Run: Uji coba impor tanpa menulis langsung ke database.
 * - Pencegahan Duplikasi: Berdasarkan ID atau external_match_id.
 * - Laporan detail: Berhasil, Gagal, Dilewati (duplikat), dan Catatan kesalahan.
 * - Ekspor data ke format JSON / CSV.
 */

/**
 * Fungsi Utama Impor Data
 * @param {string} sheetName - Nama sheet sasaran ('matches', 'teams', dll)
 * @param {string} content - Data dalam format JSON String atau CSV String
 * @param {string} format - 'json' | 'csv'
 * @param {boolean} isDryRun - Jika true, hanya validasi tanpa menyimpan
 */
function importData(sheetName, content, format, isDryRun) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('Sheet sasaran "' + sheetName + '" tidak ditemukan.');
  }

  var expectedHeaders = DATABASE_SCHEMA[sheetName];
  if (!expectedHeaders) {
    throw new Error('Skema untuk sheet "' + sheetName + '" belum terdaftar di DATABASE_SCHEMA.');
  }

  var parsedRows = [];
  if (format.toLowerCase() === 'csv') {
    parsedRows = parseCsvContent(content, expectedHeaders);
  } else {
    parsedRows = parseJsonContent(content);
  }

  // Ambil data yang sudah ada untuk cek duplikasi
  var existingData = sheet.getDataRange().getValues();
  var existingIds = {};
  var existingExternalIds = {};

  if (existingData.length > 1) {
    var headers = existingData[0];
    var idIdx = headers.indexOf('id');
    var extIdx = headers.indexOf('external_match_id');

    for (var i = 1; i < existingData.length; i++) {
      if (idIdx !== -1 && existingData[i][idIdx]) {
        existingIds[String(existingData[i][idIdx]).trim()] = true;
      }
      if (extIdx !== -1 && existingData[i][extIdx]) {
        existingExternalIds[String(existingData[i][extIdx]).trim()] = true;
      }
    }
  }

  var report = {
    sheet: sheetName,
    mode: isDryRun ? 'DRY_RUN (Simulasi)' : 'LIVE_IMPORT (Eksekusi Nyata)',
    total_received: parsedRows.length,
    success_count: 0,
    duplicate_count: 0,
    failed_count: 0,
    errors: [],
    imported_rows: []
  };

  var rowsToAppend = [];
  var nowStr = Utilities.formatDate(new Date(), 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ss");

  for (var k = 0; k < parsedRows.length; k++) {
    var item = parsedRows[k];
    var rowNum = k + 1;

    // Validasi ID primer
    var itemId = item.id ? String(item.id).trim() : null;
    if (!itemId) {
      itemId = generateUniqueId(sheetName.substring(0, 3).toUpperCase());
      item.id = itemId;
    }

    // Cek Duplikasi ID
    if (existingIds[itemId]) {
      report.duplicate_count++;
      report.errors.push('Baris ' + rowNum + ': ID duplikat dilewati (' + itemId + ')');
      continue;
    }

    // Cek Duplikasi external_match_id (Khusus Sheet matches)
    if (sheetName === 'matches' && item.external_match_id && existingExternalIds[String(item.external_match_id).trim()]) {
      report.duplicate_count++;
      report.errors.push('Baris ' + rowNum + ': external_match_id duplikat dilewati (' + item.external_match_id + ')');
      continue;
    }

    // Validasi Tanggal (jika sheet matches)
    if (sheetName === 'matches' && !item.match_date) {
      report.failed_count++;
      report.errors.push('Baris ' + rowNum + ': Kolom wajib match_date kosong.');
      continue;
    }

    // Susun baris sesuai urutan kolom header
    var rowData = [];
    for (var h = 0; h < expectedHeaders.length; h++) {
      var key = expectedHeaders[h];
      var val = item[key] !== undefined && item[key] !== null ? item[key] : '';
      if (key === 'created_at' && !val) val = nowStr;
      if (key === 'updated_at' && !val) val = nowStr;
      rowData.push(val);
    }

    rowsToAppend.push(rowData);
    report.success_count++;
    existingIds[itemId] = true;
    if (item.external_match_id) existingExternalIds[String(item.external_match_id).trim()] = true;
  }

  // Jika bukan dry-run, tulis secara BATCH untuk efisiensi kuota Apps Script
  if (!isDryRun && rowsToAppend.length > 0) {
    var startRow = sheet.getLastRow() + 1;
    var range = sheet.getRange(startRow, 1, rowsToAppend.length, expectedHeaders.length);
    range.setValues(rowsToAppend);
  }

  Logger.log('Laporan Import [' + sheetName + ']: ' + JSON.stringify(report, null, 2));
  return report;
}

/**
 * Parser format CSV
 */
function parseCsvContent(csvString, headers) {
  var csvData = Utilities.parseCsv(csvString);
  if (csvData.length === 0) return [];

  var result = [];
  var fileHeaders = csvData[0];

  for (var i = 1; i < csvData.length; i++) {
    var row = csvData[i];
    if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

    var obj = {};
    for (var j = 0; j < fileHeaders.length; j++) {
      var headerName = String(fileHeaders[j]).trim();
      obj[headerName] = row[j] !== undefined ? row[j] : '';
    }
    result.push(obj);
  }
  return result;
}

/**
 * Parser format JSON
 */
function parseJsonContent(jsonString) {
  var data = JSON.parse(jsonString);
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.rows)) return data.rows;
  return [data];
}

/**
 * Ekspor Data dari Sheet ke Format JSON String atau CSV String
 */
function exportData(sheetName, format) {
  var rows = getSheetRowsAsObjects(sheetName);
  if (format && format.toLowerCase() === 'csv') {
    if (rows.length === 0) return '';
    var headers = Object.keys(rows[0]);
    var lines = [headers.join(',')];

    rows.forEach(function(r) {
      var vals = headers.map(function(h) {
        var str = String(r[h] || '').replace(/"/g, '""');
        return '"' + str + '"';
      });
      lines.push(vals.join(','));
    });
    return lines.join('\n');
  }

  return JSON.stringify(rows, null, 2);
}
