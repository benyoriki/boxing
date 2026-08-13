/* ============================================================
   DUEL BOXING — players.js
   Tinder-style swipe deck + player profile modal + matches list.
   ============================================================ */

const PlayersModule = (() => {
  let deck = [];
  // Drag state for the swipe deck. We attach mousemove/mouseup/touchmove/touchend
  // to window exactly ONCE (see initDragListeners) instead of per-card, otherwise
  // every re-render would stack a new set of window listeners and leak memory.
  let dragActive = false;
  let dragCard = null, dragUsername = null;
  let dragStartX = 0, dragStartY = 0, dragCurX = 0;
  let listenersInitialized = false;

  function buildDeck() {
    const me = getCurrentUser();
    if (!me) return [];
    const users = getUsers();
    const swipedByMe = getSwipes()[me.username] || {};
    return Object.values(users)
      .filter(u => u.username !== me.username)
      .filter(u => !swipedByMe[u.username])
      .filter(u => !isBlocked(me.username, u.username))
      .map(u => ({ ...u, dist: distanceKm(me.lat || -6.4223, me.lng || 106.7327, u.lat, u.lng) }))
      .sort((a, b) => a.dist - b.dist);
  }

  function renderStage() {
    initDragListeners();
    const stage = document.getElementById('swipe-stage');
    deck = buildDeck();
    stage.innerHTML = '';
    document.getElementById('swipe-empty').classList.toggle('hidden', deck.length > 0);
    if (deck.length === 0) return;

    // render top 3 for a stacked-card feel
    const topThree = deck.slice(0, 3);
    topThree.slice().reverse().forEach((p, idx) => {
      const isTop = idx === topThree.length - 1;
      const card = document.createElement('div');
      card.className = 'swipe-card';
      card.dataset.username = p.username;
      card.style.zIndex = idx;
      card.style.transform = isTop ? '' : `scale(${0.95 + idx * 0.03}) translateY(${(2 - idx) * 8}px)`;
      card.innerHTML = `
        <div class="sc-badge pass">PASS</div>
        <div class="sc-badge like">TANTANG</div>
        <div class="player-photo">${avatarHtml(p.username)}</div>
        <div class="sc-name">${escapeHtml(p.username)}</div>
        <div class="sc-sub"><span>Lvl ${p.level}</span><span>⭐ ${p.rating}</span><span>${p.dist.toFixed(1)} KM</span></div>
        <span class="sc-style">${escapeHtml(p.style)}</span>
      `;
      card.addEventListener('click', () => {
        if (isTop && !dragActive) PlayersModule.showPlayerProfile(p.username);
      });
      if (isTop) {
        card.addEventListener('mousedown', (e) => beginDrag(card, p.username, e.clientX, e.clientY));
        card.addEventListener('touchstart', (e) => {
          const t = e.touches[0];
          beginDrag(card, p.username, t.clientX, t.clientY);
        }, { passive: true });
      }
      stage.appendChild(card);
    });
  }

  function beginDrag(card, username, x, y) {
    dragActive = true; dragCard = card; dragUsername = username;
    dragStartX = x; dragStartY = y; dragCurX = 0;
    card.style.transition = 'none';
  }

  function moveDrag(x, y) {
    if (!dragActive || !dragCard) return;
    dragCurX = x - dragStartX;
    const rot = dragCurX / 18;
    dragCard.style.transform = `translateX(${dragCurX}px) rotate(${rot}deg)`;
    const passBadge = dragCard.querySelector('.sc-badge.pass');
    const likeBadge = dragCard.querySelector('.sc-badge.like');
    if (passBadge) passBadge.style.opacity = dragCurX < -20 ? Math.min(1, Math.abs(dragCurX) / 100) : 0;
    if (likeBadge) likeBadge.style.opacity = dragCurX > 20 ? Math.min(1, dragCurX / 100) : 0;
  }

  function endDrag() {
    if (!dragActive || !dragCard) return;
    const card = dragCard, username = dragUsername, curX = dragCurX;
    card.style.transition = '';
    dragActive = false; dragCard = null; dragUsername = null;
    if (curX > 100) swipe(username, 'like');
    else if (curX < -100) swipe(username, 'pass');
    else card.style.transform = '';
  }

  // Attached exactly once for the lifetime of the page — fixes a bug where the
  // previous implementation added new window-level listeners on every render.
  function initDragListeners() {
    if (listenersInitialized) return;
    listenersInitialized = true;
    window.addEventListener('mousemove', (e) => { if (dragActive) moveDrag(e.clientX, e.clientY); });
    window.addEventListener('mouseup', () => { if (dragActive) endDrag(); });
    window.addEventListener('touchmove', (e) => { if (dragActive) { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); } }, { passive: true });
    window.addEventListener('touchend', () => { if (dragActive) endDrag(); });
  }

  function swipe(username, action) {
    const stage = document.getElementById('swipe-stage');
    const card = stage.querySelector(`.swipe-card[data-username="${CSS.escape(username)}"]`);
    if (card) {
      card.classList.add(action === 'like' ? 'fly-right' : 'fly-left');
    }
    const me = getCurrentUser();
    const match = recordSwipe(me.username, username, action);
    setTimeout(() => {
      renderStage();
      if (match) AppModule.showMatchFound(match);
      else if (action === 'like') toast(`Challenge terkirim ke ${username}`);
    }, 260);
  }

  function passTop() {
    const top = document.querySelector('#swipe-stage .swipe-card:last-child');
    if (top) swipe(top.dataset.username, 'pass');
  }
  function likeTop() {
    const top = document.querySelector('#swipe-stage .swipe-card:last-child');
    if (top) swipe(top.dataset.username, 'like');
  }

  function quickChallenge(username) {
    const me = getCurrentUser();
    const match = recordSwipe(me.username, username, 'like');
    document.getElementById('modal-player').classList.add('hidden');
    MapModule.closePopup();
    if (match) {
      AppModule.showMatchFound(match);
    } else {
      toast(`Challenge terkirim ke ${username}`);
    }
  }

  /* ---------- Player profile modal ---------- */
  function showPlayerProfile(username) {
    const p = getUser(username);
    if (!p) return;
    MapModule.closePopup();
    const winRate = p.wins + p.losses > 0 ? Math.round((p.wins / (p.wins + p.losses)) * 100) : 0;
    const modal = document.getElementById('modal-player-content');
    modal.innerHTML = `
      <button class="icon-btn modal-close" id="pp-close">✕</button>
      <div class="profile-modal-head">
        <div class="avatar-ring lg">${avatarHtml(p.username)}</div>
        <div>
          <h2>${escapeHtml(p.username)}</h2>
          <p style="color:var(--text-dim);font-size:13px;">Level ${p.level} · ${escapeHtml(p.style)} · ${p.city ? escapeHtml(p.city) : ''}</p>
          <span class="status-dot ${p.status}"></span>
        </div>
      </div>
      <div class="profile-modal-stats">
        <div class="pm-stat"><b>${p.rating}</b><span>Rating</span></div>
        <div class="pm-stat"><b>${p.wins}</b><span>Win</span></div>
        <div class="pm-stat"><b>${p.losses}</b><span>Loss</span></div>
        <div class="pm-stat"><b>${winRate}%</b><span>Win rate</span></div>
      </div>
      <div class="achievements-row">
        ${(p.achievements || []).map(a => `<span class="achievement-chip">🏆 ${escapeHtml(a)}</span>`).join('')}
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-block" id="pp-modal-pass">✕ PASS</button>
        <button class="btn btn-primary btn-block" id="pp-modal-challenge">⚔️ CHALLENGE</button>
      </div>
    `;
    document.getElementById('modal-player').classList.remove('hidden');
    document.getElementById('pp-close').onclick = () => document.getElementById('modal-player').classList.add('hidden');
    document.getElementById('pp-modal-pass').onclick = () => {
      const me = getCurrentUser();
      recordSwipe(me.username, username, 'pass');
      document.getElementById('modal-player').classList.add('hidden');
      toast(`Kamu pass ${username}`);
      renderStage();
    };
    document.getElementById('pp-modal-challenge').onclick = () => quickChallenge(username);
  }

  /* ---------- Matches list ---------- */
  function renderMatchesList() {
    const me = getCurrentUser();
    const list = document.getElementById('matches-list');
    const matches = getMatchesForUser(me.username).sort((a,b) => b.createdAt - a.createdAt);
    list.innerHTML = '';
    document.getElementById('matches-empty').classList.toggle('hidden', matches.length > 0);

    matches.forEach(m => {
      const oppName = getOpponent(m, me.username);
      const opp = getUser(oppName);
      if (!opp) return;
      const challenge = getChallengeForMatch(m.id);

      // Status + primary action button change depending on where this match
      // is in the challenge lifecycle — previously the button never changed,
      // so there was no way to actually enter the Duel Room after a challenge
      // was accepted. Fixed here.
      let statusHtml = '<span class="match-status pending">BELUM DUEL</span>';
      let actionLabel = '⚔️ AJUKAN DUEL';
      let actionHandler = () => DuelModule.openMatchScreen(m.id);
      let actionDisabled = false;

      if (challenge && challenge.status === 'pending') {
        statusHtml = '<span class="match-status pending">MENUNGGU RESPON</span>';
        actionLabel = 'MENUNGGU...';
        actionDisabled = challenge.from === me.username; // only the invitee can act; inviter waits
        if (!actionDisabled) { actionLabel = '👀 LIHAT TANTANGAN'; actionHandler = () => DuelModule.showIncomingChallenge(challenge); }
      } else if (challenge && challenge.status === 'accepted') {
        statusHtml = '<span class="match-status active">SIAP DUEL</span>';
        actionLabel = '🥊 MULAI DUEL';
        actionHandler = () => DuelModule.startDuelRoomForMatch(m.id);
      } else if (challenge && challenge.status === 'completed') {
        statusHtml = '<span class="match-status active">SELESAI</span>';
        actionLabel = '🔁 DUEL LAGI';
        actionHandler = () => DuelModule.openMatchScreen(m.id);
      } else if (challenge && challenge.status === 'declined') {
        statusHtml = '<span class="match-status rejected">DITOLAK</span>';
        actionLabel = '⚔️ TANTANG LAGI';
      }

      const card = document.createElement('div');
      card.className = 'match-card';
      card.innerHTML = `
        <div class="match-card-top">
          <div class="avatar-ring">${avatarHtml(opp.username)}</div>
          <div>
            <div class="match-card-name">${escapeHtml(opp.username)}</div>
            <div class="match-card-meta">Lvl ${opp.level} · ⭐ ${opp.rating} · ${escapeHtml(opp.style)}</div>
          </div>
        </div>
        ${statusHtml}
        <div class="match-card-actions">
          <button class="btn btn-secondary btn-sm" data-act="chat">💬 CHAT</button>
          <button class="btn btn-primary btn-sm" data-act="duel" ${actionDisabled ? 'disabled' : ''}>${actionLabel}</button>
        </div>
      `;
      card.querySelector('[data-act="chat"]').onclick = () => ChatModule.open(m.id);
      const duelBtn = card.querySelector('[data-act="duel"]');
      if (!actionDisabled) duelBtn.onclick = actionHandler;
      list.appendChild(card);
    });
  }

  return { renderStage, passTop, likeTop, quickChallenge, showPlayerProfile, renderMatchesList, buildDeck };
})();

function toast(msg) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}
