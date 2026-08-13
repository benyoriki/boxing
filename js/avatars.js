/* ============================================================
   DUEL BOXING — avatars.js
   Procedurally generated "fighter" avatars (inline SVG), seeded
   deterministically from a username so every player — dummy or
   real — always gets the SAME unique, tough-looking character,
   without needing any external image files or network requests.

   Design intent: fight-night poster energy — hard jaw, angry
   brows, scars/tape, dark dramatic palettes. Not cute.
   ============================================================ */

const Avatars = (() => {

  // Darker, moodier duotones — fight-poster energy instead of
  // bright/candy pastel combos.
  const PALETTES = [
    ['#ff2e3d', '#1a0508'],
    ['#ff5d3a', '#1a0e05'],
    ['#35e6ff', '#0a1420'],
    ['#a875ff', '#0f0a20'],
    ['#ffb020', '#1a1305'],
    ['#ff2e88', '#160510'],
    ['#2bffa0', '#051a12'],
    ['#7c5cff', '#0a0a1a'],
    ['#ff4d1f', '#0d0d10'],
    ['#2fa8ff', '#050a1a'],
    ['#e0e0e8', '#0a0a0d'],
    ['#ff2e3d', '#0a0a10'],
  ];
  const SKIN = ['#e8b98c', '#d1996a', '#b87a4e', '#93583a', '#6b3d24', '#4a2a1a'];
  const HAIR = ['#0d0d10', '#1c120a', '#3a2414', '#5c4025', '#151515', '#e8e8ef', '#7a0f16', '#1a2440'];
  const GLOVES = ['#ff2e3d', '#ffb020', '#35e6ff', '#a875ff', '#2bffa0', '#e0e0e8', '#ff2e88'];

  // Small, deterministic string hash (djb2-style) — same username
  // always produces the same avatar, across sessions & devices.
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) + h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  function pick(arr, n) { return arr[n % arr.length]; }

  // Strong, squared-off jaw instead of a soft circle — the base
  // silhouette that makes everything read as tougher.
  const HEAD_PATH = 'M50 19 C36 19 27 27 25.5 39 C24.5 47 25.5 53 28 59 C31 68 39 76 50 78 C61 76 69 68 72 59 C74.5 53 75.5 47 74.5 39 C73 27 64 19 50 19 Z';

  function hairShape(style, color) {
    switch (style) {
      case 0: // undercut mohawk — sharp, close-shaved sides implied
        return `<path d="M50 10 L60 33 L40 33 Z" fill="${color}"/><path d="M25.5 39 C27 27 36 19 50 19 L50 25 C40 25 32 30 29 40 Z" fill="${color}" opacity=".22"/><path d="M74.5 39 C73 27 64 19 50 19 L50 25 C60 25 68 30 71 40 Z" fill="${color}" opacity=".22"/>`;
      case 1: // buzzcut / high-and-tight
        return `<path d="M23 38 Q50 8 77 38 L77 28 Q50 2 23 28 Z" fill="${color}"/>`;
      case 2: // slicked back
        return `<path d="M22 40 Q50 6 78 40 Q78 24 68 18 Q50 8 32 18 Q22 24 22 40 Z" fill="${color}"/>`;
      case 3: // shaved bald — bare, adds a hard scalp highlight
        return `<ellipse cx="42" cy="27" rx="7" ry="3.5" fill="rgba(255,255,255,.12)"/>`;
      case 4: // spiked / warhawk
        return `<path d="M22 36 L27 12 L34 34 L41 8 L50 34 L59 8 L66 34 L73 12 L78 36 Z" fill="${color}"/>`;
      case 5: // do-rag / skull cap, low and tight
        return `<path d="M20 40 Q50 10 80 40 L80 48 Q50 36 20 48 Z" fill="${color}"/><path d="M74 44 L88 52 L76 54 Z" fill="${color}"/>`;
      default:
        return '';
    }
  }

  // Heavy, angry brows — ALWAYS drawn (not optional), because this is the
  // single biggest lever for reading "aggressive" vs "friendly".
  function browsShape() {
    return `<path d="M29 44 L45 47.5" stroke="#0c0806" stroke-width="4.4" stroke-linecap="round"/><path d="M71 44 L55 47.5" stroke="#0c0806" stroke-width="4.4" stroke-linecap="round"/>`;
  }

  function eyesShape(style) {
    switch (style) {
      case 0: // narrowed / glaring slits
        return `<path d="M32 53 L44 54.5" stroke="#0c0806" stroke-width="3.2" stroke-linecap="round"/><path d="M68 53 L56 54.5" stroke="#0c0806" stroke-width="3.2" stroke-linecap="round"/>`;
      case 1: // glowing intense eyes
        return `<ellipse cx="38.5" cy="54" rx="3.4" ry="2.4" fill="#0c0806"/><ellipse cx="61.5" cy="54" rx="3.4" ry="2.4" fill="#0c0806"/><circle cx="38.5" cy="54" r="1.5" fill="${'var(--glow)'}"/><circle cx="61.5" cy="54" r="1.5" fill="${'var(--glow)'}"/>`;
      case 2: // combat shades — wraparound
        return `<path d="M28 51.5 Q50 47 72 51.5 L71 57 Q50 53.5 29 57 Z" fill="#080808"/><rect x="31" y="52" width="14" height="3.6" rx="1.8" fill="#3a4a6b" opacity=".55"/>`;
      default:
        return '';
    }
  }

  function mouthShape(style) {
    switch (style) {
      case 0: // clenched / flat scowl
        return `<path d="M38 65 L62 65" stroke="#3a1410" stroke-width="2.6" stroke-linecap="round"/>`;
      case 1: // bared-teeth snarl
        return `<path d="M36 63.5 L64 63.5 L61 68 L39 68 Z" fill="#0c0806"/><rect x="39" y="63.8" width="22" height="3.1" fill="#e8dfd0"/>`;
      case 2: // downturned grimace
        return `<path d="M39 64 Q50 60.5 61 64" stroke="#3a1410" stroke-width="2.6" fill="none" stroke-linecap="round"/>`;
      default:
        return '';
    }
  }

  function extraShape(style, color) {
    switch (style) {
      case 0: // bandana knot
        return `<rect x="21" y="35" width="58" height="9" rx="2" fill="${color}"/><path d="M76 39 L92 46 L78 49 Z" fill="${color}"/>`;
      case 1: // diagonal scar
        return `<path d="M62 32 L54 60" stroke="rgba(255,255,255,.5)" stroke-width="1.6" stroke-linecap="round"/><path d="M62 32 L54 60" stroke="rgba(0,0,0,.35)" stroke-width="3.4" stroke-linecap="round" opacity=".4"/>`;
      case 2: // under-eye war-paint marks
        return `<path d="M31 57 L35 63" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/><path d="M69 57 L65 63" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>`;
      case 3: // stubble / jaw shadow
        return `<path d="M29 59 C33 70 41 77 50 78 C59 77 67 70 71 59 C67 66 59 71 50 72 C41 71 33 66 29 59 Z" fill="#0c0806" opacity=".28"/>`;
      default:
        return '';
    }
  }

  /**
   * Returns a self-contained inline SVG (as a markup string) representing
   * a unique, tough fighter avatar for the given username. Deterministic:
   * the same username always renders the same avatar.
   */
  function svg(username) {
    const seed = hash(String(username || '?'));
    const uid = 'av' + (seed % 1e9).toString(36);
    const pal = pick(PALETTES, seed);
    const skin = pick(SKIN, Math.floor(seed / 7));
    const hairColor = pick(HAIR, Math.floor(seed / 11));
    const hairStyle = Math.floor(seed / 13) % 6;
    const eyeStyle = Math.floor(seed / 17) % 3;
    const mouthStyle = Math.floor(seed / 19) % 3;
    const gloveColor = pick(GLOVES, Math.floor(seed / 23));
    const extra = Math.floor(seed / 29) % 4;
    const glow = pal[0];

    const eyesMarkup = eyesShape(eyeStyle).replace(/var\(--glow\)/g, glow);

    return `<svg viewBox="0 0 100 100" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Avatar ${escapeAttr(username)}">
<defs>
  <linearGradient id="${uid}g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${pal[0]}"/>
    <stop offset="1" stop-color="${pal[1]}"/>
  </linearGradient>
  <radialGradient id="${uid}v" cx="50%" cy="30%" r="75%">
    <stop offset="55%" stop-color="#000000" stop-opacity="0"/>
    <stop offset="100%" stop-color="#000000" stop-opacity=".55"/>
  </radialGradient>
</defs>
<rect width="100" height="100" fill="url(#${uid}g)"/>
<rect x="0" y="82" width="100" height="18" fill="${pal[1]}" opacity=".95"/>
<circle cx="24.5" cy="52" r="6.4" fill="${skin}"/>
<circle cx="75.5" cy="52" r="6.4" fill="${skin}"/>
<path d="${HEAD_PATH}" fill="${skin}"/>
${extra === 3 ? extraShape(3, gloveColor) : ''}
${hairShape(hairStyle, hairColor)}
${extra === 0 ? extraShape(0, gloveColor) : ''}
${browsShape()}
${eyesMarkup}
<path d="M48 58 L52 58 L51 61.5 L49 61.5 Z" fill="rgba(0,0,0,.18)"/>
${mouthShape(mouthStyle)}
${extra === 1 ? extraShape(1, gloveColor) : ''}
${extra === 2 ? extraShape(2, gloveColor) : ''}
<circle cx="9" cy="95" r="12" fill="${gloveColor}"/>
<circle cx="91" cy="95" r="12" fill="${gloveColor}"/>
<path d="M2 92 L16 92" stroke="rgba(0,0,0,.3)" stroke-width="2"/>
<path d="M84 92 L98 92" stroke="rgba(0,0,0,.3)" stroke-width="2"/>
<circle cx="6" cy="90" r="3.4" fill="rgba(255,255,255,.35)"/>
<circle cx="94" cy="90" r="3.4" fill="rgba(255,255,255,.35)"/>
<rect width="100" height="100" fill="url(#${uid}v)"/>
</svg>`;
  }

  function escapeAttr(s) {
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  return { svg };
})();
