/* ============================================================
   DUEL BOXING — data.js
   LocalStorage-backed data layer for the demo.
   Every function here is written so it can later be swapped for
   real Firebase calls (see comments) without touching UI code.
   ============================================================ */

const DB_KEYS = {
  USERS: 'da_users',
  SESSION: 'da_session',
  MATCHES: 'da_matches',      // mutual likes -> match objects
  SWIPES: 'da_swipes',        // { username: { targetId: 'like'|'pass' } }
  CHALLENGES: 'da_challenges',// pending/accepted duel invitations
  DUELS: 'da_duels',          // completed duel results
  CHATS: 'da_chats',          // { matchId: [ {from, text, ts} ] }
  NOTIFS: 'da_notifs',        // { username: [ {text, ts, read} ] }
  REPORTS: 'da_reports',
  BLOCKED: 'da_blocked',      // { username: [blockedUsernames] }
};

const STYLES = ['Boxing', 'Kickboxing', 'MMA', 'Martial Arts', 'Muay Thai', 'Judo'];
const CITIES = ['Jakarta', 'Bandung', 'Surabaya', 'Medan', 'Semarang', 'Yogyakarta'];
const RADIUS_STEPS = [1, 5, 10, 25, 50, 100];

/* ---------- shared HTML escaping (prevents broken markup / stored XSS from usernames) ---------- */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

/* ---------- fail-safe avatar renderer ----------
   Every avatar in the app is rendered through this single function
   instead of calling `Avatars.svg()` directly. If js/avatars.js ever
   fails to load (missing file, load-order issue, etc.), this quietly
   falls back to the old plain-letter avatar instead of throwing —
   so a problem with ONE decorative feature can never freeze the
   entire app (buttons, map, navigation) the way a raw crash would. */
function avatarHtml(username) {
  try {
    if (typeof Avatars !== 'undefined' && Avatars && typeof Avatars.svg === 'function') {
      return Avatars.svg(username);
    }
  } catch (e) {
    console.warn('avatarHtml: falling back to letter avatar —', e);
  }
  return escapeHtml((String(username || '?').trim()[0] || '?').toUpperCase());
}

/* ---------- username validation for registration ---------- */
function isValidUsername(name) {
  return /^[A-Za-z0-9_]{3,16}$/.test(name);
}

/* ---------- generic storage helpers ---------- */
function dbGet(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    console.error('dbGet error', key, e);
    return fallback;
  }
}
function dbSet(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* ---------- dummy player generator ---------- */
const DUMMY_NAMES = [
  'RAVEN_X', 'SHADOW99', 'NIGHTFOX', 'TITAN', 'BLAZE', 'VIPER_K',
  'IRONFIST', 'GHOSTWOLF', 'CRIMSON', 'STORMBREAKER', 'KAI_STRIKE', 'LUNA_FANG'
];

function seedDummyPlayers(centerLat, centerLng) {
  const existing = dbGet(DB_KEYS.USERS, {});
  const existingDummies = Object.values(existing).filter(u => u.isDummy);
  if (existingDummies.length > 0) {
    // Dummies already exist — but if they were seeded around a different
    // center (e.g. from an earlier test session, or the app's default
    // location changed since), they'd be sitting far outside the current
    // map view and effectively invisible. Re-seed fresh around the current
    // center instead of leaving them stranded off-map.
    const sample = existingDummies[0];
    const driftKm = distanceKm(sample.homeLat ?? sample.lat, sample.homeLng ?? sample.lng, centerLat, centerLng);
    if (driftKm < 15) return; // still close enough to the current center, keep it
    existingDummies.forEach(d => delete existing[d.username]);
  }

  DUMMY_NAMES.forEach((name, i) => {
    const angle = (i / DUMMY_NAMES.length) * Math.PI * 2;
    const dist = 0.008 + Math.random() * 0.03; // ~0.8km - 3.3km in degrees (rough)
    const lat = centerLat + Math.sin(angle) * dist;
    const lng = centerLng + Math.cos(angle) * dist;
    const wins = 5 + Math.floor(Math.random() * 40);
    const losses = 2 + Math.floor(Math.random() * 20);
    const statuses = ['online', 'online', 'online', 'away', 'offline'];
    existing[name] = {
      username: name,
      email: `${name.toLowerCase()}@duelboxing.demo`,
      password: 'demo',
      isDummy: true,
      level: 5 + Math.floor(Math.random() * 40),
      rating: 900 + Math.floor(Math.random() * 900),
      wins, losses,
      style: STYLES[Math.floor(Math.random() * STYLES.length)],
      status: statuses[Math.floor(Math.random() * statuses.length)],
      lat, lng,
      homeLat: lat, homeLng: lng, // anchor point so movement drift never wanders far
      country: 'Indonesia',
      city: CITIES[Math.floor(Math.random() * CITIES.length)],
      xp: Math.floor(Math.random() * 3000),
      xpMax: 3000,
      achievements: shuffleSample(['FIRST WIN', '10 WIN STREAK', 'SPEED MASTER', 'TOP 100', 'IRON DEFENSE', 'FAIR PLAY'], 2 + Math.floor(Math.random()*3)),
      joined: Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 200),
    };
  });
  dbSet(DB_KEYS.USERS, existing);
}

