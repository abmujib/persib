/**
 * PERSIB Bandung Match Schedule & Management
 * Main Public Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});

const App = (function() {
  let allMatches = [];
  let competitions = [];
  let currentFilter = 'all'; // 'all', 'upcoming', 'results', 'calendar'
  let selectedCompetition = 'all';
  let searchQuery = '';
  let countdownInterval = null;
  let calendarMonth = new Date().getMonth();
  let calendarYear = new Date().getFullYear();

  async function init() {
    setupEventListeners();
    await loadInitialData();
  }

  async function loadInitialData() {
    renderLoadingState(true);
    try {
      // Parallel requests
      const [matchesRes, statsRes, compsRes] = await Promise.all([
        ApiService.getMatches(),
        ApiService.getStatistics(),
        ApiService.getCompetitions()
      ]);

      allMatches = matchesRes.data || [];
      competitions = compsRes.data || [];

      populateCompetitionFilter(competitions);
      renderStatistics(statsRes.data || {});
      setupNextMatchCountdown();
      applyFiltersAndRender();
      renderCalendar();
    } catch (err) {
      console.error('Error loading initial data:', err);
      showToast('Gagal memuat data pertandingan', 'danger');
    } finally {
      renderLoadingState(false);
    }
  }

  function setupEventListeners() {
    // Quick filter buttons
    const filterTabs = document.querySelectorAll('.filter-tab-btn');
    filterTabs.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterTabs.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentFilter = e.currentTarget.dataset.filter;

        if (currentFilter === 'calendar') {
          document.getElementById('matchesContainer').classList.add('d-none');
          document.getElementById('calendarSection').classList.remove('d-none');
        } else {
          document.getElementById('matchesContainer').classList.remove('d-none');
          document.getElementById('calendarSection').classList.add('d-none');
          applyFiltersAndRender();
        }
      });
    });

    // Competition filter dropdown
    const compSelect = document.getElementById('competitionFilter');
    if (compSelect) {
      compSelect.addEventListener('change', (e) => {
        selectedCompetition = e.target.value;
        applyFiltersAndRender();
      });
    }

    // Search bar input with debounce
    const searchInput = document.getElementById('matchSearchInput');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          searchQuery = e.target.value.trim().toLowerCase();
          applyFiltersAndRender();
        }, 250);
      });
    }

    // Calendar previous/next month buttons
    const prevMonthBtn = document.getElementById('prevMonthBtn');
    const nextMonthBtn = document.getElementById('nextMonthBtn');
    if (prevMonthBtn && nextMonthBtn) {
      prevMonthBtn.addEventListener('click', () => {
        calendarMonth--;
        if (calendarMonth < 0) {
          calendarMonth = 11;
          calendarYear--;
        }
        renderCalendar();
      });

      nextMonthBtn.addEventListener('click', () => {
        calendarMonth++;
        if (calendarMonth > 11) {
          calendarMonth = 0;
          calendarYear++;
        }
        renderCalendar();
      });
    }

    // Print Button Trigger from Navbar or Toolbar
    const openPrintModalBtn = document.getElementById('openPrintModalBtn');
    if (openPrintModalBtn) {
      openPrintModalBtn.addEventListener('click', () => {
        const modal = new bootstrap.Modal(document.getElementById('printOptionsModal'));
        modal.show();
      });
    }

    // Confirm Print Action
    const executePrintBtn = document.getElementById('executePrintBtn');
    if (executePrintBtn) {
      executePrintBtn.addEventListener('click', () => {
        const type = document.getElementById('printTypeSelect').value;
        const orientation = document.getElementById('printOrientationSelect').value;
        const month = document.getElementById('printMonthSelect').value;
        const comp = document.getElementById('printCompSelect').value;

        // Dismiss modal then trigger print
        const modalEl = document.getElementById('printOptionsModal');
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (modalInstance) modalInstance.hide();

        setTimeout(() => {
          PrintService.generatePrintDocument({
            filterType: type,
            month: month,
            competitionId: comp,
            orientation: orientation
          });
        }, 300);
      });
    }
  }

  function populateCompetitionFilter(comps) {
    const compSelect = document.getElementById('competitionFilter');
    const printCompSelect = document.getElementById('printCompSelect');
    if (!compSelect) return;

    let options = '<option value="all">Semua Kompetisi</option>';
    comps.forEach(c => {
      options += `<option value="${c.id}">${c.name}</option>`;
    });

    compSelect.innerHTML = options;
    if (printCompSelect) {
      printCompSelect.innerHTML = '<option value="">Semua Kompetisi</option>' + 
        comps.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    }
  }

  function renderStatistics(stats) {
    document.getElementById('statPlayed').textContent = stats.played ?? 0;
    document.getElementById('statWon').textContent = stats.won ?? 0;
    document.getElementById('statDrawn').textContent = stats.drawn ?? 0;
    document.getElementById('statLost').textContent = stats.lost ?? 0;
    document.getElementById('statPoints').textContent = stats.points ?? 0;
    document.getElementById('statWinRate').textContent = (stats.winRate ?? 0) + '%';
    document.getElementById('statGoals').textContent = `${stats.goalsFor ?? 0} : ${stats.goalsAgainst ?? 0}`;
    document.getElementById('statCleanSheet').textContent = stats.cleanSheets ?? 0;
  }

  function formatMatchTime(timeStr) {
    if (!timeStr || String(timeStr).includes('1899') || String(timeStr).includes('-') || timeStr === '00:00') {
      return '19:00';
    }
    return String(timeStr).trim();
  }

  // Next Match Live Countdown Setup
  function setupNextMatchCountdown() {
    if (countdownInterval) clearInterval(countdownInterval);

    // Find the next upcoming match (SCHEDULED or LIVE) with date >= today
    const now = new Date();
    const upcomingMatches = allMatches.filter(m => {
      const cleanTime = formatMatchTime(m.match_time);
      const matchDate = new Date(`${m.match_date}T${cleanTime}:00+07:00`);
      return m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'LIVE';
    }).sort((a, b) => {
      const timeA = formatMatchTime(a.match_time);
      const timeB = formatMatchTime(b.match_time);
      const dateA = new Date(`${a.match_date}T${timeA}:00+07:00`);
      const dateB = new Date(`${b.match_date}T${timeB}:00+07:00`);
      return dateA - dateB;
    });

    const nextMatch = upcomingMatches[0];
    const container = document.getElementById('nextMatchCardContent');
    if (!container) return;

    if (!nextMatch) {
      container.innerHTML = `
        <div class="text-center py-4 text-white-50">
          <i class="bi bi-calendar-check fs-1 d-block mb-2 text-warning"></i>
          <h5>Belum Ada Jadwal Pertandingan Mendatang</h5>
          <p class="small mb-0">Semua pertandingan musim ini telah selesai atau belum dijadwalkan.</p>
        </div>
      `;
      return;
    }

    const home = nextMatch.homeTeam || {};
    const away = nextMatch.awayTeam || {};
    const isPersibHome = nextMatch.home_team_id === 'T-001';

    // Format WIB Date
    const d = new Date(`${nextMatch.match_date}T00:00:00`);
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);

    const matchTimeWib = formatMatchTime(nextMatch.match_time);

    container.innerHTML = `
      <div class="d-flex flex-wrap justify-content-between align-items-center mb-3">
        <div class="next-match-kicker">
          <i class="bi bi-broadcast text-warning animate-pulse"></i> NEXT MATCH · ${nextMatch.competition ? nextMatch.competition.name : 'BRI Liga 1'}
        </div>
        <div class="text-white-50 small">
          <i class="bi bi-geo-alt me-1 text-warning"></i>${nextMatch.stadium ? nextMatch.stadium.name : 'Stadion GBLA'}
        </div>
      </div>

      <div class="row align-items-center text-center my-3">
        <!-- Home Team -->
        <div class="col-5">
          <img src="${home.logo || 'https://placehold.co/80x80/002B7F/ffffff?text=PERSIB'}" 
               alt="${home.name}" class="team-emblem-large mb-2" onerror="this.src='https://placehold.co/80x80/002B7F/ffffff?text=HOME'" />
          <div class="team-name-lg text-white ${isPersibHome ? 'fw-bold' : ''}">${home.name}</div>
          <span class="badge ${isPersibHome ? 'bg-primary' : 'bg-secondary'} mt-1">Tuan Rumah</span>
        </div>

        <!-- Center VS / Score -->
        <div class="col-2">
          <span class="vs-badge">VS</span>
          <div class="mt-2 text-warning fw-bold small">${matchTimeWib} WIB</div>
        </div>

        <!-- Away Team -->
        <div class="col-5">
          <img src="${away.logo || 'https://placehold.co/80x80/333333/ffffff?text=AWAY'}" 
               alt="${away.name}" class="team-emblem-large mb-2" onerror="this.src='https://placehold.co/80x80/333333/ffffff?text=AWAY'" />
          <div class="team-name-lg text-white ${!isPersibHome ? 'fw-bold' : ''}">${away.name}</div>
          <span class="badge ${!isPersibHome ? 'bg-primary' : 'bg-secondary'} mt-1">Tim Tamu</span>
        </div>
      </div>

      <div class="text-center text-white-50 small mb-3">
        <i class="bi bi-calendar3 me-1"></i> ${dateFormatted} · Kick-off: ${nextMatch.match_time || '19:00'} WIB
        ${nextMatch.broadcast ? ` · Siaran Langsung: <span class="text-white fw-semibold">${nextMatch.broadcast}</span>` : ''}
      </div>

      <!-- Live Countdown Blocks -->
      <div class="d-flex justify-content-center gap-2 mt-3" id="countdownGrid">
        <div class="countdown-box">
          <div class="countdown-num" id="cdDays">00</div>
          <div class="countdown-label">Hari</div>
        </div>
        <div class="countdown-box">
          <div class="countdown-num" id="cdHours">00</div>
          <div class="countdown-label">Jam</div>
        </div>
        <div class="countdown-box">
          <div class="countdown-num" id="cdMinutes">00</div>
          <div class="countdown-label">Menit</div>
        </div>
        <div class="countdown-box">
          <div class="countdown-num" id="cdSeconds">00</div>
          <div class="countdown-label">Detik</div>
        </div>
      </div>

      <div class="text-center mt-3">
        <button class="btn btn-sm btn-outline-light rounded-pill px-3" onclick="App.showMatchDetail('${nextMatch.id}')">
          <i class="bi bi-info-circle me-1"></i> Detail Pertandingan
        </button>
      </div>
    `;

    // Start timer
    const targetTime = new Date(`${nextMatch.match_date}T${nextMatch.match_time || '19:00'}:00+07:00`).getTime();

    function updateTimer() {
      const currentTime = new Date().getTime();
      const distance = targetTime - currentTime;

      if (distance < 0) {
        document.getElementById('countdownGrid').innerHTML = `
          <div class="alert alert-danger mb-0 py-2 w-100 text-center fw-bold">
            <i class="bi bi-record-circle me-1"></i> PERTANDINGAN SEDANG BERLANGSUNG ATAU SUDAH DIMULAI!
          </div>
        `;
        clearInterval(countdownInterval);
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      const dEl = document.getElementById('cdDays');
      const hEl = document.getElementById('cdHours');
      const mEl = document.getElementById('cdMinutes');
      const sEl = document.getElementById('cdSeconds');

      if (dEl) dEl.textContent = String(days).padStart(2, '0');
      if (hEl) hEl.textContent = String(hours).padStart(2, '0');
      if (mEl) mEl.textContent = String(minutes).padStart(2, '0');
      if (sEl) sEl.textContent = String(seconds).padStart(2, '0');
    }

    updateTimer();
    countdownInterval = setInterval(updateTimer, 1000);
  }

  // Filter and Render Matches
  function applyFiltersAndRender() {
    let filtered = [...allMatches];

    // Filter by type
    if (currentFilter === 'upcoming') {
      filtered = filtered.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED' || m.status === 'LIVE');
    } else if (currentFilter === 'results') {
      filtered = filtered.filter(m => m.status === 'FINISHED');
    }

    // Filter by competition
    if (selectedCompetition !== 'all') {
      filtered = filtered.filter(m => m.competition_id === selectedCompetition);
    }

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(m => {
        const hName = m.homeTeam?.name?.toLowerCase() || '';
        const aName = m.awayTeam?.name?.toLowerCase() || '';
        const std = m.stadium?.name?.toLowerCase() || '';
        const comp = m.competition?.name?.toLowerCase() || '';
        return hName.includes(searchQuery) || aName.includes(searchQuery) || std.includes(searchQuery) || comp.includes(searchQuery);
      });
    }

    renderMatchList(filtered);
  }

  function renderMatchList(matches) {
    const container = document.getElementById('matchesListRow');
    const emptyState = document.getElementById('emptyMatchState');
    const countBadge = document.getElementById('matchCountBadge');

    if (countBadge) {
      countBadge.textContent = `${matches.length} Pertandingan`;
    }

    if (!matches || matches.length === 0) {
      container.innerHTML = '';
      emptyState.classList.remove('d-none');
      return;
    }

    emptyState.classList.add('d-none');

    // Build Match Cards HTML
    const cardsHtml = matches.map(m => {
      const home = m.homeTeam || {};
      const away = m.awayTeam || {};
      const isPersibHome = m.home_team_id === 'T-001';
      const isFinished = m.status === 'FINISHED';
      const isLive = m.status === 'LIVE';

      // Indonesian date format
      const d = new Date(`${m.match_date}T00:00:00`);
      const dateFormatted = new Intl.DateTimeFormat('id-ID', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      }).format(d);

      const statusBadgeClass = CONFIG.STATUS_CLASSES[m.status] || 'status-scheduled';
      const statusLabel = CONFIG.STATUS_LABELS[m.status] || m.status;

      let scoreDisplay = '';
      if (isFinished) {
        scoreDisplay = `<div class="match-score-pill">${m.home_score ?? 0} - ${m.away_score ?? 0}</div>`;
      } else if (isLive) {
        scoreDisplay = `<div class="match-score-pill text-danger border-danger">${m.home_score ?? 0} - ${m.away_score ?? 0}</div>`;
      } else {
        scoreDisplay = `<div class="match-time-pill">${formatMatchTime(m.match_time)} WIB</div>`;
      }

      return `
        <div class="col-12 col-md-6 col-lg-4 mb-4">
          <div class="match-card">
            <!-- Header: Competition & Status -->
            <div class="match-meta-header">
              <span class="text-truncate me-2 text-primary fw-bold" title="${m.competition?.name || ''}">
                <i class="bi bi-trophy me-1"></i>${m.competition?.name || 'Kompetisi'}
              </span>
              <span class="match-status-badge ${statusBadgeClass}">
                ${isLive ? '<i class="bi bi-record-circle text-danger"></i>' : ''}
                ${statusLabel}
              </span>
            </div>

            <!-- Teams & Score / Time -->
            <div class="row align-items-center text-center my-auto py-2">
              <!-- Home -->
              <div class="col-4">
                <img src="${home.logo || 'https://placehold.co/60x60/002B7F/ffffff?text=PERSIB'}" 
                     alt="${home.name}" class="team-emblem-sm mb-1" onerror="this.src='https://placehold.co/60x60/002B7F/ffffff?text=HOME'" />
                <div class="small ${isPersibHome ? 'fw-bold text-primary' : 'text-dark'} text-truncate" title="${home.name}">
                  ${home.name}
                </div>
              </div>

              <!-- Score / Time -->
              <div class="col-4 px-1">
                ${scoreDisplay}
                <div class="text-muted mt-1" style="font-size:0.7rem;">${dateFormatted}</div>
              </div>

              <!-- Away -->
              <div class="col-4">
                <img src="${away.logo || 'https://placehold.co/60x60/333333/ffffff?text=AWAY'}" 
                     alt="${away.name}" class="team-emblem-sm mb-1" onerror="this.src='https://placehold.co/60x60/333333/ffffff?text=AWAY'" />
                <div class="small ${!isPersibHome ? 'fw-bold text-primary' : 'text-dark'} text-truncate" title="${away.name}">
                  ${away.name}
                </div>
              </div>
            </div>

            <!-- Footer: Stadium & Action -->
            <div class="mt-3 pt-2 border-top d-flex justify-content-between align-items-center text-muted" style="font-size:0.75rem;">
              <span class="text-truncate me-2" title="${m.stadium?.name || ''}">
                <i class="bi bi-geo-alt me-1"></i>${m.stadium?.name || 'Stadion'}
              </span>
              <button class="btn btn-sm btn-link text-decoration-none p-0 text-primary fw-semibold" onclick="App.showMatchDetail('${m.id}')">
                Detail <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = cardsHtml;
  }

  // Interactive Monthly Calendar View
  function renderCalendar() {
    const grid = document.getElementById('calendarGrid');
    const title = document.getElementById('calendarTitle');
    if (!grid || !title) return;

    const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    title.textContent = `${monthNames[calendarMonth]} ${calendarYear}`;

    // Compute days
    const firstDayIndex = new Date(calendarYear, calendarMonth, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(calendarYear, calendarMonth, 0).getDate();

    // Map matches for this month
    const currentMonthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
    const matchesThisMonth = allMatches.filter(m => m.match_date && m.match_date.startsWith(currentMonthPrefix));

    let cellsHtml = '';

    // Day headers (Min, Sen, Sel, Rab, Kam, Jum, Sab)
    const dayLabels = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    dayLabels.forEach(lbl => {
      cellsHtml += `<div class="calendar-day-name">${lbl}</div>`;
    });

    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cellsHtml += `<div class="calendar-day-cell other-month"><span>${daysInPrevMonth - i}</span></div>`;
    }

    // Days in current month
    const today = new Date();
    const isThisMonth = today.getFullYear() === calendarYear && today.getMonth() === calendarMonth;

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonthPrefix}-${String(day).padStart(2, '0')}`;
      const dayMatches = matchesThisMonth.filter(m => m.match_date === dateStr);
      const isToday = isThisMonth && today.getDate() === day;
      const hasMatch = dayMatches.length > 0;

      let matchBadges = '';
      if (hasMatch) {
        dayMatches.forEach(m => {
          const oppName = m.home_team_id === 'T-001' ? (m.awayTeam?.name || 'Lawan') : (m.homeTeam?.name || 'Lawan');
          matchBadges += `<div class="calendar-match-indicator" title="PERSIB vs ${oppName} (${m.match_time || '19:00'} WIB)">vs ${oppName}</div>`;
        });
      }

      cellsHtml += `
        <div class="calendar-day-cell ${isToday ? 'today' : ''} ${hasMatch ? 'has-match' : ''}" 
             ${hasMatch ? `onclick="App.showCalendarDayMatches('${dateStr}')"` : ''}>
          <span>${day}</span>
          ${matchBadges}
        </div>
      `;
    }

    // Remaining slots to make multiple of 7
    const totalSlots = (firstDayIndex + daysInMonth);
    const remaining = (7 - (totalSlots % 7)) % 7;
    for (let j = 1; j <= remaining; j++) {
      cellsHtml += `<div class="calendar-day-cell other-month"><span>${j}</span></div>`;
    }

    grid.innerHTML = cellsHtml;
  }

  function showCalendarDayMatches(dateStr) {
    const dayMatches = allMatches.filter(m => m.match_date === dateStr);
    if (dayMatches.length === 1) {
      showMatchDetail(dayMatches[0].id);
    } else if (dayMatches.length > 1) {
      currentFilter = 'all';
      document.querySelectorAll('.filter-tab-btn').forEach(b => b.classList.remove('active'));
      document.getElementById('matchesContainer').classList.remove('d-none');
      document.getElementById('calendarSection').classList.add('d-none');
      renderMatchList(dayMatches);
    }
  }

  // Match Detail Modal Display
  async function showMatchDetail(matchId) {
    const res = await ApiService.getMatchDetail(matchId);
    if (!res.success || !res.data) {
      showToast('Gagal memuat detail pertandingan', 'danger');
      return;
    }

    const m = res.data;
    const home = m.homeTeam || {};
    const away = m.awayTeam || {};
    const isFinished = m.status === 'FINISHED';
    const isLive = m.status === 'LIVE';

    const d = new Date(`${m.match_date}T00:00:00`);
    const dateFormatted = new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    }).format(d);

    const modalBody = document.getElementById('matchDetailModalBody');
    if (!modalBody) return;

    modalBody.innerHTML = `
      <div class="text-center p-3 bg-light rounded mb-3">
        <span class="badge bg-primary mb-2">${m.competition ? m.competition.name : 'Kompetisi Resmi'}</span>
        <div class="row align-items-center justify-content-center">
          <div class="col-4">
            <img src="${home.logo || 'https://placehold.co/70x70/002B7F/ffffff?text=PERSIB'}" 
                 class="team-emblem-large mb-2" alt="${home.name}" onerror="this.src='https://placehold.co/70x70/002B7F/ffffff?text=HOME'" />
            <h6 class="fw-bold mb-0">${home.name}</h6>
            <small class="text-muted">Tuan Rumah</small>
          </div>
          <div class="col-4">
            ${isFinished || isLive ? `
              <div class="display-6 fw-bold text-primary font-monospace">${m.home_score ?? 0} - ${m.away_score ?? 0}</div>
              <span class="badge ${CONFIG.STATUS_CLASSES[m.status]} mt-1">${CONFIG.STATUS_LABELS[m.status]}</span>
            ` : `
              <div class="fs-4 fw-bold text-primary font-monospace">${m.match_time || '19:00'} WIB</div>
              <span class="badge bg-secondary mt-1">Belum Dimulai</span>
            `}
          </div>
          <div class="col-4">
            <img src="${away.logo || 'https://placehold.co/70x70/333333/ffffff?text=AWAY'}" 
                 class="team-emblem-large mb-2" alt="${away.name}" onerror="this.src='https://placehold.co/70x70/333333/ffffff?text=AWAY'" />
            <h6 class="fw-bold mb-0">${away.name}</h6>
            <small class="text-muted">Tim Tamu</small>
          </div>
        </div>
      </div>

      <div class="list-group list-group-flush mb-3">
        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span class="text-muted"><i class="bi bi-calendar3 me-2"></i>Hari & Tanggal</span>
          <span class="fw-semibold">${dateFormatted}</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span class="text-muted"><i class="bi bi-clock me-2"></i>Waktu Kick-off</span>
          <span class="fw-semibold font-monospace">${m.match_time || '19:00'} WIB (Asia/Jakarta)</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span class="text-muted"><i class="bi bi-geo-alt me-2"></i>Stadion & Kota</span>
          <span class="fw-semibold">${m.stadium ? m.stadium.name : 'Stadion GBLA'} (${m.stadium ? m.stadium.city : 'Bandung'})</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span class="text-muted"><i class="bi bi-person-badge me-2"></i>Wasit Utama</span>
          <span class="fw-semibold">${m.referee || 'Belum Diumumkan'}</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span class="text-muted"><i class="bi bi-tv me-2"></i>Siaran Resmi</span>
          <span class="fw-semibold">${m.broadcast || 'Indosiar & Vidio'}</span>
        </div>
        <div class="list-group-item d-flex justify-content-between align-items-center px-0">
          <span class="text-muted"><i class="bi bi-database me-2"></i>Sumber Data</span>
          <span class="badge ${m.data_source === 'Football API' ? 'bg-success' : 'bg-info'}">${m.data_source || 'Manual'}</span>
        </div>
      </div>

      ${m.notes ? `
        <div class="p-3 bg-light rounded text-muted small border">
          <strong class="d-block mb-1 text-dark"><i class="bi bi-chat-left-text me-1"></i>Catatan Pertandingan:</strong>
          ${m.notes}
        </div>
      ` : ''}
    `;

    const modal = new bootstrap.Modal(document.getElementById('matchDetailModal'));
    modal.show();
  }

  // Security helper: sanitize dynamic strings against XSS injection
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function renderLoadingState(isLoading) {
    const loader = document.getElementById('matchesLoadingState');
    if (loader) {
      loader.classList.toggle('d-none', !isLoading);
    }
  }

  function showToast(message, type = 'primary') {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
      document.body.appendChild(container);
    }

    const toastId = 'toast_' + Date.now();
    const html = `
      <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
  }

  return {
    init,
    showMatchDetail,
    showCalendarDayMatches,
    showToast
  };
})();

window.App = App;
