/* Minesweeper 13 x 12 for Tai Ying's World.
 *
 * Part 1 (createGame) is pure game logic with no DOM, so it can be tested in Node.
 * Part 2 wires it to the board in index.html (#ms-board and friends).
 *
 * Rules: 13 columns x 12 rows, 25 TNT. The first dig is always safe (it and its
 * neighbours are kept free of TNT), digging a 0 floods outward, and clicking a
 * revealed number whose flags match it digs the remaining neighbours (chording).
 */
(function (root) {
  'use strict';

  const COLS = 13, ROWS = 12, MINES = 25;

  /* ------------------------------------------------------------------ logic */
  function createGame(options) {
    const o = Object.assign({cols: COLS, rows: ROWS, mines: MINES, rng: Math.random}, options);
    const cols = o.cols, rows = o.rows, mines = o.mines, rng = o.rng, size = cols * rows;

    const nb = [];
    for (let i = 0; i < size; i++) {
      const r = Math.floor(i / cols), c = i % cols, list = [];
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (!dr && !dc) continue;
          const rr = r + dr, cc = c + dc;
          if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) list.push(rr * cols + cc);
        }
      }
      nb.push(list);
    }

    const g = {
      cols, rows, mines, size, nb,
      mine: new Uint8Array(size),
      count: new Uint8Array(size),
      open: new Uint8Array(size),
      flag: new Uint8Array(size),
      status: 'ready',   // ready -> playing -> won | lost
      opened: 0, flags: 0, boom: -1
    };

    function place(safe) {
      const banned = new Set([safe].concat(nb[safe]));
      let pool = [];
      for (let i = 0; i < size; i++) if (!banned.has(i)) pool.push(i);
      if (pool.length < mines) {            // tiny boards: only protect the clicked cell
        pool = [];
        for (let i = 0; i < size; i++) if (i !== safe) pool.push(i);
      }
      for (let k = 0; k < mines; k++) {     // partial Fisher-Yates
        const j = k + Math.floor(rng() * (pool.length - k));
        const t = pool[k]; pool[k] = pool[j]; pool[j] = t;
        g.mine[pool[k]] = 1;
      }
      for (let i = 0; i < size; i++) {
        let n = 0;
        for (const x of nb[i]) n += g.mine[x];
        g.count[i] = n;
      }
    }

    function flood(start) {
      const stack = [start];
      while (stack.length) {
        const i = stack.pop();
        if (g.open[i] || g.flag[i] || g.mine[i]) continue;
        g.open[i] = 1; g.opened++;
        if (g.count[i] === 0) for (const x of nb[i]) if (!g.open[x] && !g.flag[x]) stack.push(x);
      }
    }

    function win() {
      g.status = 'won';
      for (let i = 0; i < size; i++) if (g.mine[i] && !g.flag[i]) { g.flag[i] = 1; g.flags++; }
    }

    function lose(i) { g.status = 'lost'; g.boom = i; }

    g.reveal = function (i) {
      if (g.status === 'won' || g.status === 'lost' || g.flag[i] || g.open[i]) return false;
      if (g.status === 'ready') { place(i); g.status = 'playing'; }
      if (g.mine[i]) { lose(i); return true; }
      flood(i);
      if (g.opened === size - mines) win();
      return true;
    };

    g.toggleFlag = function (i) {
      if (g.status === 'won' || g.status === 'lost' || g.open[i]) return false;
      g.flag[i] ^= 1;
      g.flags += g.flag[i] ? 1 : -1;
      return true;
    };

    g.chord = function (i) {
      if (g.status !== 'playing' || !g.open[i] || g.count[i] === 0) return false;
      let flagged = 0;
      for (const x of nb[i]) flagged += g.flag[x];
      if (flagged !== g.count[i]) return false;
      let changed = false;
      for (const x of nb[i]) {
        if (g.open[x] || g.flag[x]) continue;
        changed = g.reveal(x) || changed;
        if (g.status !== 'playing') break;
      }
      return changed;
    };

    // hidden | flag | open | mine (revealed after a loss) | boom | wrong (bad flag after a loss)
    g.cellState = function (i) {
      if (g.status === 'lost') {
        if (i === g.boom) return 'boom';
        if (g.mine[i] && !g.flag[i]) return 'mine';
        if (g.flag[i] && !g.mine[i]) return 'wrong';
      }
      if (g.open[i]) return 'open';
      return g.flag[i] ? 'flag' : 'hidden';
    };

    return g;
  }

  const api = {createGame, COLS, ROWS, MINES};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.MSCore = api;
  if (typeof document === 'undefined') return;

  /* -------------------------------------------------------------------- DOM */
  const board = document.getElementById('ms-board');
  if (!board) return;
  const frame = board.closest('.ms-frame');
  const minesEl = document.getElementById('ms-mines');
  const timeEl = document.getElementById('ms-time');
  const bestEl = document.getElementById('ms-best');
  const statusEl = document.getElementById('ms-status');
  const newBtn = document.getElementById('ms-new');
  const modeBtn = document.getElementById('ms-mode');
  if (!minesEl || !timeEl || !bestEl || !statusEl || !newBtn || !modeBtn) return;

  const KEY = 'taiying-minesweeper-13x12-best';
  const READY = '準備好了？ / Ready?';
  let best = 0;
  try { best = Number(localStorage.getItem(KEY)) || 0; } catch (e) { /* private mode */ }

  let game = createGame();
  let flagMode = false, suppressClick = false, press = null;
  let pressFlag = {at: 0, i: -1}, current = 0;
  let timer = 0, t0 = 0, seconds = 0;
  const N = game.size;
  const cells = [];

  for (let i = 0; i < N; i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'cell';
    b.dataset.i = String(i);
    b.tabIndex = i === 0 ? 0 : -1;
    cells.push(b);
    board.append(b);
  }

  const pad = (n, w) => String(n).padStart(w, '0');

  function label(i, state) {
    const where = '列' + (Math.floor(i / COLS) + 1) + ' 欄' + ((i % COLS) + 1) + ' · ';
    if (state === 'hidden') return where + '未開 hidden';
    if (state === 'flag') return where + '旗 flagged';
    if (state === 'wrong') return where + '錯誤的旗 wrong flag';
    if (state === 'mine' || state === 'boom') return where + 'TNT';
    return where + (game.count[i] ? String(game.count[i]) : '空 empty');
  }

  function paint(i) {
    const state = game.cellState(i), b = cells[i];
    let cls = 'cell', text = '';
    if (state === 'flag') cls += ' flag';
    else if (state === 'wrong') cls += ' flag wrong';
    else if (state === 'mine') cls += ' mine';
    else if (state === 'boom') cls += ' mine boom';
    else if (state === 'open') {
      cls += ' open';
      if (game.count[i]) { cls += ' n' + game.count[i]; text = String(game.count[i]); }
    }
    if (b.className !== cls) b.className = cls;
    if (b.textContent !== text) b.textContent = text;
    b.setAttribute('aria-label', label(i, state));
  }

  function hud() {
    const left = game.mines - game.flags;
    minesEl.textContent = left < 0 ? '-' + pad(-left, 2) : pad(left, 3);
    bestEl.textContent = best ? best + 's' : '--';
  }

  function render() {
    for (let i = 0; i < N; i++) paint(i);
    hud();
  }

  function tick() {
    seconds = Math.min(999, Math.floor((Date.now() - t0) / 1000));
    timeEl.textContent = pad(seconds, 3);
  }
  function startTimer() { stopTimer(); t0 = Date.now(); timer = setInterval(tick, 200); tick(); }
  function stopTimer() { if (timer) { clearInterval(timer); timer = 0; tick(); } }

  function say(text) { statusEl.textContent = text; }

  function afterAction(prev) {
    render();
    if (prev === 'ready' && game.status === 'playing') { startTimer(); say('小心 TNT！ / Watch out for TNT!'); }
    if (prev !== 'playing' && prev !== 'ready') return;
    if (game.status === 'won') {
      stopTimer();
      let msg = '通關！用時 ' + seconds + ' 秒 / Cleared in ' + seconds + 's';
      if (!best || seconds < best) {
        best = seconds;
        try { localStorage.setItem(KEY, String(best)); } catch (e) { /* ignore */ }
        msg += ' · 新紀錄！ New best!';
      }
      say(msg); hud();
      frame && frame.classList.add('won');
    } else if (game.status === 'lost') {
      stopTimer();
      say('BOOM！踩到 TNT 了，再試一次？ / You hit TNT. Try again?');
      frame && frame.classList.add('lost');
    }
  }

  function act(i, flagging) {
    const prev = game.status;
    let changed;
    if (game.open[i]) changed = game.chord(i);
    else if (flagging) changed = game.toggleFlag(i);
    else changed = game.reveal(i);
    if (changed) afterAction(prev);
  }

  function setCurrent(i) {
    if (i === current) return;
    cells[current].tabIndex = -1;
    current = i;
    cells[i].tabIndex = 0;
  }

  function focusCell(i) {
    setCurrent(i);
    cells[i].focus();
  }

  function newGame() {
    stopTimer();
    game = createGame();
    frame && frame.classList.remove('won', 'lost');
    timeEl.textContent = '000';
    say(READY);
    render();
  }

  const cellOf = e => {
    const b = e.target.closest && e.target.closest('.cell');
    return b ? Number(b.dataset.i) : -1;
  };

  board.addEventListener('click', e => {
    const i = cellOf(e);
    if (i < 0) return;
    if (suppressClick) { suppressClick = false; return; }
    setCurrent(i);
    act(i, flagMode);
  });

  board.addEventListener('contextmenu', e => {
    e.preventDefault();
    const i = cellOf(e);
    if (i < 0 || game.open[i]) return;
    // On touch screens the browser also fires contextmenu after a long-press we already handled.
    if (pressFlag.i === i && Date.now() - pressFlag.at < 900) return;
    act(i, true);
  });

  // Touch / pen: long-press plants a flag.
  board.addEventListener('pointerdown', e => {
    suppressClick = false;
    if (e.pointerType === 'mouse' || e.button !== 0) return;
    const i = cellOf(e);
    if (i < 0) return;
    clearTimeout(press && press.timer);
    press = {id: e.pointerId, x: e.clientX, y: e.clientY, i: i, timer: setTimeout(() => {
      suppressClick = true;
      if (!game.open[i]) { act(i, true); pressFlag = {at: Date.now(), i: i}; }
      press = null;
    }, 450)};
  });
  board.addEventListener('pointermove', e => {
    if (press && press.id === e.pointerId && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 10) {
      clearTimeout(press.timer); press = null;
    }
  });
  const endPress = () => { if (press) { clearTimeout(press.timer); press = null; } };
  board.addEventListener('pointerup', endPress);
  board.addEventListener('pointercancel', endPress);
  board.addEventListener('pointerleave', endPress);

  // Keyboard: arrows move, Enter/Space dig (native button click), F plants a flag.
  board.addEventListener('keydown', e => {
    const i = cellOf(e);
    if (i < 0) return;
    const r = Math.floor(i / COLS), c = i % COLS;
    let n = -1;
    if (e.key === 'ArrowLeft') n = c > 0 ? i - 1 : i;
    else if (e.key === 'ArrowRight') n = c < COLS - 1 ? i + 1 : i;
    else if (e.key === 'ArrowUp') n = r > 0 ? i - COLS : i;
    else if (e.key === 'ArrowDown') n = r < ROWS - 1 ? i + COLS : i;
    else if (e.key === 'Home') n = r * COLS;
    else if (e.key === 'End') n = r * COLS + COLS - 1;
    else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); act(i, true); return; }
    if (n >= 0) { e.preventDefault(); focusCell(n); }
  });

  newBtn.addEventListener('click', newGame);
  modeBtn.addEventListener('click', () => {
    flagMode = !flagMode;
    modeBtn.setAttribute('aria-pressed', String(flagMode));
  });

  say(READY);
  render();
})(typeof window !== 'undefined' ? window : globalThis);
