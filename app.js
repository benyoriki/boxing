/* ============================================================
   DUEL BOXING — app.js
   Auth flow, view router, topbar/profile/notifications/filters.
   ============================================================ */

const ProfileModule = (() => {
  let editing = false;

  function render() {
    const me = getCurrentUser();
    if (!me) return;
    const winRate = me.wins + me.losses > 0 ? Math.round((me.wins/(me.wins+me.losses))*100) : 0;
    const history = getDuelHistoryForUser(me.username).slice(0, 12);
    const blocked = getBlockedList(me.username);
    const panel = document.getElementById('profile-panel');

    if (editing) { renderEdit(panel, me); return; }

    panel.innerHTML = `
      <div class="profile-head">
        <div class="avatar-ring lg">${avatarHtml(me.username)}</div>
        <div class="profile-head-info">
          <h2>${escapeHtml(me.username)}</h2>
          <p>Level ${me.level} · ${escapeHtml(me.style || 'Belum dipilih')} · <span class="status-dot ${me.status}"></span> ${me.status === 'online' ? 'Online' : me.status === 'away' ? 'Away' : 'Offline'}</p>
        </div>
      </div>

      <div class="profile-stats-grid">
        <div class="profile-stat"><b>${me.rating}</b><span>Rating</span></div>
        <div class="profile-stat"><b>${me.wins + me.losses}</b><span>Match</span></div>
        <div class="profile-stat"><b>${me.wins}</b><span>Win</span></div>
        <div class="profile-stat"><b>${me.losses}</b><span>Loss</span></div>
        <div class="profile-stat"><b>${winRate}%</b><span>Win Rate</span></div>
      </div>

      <div class="xp-bar-wrap">
        <div class="xp-bar-label"><span>LEVEL ${me.level}</span><span>${me.xp || 0} / ${me.xpMax || 3000} XP</span></div>
        <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${Math.min(100, ((me.xp||0)/(me.xpMax||3000))*100)}%"></div></div>
      </div>

      <div class="profile-section">
        <h3>Achievements</h3>
        <div class="achievements-row">
          ${(me.achievements && me.achievements.length) ? me.achievements.map(a => `<span class="achievement-chip">🏆 ${escapeHtml(a)}</span>`).join('') : `<div class="achievements-empty" style="width:100%;">Belum ada achievement.<br>Menangkan duel untuk membuka achievement!</div>`}
        </div>
      </div>

      <div class="profile-section">
        <h3>Match History</h3>
        ${history.length ? `
        <table class="history-table">
          <thead><tr><th>Tanggal</th><th>Lawan</th><th>Mode</th><th>Score</th><th>Result</th></tr></thead>
          <tbody>
            ${history.map(h => {
              const isA = h.playerA === me.username;
              const opp = isA ? h.playerB : h.playerA;
              const myScore = isA ? h.scoreA : h.scoreB;
              const oppScore = isA ? h.scoreB : h.scoreA;
              const won = h.winner === me.username;
              return `<tr>
                <td>${new Date(h.ts).toLocaleDateString('id-ID', {day:'2-digit', month:'short', year:'numeric'})}</td>
                <td>${escapeHtml(opp)}</td><td>${escapeHtml(h.mode)}</td><td>${myScore} - ${oppScore}</td>
                <td class="${won ? 'win' : 'loss'}">${won ? 'WIN' : 'LOSS'}</td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>` : `<div class="history-empty">Belum ada riwayat duel.</div>`}
      </div>

      <div class="profile-section">
        <h3>Blocked Users</h3>
        ${blocked.length ? blocked.map(b => `
          <div class="blocked-list-item"><span>${escapeHtml(b)}</span><button class="btn btn-secondary btn-sm" data-unblock="${escapeHtml(b)}">UNBLOCK</button></div>
        `).join('') : `<div class="blocked-empty">Tidak ada pengguna yang diblokir.</div>`}
      </div>

      <div class="profile-actions">
        <button class="btn btn-primary" id="btn-edit-profile">EDIT PROFILE</button>
        <button class="btn btn-secondary" id="btn-privacy">PRIVACY</button>
        ${AdminModule.isAdmin(me) ? '<button class="btn btn-secondary" id="btn-goto-admin">🛠️ ADMIN DASHBOARD</button>' : ''}
        <button class="btn btn-ghost btn-block" id="btn-logout-profile">🚪 KELUAR</button>
      </div>
    `;
    panel.querySelectorAll('[data-unblock]').forEach(btn => {
      btn.onclick = () => { unblockUser(me.username, btn.dataset.unblock); toast(`${btn.dataset.unblock} di-unblock`); render(); MapModule.refresh(); };
    });
    document.getElementById('btn-edit-profile').onclick = () => { editing = true; render(); };
    document.getElementById('btn-privacy').onclick = () => { AppModule.switchView('rules'); };
    document.getElementById('btn-logout-profile').onclick = () => {
      if (confirm('Yakin ingin keluar dari akun ini?')) AppModule.logout();
    };
    const adminBtn = document.getElementById('btn-goto-admin');
    if (adminBtn) adminBtn.onclick = () => AppModule.switchView('admin');
  }

  function renderEdit(panel, me) {
    panel.innerHTML = `
      <div class="profile-section">
        <h3>Edit Profile</h3>
        <form class="edit-profile-form" id="edit-form">
          <label>Username<input type="text" id="ep-username" value="${me.username}" disabled></label>
          <label>Preferred Style
            <select id="ep-style">
              ${STYLES.map(s => `<option value="${s}" ${s===me.style?'selected':''}>${s}</option>`).join('')}
            </select>
          </label>
          <label>Status
            <select id="ep-status">
              ${['online','away','offline'].map(s => `<option value="${s}" ${s===me.status?'selected':''}>${s.toUpperCase()}</option>`).join('')}
            </select>
          </label>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary btn-block" id="ep-cancel">BATAL</button>
            <button type="submit" class="btn btn-primary btn-block">SIMPAN</button>
          </div>
        </form>
      </div>
    `;
    document.getElementById('ep-cancel').onclick = () => { editing = false; render(); };
    document.getElementById('edit-form').addEventListener('submit', (e) => {
      e.preventDefault();
      me.style = document.getElementById('ep-style').value;
      me.status = document.getElementById('ep-status').value;
      saveUser(me);
      editing = false;
      render();
      AppModule.refreshTopbar();
      toast('Profil diperbarui');
    });
  }

  return { render };
})();

const AppModule = (() => {
  let currentView = 'map';

  /* ---------- INIT ---------- */
  function init() {
    registerServiceWorker();
    bindAuthForms();
    const session = getCurrentUsername();
    if (session && getUser(session)) {
      enterApp();
    }
  }

  /* ---------- AUTH ---------- */
  function bindAuthForms() {
    document.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById('form-login').classList.toggle('hidden', target !== 'login');
        document.getElementById('form-register').classList.toggle('hidden', target !== 'register');
        document.getElementById('auth-error').textContent = '';
      });
    });

    document.getElementById('form-login').addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('login-id').value.trim();
      const pass = document.getElementById('login-pass').value;
      const users = getUsers();
      const idLower = id.toLowerCase();
      const user = Object.values(users).find(u => (u.username.toLowerCase() === idLower || u.email.toLowerCase() === idLower));
      if (!user) { showAuthError('Akun tidak ditemukan. Coba daftar dulu, atau pakai akun demo.'); return; }
      if (user.banned) { showAuthError('Akun ini telah dibanned oleh admin.'); return; }
      // Demo: password check is lenient (any password works for dummy accounts pre-seeded);
      // for user-registered accounts we do check the stored password.
      if (!user.isDummy && user.password !== pass) { showAuthError('Password salah.'); return; }
      setSession(user.username);
      enterApp();
    });

    document.getElementById('btn-demo-login').addEventListener('click', () => {
      const demoUser = ensureDemoUser();
      setSession(demoUser.username);
      enterApp();
    });

    document.getElementById('form-register').addEventListener('submit', (e) => {
      e.preventDefault();
      const username = document.getElementById('reg-username').value.trim();
      const email = document.getElementById('reg-email').value.trim();
      const pass = document.getElementById('reg-pass').value;
      const pass2 = document.getElementById('reg-pass2').value;

      if (!isValidUsername(username)) { showAuthError('Username harus 3-16 karakter, hanya huruf/angka/underscore.'); return; }
      if (pass.length < 4) { showAuthError('Password minimal 4 karakter.'); return; }
      if (pass !== pass2) { showAuthError('Konfirmasi password tidak cocok.'); return; }
      const lower = username.toLowerCase();
      if (Object.keys(getUsers()).some(u => u.toLowerCase() === lower)) { showAuthError('Username sudah dipakai.'); return; }
      const loc = MapModule.getUserLocation();
      const newUser = {
        username, email, password: pass, isDummy: false,
        level: 1, rating: 1000, wins: 0, losses: 0,
        style: STYLES[0], status: 'online',
        lat: loc.lat + (Math.random()-0.5)*0.01, lng: loc.lng + (Math.random()-0.5)*0.01,
        country: 'Indonesia', city: CITIES[Math.floor(Math.random()*CITIES.length)],
        xp: 0, xpMax: 1000, achievements: [], joined: Date.now(),
      };
      saveUser(newUser);
      setSession(username);
      enterApp();
    });
  }

  function showAuthError(msg) { document.getElementById('auth-error').textContent = msg; }

  function ensureDemoUser() {
    let demo = getUser('DEMO_PLAYER');
    if (!demo) {
      demo = {
        username: 'DEMO_PLAYER', email: 'demo@duelboxing.demo', password: 'demo', isDummy: false,
        level: 24, rating: 1287, wins: 24, losses: 13, style: 'Boxing', status: 'online',
        lat: -6.4223, lng: 106.7327, country: 'Indonesia', city: 'Bogor', xp: 2430, xpMax: 3000,
        achievements: ['FIRST WIN', '10 WIN STREAK'], joined: Date.now() - 1000*60*60*24*90,
      };
      saveUser(demo);
    }
    return demo;
  }

  function enterApp() {
    document.getElementById('view-auth').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    const me = getCurrentUser();
    if (AdminModule.isAdmin(me)) document.getElementById('nav-admin').hidden = false;

    refreshTopbar();
    bindNav();
    bindModals();
    RankingModule.bindFilterChips();
    // Isolated: if the Leaflet/OSM CDN is slow, blocked, or offline, a
    // failure here must not take the rest of the app down with it — nav,
    // matches, ranking, and the activity simulations below are otherwise
    // completely independent of the map.
    try { MapModule.init(); } catch (e) { console.warn('MapModule failed to initialize —', e); }
    renderRightPanelDefault();
    switchView('map');
    simulateIncomingChallenges();
    simulateDummySocialActivity();
  }

  function logout() {
    clearSession();
    document.getElementById('app').classList.add('hidden');
    document.getElementById('view-auth').classList.remove('hidden');
  }

  /* ---------- NAV / ROUTING ---------- */
  function bindNav() {
    document.querySelectorAll('.nav-item, .bn-item').forEach(btn => {
      btn.addEventListener('click', () => switchView(btn.dataset.view));
    });
    document.getElementById('btn-logout').addEventListener('click', logout);
  }

  function switchView(view) {
    currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(`view-${view}`).classList.add('active');
    document.querySelectorAll('.nav-item, .bn-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));

    if (view === 'map') MapModule.refresh();
    if (view === 'duel') PlayersModule.renderStage();
    if (view === 'matches') PlayersModule.renderMatchesList();
    if (view === 'rank') RankingModule.render();
    if (view === 'tournament') DuelModule.renderTournament();
    if (view === 'profile') ProfileModule.render();
    if (view === 'admin') AdminModule.render();
  }

  function refreshTopbar() {
    const me = getCurrentUser();
    if (!me) return;
    document.getElementById('topbar-avatar').innerHTML = avatarHtml(me.username);
    document.getElementById('topbar-username').textContent = me.username;
    document.getElementById('topbar-level').textContent = me.level;
    document.getElementById('topbar-rating').textContent = me.rating;
    updateNotifDot();
  }

  function updateNotifDot() {
    const me = getCurrentUser();
    const dot = document.getElementById('notif-dot');
    if (me && hasUnreadNotifications(me.username)) dot.classList.remove('hidden');
    else dot.classList.add('hidden');
  }

  /* ---------- RIGHT PANEL (desktop map detail) ---------- */
  function renderRightPanelDefault() {
    const content = document.getElementById('right-panel-content');
    if (!content) return;
    const me = getCurrentUser();
    if (!me) return;
    const winRate = me.wins + me.losses > 0 ? Math.round((me.wins / (me.wins + me.losses)) * 100) : 0;
    const top3 = Object.values(getUsers())
      .filter(u => !u.banned)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 3);
    const medal = ['🥇', '🥈', '🥉'];
    content.className = '';
    content.innerHTML = `
      <div class="rp-self">
        <div class="avatar-ring" style="width:44px;height:44px;">${avatarHtml(me.username)}</div>
        <div>
          <strong>${escapeHtml(me.username)}</strong>
          <span>${me.rating} rating · ${winRate}% win rate</span>
        </div>
      </div>
      <p class="rp-hint">👆 Pilih pemain di map untuk lihat detail &amp; kirim tantangan.</p>
      <h4 class="rp-subhead">Top Global</h4>
      <div class="rp-mini-list">
        ${top3.map((p, i) => `
          <div class="rp-mini-row">
            <span class="rp-mini-medal">${medal[i]}</span>
            <div class="avatar-ring sm">${avatarHtml(p.username)}</div>
            <span class="rp-mini-name">${escapeHtml(p.username)}</span>
            <span class="rp-mini-rating">${p.rating}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-secondary btn-block rp-viewall" id="rp-view-rank">LIHAT RANKING</button>
    `;
    const btn = document.getElementById('rp-view-rank');
    if (btn) btn.onclick = () => switchView('rank');
  }

  function showRightPanel(player, dist) {
    const content = document.getElementById('right-panel-content');
    content.className = '';
    content.innerHTML = `
      <button class="link-btn rp-back" id="rp-back">← Kembali</button>
      <div style="text-align:center;margin-bottom:14px;">
        <div class="avatar-ring lg" style="margin:0 auto 10px;">${avatarHtml(player.username)}</div>
        <strong style="font-family:var(--font-display);font-size:16px;">${escapeHtml(player.username)}</strong>
        <p style="color:var(--text-dim);font-size:12.5px;margin-top:2px;">Level ${player.level} · ${dist.toFixed(1)} KM</p>
      </div>
      <div class="profile-modal-stats" style="margin-bottom:14px;">
        <div class="pm-stat"><b>${player.wins}</b><span>Win</span></div>
        <div class="pm-stat"><b>${player.losses}</b><span>Loss</span></div>
        <div class="pm-stat"><b>${player.rating}</b><span>Rating</span></div>
      </div>
      <span class="sc-style" style="margin-bottom:14px;display:inline-block;">${escapeHtml(player.style)}</span>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-block" id="rp-profile">PROFIL</button>
        <button class="btn btn-primary btn-block" id="rp-challenge">CHALLENGE</button>
      </div>
    `;
    document.getElementById('rp-back').onclick = renderRightPanelDefault;
    document.getElementById('rp-profile').onclick = () => PlayersModule.showPlayerProfile(player.username);
    document.getElementById('rp-challenge').onclick = () => PlayersModule.quickChallenge(player.username);
  }

  /* ---------- MODALS: player pass/challenge buttons, match found, notif, filters ---------- */
  function bindModals() {
    document.getElementById('btn-pass').addEventListener('click', () => PlayersModule.passTop());
    document.getElementById('btn-challenge').addEventListener('click', () => PlayersModule.likeTop());
    document.getElementById('btn-swipe-reset').addEventListener('click', () => PlayersModule.renderStage());
    document.getElementById('btn-expand-radius').addEventListener('click', () => MapModule.expandRadius());

    document.getElementById('btn-mf-later').addEventListener('click', () => document.getElementById('modal-match-found').classList.add('hidden'));

    document.getElementById('btn-notif').addEventListener('click', openNotifPanel);
    document.getElementById('btn-filters').addEventListener('click', openFiltersModal);

    document.getElementById('map-search-input').addEventListener('input', (e) => {
      MapModule.setNameFilter(e.target.value);
    });

    // Close modals when clicking the backdrop — except the Duel Room, which
    // has a live countdown running; accidentally closing it used to leave the
    // timer ticking invisibly in the background. Players must use END MATCH.
    document.querySelectorAll('.modal-backdrop').forEach(bd => {
      if (bd.id === 'modal-duelroom') return;
      bd.addEventListener('click', (e) => { if (e.target === bd) bd.classList.add('hidden'); });
    });
  }

  function showMatchFound(match) {
    const me = getCurrentUser();
    const oppName = getOpponent(match, me.username);
    const opp = getUser(oppName);
    document.getElementById('match-found-avatars').innerHTML = `
      <div class="avatar-ring">${avatarHtml(me.username)}</div>
      <span class="match-found-vs">VS</span>
      <div class="avatar-ring">${avatarHtml(opp.username)}</div>
    `;
    document.getElementById('modal-match-found').classList.remove('hidden');
    document.getElementById('btn-mf-open').onclick = () => {
      document.getElementById('modal-match-found').classList.add('hidden');
      switchView('matches');
      setTimeout(() => DuelModule.openMatchScreen(match.id), 150);
    };
    updateNotifDot();
  }

  function openNotifPanel() {
    const me = getCurrentUser();
    markNotificationsRead(me.username);
    updateNotifDot();
    const notifs = getNotifications(me.username);
    const panel = document.getElementById('notif-panel-content');
    panel.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
        <h2 style="margin:0;">Notifications</h2>
        <button class="icon-btn" id="notif-close">✕</button>
      </div>
      ${notifs.length ? notifs.map(n => `
        <div class="notif-item"><div>${escapeHtml(n.text)}<div class="notif-time">${timeAgo(n.ts)}</div></div></div>
      `).join('') : `<div class="notif-empty">Belum ada notifikasi.</div>`}
    `;
    document.getElementById('modal-notif').classList.remove('hidden');
    document.getElementById('notif-close').onclick = () => document.getElementById('modal-notif').classList.add('hidden');
  }

  function openFiltersModal() {
    const f = MapModule.getFilters();
    const content = document.getElementById('modal-filters-content');
    content.innerHTML = `
      <h2>Filter Map</h2>
      <div class="option-group-label">Distance</div>
      <div class="option-group">
        ${RADIUS_STEPS.map(d => `<label class="option-row ${f.distance===d?'selected':''}"><input type="radio" name="f-dist" value="${d}" ${f.distance===d?'checked':''}> ${d} KM</label>`).join('')}
      </div>
      <div class="option-group-label">Status</div>
      <div class="option-group">
        <label class="option-row ${!f.onlineOnly?'selected':''}"><input type="radio" name="f-status" value="all" ${!f.onlineOnly?'checked':''}> Semua</label>
        <label class="option-row ${f.onlineOnly?'selected':''}"><input type="radio" name="f-status" value="online" ${f.onlineOnly?'checked':''}> Online Only</label>
      </div>
      <div class="option-group-label">Jenis Pertandingan</div>
      <div class="option-group">
        <label class="option-row ${f.style==='all'?'selected':''}"><input type="radio" name="f-style" value="all" ${f.style==='all'?'checked':''}> Semua</label>
        ${STYLES.map(s => `<label class="option-row ${f.style===s?'selected':''}"><input type="radio" name="f-style" value="${s}" ${f.style===s?'checked':''}> ${s}</label>`).join('')}
      </div>
      <div class="option-group-label">Minimum Level</div>
      <div class="option-group">
        ${[0,10,20,30].map(lv => `<label class="option-row ${f.minLevel===lv?'selected':''}"><input type="radio" name="f-level" value="${lv}" ${f.minLevel===lv?'checked':''}> ${lv === 0 ? 'Semua Level' : lv + '+'}</label>`).join('')}
      </div>
      <div class="option-group-label">Minimum Rating</div>
      <div class="option-group">
        ${[0,1000,1300,1600].map(rt => `<label class="option-row ${f.minRating===rt?'selected':''}"><input type="radio" name="f-rating" value="${rt}" ${f.minRating===rt?'checked':''}> ${rt === 0 ? 'Semua Rating' : rt + '+'}</label>`).join('')}
      </div>
      <button class="btn btn-primary btn-block" id="f-apply">TERAPKAN FILTER</button>
    `;
    content.querySelectorAll('.option-row input').forEach(inp => {
      inp.addEventListener('change', () => {
        inp.closest('.option-group').querySelectorAll('.option-row').forEach(r => r.classList.remove('selected'));
        inp.closest('.option-row').classList.add('selected');
      });
    });
    document.getElementById('modal-filters').classList.remove('hidden');
    document.getElementById('f-apply').onclick = () => {
      const dist = parseInt(content.querySelector('input[name="f-dist"]:checked').value);
      const onlineOnly = content.querySelector('input[name="f-status"]:checked').value === 'online';
      const style = content.querySelector('input[name="f-style"]:checked').value;
      const minLevel = parseInt(content.querySelector('input[name="f-level"]:checked').value);
      const minRating = parseInt(content.querySelector('input[name="f-rating"]:checked').value);
      MapModule.setFilters({ distance: dist, onlineOnly, style, minLevel, minRating });
      document.getElementById('modal-filters').classList.add('hidden');
      toast('Filter diterapkan');
    };
  }

  // Demo multiplayer simulation: since this build has no real backend, dummy
  // opponents will occasionally send YOU a duel challenge — either a
  // rematch-style challenge on a match you already have, or (if you haven't
  // matched anyone yet) a fresh "swipe" from a nearby active dummy that
  // instantly forms a match AND opens with a challenge. Timing is randomized
  // rather than a fixed interval so it reads as organic activity, not a
  // metronome.
  function simulateIncomingChallenges() {
    scheduleNext();

    function scheduleNext() {
      setTimeout(runOnce, 9000 + Math.random() * 8000);
    }

    function runOnce() {
      scheduleNext();
      const me = getCurrentUser();
      if (!me) return;
      updateNotifDot();

      const anyModalOpen = document.querySelectorAll('.modal-backdrop:not(.hidden)').length > 0;
      if (anyModalOpen) return;
      if (Math.random() > 0.62) return;

      const myMatches = getMatchesForUser(me.username);
      const candidates = myMatches
        .map(m => ({ match: m, opp: getUser(getOpponent(m, me.username)) }))
        .filter(x => x.opp && x.opp.isDummy && !x.opp.banned && !getChallengeForMatch(x.match.id));

      const modes = ['Boxing', 'Kickboxing', 'MMA', 'Martial Arts'];
      const durations = ['3 Menit', '5 Menit', '10 Menit'];
      const locations = ['Virtual Arena', 'Official Gym', 'Sports Arena'];

      let ch, oppUsername;
      if (candidates.length > 0) {
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        ch = createChallenge(
          pick.match.id, pick.opp.username, me.username,
          modes[Math.floor(Math.random()*modes.length)],
          durations[Math.floor(Math.random()*durations.length)],
          locations[Math.floor(Math.random()*locations.length)]
        );
        oppUsername = pick.opp.username;
      } else {
        // Nobody matched yet (e.g. a brand-new account) — a nearby active
        // dummy challenges you first, so the app never feels empty/dead.
        const res = simulateFreshChallengeRequest(me.username);
        if (!res) return;
        ch = res.challenge;
        oppUsername = res.username;
        MapModule.refresh();
      }

      updateNotifDot();
      if (currentView === 'map') MapModule.pulseMarker(oppUsername);
      DuelModule.showIncomingChallenge(ch);
      if (currentView === 'matches') PlayersModule.renderMatchesList();
    }
  }

  // Independent of duel challenges: matched dummies occasionally send you a
  // message out of the blue, or "check out" your profile — small ambient
  // touches that make the roster feel like real people online right now.
  // Timing is randomized (not a fixed interval) for the same reason as above.
  function simulateDummySocialActivity() {
    scheduleNext();

    function scheduleNext() {
      setTimeout(runOnce, 6000 + Math.random() * 6000);
    }

    function runOnce() {
      scheduleNext();
      const me = getCurrentUser();
      if (!me) return;
      const anyModalOpen = document.querySelectorAll('.modal-backdrop:not(.hidden)').length > 0;
      const roll = Math.random();

      if (roll < 0.4) {
        const prepared = prepareDummyMessage(me.username);
        if (!prepared) return;
        const chatModalOpen = !document.getElementById('modal-chat').classList.contains('hidden');
        const chatIsForThisMatch = chatModalOpen && ChatModule.getCurrentMatchId() === prepared.matchId;

        // If you're already looking at that conversation, show a realistic
        // "typing..." beat before the message actually lands.
        if (chatIsForThisMatch) ChatModule.showTyping();

        setTimeout(() => {
          commitDummyMessage(prepared, me.username);
          updateNotifDot();
          if (currentView === 'map') MapModule.pulseMarker(prepared.username);
          if (chatIsForThisMatch) {
            ChatModule.render();
          } else if (!anyModalOpen) {
            toast(`💬 ${prepared.username}: ${prepared.text}`);
          }
          if (currentView === 'matches') PlayersModule.renderMatchesList();
        }, chatIsForThisMatch ? 1100 + Math.random() * 1100 : 0);
      } else if (roll < 0.62) {
        const res = simulateDummyProfileView(me.username);
        if (res) updateNotifDot();
      }
    }
  }

  function timeAgo(ts) {
    const diff = Math.floor((Date.now() - ts) / 1000);
    if (diff < 60) return 'Baru saja';
    if (diff < 3600) return Math.floor(diff/60) + ' menit lalu';
    if (diff < 86400) return Math.floor(diff/3600) + ' jam lalu';
    return Math.floor(diff/86400) + ' hari lalu';
  }

  /* ---------- Live activity ticker (Map view) ---------- */
  let tickerQueue = [];
  let tickerTimer = null;
  function pushActivityEvents(events) {
    if (!events || !events.length) return;
    tickerQueue.push(...events);
    if (tickerQueue.length > 8) tickerQueue = tickerQueue.slice(-8);
    if (!tickerTimer) rotateTicker();
  }
  function rotateTicker() {
    const el = document.getElementById('activity-ticker-text');
    if (!el) { tickerTimer = null; return; }
    if (tickerQueue.length === 0) {
      el.textContent = 'Memantau aktivitas arena...';
      tickerTimer = null;
      return;
    }
    const next = tickerQueue.shift();
    el.classList.remove('fadeUp');
    void el.offsetWidth; // restart animation
    el.classList.add('fadeUp');
    el.textContent = next;
    tickerTimer = setTimeout(rotateTicker, 3800);
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('service-worker.js').catch(() => {});
      });
    }
  }

  return { init, switchView, refreshTopbar, showRightPanel, renderRightPanelDefault, showMatchFound, pushActivityEvents, logout };
})();

document.addEventListener('DOMContentLoaded', () => AppModule.init());
