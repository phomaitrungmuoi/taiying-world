// Elemental Zombies — 3D action RPG prototype (Three.js, no build step).
// Systems: 6 elements x 5 moves, unlock elements by kills, 5-slot mix-and-match loadout, combo bonus.
import * as THREE from './lib/three.module.min.js';

/* ------------------------------------------------------------------ data */
const mk = (el, id, name, kind, cd, o) => ({ el, id, name, kind, cd, ...o });
// kinds: proj | aoe | blast | beam | dash | heal | shield | haste
const ELEMENTS = {
  fire: { name: 'Hỏa', color: 0xff5a22, unlock: 0, moves: [
    mk('fire','fireball','Cầu lửa','proj',1.2,{dmg:22,speed:30,size:.5,boom:3,fx:{burn:3}}),
    mk('fire','flameburst','Bùng cháy','aoe',4,{dmg:30,radius:6,fx:{burn:4,knock:6}}),
    mk('fire','flamedash','Lướt lửa','dash',5,{dmg:28,dist:10,fx:{burn:3}}),
    mk('fire','meteor','Thiên thạch','blast',9,{dmg:80,dist:12,radius:6,delay:.7,fx:{burn:5,stun:1}}),
    mk('fire','infernowave','Sóng lửa','proj',6,{dmg:16,speed:24,size:.45,count:5,spread:.6,pierce:3,fx:{burn:3}}),
  ]},
  water: { name: 'Thủy', color: 0x3399ff, unlock: 8, moves: [
    mk('water','waterbullet','Đạn nước','proj',.9,{dmg:16,speed:38,size:.35,fx:{knock:5}}),
    mk('water','tidal','Sóng thần','aoe',6,{dmg:26,radius:8,fx:{knock:16}}),
    mk('water','spring','Suối chữa lành','heal',10,{amount:45}),
    mk('water','aquajet','Phản lực nước','dash',4,{dmg:18,dist:14,fx:{knock:6}}),
    mk('water','geyser','Mạch nước','blast',7,{dmg:45,dist:10,radius:5,delay:.5,fx:{slow:3,knock:12}}),
  ]},
  wind: { name: 'Phong', color: 0xa8ffd0, unlock: 20, moves: [
    mk('wind','slash','Lưỡi gió','proj',1,{dmg:18,speed:40,size:.4,pierce:4,fx:{}}),
    mk('wind','cyclone','Lốc xoáy','aoe',5,{dmg:24,radius:7,fx:{knock:22}}),
    mk('wind','gale','Gió cuốn','dash',3,{dmg:14,dist:16,fx:{knock:10}}),
    mk('wind','tailwind','Thuận gió','haste',12,{time:6}),
    mk('wind','tornado','Cuồng phong','blast',8,{dmg:50,dist:11,radius:6,delay:.5,fx:{knock:18,stun:1.2}}),
  ]},
  earth: { name: 'Thổ', color: 0xa07c4a, unlock: 40, moves: [
    mk('earth','rock','Ném đá','proj',1.4,{dmg:30,speed:26,size:.6,fx:{knock:6}}),
    mk('earth','quake','Động đất','aoe',7,{dmg:40,radius:9,fx:{stun:2}}),
    mk('earth','armor','Giáp đá','shield',14,{time:6}),
    mk('earth','boulder','Tảng đá rơi','blast',8,{dmg:70,dist:12,radius:5,delay:.8,fx:{stun:1.5}}),
    mk('earth','spikes','Gai đá','beam',5,{dmg:48,length:22,width:2.2,fx:{stun:1.2}}),
  ]},
  ice: { name: 'Băng', color: 0x8eeaff, unlock: 70, moves: [
    mk('ice','shard','Mảnh băng','proj',1.6,{dmg:14,speed:36,size:.3,count:3,spread:.25,fx:{slow:2}}),
    mk('ice','nova','Bão tuyết nổ','aoe',8,{dmg:35,radius:8,fx:{stun:2.5}}),
    mk('ice','slide','Trượt băng','dash',4,{dmg:20,dist:14,fx:{slow:3}}),
    mk('ice','blizzard','Bão tuyết','blast',10,{dmg:60,dist:12,radius:8,delay:.6,fx:{slow:5}}),
    mk('ice','iceplate','Giáp băng','shield',13,{time:7}),
  ]},
  lightning: { name: 'Lôi', color: 0xffe94a, unlock: 110, moves: [
    mk('lightning','bolt','Tia sét','beam',2,{dmg:40,length:30,width:1.6,fx:{stun:.5}}),
    mk('lightning','thunder','Sấm giáng','blast',6,{dmg:75,dist:11,radius:4.5,delay:.45,fx:{stun:1.5}}),
    mk('lightning','zapdash','Lướt sét','dash',3,{dmg:30,dist:18,fx:{stun:.8}}),
    mk('lightning','chain','Điện giật','proj',1.1,{dmg:24,speed:55,size:.3,pierce:6,fx:{stun:.4}}),
    mk('lightning','overcharge','Quá tải','haste',14,{time:7}),
  ]},
};
const MOVES = {};
for (const [k, e] of Object.entries(ELEMENTS)) e.moves.forEach(m => (MOVES[m.id] = m, m.color = e.color, m.key = k));
const ORDER = Object.keys(ELEMENTS);

