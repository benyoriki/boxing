/* ============================================================
   DUEL BOXING — duel.js
   Match screen -> Challenge invitation -> Duel Room -> Result.
   ============================================================ */

const DuelModule = (() => {
  let activeDuel = null; // { matchId, playerA, playerB, timer, round, scoreA, scoreB, running }
  let duelInterval = null;

  /* ---------- MATCH SCREEN (PLAYER1 VS PLAYER2) ---------- */
  function openMatchScreen(matchId) {
    const me = getCurrentUser();
    const match = getMatchesForUser(me.username).find(m => m.id === matchId);
    if (!match) return;
    const oppName = getOpponent(match, me.username);
    const opp = getUser(oppName);

    const modal = document.getElementById('modal-challenge-content');
    modal.innerHTML = `
      <button class="icon-btn modal-close" id="ms-close">✕</button>
      <h2 style="text-align:center;margin-bottom:18px;">Match</h2>
      <div class="dr-vs-row">
        <div class="dr-player"><div class="avatar-ring lg">${avatarHtml(me.username)}</div><div class="dr-player-name">${escapeHtml(me.username)}</div><div class="match-card-meta">⭐ ${me.rating}</div></div>
        <div class="dr-vs-mid">VS</div>
        <div class="dr-player"><div class="avatar-ring lg">${avatarHtml(opp.username)}</div><div class="dr-player-name">${escapeHtml(opp.username)}</div><div class="match-card-meta">⭐ ${opp.rating}</div></div>
      </div>
      <div class="profile-modal-stats">
        <div class="pm-stat"><b>${opp.wins}-${opp.losses}</b><span>W-L Lawan</span></div>
        <div class="pm-stat"><b>${opp.level}</b><span>Level</span></div>
        <div class="pm-stat"><b>${escapeHtml(opp.style)}</b><span>Style</span></div>
      </div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-block" id="ms-chat">💬 CHAT</button>
        <button class="btn btn-primary btn-block" id="ms-duel">⚔️ AJUKAN DUEL</button>
      </div>
      <button class="btn btn-ghost btn-block" style="margin-top:10px;" id="ms-cancel">BATALKAN MATCH</button>
    `;
    document.getElementById('modal-challenge').classList.remove('hidden');
    document.getElementById('ms-close').onclick = () => document.getElementById('modal-challenge').classList.add('hidden');
    document.getElementById('ms-chat').onclick = () => { document.getElementById('modal-challenge').classList.add('hidden'); ChatModule.open(matchId); };
    document.getElementById('ms-duel').onclick = () => openChallengeForm(matchId, oppName);
    document.getElementById('ms-cancel').onclick = () => {
      document.getElementById('modal-challenge').classList.add('hidden');
      toast('Match dibatalkan');
      PlayersModule.renderMatchesList();
    };
  }

  /* ---------- CHALLENGE INVITATION FORM ---------- */
  function openChallengeForm(matchId, oppName) {
    document.getElementById('modal-challenge').classList.add('hidden');
    const modal = document.getElementById('modal-challenge-content');
    modal.innerHTML = `
      <button class="icon-btn modal-close" id="cf-close">✕</button>
      <h2>⚔️ Duel Challenge</h2>
      <p style="color:var(--text-dim);font-size:13.5px;margin-top:4px;">Ajukan tantangan ke ${escapeHtml(oppName)}</p>

      <div class="option-group-label">Jenis Pertandingan</div>
      <div class="option-group" id="cf-mode">
        ${['Boxing','Kickboxing','MMA','Martial Arts','Custom'].map((m,i) => `
          <label class="option-row ${i===0?'selected':''}"><input type="radio" name="cf-mode" value="${m}" ${i===0?'checked':''}> ${m}</label>
        `).join('')}
      </div>

      <div class="option-group-label">Durasi</div>
      <div class="option-group" id="cf-duration">
        ${['3 Menit','5 Menit','10 Menit'].map((d,i) => `
          <label class="option-row ${i===1?'selected':''}"><input type="radio" name="cf-duration" value="${d}" ${i===1?'checked':''}> ${d}</label>
        `).join('')}
      </div>

      <div class="option-group-label">Lokasi</div>
      <div class="option-group" id="cf-location">
        ${['Virtual Arena','Official Gym','Sports Arena'].map((l,i) => `
          <label class="option-row ${i===0?'selected':''}"><input type="radio" name="cf-location" value="${l}" ${i===0?'checked':''}> ${l}</label>
        `).join('')}
      </div>

      <div class="notice-box">⚠️ Pertandingan fisik hanya boleh dilakukan di tempat yang aman/resmi, dengan persetujuan kedua pihak dan pengawasan yang sesuai.</div>

      <button class="btn btn-primary btn-block" id="cf-send">KIRIM TANTANGAN</button>
    `;
    document.getElementById('modal-challenge').classList.remove('hidden');
    document.getElementById('cf-close').onclick = () => document.getElementById('modal-challenge').classList.add('hidden');

    modal.querySelectorAll('.option-row input').forEach(inp => {
      inp.addEventListener('change', () => {
        inp.closest('.option-group').querySelectorAll('.option-row').forEach(r => r.classList.remove('selected'));
        inp.closest('.option-row').classList.add('selected');
      });
    });

    document.getElementById('cf-send').onclick = () => {
      const mode = modal.querySelector('input[name="cf-mode"]:checked').value;
      const duration = modal.querySelector('input[name="cf-duration"]:checked').value;
      const location = modal.querySelector('input[name="cf-location"]:checked').value;
      const me = getCurrentUser();
      const ch = createChallenge(matchId, me.username, oppName, mode, duration, location);
      document.getElementById('modal-challenge').classList.add('hidden');
      toast(`Tantangan dikirim ke ${oppName}`);
      PlayersModule.renderMatchesList();

      // Simulate opponent response for dummy players
      const opp = getUser(oppName);
      if (opp && opp.isDummy) {
        setTimeout(() => {
          const accepted = Math.random() < 0.75;
          updateChallenge(ch.id, accepted ? 'accepted' : 'declined');
          addNotification(me.username, accepted ? `✅ ${oppName} menerima tantanganmu` : `❌ ${oppName} menolak tantanganmu`);
          if (accepted) toast(`${oppName} menerima tantangan!`);
          PlayersModule.renderMatchesList();
        }, 1800);
      }
    };
  }

  /* ---------- INCOMING CHALLENGE (shown via notification click) ---------- */
  function showIncomingChallenge(challenge) {
    const modal = document.getElementById('modal-incoming-content');
    modal.innerHTML = `
      <h2>⚔️ Duel Challenge</h2>
      <p style="color:var(--text-dim);font-size:13.5px;margin-top:4px;">${escapeHtml(challenge.from)} menantang kamu!</p>
      <div class="profile-modal-stats" style="margin-top:14px;">
        <div class="pm-stat"><b>${escapeHtml(challenge.mode)}</b><span>Mode</span></div>
        <div class="pm-stat"><b>${escapeHtml(challenge.duration)}</b><span>Durasi</span></div>
        <div class="pm-stat"><b>${escapeHtml(challenge.location)}</b><span>Lokasi</span></div>
      </div>
      <div class="notice-box">⚠️ Pertandingan fisik hanya boleh dilakukan di tempat yang aman/resmi, dengan persetujuan kedua pihak dan pengawasan yang sesuai.</div>
      <div class="modal-actions">
        <button class="btn btn-secondary btn-block" id="ic-decline">TOLAK</button>
        <button class="btn btn-primary btn-block" id="ic-accept">TERIMA</button>
      </div>
    `;
    document.getElementById('modal-incoming').classList.remove('hidden');
    document.getElementById('ic-decline').onclick = () => {
      updateChallenge(challenge.id, 'declined');
      document.getElementById('modal-incoming').classList.add('hidden');
      toast('Tantangan ditolak');
      PlayersModule.renderMatchesList();
    };
    document.getElementById('ic-accept').onclick = () => {
      updateChallenge(challenge.id, 'accepted');
      document.getElementById('modal-incoming').classList.add('hidden');
      toast('Tantangan diterima!');
      startDuelRoom(challenge);
    };
  }

  /* ---------- DUEL ROOM ---------- */
  function startDuelRoomForMatch(matchId) {
    const challenge = getChallengeForMatch(matchId);
    if (!challenge || challenge.status !== 'accepted') { toast('Tantangan belum diterima kedua pihak'); return; }
    startDuelRoom(challenge);
  }

  function startDuelRoom(challenge) {
    const me = getCurrentUser();
    const oppName = challenge.from === me.username ? challenge.to : challenge.from;
    const opp = getUser(oppName);
    const durationSec = parseInt(challenge.duration) * 60 || 180;

    activeDuel = {
      challengeId: challenge.id,
      matchId: challenge.matchId,
      playerA: me.username, playerB: oppName,
      timeLeft: durationSec, totalTime: durationSec,
      round: 1, scoreA: 0, scoreB: 0, running: false, finished: false,
    };
    renderDuelRoom();
    document.getElementById('modal-duelroom').classList.remove('hidden');
  }

  function renderDuelRoom() {
    if (!activeDuel) return;
    const d = activeDuel;
    const me = getUser(d.playerA), opp = getUser(d.playerB);
    const mins = Math.floor(d.timeLeft / 60).toString().padStart(2,'0');
    const secs = (d.timeLeft % 60).toString().padStart(2,'0');
    const maxScore = Math.max(d.scoreA, d.scoreB, 20);

    const el = document.getElementById('duelroom-content');
    el.innerHTML = `
      <span class="dr-mode-badge">SPORT MATCH · FAIR PLAY</span>
      <div class="dr-vs-row">
        <div class="dr-player"><div class="avatar-ring">${avatarHtml(me.username)}</div><div class="dr-player-name">${escapeHtml(me.username)}</div></div>
        <div class="dr-vs-mid">VS</div>
        <div class="dr-player"><div class="avatar-ring">${avatarHtml(opp.username)}</div><div class="dr-player-name">${escapeHtml(opp.username)}</div></div>
      </div>
      <div class="dr-timer">${mins}:${secs}</div>
      <div class="dr-round">ROUND ${d.round}</div>
      <div class="dr-bars">
        <div class="dr-bar-col">
          <div class="dr-bar-label"><span>${escapeHtml(me.username)}</span><span id="dr-score-a">${d.scoreA}</span></div>
          <div class="dr-bar-track"><div class="dr-bar-fill blue" id="dr-fill-a" style="width:${(d.scoreA/maxScore)*100}%"></div></div>
        </div>
        <div class="dr-bar-col">
          <div class="dr-bar-label"><span>${escapeHtml(opp.username)}</span><span id="dr-score-b">${d.scoreB}</span></div>
          <div class="dr-bar-track"><div class="dr-bar-fill orange" id="dr-fill-b" style="width:${(d.scoreB/maxScore)*100}%"></div></div>
        </div>
      </div>
      <div class="option-group-label">Catat Poin untuk ${escapeHtml(me.username)}</div>
      <div class="dr-score-buttons">
        <button data-pt="3" data-who="a">POINT<small>+3</small></button>
        <button data-pt="4" data-who="a">TECHNIQUE<small>+4</small></button>
        <button data-pt="2" data-who="a">SPEED<small>+2</small></button>
        <button data-pt="3" data-who="a">CONTROL<small>+3</small></button>
      </div>
      <div class="dr-controls">
        <button class="btn btn-secondary btn-block" id="dr-pause">${d.running ? '⏸ PAUSE' : '▶ READY'}</button>
        <button class="btn btn-danger btn-block" id="dr-end">⏹ END MATCH</button>
      </div>
    `;
    el.querySelectorAll('.dr-score-buttons button').forEach(btn => {
      btn.onclick = () => addScore('a', parseInt(btn.dataset.pt));
    });
    document.getElementById('dr-pause').onclick = toggleRunning;
    document.getElementById('dr-end').onclick = () => endDuel(true);
  }

  function addScore(who, pts) {
    if (!activeDuel || activeDuel.finished) return;
    if (who === 'a') activeDuel.scoreA += pts; else activeDuel.scoreB += pts;
    // simulate opponent scoring automatically if running
    renderDuelRoom();
    const scoreEl = document.getElementById(who === 'a' ? 'dr-score-a' : 'dr-score-b');
    if (scoreEl) scoreEl.classList.add('bump');
  }

  function toggleRunning() {
    if (!activeDuel) return;
    activeDuel.running = !activeDuel.running;
    if (activeDuel.running) {
      duelInterval = setInterval(tick, 1000);
    } else {
      clearInterval(duelInterval);
    }
    renderDuelRoom();
  }

  function tick() {
    if (!activeDuel || !activeDuel.running) return;
    activeDuel.timeLeft -= 1;
    // opponent (simulated) occasionally scores
    if (Math.random() < 0.18) {
      activeDuel.scoreB += [2,3,4][Math.floor(Math.random()*3)];
    }
    if (activeDuel.timeLeft <= 0) {
      clearInterval(duelInterval);
      endDuel(false);
      return;
    }
    renderDuelRoom();
  }

  function endDuel(manual) {
    if (!activeDuel) return;
    clearInterval(duelInterval);
    activeDuel.finished = true;
    const d = activeDuel;
    const me = getUser(d.playerA), opp = getUser(d.playerB);
    const winner = d.scoreA >= d.scoreB ? me : opp;
    const iWon = winner.username === me.username;
    const ratingChange = iWon ? 12 + Math.floor(Math.random()*16) : -(6 + Math.floor(Math.random()*12));

    saveDuelResult({
      id: 'd_' + Date.now(), matchId: d.matchId,
      playerA: d.playerA, playerB: d.playerB,
      scoreA: d.scoreA, scoreB: d.scoreB,
      winner: winner.username, ts: Date.now(), mode: 'Sport Match',
    });
    updateChallenge(d.challengeId, 'completed');
    applyRatingChange(me.username, ratingChange);
    grantXP(me.username, iWon ? 220 : 90);
    // Bug fix: opponent's rating change must simply be the mirror of mine
    // (previously a broken conditional made the loser's rating go UP).
    if (opp.isDummy) applyRatingChange(opp.username, -ratingChange);

    const el = document.getElementById('duelroom-content');
    el.innerHTML = `
      <div class="dr-result">
        <div class="trophy">🏆</div>
        <h2>MATCH COMPLETE</h2>
        <div class="match-card-meta">WINNER</div>
        <div class="winner-name">${escapeHtml(winner.username)}</div>
        <div class="final-score">${d.scoreA} - ${d.scoreB}</div>
        <div class="rating-change ${ratingChange >= 0 ? 'up' : 'down'}">Rating ${ratingChange >= 0 ? '+' : ''}${ratingChange}</div>
        <button class="btn btn-primary btn-block" id="dr-close">SELESAI</button>
      </div>
    `;
    document.getElementById('dr-close').onclick = () => {
      document.getElementById('modal-duelroom').classList.add('hidden');
      activeDuel = null;
      AppModule.refreshTopbar();
      PlayersModule.renderMatchesList();
      RankingModule.render();
      if (document.getElementById('view-profile').classList.contains('active')) ProfileModule.render();
    };
  }

  /* ---------- TOURNAMENT ---------- */
  function renderTournament() {
    const me = getCurrentUser();
    const t = getTournament();
    const joined = t.joined.includes(me.username);
    const panel = document.getElementById('tournament-panel');
    panel.innerHTML = `
      <div class="tournament-hero">
        <h2>🥊 ${t.name}</h2>
        <div class="tournament-meta">
          <span>${t.players} PLAYERS</span>
          <span>ENTRY: ${t.entry}</span>
          <span>START: ${t.startLabel}</span>
          <span>${t.joined.length} terdaftar</span>
        </div>
        <button class="btn ${joined ? 'btn-secondary' : 'btn-primary'}" id="tour-join" ${joined ? 'disabled' : ''}>${joined ? '✓ TERDAFTAR' : 'JOIN TOURNAMENT'}</button>
      </div>
      <div class="bracket">${bracketHtml(t)}</div>
    `;
    const btn = document.getElementById('tour-join');
    if (btn && !joined) btn.onclick = () => { joinTournament(me.username); toast('Kamu terdaftar di turnamen!'); renderTournament(); };
  }

  function bracketHtml(t) {
    const names = [...DUMMY_NAMES.slice(0,8)];
    const round1 = [];
    for (let i=0;i<names.length;i+=2) round1.push([names[i], names[i+1]]);
    const round1Winners = round1.map(pair => pair[Math.floor(Math.random()*2)]);
    const round2 = [[round1Winners[0], round1Winners[1]],[round1Winners[2], round1Winners[3]]];
    const round2Winners = round2.map(pair => pair[Math.floor(Math.random()*2)]);
    const final = [[round2Winners[0], round2Winners[1]]];
    const champion = final[0][Math.floor(Math.random()*2)];

    function col(title, pairs, winners) {
      return `<div class="bracket-round"><div class="bracket-round-title">${title}</div>
        ${pairs.map((p, idx) => `<div class="bracket-match">
          <div class="bracket-slot ${winners && winners[idx]===p[0] ? 'winner' : ''}">${p[0] || '<span class="tbd">TBD</span>'}</div>
          <div class="bracket-slot ${winners && winners[idx]===p[1] ? 'winner' : ''}">${p[1] || '<span class="tbd">TBD</span>'}</div>
        </div>`).join('')}
      </div>`;
    }
    return col('ROUND 1', round1, round1Winners) + col('SEMIFINAL', round2, round2Winners) + col('FINAL', final, [champion]);
  }

  return { openMatchScreen, openChallengeForm, showIncomingChallenge, startDuelRoomForMatch, startDuelRoom, renderTournament };
})();
