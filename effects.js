/* Page effects: XP scroll bar, hotbar highlight, animated End background, splash text.
 * Everything here is decoration. It stops with the page's pause button (html.paused)
 * and with prefers-reduced-motion, and the page works without it. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches || root.classList.contains('paused');

  // Deterministic pseudo-random (mulberry32), so the sky looks the same on every load.
  const makeRand = seed => () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const rand = makeRand(20260921);
  const between = (a, b) => a + rand() * (b - a);

  /* ---- XP bar: scroll progress ---- */
  const xp = document.querySelector('#xp i');
  /* ---- Hotbar: highlight the section being read ---- */
  const links = Array.from(document.querySelectorAll('header nav a[href^="#"]'));
  const sections = links.map(a => document.querySelector(a.hash));

  let queued = 0;
  function onScroll() {
    queued = 0;
    if (xp) {
      const max = root.scrollHeight - innerHeight;
      xp.style.transform = 'scaleX(' + (max > 0 ? Math.min(1, scrollY / max) : 0) + ')';
    }
    let active = -1;
    sections.forEach((s, i) => { if (s && s.getBoundingClientRect().top <= innerHeight * 0.4) active = i; });
    links.forEach((a, i) => {
      a.classList.toggle('active', i === active);
      if (i === active) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
    });
  }
  const schedule = () => { if (!queued) queued = requestAnimationFrame(onScroll); };
  addEventListener('scroll', schedule, {passive: true});
  addEventListener('resize', schedule);
  onScroll();

  /* ---- Background: the End. Void sky, floating end stone islands, obsidian
   *      pillars topped with end crystals, drifting blocks, ender particles
   *      and a few pairs of watching eyes. ---- */
  const bg = document.createElement('div');
  bg.id = 'bg';
  bg.setAttribute('aria-hidden', 'true');
  const layer = cls => {
    const l = document.createElement('div');
    l.className = 'layer' + (cls ? ' ' + cls : '');
    bg.append(l);
    return l;
  };
  const skyLayer = layer(), horizonLayer = layer('horizon'), islandLayer = layer(),
    cubeLayer = layer(), orbLayer = layer();

  const small = innerWidth < 600;
  const put = (parent, cls, vars) => {
    const el = document.createElement('span');
    el.className = cls;
    Object.keys(vars).forEach(k => el.style.setProperty(k, vars[k]));
    parent.append(el);
    return el;
  };
  // Layers overhang the viewport by 140px (room for parallax), so place things in viewport units.
  const at = (el, x, y) => { el.style.left = 'calc(140px + ' + x + 'vw)'; el.style.top = 'calc(140px + ' + y + 'vh)'; };

  // Pixel art as <svg>: fills maps a color to [x, y, w, h] rectangles.
  const svg = (w, h, fills, extra, fit) => {
    let paths = '';
    Object.keys(fills).forEach(color => {
      const d = fills[color].map(r => 'M' + r[0] + ' ' + r[1] + 'h' + r[2] + 'v' + r[3] + 'h' + -r[2] + 'z').join('');
      if (d) paths += '<path fill="' + color + '" d="' + d + '"/>';
    });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + w + ' ' + h + '"' +
      (fit ? ' preserveAspectRatio="' + fit + '"' : '') + ' shape-rendering="crispEdges" focusable="false">' +
      (extra && extra[0] || '') + paths + (extra && extra[1] || '') + '</svg>';
  };

  for (let i = 0; i < (small ? 30 : 60); i++) {
    const s = put(skyLayer, 'star' + (rand() < 0.12 ? ' big' : ''), {
      '--dur': between(2.5, 6).toFixed(1) + 's', '--delay': (-between(0, 6)).toFixed(1) + 's'});
    s.style.left = between(0, 100).toFixed(1) + '%';
    s.style.top = between(0, 100).toFixed(1) + '%';
  }

  /* Floating islands: an end stone crust that tapers underneath, sometimes with a chorus plant. */
  const STONE = ['#d6d29a', '#b9b47b', '#938e5c', '#6a6542', '#45412b'];
  function island(w, plant) {
    const c = (w - 1) / 2, depth = Math.round(w * 0.42), ph = plant ? 7 : 0;
    const f = {};
    const add = (color, x, y, rw, rh) => (f[color] = f[color] || []).push([x, y, rw, rh]);
    for (let x = 0; x < w; x++) {
      const edge = Math.abs(x - c) / c;
      const top = ph + (edge > 0.82 ? 1 : 0);
      const d = Math.max(1, Math.round(depth * Math.pow(1 - edge, 0.8) + between(-1, 1)));
      add(STONE[0], x, top, 1, 1);
      // Bands of darker stone with a ragged boundary.
      let y = 1;
      [0.3, 0.55, 0.8, 1].forEach((t, band) => {
        const end = Math.min(d, Math.round(d * t + (band < 3 ? between(-0.6, 0.6) : 0)));
        if (end >= y) { add(STONE[band + 1], x, top + y, 1, end - y + 1); y = end + 1; }
      });
      if (rand() < 0.18 && d > 2) add('#efecc2', x, top + 1, 1, 1);
    }
    if (plant) {
      const px = Math.round(c + between(-c / 2, c / 2));
      add('#6d4a78', px, 2, 1, ph - 2);
      add('#6d4a78', px - 2, 4, 2, 1);
      add('#6d4a78', px - 2, 2, 1, 2);
      add('#8f6c99', px + 1, 3, 1, 1);
      add('#dcb8e4', px, 0, 1, 2);
      add('#dcb8e4', px - 2, 1, 1, 1);
      add('#a37aad', px + 1, 1, 1, 1);
    }
    return {html: svg(w, ph + depth + 2, f), w, h: ph + depth + 2};
  }
  (small
    ? [[62, 21, 20, 4, 0], [74, 58, 12, 3, 1]]
    : [[-3, 17, 24, 5, 1], [45, 15, 26, 5, 0], [57, 60, 13, 4, 1], [1, 72, 16, 4, 0]]
  ).forEach((p, i) => {
    const isle = island(p[2], p[4]);
    const el = put(islandLayer, 'island', {
      '--dur': between(7, 12).toFixed(1) + 's', '--delay': (-between(0, 10)).toFixed(1) + 's',
      '--o': (0.28 + p[3] * 0.04).toFixed(2)});
    el.innerHTML = isle.html;
    el.style.width = isle.w * p[3] + 'px';
    el.style.height = isle.h * p[3] + 'px';
    at(el, p[0], p[1]);
  });

  /* Horizon: the main island's obsidian pillars, each with an end crystal on top. */
  const makeHorizon = () => {
    const r = makeRand(1312), range = (a, b) => a + r() * (b - a);
    const unit = small ? 3 : 4, W = Math.ceil((innerWidth + 80) / unit), H = small ? 76 : 106;
    const f = {}, glow = [], crystals = [];
    const add = (color, x, y, w, h) => (f[color] = f[color] || []).push([x, y, w, h]);
    const phase = [range(0, 6), range(0, 6)];
    const ground = x => Math.round(5 + 2.5 * Math.sin(x / 23 + phase[0]) + 1.5 * Math.sin(x / 9 + phase[1]));
    const count = Math.max(3, Math.round(W / 64)), gap = W / count;
    for (let i = 0; i < count; i++) {
      const far = r() < 0.45;
      const pw = far ? Math.round(range(6, 9)) : Math.round(range(10, 15));
      const x = Math.round(gap * (i + 0.5) + range(-gap / 4, gap / 4) - pw / 2);
      const top = Math.round(H * range(far ? 0.4 : 0.18, far ? 0.62 : 0.55));
      const bottom = H - ground(x) + 1;
      if (far) {
        add('#170f22', x, top, pw, bottom - top);
        add('#21162f', x, top, pw, 1);
      } else {
        add('#0b0711', x, top, pw, bottom - top);
        add('#1d132c', x, top, 2, bottom - top);
        add('#2c1e42', x, top, pw, 1);
        add('#06040a', x + pw - 2, top + 1, 2, bottom - top - 1);
        for (let y = top + 2; y < bottom - 1; y += Math.round(range(1, 4))) {
          add(r() < 0.5 ? '#22173a' : '#2b1c48', x + 2 + Math.floor(r() * (pw - 4)), y, r() < 0.3 ? 2 : 1, 1);
        }
      }
      // Bedrock seat and the crystal floating above it.
      const cx = x + Math.floor(pw / 2), cy = top - 7, delay = (-range(0, 4)).toFixed(1) + 's';
      add(far ? '#232027' : '#34313a', cx - 1, top - 1, 3, 1);
      glow.push('<circle class="crystal-glow" style="animation-delay:' + delay + '" cx="' + (cx + 0.5) + '" cy="' + (cy + 2.5) +
        '" r="' + (far ? 7 : 10) + '" fill="url(#crystal-glow)"/>');
      crystals.push('<g class="crystal" style="animation-delay:' + delay + '"' + (far ? ' opacity=".6"' : '') + '>' +
        '<path fill="#e9c6ef" fill-opacity=".55" d="M' + (cx - 2) + ' ' + cy + 'h5v5h-5zm1 1v3h3v-3z"/>' +
        '<path fill="#f39be3" d="M' + (cx - 1) + ' ' + (cy + 1) + 'h3v3h-3z"/>' +
        '<path fill="#fff0fb" d="M' + cx + ' ' + (cy + 2) + 'h1v1h-1z"/></g>');
    }
    for (let x = 0; x < W; x++) {
      const g = ground(x);
      add('#57523b', x, H - g, 1, 1);
      add('#2f2b20', x, H - g + 1, 1, g - 1);
    }
    const defs = '<defs><radialGradient id="crystal-glow"><stop offset="0" stop-color="#f08ce0" stop-opacity=".55"/>' +
      '<stop offset="1" stop-color="#f08ce0" stop-opacity="0"/></radialGradient></defs>';
    horizonLayer.innerHTML = svg(W, H, f, [defs + glow.join(''), crystals.join('')], 'xMidYMax slice');
    horizonLayer.firstChild.style.height = H * unit + 'px';
    return innerWidth;
  };
  let horizonWidth = makeHorizon();
  addEventListener('resize', () => { if (Math.abs(innerWidth - horizonWidth) > 160) horizonWidth = makeHorizon(); });

  /* Drifting blocks along the edges. */
  const kinds = ['endstone', 'purpur', 'obsidian', 'pearl', 'endstone', 'crystal', 'purpur', 'obsidian'];
  kinds.forEach((kind, i) => {
    const left = i % 2 ? between(88, 96) : between(2, 10);
    const el = put(cubeLayer, 'cube ' + kind, {
      '--s': Math.round(between(22, 36) * (kind === 'pearl' ? 0.6 : 1)) + 'px', '--dur': between(6, 11).toFixed(1) + 's',
      '--delay': (-between(0, 8)).toFixed(1) + 's'});
    el.style.left = left.toFixed(1) + '%';
    el.style.top = (8 + i * 11 + between(-3, 3)).toFixed(1) + '%';
  });

  /* Enderman eyes that open in the dark now and then. */
  (small ? [[4, 42], [90, 70]] : [[3, 36], [93, 22], [8, 78], [88, 64]]).forEach(p => {
    const el = put(islandLayer, 'eyes', {
      '--dur': between(11, 19).toFixed(1) + 's', '--delay': (-between(0, 18)).toFixed(1) + 's'});
    at(el, p[0], p[1]);
  });

  /* Ender particles rising from the void. */
  for (let i = 0; i < (small ? 8 : 16); i++) {
    const o = put(orbLayer, 'ender' + (rand() < 0.4 ? ' small' : ''), {
      '--dur': between(12, 22).toFixed(1) + 's', '--delay': (-between(0, 20)).toFixed(1) + 's',
      '--sway': Math.round(between(-26, 26)) + 'px'});
    o.style.left = between(3, 97).toFixed(1) + '%';
  }
  document.body.prepend(bg);

  /* ---- Parallax: layers drift with the pointer and slowly with scroll ---- */
  const depth = [[6, 4, 0.02], [4, 2, 0], [12, 7, 0.04], [18, 10, 0.08], [26, 16, 0.12]];
  const layers = [skyLayer, horizonLayer, islandLayer, cubeLayer, orbLayer];
  const target = {x: 0, y: 0}, now = {x: 0, y: 0};
  let raf = 0;
  function paint() {
    raf = 0;
    now.x += (target.x - now.x) * 0.12;
    now.y += (target.y - now.y) * 0.12;
    layers.forEach((l, i) => {
      const d = depth[i];
      l.style.transform = 'translate3d(' + (now.x * d[0]).toFixed(2) + 'px,' +
        (now.y * d[1] - scrollY * d[2]).toFixed(2) + 'px,0)';
    });
    if (Math.abs(target.x - now.x) + Math.abs(target.y - now.y) > 0.002) raf = requestAnimationFrame(paint);
  }
  const kick = () => { if (!raf && !still()) raf = requestAnimationFrame(paint); };
  addEventListener('pointermove', e => {
    if (e.pointerType !== 'mouse') return;
    target.x = e.clientX / innerWidth - 0.5;
    target.y = e.clientY / innerHeight - 0.5;
    kick();
  }, {passive: true});
  addEventListener('scroll', kick, {passive: true});

  /* ---- Splash text, like the Minecraft title screen ---- */
  const splash = document.getElementById('splash');
  if (splash) {
    const lines = ['NCPC finals!', 'Also try Minesweeper!', 'Meow! ♡', 'Built block by block!', 'Codeforces time!'];
    splash.textContent = lines[Math.floor(Math.random() * lines.length)];
  }
})();