/* ------------------------------------------------------------------ save */
const SAVE_KEY = 'elemzombie-v1';
const save = { kills: 0, loadout: ['fireball','flameburst','flamedash','meteor','infernowave'] };
try { Object.assign(save, JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')); } catch (e) {}
const persist = () => { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} };
const unlocked = el => save.kills >= ELEMENTS[el].unlock;
save.loadout = save.loadout.filter(id => MOVES[id] && unlocked(MOVES[id].key)).concat([]);
while (save.loadout.length < 5) save.loadout.push(null);
save.loadout = save.loadout.slice(0, 5);

/* ------------------------------------------------------------------ scene */
const $ = id => document.getElementById(id);
const canvas = $('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a1022);
scene.fog = new THREE.Fog(0x0a1022, 40, 140);
const camera = new THREE.PerspectiveCamera(65, 1, .1, 400);
function resize() { renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
addEventListener('resize', resize); resize();

scene.add(new THREE.HemisphereLight(0x8899ff, 0x223322, .8));
const moon = new THREE.DirectionalLight(0xaabbff, 1.1); moon.position.set(-30, 60, 20); scene.add(moon);

const ARENA = 70;
// ground with grid texture
{
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#243a2a'; g.fillRect(0, 0, 128, 128);
  g.strokeStyle = '#2d4a35'; g.strokeRect(0, 0, 128, 128);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${40 + Math.random() * 30},${70 + Math.random() * 40},50,.5)`; g.fillRect(Math.random() * 128, Math.random() * 128, 3, 3); }
  const tex = new THREE.CanvasTexture(c); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(60, 60); tex.magFilter = THREE.NearestFilter;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(500, 500), new THREE.MeshLambertMaterial({ map: tex }));
  ground.rotation.x = -Math.PI / 2; scene.add(ground);
  // arena ring
  const ring = new THREE.Mesh(new THREE.TorusGeometry(ARENA, .4, 8, 96), new THREE.MeshBasicMaterial({ color: 0x6677ff }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .4; scene.add(ring);
  // trees outside the arena
  const trunk = new THREE.CylinderGeometry(.5, .7, 4), leaf = new THREE.ConeGeometry(3, 8, 7);
  const tm = new THREE.MeshLambertMaterial({ color: 0x4a3322 }), lm = new THREE.MeshLambertMaterial({ color: 0x1f5a35 });
  for (let i = 0; i < 90; i++) {
    const a = Math.random() * 6.283, r = ARENA + 6 + Math.random() * 60;
    const t = new THREE.Group();
    const a1 = new THREE.Mesh(trunk, tm); a1.position.y = 2; const a2 = new THREE.Mesh(leaf, lm); a2.position.y = 8;
    t.add(a1, a2); t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); t.scale.setScalar(.8 + Math.random() * .8); scene.add(t);
  }
}

/* ------------------------------------------------------------------ state */
const P = { pos: new THREE.Vector3(0, 0, 0), vy: 0, hp: 100, max: 100, dead: false, shield: 0, haste: 0, dash: null, face: 0, hitFlash: 0 };
let yaw = 0, pitch = .35, running = false, menuOpen = false;
const zs = [], projs = [], fxs = [], timers = [];
const cdLeft = [0, 0, 0, 0, 0], cdMax = [1, 1, 1, 1, 1];
let combo = 0, comboT = 0, lastEl = null, spawnT = 0, spawnCount = 0, selSlot = 0;

// player model
const playerG = new THREE.Group();
const bodyMat = new THREE.MeshLambertMaterial({ color: 0x3a6fe0, emissive: 0x000000 });
{
  const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.5, .6), bodyMat); body.position.y = 1.5;
  const head = new THREE.Mesh(new THREE.BoxGeometry(.8, .8, .8), new THREE.MeshLambertMaterial({ color: 0xffd9a8 })); head.position.y = 2.7;
  const legs = new THREE.Mesh(new THREE.BoxGeometry(.9, .8, .5), new THREE.MeshLambertMaterial({ color: 0x223366 })); legs.position.y = .4;
  playerG.add(body, head, legs);
}
scene.add(playerG);

/* ------------------------------------------------------------------ helpers */
const fwd = () => new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
const geoSphere = new THREE.SphereGeometry(1, 12, 10), geoRing = new THREE.RingGeometry(.9, 1, 40), geoBox = new THREE.BoxGeometry(1, 1, 1);
function fx(geo, pos, color, o = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: o.op ?? .7, depthWrite: false, side: THREE.DoubleSide }));
  m.position.copy(pos); if (o.flat) m.rotation.x = -Math.PI / 2; if (o.rotY) m.rotation.y = o.rotY;
  m.scale.setScalar(o.from ?? 1); if (o.sx) m.scale.set(o.sx, o.sy, o.sz);
  scene.add(m); fxs.push({ m, t: 0, life: o.life ?? .4, from: o.from ?? 1, to: o.to ?? 1, op: o.op ?? .7, keep: o.sx != null });
  return m;
}
function toast(msg) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = msg; $('toasts').appendChild(d); setTimeout(() => d.remove(), 4000); }
function floatText(pos, txt, color = '#fff') {
  const v = pos.clone(); v.y += 2.5; v.project(camera);
  if (v.z > 1) return;
  const d = document.createElement('div'); d.className = 'float'; d.textContent = txt; d.style.color = color;
  d.style.left = (v.x * .5 + .5) * innerWidth + 'px'; d.style.top = (-v.y * .5 + .5) * innerHeight + 'px';
  document.body.appendChild(d); setTimeout(() => d.remove(), 800);
}
const hex = c => '#' + c.toString(16).padStart(6, '0');

/* ------------------------------------------------------------------ zombies */
const zGeo = { body: new THREE.BoxGeometry(1, 1.5, .6), head: new THREE.BoxGeometry(.8, .8, .8), arm: new THREE.BoxGeometry(.35, 1.3, .35), leg: new THREE.BoxGeometry(.9, .8, .5), bar: new THREE.PlaneGeometry(2, .25) };
function spawnZombie() {
  const brute = ++spawnCount % 10 === 0;
  const lvl = 1 + save.kills / 25;
  const a = Math.random() * 6.283, r = 28 + Math.random() * 25;
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const skin = brute ? 0x2f6b2f : 0x5aa05a;
  const sm = new THREE.MeshLambertMaterial({ color: skin }), cm = new THREE.MeshLambertMaterial({ color: brute ? 0x4a2020 : 0x3a4a7a });
  const body = new THREE.Mesh(zGeo.body, cm); body.position.y = 1.5;
  const head = new THREE.Mesh(zGeo.head, sm); head.position.y = 2.7;
  const legs = new THREE.Mesh(zGeo.leg, new THREE.MeshLambertMaterial({ color: 0x2a2a44 })); legs.position.y = .4;
  const armL = new THREE.Mesh(zGeo.arm, sm), armR = new THREE.Mesh(zGeo.arm, sm);
  armL.position.set(-.7, 2, -.5); armR.position.set(.7, 2, -.5); armL.rotation.x = armR.rotation.x = -1.3;
  inner.add(body, head, legs, armL, armR);
  const bar = new THREE.Mesh(zGeo.bar, new THREE.MeshBasicMaterial({ color: 0xff3333, side: THREE.DoubleSide, depthTest: false })); bar.position.y = 3.6; bar.renderOrder = 10; root.add(bar);
  const hp = (brute ? 160 : 45) * (1 + (lvl - 1) * .5);
  root.position.set(Math.cos(a) * r + P.pos.x, 0, Math.sin(a) * r + P.pos.z);
  if (root.position.length() > ARENA - 2) root.position.setLength(ARENA - 2);
  root.scale.setScalar(brute ? 1.6 : 1);
  scene.add(root);
  zs.push({ root, inner, bar, armL, armR, mats: [sm, cm], hp, max: hp, speed: (brute ? 2.6 : 3.2 + Math.random() * 1.2), dmg: (brute ? 22 : 9) * (1 + (lvl - 1) * .25), cd: 0, burn: 0, slow: 0, stun: 0, kv: new THREE.Vector3(), flash: 0, t: Math.random() * 9, brute });
}
function hurtZ(z, dmg, mv, from, mult = 1) {
  if (z.hp <= 0) return;
  dmg = Math.round(dmg * mult);
  z.hp -= dmg; z.flash = .15;
  floatText(z.root.position, dmg + (mult > 1 ? '!' : ''), mult > 1 ? '#ffd84a' : '#fff');
  const f = mv?.fx || {};
  if (f.burn) z.burn = Math.max(z.burn, f.burn);
  if (f.slow) z.slow = Math.max(z.slow, f.slow);
  if (f.stun) z.stun = Math.max(z.stun, f.stun);
  if (f.knock) { const d = z.root.position.clone().sub(from).setY(0); if (d.lengthSq() < .01) d.copy(fwd()); z.kv.add(d.normalize().multiplyScalar(f.knock * (z.brute ? .5 : 1))); }
  if (z.hp <= 0) killZ(z);
}
function killZ(z) {
  scene.remove(z.root); zs.splice(zs.indexOf(z), 1);
  fx(geoSphere, z.root.position.clone().setY(1.5), 0x66ff66, { from: .5, to: 2, life: .35, op: .6 });
  const before = ORDER.filter(unlocked);
  save.kills++;
  const after = ORDER.filter(unlocked);
  after.filter(e => !before.includes(e)).forEach(e => { toast(`🔓 Mở khóa nguyên tố ${ELEMENTS[e].name}! Nhấn Tab để trang bị chiêu mới.`); buildMenu(); });
  if (save.kills % 5 === 0) persist();
  updateHud();
}
function hurtPlayer(d) {
  if (P.dead) return;
  if (P.shield > 0) d *= .3;
  P.hp -= d; $('hurt').style.opacity = 1; setTimeout(() => $('hurt').style.opacity = 0, 120);
  if (P.hp <= 0) {
    P.hp = 0; P.dead = true; toast('💀 Bạn đã gục! Hồi sinh sau 3 giây...');
    setTimeout(() => { P.dead = false; P.hp = P.max; P.pos.set(0, 0, 0); zs.forEach(z => { z.root.position.setLength(Math.max(z.root.position.length(), 35)); }); }, 3000);
  }
}

/* ------------------------------------------------------------------ casting */
function damageArea(center, radius, mv, mult, dmgScale = 1) {
  for (const z of zs.slice()) {
    const d = z.root.position.distanceTo(center) - (z.brute ? .8 : 0);
    if (d <= radius) hurtZ(z, mv.dmg * dmgScale, mv, center, mult);
  }
}
function cast(i) {
  const mv = MOVES[save.loadout[i]];
  if (!mv || cdLeft[i] > 0 || P.dead || !running || menuOpen) return;
  // combo: chain different elements
  if (comboT > 0 && lastEl && lastEl !== mv.key) combo = Math.min(combo + 1, 5);
  else if (comboT <= 0) combo = 0;
  lastEl = mv.key; comboT = 3;
  const mult = 1 + combo * .15;
  const dir = fwd(), origin = P.pos.clone().setY(1.6);
  { // mild aim assist: snap to nearest zombie within ~25 degrees of the view direction
    let best = null, bd = 1e9;
    for (const z of zs) { const rel = z.root.position.clone().sub(P.pos).setY(0), l = rel.length(); if (l > 1 && l < 45 && rel.normalize().dot(dir) > .9 && l < bd) { bd = l; best = rel; } }
    if (best) dir.copy(best);
  }
  bodyMat.emissive.setHex(mv.color); bodyMat.emissiveIntensity = .5; P.glow = .4;
  P.face = Math.atan2(-dir.x, -dir.z) + Math.PI;

  switch (mv.kind) {
    case 'proj': {
      const n = mv.count || 1;
      for (let k = 0; k < n; k++) {
        const ang = n > 1 ? (k / (n - 1) - .5) * mv.spread * 2 : 0;
        const d = dir.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), ang);
        const m = new THREE.Mesh(geoSphere, new THREE.MeshBasicMaterial({ color: mv.color })); m.scale.setScalar(mv.size);
        m.position.copy(origin).addScaledVector(d, 1.5); scene.add(m);
        projs.push({ m, vel: d.multiplyScalar(mv.speed), life: 1.6, mv, mult, pierce: mv.pierce || 0, hit: new Set() });
      }
      break;
    }
    case 'aoe':
      damageArea(P.pos, mv.radius, mv, mult);
      fx(geoRing, P.pos.clone().setY(.3), mv.color, { flat: 1, from: 1, to: mv.radius, life: .45, op: .9 });
      fx(geoSphere, P.pos.clone().setY(1.5), mv.color, { from: 1, to: mv.radius * .8, life: .3, op: .35 });
      break;
    case 'blast': {
      const c = P.pos.clone().addScaledVector(dir, mv.dist).setY(0);
      if (c.length() > ARENA) c.setLength(ARENA);
      fx(geoRing, c.clone().setY(.2), mv.color, { flat: 1, from: mv.radius, to: mv.radius, life: mv.delay, op: .5 });
      timers.push({ t: mv.delay, fn: () => {
        damageArea(c, mv.radius, mv, mult);
        fx(geoSphere, c.clone().setY(1), mv.color, { from: 1, to: mv.radius, life: .5, op: .7 });
        const col = fx(geoBox, c.clone().setY(15), mv.color, { sx: 1.2, sy: 30, sz: 1.2, life: .3, op: .8 });
      } });
      break;
    }
    case 'beam': {
      const end = origin.clone().addScaledVector(dir, mv.length);
      for (const z of zs.slice()) {
        const rel = z.root.position.clone().sub(P.pos).setY(0), along = rel.dot(dir);
        if (along > 0 && along < mv.length && Math.abs(rel.cross(dir).y) < mv.width + (z.brute ? .8 : 0)) hurtZ(z, mv.dmg, mv, P.pos, mult);
      }
      const mid = origin.clone().add(end).multiplyScalar(.5);
      fx(geoBox, mid, mv.color, { sx: mv.width * .5, sy: mv.width * .5, sz: mv.length, rotY: Math.atan2(dir.x, dir.z), life: .25, op: .9 });
      break;
    }
    case 'dash':
      P.dash = { t: mv.dist / 45, dir, speed: 45, mv, mult, hit: new Set() };
      break;
    case 'heal':
      P.hp = Math.min(P.max, P.hp + mv.amount); updateHud();
      fx(geoRing, P.pos.clone().setY(.3), 0x55ff88, { flat: 1, from: 1, to: 4, life: .6, op: .9 });
      floatText(P.pos, '+' + mv.amount, '#6f6');
      break;
    case 'shield':
      P.shield = mv.time; fx(geoSphere, P.pos.clone().setY(1.6), mv.color, { from: 2.6, to: 2.6, life: mv.time, op: .25 });
      break;
    case 'haste':
      P.haste = mv.time; fx(geoRing, P.pos.clone().setY(.3), mv.color, { flat: 1, from: 1, to: 3, life: .5, op: .9 });
      break;
  }
  cdLeft[i] = cdMax[i] = mv.cd;
  updateCombo();
}

/* ------------------------------------------------------------------ input */
const keys = {};
addEventListener('keydown', e => {
  const k = e.key.toLowerCase();
  if (k === 'tab') { e.preventDefault(); if (running) toggleMenu(); return; }
  keys[k] = true;
  if (/^[1-5]$/.test(k)) cast(+k - 1);
  if (k === ' ') e.preventDefault();
});
addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
addEventListener('mousemove', e => {
  if (!running || menuOpen) return;
  if (document.pointerLockElement === canvas || e.buttons) {
    yaw -= e.movementX * .0028; pitch = Math.max(.05, Math.min(1.1, pitch + e.movementY * .0025));
  }
});
canvas.addEventListener('click', () => { if (running && !menuOpen && !document.pointerLockElement) canvas.requestPointerLock?.(); });
$('play').onclick = () => { $('start').classList.add('hidden'); running = true; canvas.requestPointerLock?.(); };
function toggleMenu() {
  menuOpen = !menuOpen; $('menu').classList.toggle('hidden', !menuOpen);
  if (menuOpen) { document.exitPointerLock?.(); buildMenu(); } else canvas.requestPointerLock?.();
}

/* ------------------------------------------------------------------ HUD / menu */
function buildBar() {
  $('bar').innerHTML = '';
  save.loadout.forEach((id, i) => {
    const mv = MOVES[id], d = document.createElement('div'); d.className = 'slot';
    d.style.borderColor = mv ? hex(mv.color) : '#888';
    d.innerHTML = `<span class="key">${i + 1}</span><div class="nm">${mv ? mv.name : '—'}</div><div class="cd"></div>`;
    $('bar').appendChild(d);
  });
}
function updateHud() {
  $('hp').style.width = (P.hp / P.max * 100) + '%'; $('hptxt').textContent = `${Math.ceil(P.hp)} / ${P.max}`;
  $('kills').textContent = `Hạ gục: ${save.kills}`;
  const nxt = ORDER.map(k => ELEMENTS[k]).find(e => save.kills < e.unlock);
  $('next').textContent = nxt ? `Nguyên tố ${nxt.name}: còn ${nxt.unlock - save.kills} lần hạ gục` : 'Đã mở khóa tất cả nguyên tố!';
}
function updateCombo() {
  const c = $('combo'); c.textContent = combo > 0 ? `COMBO x${combo}  (+${combo * 15}%)` : ''; c.style.opacity = combo > 0 ? 1 : 0;
}
function buildMenu() {
  const s = $('slots'); s.innerHTML = '';
  save.loadout.forEach((id, i) => {
    const mv = MOVES[id], b = document.createElement('button'); b.className = 'sl' + (i === selSlot ? ' sel' : '');
    b.innerHTML = `<b>[${i + 1}]</b><br>${mv ? mv.name : 'Trống'}`; if (mv) b.style.borderColor = hex(mv.color);
    b.onclick = () => { selSlot = i; buildMenu(); }; s.appendChild(b);
  });
  const el = $('elements'); el.innerHTML = '';
  for (const k of ORDER) {
    const e = ELEMENTS[k], ok = unlocked(k), box = document.createElement('div');
    box.className = 'el' + (ok ? '' : ' locked'); box.style.setProperty('--c', hex(e.color));
    box.innerHTML = `<h3>${e.name} ${ok ? '' : `🔒 ${e.unlock} kill`}</h3>`;
    e.moves.forEach(mv => {
      const b = document.createElement('button'); b.className = 'mv'; b.disabled = !ok;
      b.innerHTML = `${mv.name}<small>${kindLabel(mv)} · hồi ${mv.cd}s</small>`;
      b.onclick = () => { save.loadout[selSlot] = mv.id; selSlot = (selSlot + 1) % 5; persist(); buildBar(); buildMenu(); };
      box.appendChild(b);
    });
    el.appendChild(box);
  }
}
function kindLabel(m) {
  const t = { proj: 'Phóng', aoe: 'Quanh người', blast: 'Nổ vùng', beam: 'Tia', dash: 'Lướt', heal: 'Hồi máu', shield: 'Khiên', haste: 'Tăng tốc' }[m.kind];
  return m.dmg ? `${t} · ${m.dmg} ST` : m.amount ? `${t} +${m.amount}` : `${t} ${m.time}s`;
}

/* ------------------------------------------------------------------ main loop */
const clock = new THREE.Clock(), tmp = new THREE.Vector3();
function update(dt) {
  // player movement (relative to camera yaw)
  const f = fwd();
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const mv = new THREE.Vector3();
  if (!P.dead) {
    if (keys.w || keys.arrowup) mv.add(f); if (keys.s || keys.arrowdown) mv.sub(f);
    if (keys.d || keys.arrowright) mv.add(right); if (keys.a || keys.arrowleft) mv.sub(right);
  }
  const speed = 11 * (P.haste > 0 ? 1.7 : 1);
  if (P.dash) {
    P.pos.addScaledVector(P.dash.dir, P.dash.speed * dt); P.dash.t -= dt;
    for (const z of zs.slice()) if (!P.dash.hit.has(z) && z.root.position.distanceTo(P.pos) < 3) { P.dash.hit.add(z); hurtZ(z, P.dash.mv.dmg, P.dash.mv, P.pos, P.dash.mult); }
    fx(geoSphere, P.pos.clone().setY(1.5), P.dash.mv.color, { from: 1, to: .2, life: .3, op: .5 });
    if (P.dash.t <= 0) P.dash = null;
  } else if (mv.lengthSq() > 0) {
    mv.normalize(); P.pos.addScaledVector(mv, speed * dt); P.face = Math.atan2(mv.x, mv.z);
  }
  if (keys[' '] && P.pos.y <= 0 && !P.dead) P.vy = 12;
  P.vy -= 35 * dt; P.pos.y = Math.max(0, P.pos.y + P.vy * dt); if (P.pos.y === 0 && P.vy < 0) P.vy = 0;
  const flatLen = Math.hypot(P.pos.x, P.pos.z); if (flatLen > ARENA - 1) { P.pos.x *= (ARENA - 1) / flatLen; P.pos.z *= (ARENA - 1) / flatLen; }
  playerG.position.copy(P.pos); playerG.rotation.y = P.face;
  playerG.visible = !P.dead || (performance.now() % 300 < 150);
  if (P.glow > 0) { P.glow -= dt; if (P.glow <= 0) bodyMat.emissive.setHex(0); }
  P.shield = Math.max(0, P.shield - dt); P.haste = Math.max(0, P.haste - dt);
  if (!P.dead && P.hp < P.max) { P.hp = Math.min(P.max, P.hp + 1.5 * dt); }
  updateHud();

  // cooldowns / combo
  const cds = $('bar').children;
  for (let i = 0; i < 5; i++) { cdLeft[i] = Math.max(0, cdLeft[i] - dt); if (cds[i]) cds[i].querySelector('.cd').style.height = (cdLeft[i] / cdMax[i] * 100) + '%'; }
  if (comboT > 0) { comboT -= dt; if (comboT <= 0) { combo = 0; updateCombo(); } }

  // spawning
  const maxAlive = Math.min(6 + Math.floor(save.kills / 6), 28);
  spawnT -= dt; if (spawnT <= 0 && zs.length < maxAlive) { spawnZombie(); spawnT = Math.max(.4, 1.6 - save.kills / 120); }

  // zombies
  for (const z of zs.slice()) {
    const pos = z.root.position; z.t += dt;
    z.flash = Math.max(0, z.flash - dt);
    z.mats.forEach(m => m.emissive.setHex(z.flash > 0 ? 0xffffff : z.burn > 0 ? 0x661100 : z.slow > 0 ? 0x113366 : 0));
    if (z.burn > 0) { z.burn -= dt; z.hp -= 7 * dt * (1 + save.kills / 200); if (z.hp <= 0) { killZ(z); continue; } }
    z.slow = Math.max(0, z.slow - dt); z.stun = Math.max(0, z.stun - dt); z.cd -= dt;
    tmp.copy(P.pos).sub(pos).setY(0); const d = tmp.length();
    if (z.stun <= 0 && !P.dead) {
      const sp = z.speed * (z.slow > 0 ? .4 : 1);
      if (d > 1.6) { tmp.normalize(); pos.addScaledVector(tmp, sp * dt); }
      else if (z.cd <= 0) { z.cd = 1.1; hurtPlayer(z.dmg); }
      z.inner.rotation.y = Math.atan2(P.pos.x - pos.x, P.pos.z - pos.z);
      z.armL.rotation.x = z.armR.rotation.x = -1.3 + Math.sin(z.t * 8) * .25;
    }
    pos.addScaledVector(z.kv, dt); z.kv.multiplyScalar(Math.max(0, 1 - 5 * dt));
    for (const o of zs) if (o !== z) { const dx = pos.x - o.root.position.x, dz = pos.z - o.root.position.z, dd = Math.hypot(dx, dz); if (dd > 0 && dd < 1.4) { pos.x += dx / dd * 3 * dt; pos.z += dz / dd * 3 * dt; } }
    if (pos.length() > ARENA - 1) pos.setLength(ARENA - 1);
    z.bar.scale.x = Math.max(.01, z.hp / z.max); z.bar.quaternion.copy(camera.quaternion);
  }

  // projectiles
  for (let i = projs.length - 1; i >= 0; i--) {
    const p = projs[i]; p.m.position.addScaledVector(p.vel, dt); p.life -= dt;
    fx(geoSphere, p.m.position.clone(), p.mv.color, { from: p.mv.size * .8, to: .05, life: .25, op: .4 });
    let done = p.life <= 0;
    for (const z of zs.slice()) {
      if (p.hit.has(z)) continue;
      const zp = z.root.position;
      if (Math.hypot(zp.x - p.m.position.x, zp.z - p.m.position.z) < (z.brute ? 1.6 : 1.1) + p.mv.size) {
        p.hit.add(z);
        if (p.mv.boom) { damageArea(p.m.position, p.mv.boom, p.mv, p.mult, .7); fx(geoSphere, p.m.position.clone(), p.mv.color, { from: 1, to: p.mv.boom, life: .3, op: .6 }); done = true; break; }
        hurtZ(z, p.mv.dmg, p.mv, p.m.position.clone().sub(p.vel.clone().normalize()), p.mult);
        if (p.pierce-- <= 0) { done = true; break; }
      }
    }
    if (done) { scene.remove(p.m); projs.splice(i, 1); }
  }

  // delayed effects & fx
  for (let i = timers.length - 1; i >= 0; i--) { timers[i].t -= dt; if (timers[i].t <= 0) { timers[i].fn(); timers.splice(i, 1); } }
  for (let i = fxs.length - 1; i >= 0; i--) {
    const e = fxs[i]; e.t += dt; const k = Math.min(1, e.t / e.life);
    if (!e.keep) e.m.scale.setScalar(e.from + (e.to - e.from) * k);
    e.m.material.opacity = e.op * (1 - k * k);
    if (k >= 1) { scene.remove(e.m); e.m.material.dispose(); fxs.splice(i, 1); }
  }

  // camera (third person)
  const dist = 11, tx = P.pos.x, ty = P.pos.y + 3.2, tz = P.pos.z;
  camera.position.set(tx + Math.sin(yaw) * Math.cos(pitch) * dist, ty + Math.sin(pitch) * dist, tz + Math.cos(yaw) * Math.cos(pitch) * dist);
  camera.lookAt(tx, ty, tz);
}
function frame() {
  const dt = Math.min(clock.getDelta(), .05);
  if (running && !menuOpen) update(dt);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
buildBar(); updateHud(); frame();
// debug hook for tests
window.__game = { save, P, zs, cast, unlocked, get running() { return running; } };
