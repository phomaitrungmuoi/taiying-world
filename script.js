(() => {
  'use strict';
  const root = document.documentElement;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motion = document.getElementById('motion');
  function setPaused(value) {
    root.classList.toggle('paused', value);
    motion.setAttribute('aria-pressed', String(value));
    motion.setAttribute('aria-label', value ? '開啟動畫 / Enable animation' : '暫停動畫 / Pause animation');
    motion.textContent = value ? '▷' : 'Ⅱ';
  }
  setPaused(reduced.matches);
  motion.addEventListener('click', () => setPaused(!root.classList.contains('paused')));
  reduced.addEventListener('change', e => setPaused(e.matches));
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
    }), {threshold: 0.08});
    root.classList.add('js');
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
  }
  const field = document.getElementById('particles');
  for (let i = 0; i < 16; i++) {
    const pixel = document.createElement('span'); pixel.className = 'particle';
    pixel.style.left = `${(i * 37) % 100}%`; pixel.style.animationDelay = `${-i * 1.7}s`;
    pixel.style.animationDuration = `${14 + i % 7}s`; field.append(pixel);
  }
  const avatar = document.getElementById('avatar');
  const fallback = () => { avatar.hidden = true; avatar.style.display = 'none'; };
  avatar.addEventListener('error', fallback);
  if (avatar.complete && !avatar.naturalWidth) fallback();
  let timer;
  document.querySelectorAll('[data-copy]').forEach(button => button.addEventListener('click', async () => {
    const toast = document.getElementById('toast');
    try { await navigator.clipboard.writeText(button.dataset.copy); toast.textContent = '已複製信箱 / Email copied'; }
    catch { toast.textContent = '請長按或選取上方信箱以複製 / Select email to copy'; }
    toast.classList.add('show'); clearTimeout(timer); timer = setTimeout(() => toast.classList.remove('show'), 3200);
  }));
  document.getElementById('year').textContent = new Date().getFullYear();
})();
