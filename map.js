/* ============================================================
   DUEL BOXING — map.js
   Leaflet + OpenStreetMap player map.
   ============================================================ */

const MapModule = (() => {
  let map = null;
  let youMarker = null;
  let markerByUsername = new Map(); // username -> { marker, iconKey } — persisted across renders so position changes glide (see .leaflet-marker-icon transition in CSS) instead of teleporting
  let userLat = -6.4223, userLng = 106.7327; // fallback: Parung, Kab. Bogor, Jawa Barat
  let filters = { distance: 50, minLevel: 0, minRating: 0, style: 'all', onlineOnly: false };
  let nameQuery = '';

  function init() {
    if (map) return;
    map = L.map('leaflet-map', { zoomControl: false, attributionControl: false }).setView([userLat, userLng], 14);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap',
      maxZoom: 19,
    }).addTo(map);
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    // prefix:false removes Leaflet's own "Leaflet" branding link from the
    // attribution control — we only need the required OSM credit, styled to
    // match the dark theme (see .leaflet-control-attribution in style.css).
    L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

    // The map always opens focused on Parung, Kab. Bogor (per request) —
    // device GPS is intentionally NOT auto-requested anymore, since it used
    // to silently override this with the tester's real location, making the
    // demo inconsistent from device to device.
    seedAndRender();
    startActivitySimulation();
  }

  // Makes the dummy roster feel alive: they drift, flip status, and duel
  // each other in the background on a randomized timer (not a robotic fixed
  // interval — real activity doesn't tick on the second). Markers update in
  // place so movement glides smoothly; any resulting events feed the
  // live-activity ticker in the UI.
  let activityTimer = null;
  function startActivitySimulation() {
    if (activityTimer) return;
    scheduleNext();
    function scheduleNext() {
      activityTimer = setTimeout(runOnce, 4200 + Math.random() * 3200);
    }
    function runOnce() {
      const me = getCurrentUser();
      const events = simulateDummyActivity({ myUsername: me && me.username, myLat: userLat, myLng: userLng });
      renderPlayers();
      if (events.length && typeof AppModule !== 'undefined' && AppModule.pushActivityEvents) {
        AppModule.pushActivityEvents(events);
      }
      scheduleNext();
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      seedAndRender();
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        userLat = pos.coords.latitude;
        userLng = pos.coords.longitude;
        map.setView([userLat, userLng], 14);
        seedAndRender();
      },
      () => { seedAndRender(); }, // permission denied -> fallback location
      { timeout: 4000 }
    );
  }

  function seedAndRender() {
    seedDummyPlayers(userLat, userLng);
    renderYouMarker();
    renderPlayers();
  }

  function renderYouMarker() {
    if (youMarker) map.removeLayer(youMarker);
    const icon = L.divIcon({ className: '', html: '<div class="you-marker"></div>', iconSize: [20,20] });
    youMarker = L.marker([userLat, userLng], { icon, zIndexOffset: 1000 }).addTo(map).bindPopup('📍 YOU');
  }

  function buildIcon(p, statusClass, isChatting) {
    return L.divIcon({
      className: '',
      html: `<div class="player-marker ${statusClass}"><span class="marker-avatar-clip">${avatarHtml(p.username)}</span>${isChatting ? '<span class="marker-chat-bubble">💬</span>' : ''}</div>`,
      iconSize: [44, 44],
    });
  }

  function renderPlayers() {
    const users = getUsers();
    const me = getCurrentUser();
    const list = Object.values(users).filter(u => u.username !== (me && me.username));
    const stillVisible = new Set();
    let visibleCount = 0;

    list.forEach(p => {
      const dist = distanceKm(userLat, userLng, p.lat, p.lng);
      if (dist > filters.distance) return;
      if (p.level < filters.minLevel) return;
      if (p.rating < filters.minRating) return;
      if (filters.style !== 'all' && p.style !== filters.style) return;
      if (filters.onlineOnly && p.status !== 'online') return;
      if (me && isBlocked(me.username, p.username)) return;
      if (nameQuery && !p.username.toLowerCase().includes(nameQuery)) return;

      visibleCount++;
      stillVisible.add(p.username);
      const statusClass = p.status === 'online' ? '' : p.status === 'away' ? 'away' : 'offline';
      const isChatting = p.username === chattingUsername;
      const iconKey = statusClass + '|' + (isChatting ? 1 : 0);

      const existing = markerByUsername.get(p.username);
      if (existing) {
        // Only the position changed (the common case, every activity tick) —
        // setLatLng lets the marker glide via CSS transition instead of the
        // marker being torn down and recreated, which used to make dummies
        // appear to teleport around the map every few seconds.
        existing.marker.setLatLng([p.lat, p.lng]);
        existing.marker.setPopupContent(popupHtml(p, dist));
        if (existing.iconKey !== iconKey) {
          existing.marker.setIcon(buildIcon(p, statusClass, isChatting));
          existing.iconKey = iconKey;
        }
      } else {
        const marker = L.marker([p.lat, p.lng], { icon: buildIcon(p, statusClass, isChatting), zIndexOffset: isChatting ? 500 : 0 }).addTo(map);
        marker.bindPopup(popupHtml(p, dist), { closeButton: true, autoPan: false, className: 'player-popup-wrap' });
        marker.on('popupopen', () => {
          const btn = document.getElementById(`pp-profile-${p.username}`);
          const chBtn = document.getElementById(`pp-challenge-${p.username}`);
          if (btn) btn.onclick = () => PlayersModule.showPlayerProfile(p.username);
          if (chBtn) chBtn.onclick = () => PlayersModule.quickChallenge(p.username);
        });
        marker.on('click', () => AppModule.showRightPanel(p, dist));
        markerByUsername.set(p.username, { marker, iconKey });
      }
    });

    // Drop markers for players who are no longer visible (filtered out,
    // blocked, went offline while onlineOnly is on, etc.)
    markerByUsername.forEach((entry, username) => {
      if (!stillVisible.has(username)) {
        map.removeLayer(entry.marker);
        markerByUsername.delete(username);
      }
    });

    document.getElementById('map-empty').classList.toggle('hidden', visibleCount > 0);
  }

  // Temporarily flags a marker as "chatting" so it shows a small chat-bubble
  // pulse — called whenever a dummy sends a spontaneous message, so the map
  // itself feels alive, not just the notification list.
  let chattingUsername = null;
  let chattingTimeout = null;
  function pulseMarker(username) {
    chattingUsername = username;
    renderPlayers();
    clearTimeout(chattingTimeout);
    chattingTimeout = setTimeout(() => { chattingUsername = null; renderPlayers(); }, 2800);
  }

  function popupHtml(p, dist) {
    const safeName = escapeHtml(p.username);
    return `
      <div class="player-popup">
        <div class="pp-name">${safeName}</div>
        <div class="pp-meta">Level ${p.level} · ${escapeHtml(p.style)} · ${dist.toFixed(1)} KM</div>
        <div class="pp-stats"><span>🏆 ${p.wins}W</span><span>💀 ${p.losses}L</span><span>⭐ ${p.rating}</span></div>
        <div style="display:flex;gap:6px;">
          <button id="pp-profile-${p.username}" class="btn btn-secondary btn-sm" style="flex:1;">PROFIL</button>
          <button id="pp-challenge-${p.username}" class="btn btn-primary btn-sm" style="flex:1;">CHALLENGE</button>
        </div>
      </div>`;
  }

  function setFilters(f) {
    filters = { ...filters, ...f };
    renderPlayers();
  }
  function getFilters() { return filters; }
  function getUserLocation() { return { lat: userLat, lng: userLng }; }
  function refresh() { renderPlayers(); }

  function expandRadius() {
    const next = RADIUS_STEPS.find(v => v > filters.distance);
    filters.distance = next || RADIUS_STEPS[RADIUS_STEPS.length - 1];
    renderPlayers();
  }

  /* ---------- search box: filter markers by name + fly to first match ---------- */
  function setNameFilter(query) {
    nameQuery = (query || '').trim().toLowerCase();
    renderPlayers();
    if (nameQuery) {
      const users = Object.values(getUsers());
      const hit = users.find(u => u.username.toLowerCase().includes(nameQuery));
      if (hit && map) map.flyTo([hit.lat, hit.lng], 15, { duration: 0.6 });
    }
  }

  // Leaflet's popup pane can end up compositing above our own page-level
  // modals (z-index:100) in some WebViews — a GPU-layer stacking quirk.
  // Anything that opens one of our modals FROM inside a map popup (PROFIL /
  // CHALLENGE buttons) must explicitly close the Leaflet popup first, or the
  // two end up visually overlapping.
  function closePopup() {
    if (map) map.closePopup();
  }

  return { init, locateMe, renderPlayers, setFilters, getFilters, getUserLocation, refresh, expandRadius, setNameFilter, closePopup, pulseMarker };
})();
