/**
 * PERSIB Bandung Match Schedule & Management
 * Official Print & PDF Export System (A4 Portrait & Landscape)
 */

const PrintService = (function() {
  /**
   * Generates and triggers the formatted printable A4 document
   * @param {Object} options
   *   - filterType: 'all' | 'upcoming' | 'results' | 'month' | 'competition'
   *   - month: 'YYYY-MM' (if filterType === 'month')
   *   - competitionId: string (if filterType === 'competition')
   *   - orientation: 'portrait' | 'landscape'
   */
  async function generatePrintDocument(options = {}) {
    const {
      filterType = 'all',
      month = '',
      competitionId = '',
      orientation = 'portrait'
    } = options;

    // Fetch matches with current filters
    const matchesRes = await ApiService.getMatches({});
    const statsRes = await ApiService.getStatistics();
    const competitionsRes = await ApiService.getCompetitions();

    let matches = matchesRes.data || [];
    const stats = statsRes.data || {};
    const competitions = competitionsRes.data || [];

    // Filter accordingly
    let filterSubtitle = 'Seluruh Jadwal & Hasil Pertandingan';

    if (filterType === 'upcoming') {
      matches = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'LIVE');
      filterSubtitle = 'Daftar Pertandingan Mendatang (Upcoming Fixtures)';
    } else if (filterType === 'results') {
      matches = matches.filter(m => m.status === 'FINISHED');
      filterSubtitle = 'Hasil Pertandingan Selesai (Match Results)';
    } else if (filterType === 'month' && month) {
      matches = matches.filter(m => m.match_date && m.match_date.startsWith(month));
      const [year, mNum] = month.split('-');
      const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      const monthName = monthNames[parseInt(mNum, 10) - 1] || month;
      filterSubtitle = `Jadwal & Hasil Pertandingan Bulan ${monthName} ${year}`;
    } else if (filterType === 'competition' && competitionId) {
      matches = matches.filter(m => m.competition_id === competitionId);
      const comp = competitions.find(c => c.id === competitionId);
      filterSubtitle = `Jadwal & Hasil: ${comp ? comp.name : competitionId}`;
    }

    // Format current date in Asia/Jakarta
    const now = new Date();
    const printDateStr = new Intl.DateTimeFormat('id-ID', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: CONFIG.TIMEZONE
    }).format(now);

    // Apply orientation rule dynamically
    let styleSheet = document.getElementById('printOrientationStyle');
    if (!styleSheet) {
      styleSheet = document.createElement('style');
      styleSheet.id = 'printOrientationStyle';
      document.head.appendChild(styleSheet);
    }
    styleSheet.innerHTML = `@page { size: A4 ${orientation}; margin: 12mm 10mm 15mm 10mm; }`;

    // Ensure print container exists
    let printArea = document.getElementById('printDocumentArea');
    if (!printArea) {
      printArea = document.createElement('div');
      printArea.id = 'printDocumentArea';
      document.body.appendChild(printArea);
    }

    // Build print HTML content
    const rowsHtml = matches.map((m, idx) => {
      // Date in Indonesian
      const d = new Date(`${m.match_date}T00:00:00`);
      const dateFormatted = new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(d);

      let scoreOrTime = `${m.match_time || '19:00'} WIB`;
      if (m.status === 'FINISHED') {
        scoreOrTime = `<strong>${m.home_score ?? 0} - ${m.away_score ?? 0}</strong>`;
      } else if (m.status === 'LIVE') {
        scoreOrTime = `<span style="color:#d90429;font-weight:bold;">LIVE ${m.home_score ?? 0}-${m.away_score ?? 0}</span>`;
      }

      const statusIndo = CONFIG.STATUS_LABELS[m.status] || m.status;

      return `
        <tr>
          <td style="text-align:center;">${idx + 1}</td>
          <td>${dateFormatted}</td>
          <td>${m.competition ? m.competition.name : '-'}</td>
          <td style="font-weight:${m.home_team_id === 'T-001' ? 'bold' : 'normal'}">
            ${m.homeTeam ? m.homeTeam.name : 'Tuan Rumah'}
          </td>
          <td style="text-align:center;font-family:monospace;font-size:10pt;">${scoreOrTime}</td>
          <td style="font-weight:${m.away_team_id === 'T-001' ? 'bold' : 'normal'}">
            ${m.awayTeam ? m.awayTeam.name : 'Tamu'}
          </td>
          <td>${m.stadium ? m.stadium.name : '-'}</td>
          <td style="text-align:center;">${statusIndo}</td>
        </tr>
      `;
    }).join('');

    printArea.innerHTML = `
      <div class="print-header">
        <div style="display:flex;align-items:center;gap:14px;">
          <img src="https://upload.wikimedia.org/wikipedia/id/thumb/0/05/Logo_Persib_Bandung.svg/200px-Logo_Persib_Bandung.svg.png" 
               alt="PERSIB Logo" style="height:55px;width:auto;" />
          <div>
            <h1 class="print-club-title">PERSIB BANDUNG</h1>
            <div class="print-doc-subtitle">${filterSubtitle}</div>
            <div class="print-meta-text">Home Stadium: ${CONFIG.HOME_STADIUM} · Zona Waktu: Asia/Jakarta (WIB)</div>
          </div>
        </div>
        <div style="text-align:right;">
          <div style="font-size:11pt;font-weight:bold;color:#002B7F;">DOKUMEN RESMI</div>
          <div class="print-meta-text">Database: Google Sheets (GAS API)</div>
          <div class="print-meta-text">Total Laga: ${matches.length} Pertandingan</div>
        </div>
      </div>

      <div class="print-stats-box">
        <div><strong>Main:</strong> ${stats.played ?? 0}</div>
        <div><strong>Menang:</strong> ${stats.won ?? 0}</div>
        <div><strong>Seri:</strong> ${stats.drawn ?? 0}</div>
        <div><strong>Kalah:</strong> ${stats.lost ?? 0}</div>
        <div><strong>Gol (GF - GA):</strong> ${stats.goalsFor ?? 0} - ${stats.goalsAgainst ?? 0} (${(stats.goalDifference ?? 0) >= 0 ? '+' : ''}${stats.goalDifference ?? 0})</div>
        <div><strong>Poin:</strong> ${stats.points ?? 0}</div>
        <div><strong>Win Rate:</strong> ${stats.winRate ?? 0}%</div>
      </div>

      <table class="print-table">
        <thead>
          <tr>
            <th style="width:35px;text-align:center;">No</th>
            <th style="width:110px;">Hari & Tanggal</th>
            <th>Kompetisi</th>
            <th>Tuan Rumah</th>
            <th style="width:90px;text-align:center;">Skor / Waktu</th>
            <th>Tim Tamu</th>
            <th>Stadion</th>
            <th style="width:85px;text-align:center;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="8" style="text-align:center;padding:15px;">Tidak ada data pertandingan untuk filter ini.</td></tr>'}
        </tbody>
      </table>

      <div class="print-footer">
        <div>Dicetak melalui Official Website PERSIB Bandung Match Schedule</div>
        <div>Tanggal Cetak: ${printDateStr} WIB</div>
      </div>
    `;

    // Trigger browser print
    window.print();
  }

  return {
    generatePrintDocument
  };
})();

window.PrintService = PrintService;
