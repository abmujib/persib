/**
 * PERSIB Bandung Match Schedule & Management
 * Administrator Dashboard Logic
 */

document.addEventListener('DOMContentLoaded', () => {
  AdminApp.init();
});

const AdminApp = (function() {
  let matches = [];
  let teams = [];
  let competitions = [];
  let stadiums = [];
  let seasons = [];
  let syncLogs = [];

  async function init() {
    setupAuthListeners();
    checkAuthSession();
  }

  function checkAuthSession() {
    if (ApiService.isAuthenticated()) {
      showAdminDashboard();
    } else {
      showLoginView();
    }
  }

  function setupAuthListeners() {
    // Login form
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }

    // Logout button
    const logoutBtn = document.getElementById('adminLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    const usernameInput = document.getElementById('adminUsername');
    const passwordInput = document.getElementById('adminPassword');
    const alertBox = document.getElementById('loginAlertBox');

    const username = usernameInput.value.trim().toLowerCase();
    const password = passwordInput.value.trim();

    alertBox.classList.add('d-none');

    try {
      const res = await ApiService.login(username, password);
      if (res.success) {
        showToast('Login berhasil. Selamat datang kembali, Administrator!', 'success');
        showAdminDashboard();
      } else {
        alertBox.textContent = res.message || 'Login gagal. Periksa username dan password.';
        alertBox.classList.remove('d-none');
      }
    } catch (err) {
      alertBox.textContent = 'Terjadi kesalahan sistem saat verifikasi login.';
      alertBox.classList.remove('d-none');
    }
  }

  function handleLogout() {
    ApiService.logout();
    showLoginView();
    showToast('Anda telah logout dengan aman.', 'info');
  }

  function showLoginView() {
    document.getElementById('adminLoginSection').classList.remove('d-none');
    document.getElementById('adminDashboardSection').classList.add('d-none');
  }

  async function showAdminDashboard() {
    document.getElementById('adminLoginSection').classList.add('d-none');
    document.getElementById('adminDashboardSection').classList.remove('d-none');

    const user = ApiService.getAuthUser();
    const userDisplay = document.getElementById('adminUserDisplay');
    if (userDisplay && user) {
      userDisplay.textContent = user.username;
    }

    setupDashboardTabs();
    setupCrudListeners();
    await loadAllAdminData();
  }

  function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggleBtn');
    const layoutWrapper = document.querySelector('.admin-layout-wrapper');
    if (toggleBtn && layoutWrapper) {
      toggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (window.innerWidth < 992) {
          layoutWrapper.classList.toggle('sidebar-open');
        } else {
          layoutWrapper.classList.toggle('sidebar-collapsed');
        }
      });
    }
  }

  function setupDashboardTabs() {
    setupSidebarToggle();

    const navItems = document.querySelectorAll('.admin-nav-link');
    const titleEl = document.getElementById('currentViewTitle');
    const breadcrumbEl = document.getElementById('currentViewBreadcrumb');

    const viewMetaData = {
      overview: {
        title: '<i class="bi bi-speedometer2 text-primary me-2"></i>Dashboard Overview',
        breadcrumb: 'Overview'
      },
      matches: {
        title: '<i class="bi bi-calendar-check-fill text-warning me-2"></i>Jadwal & Hasil Pertandingan PERSIB',
        breadcrumb: 'Jadwal & Skor'
      },
      teams: {
        title: '<i class="bi bi-shield-fill text-info me-2"></i>Daftar Tim Lawan & Logo',
        breadcrumb: 'Tim Lawan'
      },
      stadiums: {
        title: '<i class="bi bi-geo-alt-fill text-success me-2"></i>Manajemen Stadion & Lokasi',
        breadcrumb: 'Stadion'
      },
      competitions: {
        title: '<i class="bi bi-trophy-fill text-warning me-2"></i>Kompetisi Resmi & Turnamen',
        breadcrumb: 'Kompetisi'
      },
      sync: {
        title: '<i class="bi bi-arrow-repeat text-primary me-2"></i>Football API Sync Settings',
        breadcrumb: 'API Sync'
      },
      logs: {
        title: '<i class="bi bi-journal-code text-secondary me-2"></i>Riwayat Log Sinkronisasi API',
        breadcrumb: 'Sync Logs'
      },
      database: {
        title: '<i class="bi bi-database-gear text-danger me-2"></i>Database Tools & Backup',
        breadcrumb: 'Database'
      }
    };

    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const targetView = item.dataset.view;
        if (!targetView) return;

        // Highlight matching nav items across sidebar and header
        navItems.forEach(n => {
          if (n.dataset.view === targetView) {
            n.classList.add('active');
          } else {
            n.classList.remove('active');
          }
        });

        // Show target panel
        document.querySelectorAll('.admin-view-panel').forEach(p => p.classList.add('d-none'));
        const panel = document.getElementById(`panel_${targetView}`);
        if (panel) panel.classList.remove('d-none');

        // Update header title & breadcrumb
        const meta = viewMetaData[targetView];
        if (meta) {
          if (titleEl) titleEl.innerHTML = meta.title;
          if (breadcrumbEl) breadcrumbEl.textContent = meta.breadcrumb;
        }

        // Close sidebar on mobile upon item selection
        if (window.innerWidth < 992) {
          const wrapper = document.querySelector('.admin-layout-wrapper');
          if (wrapper) wrapper.classList.remove('sidebar-open');
        }
      });
    });
  }

  async function loadAllAdminData() {
    try {
      const [mRes, tRes, cRes, sRes, seasRes, logsRes] = await Promise.all([
        ApiService.getMatches(),
        ApiService.getTeams(),
        ApiService.getCompetitions(),
        ApiService.getStadiums(),
        ApiService.getSeasons(),
        ApiService.getSyncLogs()
      ]);

      matches = mRes.data || [];
      teams = tRes.data || [];
      competitions = cRes.data || [];
      stadiums = sRes.data || [];
      seasons = seasRes.data || [];
      syncLogs = logsRes.data || [];

      renderOverviewStats();
      renderMatchesTable();
      renderTeamsTable();
      renderStadiumsTable();
      renderCompetitionsTable();
      renderSyncLogsTable();
      populateFormDropdowns();
    } catch (err) {
      console.error('Error loading admin datasets:', err);
      showToast('Gagal memuat dataset admin', 'danger');
    }
  }

  function renderOverviewStats() {
    const upcomingCount = matches.filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED').length;
    const finishedCount = matches.filter(m => m.status === 'FINISHED').length;

    const totalEl = document.getElementById('adminStatTotalMatches');
    const upcomingEl = document.getElementById('adminStatUpcoming');
    const finishedEl = document.getElementById('adminStatFinished');
    const teamsEl = document.getElementById('adminStatTeams');
    const syncsEl = document.getElementById('adminStatSyncs');

    if (totalEl) totalEl.textContent = matches.length;
    if (upcomingEl) upcomingEl.textContent = upcomingCount;
    if (finishedEl) finishedEl.textContent = finishedCount;
    if (teamsEl) teamsEl.textContent = teams.length;
    if (syncsEl) syncsEl.textContent = syncLogs.length;

    // Sidebar badge counts
    const badgeMatches = document.getElementById('sidebarBadgeMatches');
    const badgeTeams = document.getElementById('sidebarBadgeTeams');
    if (badgeMatches) badgeMatches.textContent = matches.length;
    if (badgeTeams) badgeTeams.textContent = teams.length;
  }

  function renderMatchesTable() {
    const tbody = document.getElementById('adminMatchesTableBody');
    if (!tbody) return;

    if (matches.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">Belum ada data pertandingan. Silakan tambahkan pertandingan baru.</td></tr>';
      return;
    }

    const rows = matches.map((m, idx) => {
      const statusBadge = CONFIG.STATUS_CLASSES[m.status] || 'status-scheduled';
      const statusLabel = CONFIG.STATUS_LABELS[m.status] || m.status;
      const isFinished = m.status === 'FINISHED';
      const scoreStr = isFinished ? `${m.home_score ?? 0} - ${m.away_score ?? 0}` : '-';

      return `
        <tr>
          <td class="text-center">${idx + 1}</td>
          <td>
            <strong>${m.match_date}</strong><br>
            <small class="text-muted font-monospace">${(!m.match_time || String(m.match_time).includes('1899') || String(m.match_time).includes('-')) ? '19:00' : m.match_time} WIB</small>
          </td>
          <td>
            <span class="badge bg-light text-dark border">${m.competition?.name || '-'}</span>
          </td>
          <td>
            <div class="d-flex align-items-center gap-2">
              <span class="${m.home_team_id === 'T-001' ? 'fw-bold text-primary' : ''}">${m.homeTeam?.name || 'Tuan Rumah'}</span>
              <span class="text-muted small">vs</span>
              <span class="${m.away_team_id === 'T-001' ? 'fw-bold text-primary' : ''}">${m.awayTeam?.name || 'Tamu'}</span>
            </div>
            <small class="text-muted"><i class="bi bi-geo-alt me-1"></i>${m.stadium?.name || '-'}</small>
          </td>
          <td class="text-center font-monospace fw-bold">${scoreStr}</td>
          <td>
            <span class="match-status-badge ${statusBadge}">${statusLabel}</span><br>
            <span class="badge ${m.data_source === 'Football API' ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}" style="font-size:0.65rem;">
              ${m.data_source || 'Manual'}
            </span>
          </td>
          <td class="text-end">
            <div class="btn-group btn-group-sm">
              <button class="btn btn-outline-success" title="Update Skor" onclick="AdminApp.openScoreModal('${m.id}')">
                <i class="bi bi-pencil-square"></i> Skor
              </button>
              <button class="btn btn-outline-primary" title="Edit Pertandingan" onclick="AdminApp.openEditMatchModal('${m.id}')">
                <i class="bi bi-pencil"></i>
              </button>
              <button class="btn btn-outline-danger" title="Hapus Pertandingan" onclick="AdminApp.deleteMatch('${m.id}')">
                <i class="bi bi-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    tbody.innerHTML = rows;
  }

  function renderTeamsTable() {
    const tbody = document.getElementById('adminTeamsTableBody');
    if (!tbody) return;

    if (teams.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada tim lawan terdaftar.</td></tr>';
      return;
    }

    tbody.innerHTML = teams.map((t, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>
          <img src="${t.logo}" alt="${escapeHtml(t.name)}" style="height:34px;width:34px;object-fit:contain;" 
               onerror="this.src='https://placehold.co/40x40/002B7F/ffffff?text=${encodeURIComponent((t.code || t.name || 'TIM').substring(0, 3).toUpperCase())}'" />
        </td>
        <td><strong>${escapeHtml(t.name)}</strong> ${t.id === 'T-001' ? '<span class="badge bg-primary ms-1">Tim Utama</span>' : ''}</td>
        <td><span class="badge bg-light text-dark font-monospace">${escapeHtml(t.code || '-')}</span></td>
        <td><span class="badge bg-secondary-subtle text-secondary font-monospace" style="font-size:0.7rem;">${t.id}</span></td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Edit Tim" onclick="AdminApp.openEditTeamModal('${t.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            ${t.id !== 'T-001' ? `
              <button class="btn btn-outline-danger" title="Hapus Tim" onclick="AdminApp.deleteTeam('${t.id}')">
                <i class="bi bi-trash"></i>
              </button>
            ` : `
              <button class="btn btn-outline-secondary" disabled title="Tim utama tidak dapat dihapus">
                <i class="bi bi-lock"></i>
              </button>
            `}
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderStadiumsTable() {
    const tbody = document.getElementById('adminStadiumsTableBody');
    if (!tbody) return;

    if (stadiums.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">Belum ada data stadion.</td></tr>';
      return;
    }

    tbody.innerHTML = stadiums.map((s, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td><strong>${escapeHtml(s.name)}</strong></td>
        <td>${escapeHtml(s.city || '-')}</td>
        <td><span class="badge bg-secondary-subtle text-secondary font-monospace" style="font-size:0.7rem;">${s.id}</span></td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Edit Stadion" onclick="AdminApp.openEditStadiumModal('${s.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" title="Hapus Stadion" onclick="AdminApp.deleteStadium('${s.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderCompetitionsTable() {
    const tbody = document.getElementById('adminCompetitionsTableBody');
    if (!tbody) return;

    if (competitions.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted">Belum ada data kompetisi.</td></tr>';
      return;
    }

    tbody.innerHTML = competitions.map((c, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td>
          <img src="${c.logo}" alt="${escapeHtml(c.name)}" style="height:32px;width:32px;object-fit:contain;" 
               onerror="this.src='https://placehold.co/40x40/002B7F/ffffff?text=${encodeURIComponent((c.code || c.name || 'COMP').substring(0, 4).toUpperCase())}'" />
        </td>
        <td><strong>${escapeHtml(c.name)}</strong></td>
        <td><span class="badge bg-light text-dark font-monospace">${escapeHtml(c.code || '-')}</span></td>
        <td><span class="badge bg-secondary-subtle text-secondary font-monospace" style="font-size:0.7rem;">${c.id}</span></td>
        <td class="text-end">
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-primary" title="Edit Kompetisi" onclick="AdminApp.openEditCompetitionModal('${c.id}')">
              <i class="bi bi-pencil"></i>
            </button>
            <button class="btn btn-outline-danger" title="Hapus Kompetisi" onclick="AdminApp.deleteCompetition('${c.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `).join('');
  }

  function renderSyncLogsTable() {
    const tbody = document.getElementById('adminSyncLogsTableBody');
    if (!tbody) return;

    if (syncLogs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center py-3 text-muted">Belum ada riwayat log sinkronisasi.</td></tr>';
      return;
    }

    tbody.innerHTML = syncLogs.map((l, idx) => `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="small font-monospace">${new Date(l.created_at).toLocaleString('id-ID')}</td>
        <td><span class="badge ${l.sync_type === 'AUTOMATIC_TRIGGER' ? 'bg-info' : 'bg-primary'}">${l.sync_type}</span></td>
        <td><span class="badge ${l.status === 'SUCCESS' ? 'bg-success' : 'bg-danger'}">${l.status}</span></td>
        <td class="small">${l.message}</td>
      </tr>
    `).join('');
  }

  function populateFormDropdowns() {
    const homeSelect = document.getElementById('matchHomeTeam');
    const awaySelect = document.getElementById('matchAwayTeam');
    const compSelect = document.getElementById('matchCompetition');
    const stadiumSelect = document.getElementById('matchStadium');
    const seasonSelect = document.getElementById('matchSeason');

    if (!homeSelect) return;

    const teamOpts = teams.map(t => `<option value="${t.id}">${t.name} (${t.code || ''})</option>`).join('');
    homeSelect.innerHTML = teamOpts;
    awaySelect.innerHTML = teamOpts;

    // Set PERSIB default home
    homeSelect.value = 'T-001';

    compSelect.innerHTML = competitions.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
    stadiumSelect.innerHTML = stadiums.map(s => `<option value="${s.id}">${s.name} (${s.city})</option>`).join('');
    seasonSelect.innerHTML = seasons.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  }

  function setupCrudListeners() {
    // Add Match Modal Form Submit
    const matchForm = document.getElementById('adminMatchForm');
    if (matchForm) {
      matchForm.addEventListener('submit', handleSaveMatch);
    }

    // Score Update Modal Form Submit
    const scoreForm = document.getElementById('adminScoreForm');
    if (scoreForm) {
      scoreForm.addEventListener('submit', handleSaveScore);
    }

    // Add Team Form Submit
    const teamForm = document.getElementById('adminTeamForm');
    if (teamForm) {
      teamForm.addEventListener('submit', handleSaveTeam);
    }

    // Add Stadium Form Submit
    const stadiumForm = document.getElementById('adminStadiumForm');
    if (stadiumForm) {
      stadiumForm.addEventListener('submit', handleSaveStadium);
    }

    // Add Competition Form Submit
    const compForm = document.getElementById('adminCompetitionForm');
    if (compForm) {
      compForm.addEventListener('submit', handleSaveCompetition);
    }

    // Manual Sync Button
    const syncBtn = document.getElementById('runManualSyncBtn');
    if (syncBtn) {
      syncBtn.addEventListener('click', handleManualSync);
    }

    // Reset Database Button
    const resetBtn = document.getElementById('resetDatabaseBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', handleResetDatabase);
    }

    // Backup Database JSON Button
    const backupBtn = document.getElementById('backupDatabaseBtn');
    if (backupBtn) {
      backupBtn.addEventListener('click', handleExportBackup);
    }
  }

  // Open Create Match Modal
  function openAddMatchModal() {
    document.getElementById('adminMatchModalTitle').textContent = 'Tambah Jadwal Pertandingan Baru';
    document.getElementById('matchEditId').value = '';
    document.getElementById('adminMatchForm').reset();
    document.getElementById('matchHomeTeam').value = 'T-001';
    document.getElementById('matchStatus').value = 'SCHEDULED';

    const modal = new bootstrap.Modal(document.getElementById('adminMatchModal'));
    modal.show();
  }

  // Open Edit Match Modal
  function openEditMatchModal(id) {
    const m = matches.find(item => item.id === id);
    if (!m) return;

    document.getElementById('adminMatchModalTitle').textContent = 'Edit Data Pertandingan';
    document.getElementById('matchEditId').value = m.id;
    document.getElementById('matchCompetition').value = m.competition_id;
    document.getElementById('matchSeason').value = m.season_id;
    document.getElementById('matchHomeTeam').value = m.home_team_id;
    document.getElementById('matchAwayTeam').value = m.away_team_id;
    document.getElementById('matchStadium').value = m.stadium_id;
    document.getElementById('matchDate').value = m.match_date;
    document.getElementById('matchTime').value = m.match_time || '19:00';
    document.getElementById('matchHomeScore').value = m.home_score !== null ? m.home_score : '';
    document.getElementById('matchAwayScore').value = m.away_score !== null ? m.away_score : '';
    document.getElementById('matchStatus').value = m.status;
    document.getElementById('matchReferee').value = m.referee || '';
    document.getElementById('matchBroadcast').value = m.broadcast || '';
    document.getElementById('matchNotes').value = m.notes || '';

    const modal = new bootstrap.Modal(document.getElementById('adminMatchModal'));
    modal.show();
  }

  // Save (Create or Update) Match
  async function handleSaveMatch(e) {
    e.preventDefault();
    const editId = document.getElementById('matchEditId').value;

    const matchData = {
      competition_id: document.getElementById('matchCompetition').value,
      season_id: document.getElementById('matchSeason').value,
      home_team_id: document.getElementById('matchHomeTeam').value,
      away_team_id: document.getElementById('matchAwayTeam').value,
      stadium_id: document.getElementById('matchStadium').value,
      match_date: document.getElementById('matchDate').value,
      match_time: document.getElementById('matchTime').value,
      home_score: document.getElementById('matchHomeScore').value,
      away_score: document.getElementById('matchAwayScore').value,
      status: document.getElementById('matchStatus').value,
      referee: document.getElementById('matchReferee').value,
      broadcast: document.getElementById('matchBroadcast').value,
      notes: document.getElementById('matchNotes').value
    };

    if (matchData.home_team_id === matchData.away_team_id) {
      alert('Tuan rumah dan tim tamu tidak boleh sama!');
      return;
    }

    try {
      if (editId) {
        await ApiService.updateMatch(editId, matchData);
        showToast('Data pertandingan berhasil diperbarui!', 'success');
      } else {
        await ApiService.createMatch(matchData);
        showToast('Jadwal pertandingan baru berhasil ditambahkan!', 'success');
      }

      const modalEl = document.getElementById('adminMatchModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal menyimpan pertandingan: ' + err.message, 'danger');
    }
  }

  // Open Score Modal
  function openScoreModal(id) {
    const m = matches.find(item => item.id === id);
    if (!m) return;

    document.getElementById('scoreMatchId').value = m.id;
    document.getElementById('scoreMatchTitle').textContent = `${m.homeTeam?.name || 'Home'} vs ${m.awayTeam?.name || 'Away'}`;
    document.getElementById('scoreHomeName').textContent = m.homeTeam?.name || 'Home';
    document.getElementById('scoreAwayName').textContent = m.awayTeam?.name || 'Away';
    document.getElementById('scoreHomeInput').value = m.home_score !== null ? m.home_score : 0;
    document.getElementById('scoreAwayInput').value = m.away_score !== null ? m.away_score : 0;
    document.getElementById('scoreStatusSelect').value = m.status === 'SCHEDULED' ? 'FINISHED' : m.status;

    const modal = new bootstrap.Modal(document.getElementById('adminScoreModal'));
    modal.show();
  }

  // Save Quick Score
  async function handleSaveScore(e) {
    e.preventDefault();
    const id = document.getElementById('scoreMatchId').value;
    const homeScore = Number(document.getElementById('scoreHomeInput').value);
    const awayScore = Number(document.getElementById('scoreAwayInput').value);
    const status = document.getElementById('scoreStatusSelect').value;

    try {
      await ApiService.updateScore(id, homeScore, awayScore, status);
      showToast('Skor pertandingan dan status berhasil disimpan!', 'success');

      const modalEl = document.getElementById('adminScoreModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();

      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal memperbarui skor: ' + err.message, 'danger');
    }
  }

  // Delete Match
  async function deleteMatch(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus pertandingan ini? Tindakan ini tidak dapat dibatalkan.')) {
      return;
    }

    try {
      await ApiService.deleteMatch(id);
      showToast('Pertandingan telah dihapus.', 'info');
      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal menghapus pertandingan: ' + err.message, 'danger');
    }
  }

  // ==========================================
  // TEAMS CRUD HANDLERS
  // ==========================================
  function openAddTeamModal() {
    document.getElementById('adminTeamModalTitle').textContent = 'Tambah Tim Lawan Baru';
    document.getElementById('teamEditId').value = '';
    document.getElementById('adminTeamForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('adminTeamModal'));
    modal.show();
  }

  function openEditTeamModal(id) {
    const t = teams.find(item => String(item.id) === String(id));
    if (!t) return;

    document.getElementById('adminTeamModalTitle').textContent = `Edit Data Tim: ${t.name}`;
    document.getElementById('teamEditId').value = t.id;
    document.getElementById('teamNameInput').value = t.name || '';
    document.getElementById('teamCodeInput').value = t.code || '';
    document.getElementById('teamLogoInput').value = t.logo || '';

    const modal = new bootstrap.Modal(document.getElementById('adminTeamModal'));
    modal.show();
  }

  async function handleSaveTeam(e) {
    e.preventDefault();
    const editId = document.getElementById('teamEditId').value.trim();
    const name = document.getElementById('teamNameInput').value.trim();
    const code = document.getElementById('teamCodeInput').value.trim().toUpperCase();
    const logo = document.getElementById('teamLogoInput').value.trim();

    try {
      if (editId) {
        await ApiService.updateTeam(editId, { name, code, logo });
        showToast(`Data tim ${name} berhasil diperbarui!`, 'success');
      } else {
        await ApiService.createTeam({ name, code, logo });
        showToast(`Tim ${name} berhasil ditambahkan!`, 'success');
      }

      const modalEl = document.getElementById('adminTeamModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      document.getElementById('adminTeamForm').reset();

      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal memproses data tim: ' + err.message, 'danger');
    }
  }

  async function deleteTeam(id) {
    if (id === 'T-001') {
      alert('Tim utama PERSIB Bandung tidak boleh dihapus!');
      return;
    }
    const t = teams.find(item => String(item.id) === String(id));
    const teamName = t ? t.name : 'tim ini';
    if (!confirm(`Apakah Anda yakin ingin menghapus "${teamName}" dari daftar tim lawan?`)) return;

    try {
      await ApiService.deleteTeam(id);
      showToast(`Tim "${teamName}" telah dihapus.`, 'info');
      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal menghapus tim: ' + err.message, 'danger');
    }
  }

  // ==========================================
  // STADIUMS CRUD HANDLERS
  // ==========================================
  function openAddStadiumModal() {
    document.getElementById('adminStadiumModalTitle').textContent = 'Tambah Stadion Baru';
    document.getElementById('stadiumEditId').value = '';
    document.getElementById('adminStadiumForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('adminStadiumModal'));
    modal.show();
  }

  function openEditStadiumModal(id) {
    const s = stadiums.find(item => String(item.id) === String(id));
    if (!s) return;

    document.getElementById('adminStadiumModalTitle').textContent = `Edit Data Stadion: ${s.name}`;
    document.getElementById('stadiumEditId').value = s.id;
    document.getElementById('stadiumNameInput').value = s.name || '';
    document.getElementById('stadiumCityInput').value = s.city || '';

    const modal = new bootstrap.Modal(document.getElementById('adminStadiumModal'));
    modal.show();
  }

  async function handleSaveStadium(e) {
    e.preventDefault();
    const editId = document.getElementById('stadiumEditId').value.trim();
    const name = document.getElementById('stadiumNameInput').value.trim();
    const city = document.getElementById('stadiumCityInput').value.trim();

    try {
      if (editId) {
        await ApiService.updateStadium(editId, { name, city });
        showToast(`Data stadion ${name} berhasil diperbarui!`, 'success');
      } else {
        await ApiService.createStadium({ name, city });
        showToast(`Stadion ${name} berhasil didaftarkan!`, 'success');
      }

      const modalEl = document.getElementById('adminStadiumModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      document.getElementById('adminStadiumForm').reset();

      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal memproses data stadion: ' + err.message, 'danger');
    }
  }

  async function deleteStadium(id) {
    const s = stadiums.find(item => String(item.id) === String(id));
    const stadiumName = s ? s.name : 'stadion ini';
    if (!confirm(`Apakah Anda yakin ingin menghapus "${stadiumName}"?`)) return;

    try {
      await ApiService.deleteStadium(id);
      showToast(`Stadion "${stadiumName}" telah dihapus.`, 'info');
      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal menghapus stadion: ' + err.message, 'danger');
    }
  }

  // ==========================================
  // COMPETITIONS CRUD HANDLERS
  // ==========================================
  function openAddCompetitionModal() {
    document.getElementById('adminCompModalTitle').textContent = 'Tambah Kompetisi & Turnamen Baru';
    document.getElementById('compEditId').value = '';
    document.getElementById('adminCompetitionForm').reset();
    const modal = new bootstrap.Modal(document.getElementById('adminCompetitionModal'));
    modal.show();
  }

  function openEditCompetitionModal(id) {
    const c = competitions.find(item => String(item.id) === String(id));
    if (!c) return;

    document.getElementById('adminCompModalTitle').textContent = `Edit Kompetisi: ${c.name}`;
    document.getElementById('compEditId').value = c.id;
    document.getElementById('compNameInput').value = c.name || '';
    document.getElementById('compCodeInput').value = c.code || '';
    document.getElementById('compLogoInput').value = c.logo || '';

    const modal = new bootstrap.Modal(document.getElementById('adminCompetitionModal'));
    modal.show();
  }

  async function handleSaveCompetition(e) {
    e.preventDefault();
    const editId = document.getElementById('compEditId').value.trim();
    const name = document.getElementById('compNameInput').value.trim();
    const code = document.getElementById('compCodeInput').value.trim().toUpperCase();
    const logo = document.getElementById('compLogoInput').value.trim();

    try {
      if (editId) {
        await ApiService.updateCompetition(editId, { name, code, logo });
        showToast(`Kompetisi ${name} berhasil diperbarui!`, 'success');
      } else {
        await ApiService.createCompetition({ name, code, logo });
        showToast(`Kompetisi ${name} berhasil ditambahkan!`, 'success');
      }

      const modalEl = document.getElementById('adminCompetitionModal');
      const modal = bootstrap.Modal.getInstance(modalEl);
      if (modal) modal.hide();
      document.getElementById('adminCompetitionForm').reset();

      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal memproses data kompetisi: ' + err.message, 'danger');
    }
  }

  async function deleteCompetition(id) {
    const c = competitions.find(item => String(item.id) === String(id));
    const compName = c ? c.name : 'kompetisi ini';
    if (!confirm(`Apakah Anda yakin ingin menghapus "${compName}" dari daftar kompetisi?`)) return;

    try {
      await ApiService.deleteCompetition(id);
      showToast(`Kompetisi "${compName}" telah dihapus.`, 'info');
      await loadAllAdminData();
    } catch (err) {
      showToast('Gagal menghapus kompetisi: ' + err.message, 'danger');
    }
  }

  // ==========================================
  // SYNC & DATABASE TOOLS
  // ==========================================
  async function handleManualSync() {
    const btn = document.getElementById('runManualSyncBtn');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menjalankan Sinkronisasi API...';
    }

    try {
      const res = await ApiService.triggerSync();
      showToast(`Sinkronisasi Selesai! ${res.records_processed || 1} data diperiksa dan diperbarui.`, 'success');
      await loadAllAdminData();
    } catch (err) {
      showToast('Sinkronisasi gagal: ' + err.message, 'danger');
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }

  // Reset database
  function handleResetDatabase() {
    if (!confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh database lokal kembali ke data awal PERSIB?')) {
      return;
    }
    ApiService.resetLocalDb();
    showToast('Database berhasil direset ke dataset awal!', 'success');
    loadAllAdminData();
  }

  // Export JSON Backup
  function handleExportBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(ApiService.exportDatabaseAsJson());
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `persib_sheets_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Backup JSON Google Sheets berhasil didownload!', 'info');
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
      <div id="${toastId}" class="toast align-items-center text-bg-${type} border-0 shadow" role="alert" aria-live="assertive" aria-atomic="true">
        <div class="d-flex">
          <div class="toast-body fw-semibold">${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
        </div>
      </div>
    `;
    container.insertAdjacentHTML('beforeend', html);
    const toastEl = document.getElementById(toastId);
    const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
    bsToast.show();
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

  return {
    init,
    openAddMatchModal,
    openEditMatchModal,
    openScoreModal,
    deleteMatch,
    openAddTeamModal,
    openEditTeamModal,
    deleteTeam,
    openAddStadiumModal,
    openEditStadiumModal,
    deleteStadium,
    openAddCompetitionModal,
    openEditCompetitionModal,
    deleteCompetition,
    handleManualSync
  };
})();

window.AdminApp = AdminApp;