function shuffleSample(arr, n) {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
}

/* ---------- user helpers ---------- */
function getUsers() { return dbGet(DB_KEYS.USERS, {}); }
function saveUser(user) {
  const users = getUsers();
  users[user.username] = user;
  dbSet(DB_KEYS.USERS, users);
}
function getUser(username) { return getUsers()[username] || null; }

function getCurrentUsername() { return dbGet(DB_KEYS.SESSION, null); }
function setSession(username) { dbSet(DB_KEYS.SESSION, username); }
function clearSession() { localStorage.removeItem(DB_KEYS.SESSION); }
function getCurrentUser() {
  const u = getCurrentUsername();
  return u ? getUser(u) : null;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

/* ---------- swipes / matches ---------- */
function getSwipes() { return dbGet(DB_KEYS.SWIPES, {}); }
function recordSwipe(username, targetId, action) {
  const swipes = getSwipes();
  if (!swipes[username]) swipes[username] = {};
  swipes[username][targetId] = action;
  dbSet(DB_KEYS.SWIPES, swipes);

  // Simulate opponent's own swipe for demo purposes (dummy players "like back" ~70% of the time)
  if (action === 'like') {
    const target = getUser(targetId);
    if (target && target.isDummy) {
      if (!swipes[targetId]) swipes[targetId] = {};
      const opponentLikesBack = Math.random() < 0.7;
      swipes[targetId][username] = opponentLikesBack ? 'like' : 'pass';
      dbSet(DB_KEYS.SWIPES, swipes);
      if (opponentLikesBack) {
        return createMatch(username, targetId);
      }
    }
  }
  return null;
}

function getMatches() { return dbGet(DB_KEYS.MATCHES, []); }
function createMatch(userA, userB) {
  const matches = getMatches();
  const already = matches.find(m => (m.a === userA && m.b === userB) || (m.a === userB && m.b === userA));
  if (already) return already;
  const match = { id: 'm_' + Date.now() + '_' + Math.floor(Math.random()*999), a: userA, b: userB, createdAt: Date.now(), duelStatus: 'none' };
  matches.push(match);
  dbSet(DB_KEYS.MATCHES, matches);
  addNotification(userA, `🎉 Kamu match dengan ${userB}`);
  addNotification(userB, `🎉 Kamu match dengan ${userA}`);
  return match;
}
function getMatchesForUser(username) {
  return getMatches().filter(m => m.a === username || m.b === username);
}
function getOpponent(match, username) {
  return match.a === username ? match.b : match.a;
}

/* ---------- challenges (duel invitations) ---------- */
function getChallenges() { return dbGet(DB_KEYS.CHALLENGES, []); }
function createChallenge(matchId, from, to, mode, duration, location) {
  const challenges = getChallenges();
  const ch = {
    id: 'c_' + Date.now(), matchId, from, to, mode, duration, location,
    status: 'pending', createdAt: Date.now()
  };
  challenges.push(ch);
  dbSet(DB_KEYS.CHALLENGES, challenges);
  addNotification(to, `⚔️ ${from} menantang kamu`);
  return ch;
}
function updateChallenge(id, status) {
  const challenges = getChallenges();
  const ch = challenges.find(c => c.id === id);
  if (ch) { ch.status = status; dbSet(DB_KEYS.CHALLENGES, challenges); }
  return ch;
}
function getChallengeForMatch(matchId) {
  return getChallenges().filter(c => c.matchId === matchId).sort((a,b) => b.createdAt - a.createdAt)[0] || null;
}

/* ---------- duel results ---------- */
function getDuels() { return dbGet(DB_KEYS.DUELS, []); }
function saveDuelResult(result) {
  const duels = getDuels();
  duels.push(result);
  dbSet(DB_KEYS.DUELS, duels);
}
function getDuelHistoryForUser(username) {
  return getDuels().filter(d => d.playerA === username || d.playerB === username)
    .sort((a,b) => b.ts - a.ts);
}

/* ---------- chat ---------- */
function getChatMessages(matchId) {
  const chats = dbGet(DB_KEYS.CHATS, {});
  return chats[matchId] || [];
}
function sendChatMessage(matchId, from, text) {
  const chats = dbGet(DB_KEYS.CHATS, {});
  if (!chats[matchId]) chats[matchId] = [];
  chats[matchId].push({ from, text, ts: Date.now() });
  dbSet(DB_KEYS.CHATS, chats);
}

/* ---------- notifications ---------- */
function getNotifications(username) {
  const all = dbGet(DB_KEYS.NOTIFS, {});
  return (all[username] || []).sort((a,b) => b.ts - a.ts);
}
function addNotification(username, text) {
  const all = dbGet(DB_KEYS.NOTIFS, {});
  if (!all[username]) all[username] = [];
  all[username].unshift({ text, ts: Date.now(), read: false });
  dbSet(DB_KEYS.NOTIFS, all);
}
function markNotificationsRead(username) {
  const all = dbGet(DB_KEYS.NOTIFS, {});
  if (all[username]) { all[username].forEach(n => n.read = true); dbSet(DB_KEYS.NOTIFS, all); }
}
function hasUnreadNotifications(username) {
  return getNotifications(username).some(n => !n.read);
}

/* ---------- report / block ---------- */
function reportUser(reporter, target, reason) {
  const reports = dbGet(DB_KEYS.REPORTS, []);
  reports.push({ id: 'r_' + Date.now(), reporter, target, reason, ts: Date.now(), status: 'open' });
  dbSet(DB_KEYS.REPORTS, reports);
}
function getReports() { return dbGet(DB_KEYS.REPORTS, []); }
function updateReportStatus(id, status) {
  const reports = getReports();
  const r = reports.find(x => x.id === id);
  if (r) { r.status = status; dbSet(DB_KEYS.REPORTS, reports); }
}
function blockUser(username, target) {
  const blocked = dbGet(DB_KEYS.BLOCKED, {});
  if (!blocked[username]) blocked[username] = [];
  if (!blocked[username].includes(target)) blocked[username].push(target);
  dbSet(DB_KEYS.BLOCKED, blocked);
}
function unblockUser(username, target) {
  const blocked = dbGet(DB_KEYS.BLOCKED, {});
  if (blocked[username]) blocked[username] = blocked[username].filter(u => u !== target);
  dbSet(DB_KEYS.BLOCKED, blocked);
}
function getBlockedList(username) {
  return dbGet(DB_KEYS.BLOCKED, {})[username] || [];
}
function isBlocked(username, target) {
  return getBlockedList(username).includes(target);
}

/* ---------- XP / rating ---------- */
function grantXP(username, amount) {
  const user = getUser(username);
  if (!user) return;
  user.xp = (user.xp || 0) + amount;
  while (user.xp >= (user.xpMax || 3000)) {
    user.xp -= (user.xpMax || 3000);
    user.level += 1;
    user.xpMax = Math.round((user.xpMax || 3000) * 1.08);
    addNotification(username, `⭐ Level up! Sekarang level ${user.level}`);
  }
  saveUser(user);
}
function applyRatingChange(username, delta) {
  const user = getUser(username);
  if (!user) return;
  user.rating = Math.max(0, user.rating + delta);
  saveUser(user);
  addNotification(username, `📈 Rating ${delta >= 0 ? '+' : ''}${delta}`);
}

/* ---------- tournament (demo, static bracket) ---------- */
function getTournament() {
  return dbGet('da_tournament', {
    name: 'WEEKEND ARENA',
    players: 32,
    entry: 'FREE',
    startLabel: 'Saturday 20:00',
    joined: [],
  });
}
function joinTournament(username) {
  const t = getTournament();
  if (!t.joined.includes(username)) t.joined.push(username);
  dbSet('da_tournament', t);
  return t;
}

/* ============================================================
   LIVE ACTIVITY SIMULATION
   Makes the dummy roster feel alive: they drift around their home spot,
   flip online/away/offline, and occasionally duel each other in the
   background — all purely client-side, no backend needed. Called on a
   timer from map.js. Returns an array of human-readable event strings
   (may be empty) so the UI can show a rotating "live" ticker.
   ============================================================ */
const DB_KEYS_ACTIVITY = 'da_activity';
function getActivityLog() { return dbGet(DB_KEYS_ACTIVITY, []); }
function pushActivity(text) {
  const log = getActivityLog();
  log.unshift({ text, ts: Date.now() });
  dbSet(DB_KEYS_ACTIVITY, log.slice(0, 25));
}

function simulateDummyActivity() {
  const users = getUsers();
  const dummies = Object.values(users).filter(u => u.isDummy && !u.banned);
  if (dummies.length === 0) return [];
  const events = [];

  // 1) Movement: a few random dummies drift a little around their home spot,
  //    like they're actually walking/driving around the neighborhood.
  const moveCount = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < moveCount; i++) {
    const p = dummies[Math.floor(Math.random() * dummies.length)];
    const home = { lat: p.homeLat ?? p.lat, lng: p.homeLng ?? p.lng };
    const jitter = 0.0015; // small step
    let nextLat = p.lat + (Math.random() - 0.5) * jitter;
    let nextLng = p.lng + (Math.random() - 0.5) * jitter;
    // keep it on a leash so nobody wanders off the map permanently
    const maxDrift = 0.012;
    if (Math.abs(nextLat - home.lat) > maxDrift || Math.abs(nextLng - home.lng) > maxDrift) {
      nextLat = home.lat + (Math.random() - 0.5) * maxDrift;
      nextLng = home.lng + (Math.random() - 0.5) * maxDrift;
    }
    p.lat = nextLat; p.lng = nextLng;
    users[p.username] = p;
  }

  // 2) Status flicker: one random dummy changes online/away/offline.
  if (Math.random() < 0.6) {
    const p = dummies[Math.floor(Math.random() * dummies.length)];
    const roll = Math.random();
    const newStatus = roll < 0.65 ? 'online' : roll < 0.88 ? 'away' : 'offline';
    if (p.status !== newStatus) {
      p.status = newStatus;
      users[p.username] = p;
      if (newStatus === 'online') events.push(`⚡ ${p.username} baru saja online`);
    }
  }

  // 3) Background duel between two dummies, purely cosmetic (keeps the
  //    leaderboard and win/loss records feeling alive between the user's
  //    own matches).
  if (dummies.length >= 2 && Math.random() < 0.22) {
    const a = dummies[Math.floor(Math.random() * dummies.length)];
    let b = dummies[Math.floor(Math.random() * dummies.length)];
    let guard = 0;
    while (b.username === a.username && guard++ < 5) b = dummies[Math.floor(Math.random() * dummies.length)];
    if (b.username !== a.username) {
      const aWins = Math.random() < 0.5;
      const winner = aWins ? a : b;
      const loser = aWins ? b : a;
      const delta = 8 + Math.floor(Math.random() * 18);
      winner.wins += 1;
      winner.rating += delta;
      loser.losses += 1;
      loser.rating = Math.max(0, loser.rating - delta);
      users[winner.username] = winner;
      users[loser.username] = loser;
      events.push(`🥊 ${winner.username} mengalahkan ${loser.username} (+${delta} rating)`);
    }
  }

  dbSet(DB_KEYS.USERS, users);
  events.forEach(pushActivity);
  return events;
}

