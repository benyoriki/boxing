/* ============================================================
   DUEL BOXING — ranking.js
   Global / country / city / friends leaderboard.
   ============================================================ */

const RankingModule = (() => {
  let scope = 'global';

  function setScope(s) { scope = s; render(); }

  function render() {
    const me = getCurrentUser();
    if (!me) return;
    let players = Object.values(getUsers()).filter(p => !p.banned);

    if (scope === 'friends') {
      const matchedNames = getMatchesForUser(me.username).map(m => getOpponent(m, me.username));
      players = players.filter(p => matchedNames.includes(p.username) || p.username === me.username);
    } else if (scope === 'country') {
      const myCountry = me.country || 'Indonesia';
      players = players.filter(p => (p.country || 'Indonesia') === myCountry);
    } else if (scope === 'city') {
      const myCity = me.city || 'Jakarta';
      players = players.filter(p => (p.city || 'Jakarta') === myCity);
    }
    // 'global' scope: no filtering, everyone is ranked together.

    players.sort((a,b) => b.rating - a.rating);

    const list = document.getElementById('rank-list');
    list.innerHTML = players.map((p, i) => `
      <div class="rank-row ${p.username === me.username ? 'me' : ''}">
        <div class="rank-pos">${i+1}</div>
        <div class="avatar-ring sm">${avatarHtml(p.username)}</div>
        <div class="rank-name">${escapeHtml(p.username)}${p.username === me.username ? ' (kamu)' : ''}</div>
        <div class="rank-rating">${p.rating}</div>
      </div>
    `).join('') || `<p style="text-align:center;color:var(--text-faint);padding:30px 0;">Belum ada data untuk kategori ini.</p>`;
  }

  function bindFilterChips() {
    document.querySelectorAll('#view-rank .rank-filters .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#view-rank .rank-filters .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        setScope(chip.dataset.scope);
      });
    });
  }

  return { render, setScope, bindFilterChips };
})();
