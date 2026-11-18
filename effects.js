/* Page effects: XP scroll bar, hotbar highlight, animated background, splash text.
 * Everything here is decoration. It stops with the page's pause button (html.paused)
 * and with prefers-reduced-motion, and the page works without it. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const still = () => reduced.matches || root.classList.contains('paused');

  // Deterministic pseudo-random, so the sky looks the same on every load.
  let seed = 20260921;
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
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

  /* ---- Background: stars, clouds, floating blocks, XP orbs ---- */
  const bg = document.createElement('div');
  bg.id = 'bg';
  bg.setAttribute('aria-hidden', 'true');
  const layer = () => { const l = document.createElement('div'); l.className = 'layer'; bg.append(l); return l; };
  const skyLayer = layer(), cloudLayer = layer(), cubeLayer = layer(), orbLayer = layer();

  const small = innerWidth < 600;
  const put = (parent, cls, vars) => {
    const el = document.createElement('span');
    el.className = cls;
    Object.keys(vars).forEach(k => el.style.setProperty(k, vars[k]));
    parent.append(el);
    return el;
  };

  for (let i = 0; i < (small ? 28 : 52); i++) {
    const s = put(skyLayer, 'star' + (rand() < 0.14 ? ' big' : ''), {
      '--dur': between(2.5, 6).toFixed(1) + 's', '--delay': (-between(0, 6)).toFixed(1) + 's'});
    s.style.left = between(0, 100).toFixed(1) + '%';
    s.style.top = between(0, 100).toFixed(1) + '%';
  }

  [[9, 180, 14], [20, 260, 55], [34, 220, 30], [52, 300, 80]].forEach(c => {
    const el = put(cloudLayer, 'cloud', {
      '--dur': c[1] + 's', '--delay': '-' + (c[1] * c[2] / 100).toFixed(0) + 's', '--rx': c[2] + 'vw'});
    el.style.top = c[0] + '%';
    el.style.fontSize = (small ? 9 : 14) + 'px';
  });

  const kinds = ['grass', 'stone', 'gold', 'diamond', 'stone', 'tnt', 'grass', 'diamond'];
  kinds.forEach((kind, i) => {
    const left = i % 2 ? between(88, 96) : between(2, 10);
    const el = put(cubeLayer, 'cube ' + kind, {
      '--s': Math.round(between(24, 40)) + 'px', '--dur': between(6, 11).toFixed(1) + 's',
      '--delay': (-between(0, 8)).toFixed(1) + 's'});
    el.style.left = left.toFixed(1) + '%';
    el.style.top = (8 + i * 11 + between(-3, 3)).toFixed(1) + '%';
  });

  for (let i = 0; i < (small ? 6 : 11); i++) {
    const o = put(orbLayer, 'orb', {
      '--dur': between(13, 24).toFixed(1) + 's', '--delay': (-between(0, 20)).toFixed(1) + 's'});
    o.style.left = between(3, 97).toFixed(1) + '%';
  }
  document.body.prepend(bg);

  /* ---- Parallax: layers drift with the pointer and slowly with scroll ---- */
  const depth = [[6, 4, 0.03], [10, 6, 0.05], [18, 10, 0.09], [26, 16, 0.13]];
  const layers = [skyLayer, cloudLayer, cubeLayer, orbLayer];
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