/* ============================================================
   DUMMY SOCIAL BEHAVIOR
   Matched dummies proactively message you and "check out" your profile,
   independent of the duel-challenge simulation in app.js — makes the
   roster feel like real people rather than static NPCs.
   ============================================================ */
const DUMMY_CHAT_OPENERS = [
  'Hai! Udah siap buat duel belum? 😄',
  'Eh, kapan kita tanding nih?',
  'GG buat match kemarin, rematch yuk!',
  'Kamu online terus ya, semangat banget 🔥',
  'Style kamu keren juga, boleh tuker tips gak?',
  'Siap-siap ya, aku lagi latihan combo baru 😎',
  'Jangan kabur pas aku challenge nanti ya 😆',
  'Rating kamu naik terus nih, hati-hati aku kejar!',
  'Btw kamu biasa latihan di gym mana?',
  'Gas, kapan free buat sparring santai?',
];

// Pick a matched, non-offline dummy and have them send a spontaneous chat
// message. Returns { matchId, username, text } or null if nobody's around.
function simulateDummyMessage(myUsername) {
  const matches = getMatchesForUser(myUsername);
  const candidates = matches
    .map(m => ({ match: m, opp: getUser(getOpponent(m, myUsername)) }))
    .filter(x => x.opp && x.opp.isDummy && !x.opp.banned && x.opp.status !== 'offline');
  if (candidates.length === 0) return null;
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  const text = DUMMY_CHAT_OPENERS[Math.floor(Math.random() * DUMMY_CHAT_OPENERS.length)];
  sendChatMessage(pick.match.id, pick.opp.username, text);
  addNotification(myUsername, `💬 ${pick.opp.username}: ${text}`);
  return { matchId: pick.match.id, username: pick.opp.username, text };
}

// Ambient flavor: an online dummy "checks out" your profile. Purely cosmetic
// (just a notification), but adds to the sense that real people are around.
function simulateDummyProfileView(myUsername) {
  const candidates = Object.values(getUsers()).filter(u => u.isDummy && !u.banned && u.status === 'online' && u.username !== myUsername);
  if (candidates.length === 0) return null;
  const p = candidates[Math.floor(Math.random() * candidates.length)];
  addNotification(myUsername, `👀 ${p.username} melihat profil kamu`);
  return { username: p.username };
}
