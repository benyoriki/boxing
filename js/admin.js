/* ============================================================
   DUEL BOXING — admin.js
   Simple admin dashboard. In this demo, any username containing
   "admin" (case-insensitive) unlocks the Admin nav item.
   ============================================================ */

const AdminModule = (() => {
  let tab = 'overview';

  function isAdmin(user) {
    return user && user.username.toLowerCase().includes('admin');
  }

  function render() {
    const users = Object.values(getUsers());
    const online = users.filter(u => u.status === 'online').length;
    const duelsToday = getDuels().filter(d => isToday(d.ts)).length;
    const activeChallenges = getChallenges().filter(c => c.status === 'pending' || c.status === 'accepted').length;
    const reports = getReports();

    const panel = document.getElementById('admin-panel');
    panel.innerHTML = `
      <div class="admin-stats-grid">
        <div class="admin-stat"><b>${users.length}</b><span>Total Users</span></div>
        <div class="admin-stat"><b>${online}</b><span>Online Users</span></div>
        <div class="admin-stat"><b>${duelsToday}</b><span>Matches Today</span></div>
        <div class="admin-stat"><b>${activeChallenges}</b><span>Active Challenges</span></div>
        <div class="admin-stat"><b>${reports.filter(r=>r.status==='open').length}</b><span>Open Reports</span></div>
      </div>
      <div class="admin-tabs">
        <button class="chip ${tab==='users'?'active':''}" data-tab="users">Users</button>
        <button class="chip ${tab==='reports'?'active':''}" data-tab="reports">Reports</button>
        <button class="chip ${tab==='matches'?'active':''}" data-tab="matches">Matches</button>
        <button class="chip ${tab==='tournament'?'active':''}" data-tab="tournament">Tournament</button>
      </div>
      <div id="admin-tab-content"></div>
    `;
    panel.querySelectorAll('.admin-tabs .chip').forEach(btn => {
      btn.onclick = () => { tab = btn.dataset.tab; render(); };
    });
    renderTabContent();
  }

  function renderTabContent() {
    const content = document.getElementById('admin-tab-content');
    if (!content) return;
    const users = Object.values(getUsers());

    if (tab === 'users' || !tab) {
      content.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Username</th><th>Level</th><th>Rating</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${users.map(u => `
              <tr>
                <td>${escapeHtml(u.username)}</td><td>${u.level}</td><td>${u.rating}</td>
                <td><span class="status-dot ${u.status}"></span> ${u.status}</td>
                <td>
                  <button class="btn btn-secondary" data-ban="${escapeHtml(u.username)}">${u.banned ? 'UNBAN' : 'BAN'}</button>
                </td>
              </tr>`).join('')}
          </tbody>
        </table>`;
      content.querySelectorAll('[data-ban]').forEach(btn => {
        btn.onclick = () => {
          const u = getUser(btn.dataset.ban);
          u.banned = !u.banned;
          u.status = u.banned ? 'offline' : 'online';
          saveUser(u);
          toast(`${u.username} ${u.banned ? 'dibanned' : 'di-unban'}`);
          renderTabContent();
        };
      });
    }

    if (tab === 'reports') {
      const reports = getReports();
      content.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Reporter</th><th>Target</th><th>Alasan</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            ${reports.length ? reports.map(r => `
              <tr>
                <td>${escapeHtml(r.reporter)}</td><td>${escapeHtml(r.target)}</td><td>${escapeHtml(r.reason)}</td><td>${r.status}</td>
                <td>${r.status==='open' ? `<button class="btn btn-secondary" data-resolve="${r.id}">RESOLVE</button>` : '✓'}</td>
              </tr>`).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-faint);">Belum ada laporan.</td></tr>`}
          </tbody>
        </table>`;
      content.querySelectorAll('[data-resolve]').forEach(btn => {
        btn.onclick = () => { updateReportStatus(btn.dataset.resolve, 'resolved'); toast('Laporan diselesaikan'); renderTabContent(); };
      });
    }

    if (tab === 'matches') {
      const duels = getDuels().sort((a,b) => b.ts - a.ts).slice(0, 30);
      content.innerHTML = `
        <table class="admin-table">
          <thead><tr><th>Tanggal</th><th>Player A</th><th>Player B</th><th>Score</th><th>Winner</th></tr></thead>
          <tbody>
            ${duels.length ? duels.map(d => `
              <tr><td>${new Date(d.ts).toLocaleDateString('id-ID')}</td><td>${escapeHtml(d.playerA)}</td><td>${escapeHtml(d.playerB)}</td><td>${d.scoreA}-${d.scoreB}</td><td>${escapeHtml(d.winner)}</td></tr>
            `).join('') : `<tr><td colspan="5" style="text-align:center;color:var(--text-faint);">Belum ada duel selesai.</td></tr>`}
          </tbody>
        </table>`;
    }

    if (tab === 'tournament') {
      const t = getTournament();
      content.innerHTML = `
        <div class="glass" style="border-radius:var(--radius-md);padding:16px;">
          <p><strong>${t.name}</strong> — ${t.joined.length}/${t.players} terdaftar</p>
          <p style="color:var(--text-dim);font-size:13px;margin:6px 0 14px;">Start: ${t.startLabel} · Entry: ${t.entry}</p>
          <button class="btn btn-secondary" id="admin-reset-tour">RESET PENDAFTARAN</button>
        </div>`;
      const btn = document.getElementById('admin-reset-tour');
      if (btn) btn.onclick = () => { t.joined = []; dbSet('da_tournament', t); toast('Pendaftaran turnamen direset'); renderTabContent(); };
    }
  }

  function isToday(ts) {
    const d = new Date(ts), now = new Date();
    return d.getDate()===now.getDate() && d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  }

  return { isAdmin, render };
})();
