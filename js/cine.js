/* ══════════════════════════════════════════════════════════════
   LAS PALMAS — cinematic scroll engine
   ══════════════════════════════════════════════════════════════ */
(() => {
'use strict';

const D   = window.LP_DATA;
const $   = (s, r = document) => r.querySelector(s);
const $$  = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => v < a ? a : v > b ? b : v;
const lerp  = (a, b, t) => a + (b - a) * t;
const easeInOut = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COARSE  = matchMedia('(pointer: coarse)').matches;

/* ─────────────────────────────────────────────
   LANGUAGE
   ───────────────────────────────────────────── */
let lang = 'es';
function applyLang() {
  $$('[data-es]').forEach(el => {
    const v = el.dataset[lang];
    if (v == null) return;
    if (/<br\s*\/?>/i.test(v)) el.innerHTML = v; else el.textContent = v;
  });
  document.documentElement.lang = lang;
  /* there is no cursor to move on a touch device */
  const hint = $('#mapHint');
  if (hint && COARSE) {
    const t = hint.dataset[lang + 'Touch'];
    if (t) hint.textContent = t;
  }
  const b = $('#langBtn');
  if (b) {
    b.children[0].classList.toggle('off', lang !== 'es');
    b.children[2].classList.toggle('off', lang !== 'en');
  }
  renderCourts(); renderMenu(); renderDates(); renderTimes(); syncSummary();
}
$('#langBtn')?.addEventListener('click', () => { lang = lang === 'es' ? 'en' : 'es'; applyLang(); });

/* ─────────────────────────────────────────────
   CHAPTERS
   ───────────────────────────────────────────── */
const chapters = $$('.chapter').map((el, i) => {
  const len = +el.dataset.len || 300;
  el.style.height = len + 'vh';
  return {
    el, i, len,
    stage : $('.stage', el),
    copies: $$('[data-in]', el).map(c => ({
      el: c, in: +c.dataset.in || 0, out: +c.dataset.out || 1
    })),
    slug  : $('.chapter-slug', el),
    films : $$('.film', el).map(f => ({ host: f, src: f.dataset.video, poster: f.dataset.poster, v: null, cur: 0, target: 0, ready: false })),
    top: 0, height: 0, p: 0
  };
});

function measure() {
  chapters.forEach(c => {
    const r = c.el.getBoundingClientRect();
    c.top    = r.top + window.scrollY;
    c.height = c.el.offsetHeight;
  });
}

/* ─────────────────────────────────────────────
   FILM LAYERS — scroll-scrubbed video
   ───────────────────────────────────────────── */
function buildFilm(f) {
  if (f.v || !f.src) return;

  if (f.poster) {
    const img = new Image();
    img.src = f.poster; img.alt = ''; img.decoding = 'async';
    f.host.appendChild(img);
  }

  const v = document.createElement('video');
  v.src = f.src;
  v.muted = true; v.defaultMuted = true;
  v.playsInline = true; v.setAttribute('playsinline', '');
  v.setAttribute('webkit-playsinline', '');
  v.preload = 'auto';
  v.loop = false; v.controls = false;
  v.addEventListener('loadeddata', () => { f.ready = true; v.classList.add('ready'); }, { once: true });
  v.addEventListener('error', () => { f.ready = false; });
  f.host.appendChild(v);
  f.v = v;
}

/* iOS will not let us seek a video that has never been handed a gesture. */
let primed = false;
function prime() {
  if (primed) return; primed = true;
  chapters.forEach(c => c.films.forEach(f => {
    if (!f.v) return;
    const p = f.v.play();
    if (p && p.then) p.then(() => f.v.pause()).catch(() => {});
    else { try { f.v.pause(); } catch (e) {} }
  }));
}
['touchstart', 'pointerdown', 'wheel', 'keydown'].forEach(e =>
  addEventListener(e, prime, { once: true, passive: true }));

/* ─────────────────────────────────────────────
   SCROLL STATE
   ───────────────────────────────────────────── */
const aerial     = $('#aerialImg');
const bloom      = $('#bloom');
const nightLayer = $('#nightLayer');
const insideLayer= $('#insideLayer');
const matLayer   = $('#matLayer');
const progFill   = $('#progFill');
const navBtns    = $$('#chapterNav button');
const scrollCue  = $('#scrollCue');

const FADE = .07;
function copyOpacity(p, a, b) {
  if (p < a || p > b) return 0;
  return Math.min(1, (p - a) / FADE, (b - p) / FADE);
}

let active = 0;

function frame() {
  const y  = window.scrollY;
  const vh = window.innerHeight;
  active = -1;

  chapters.forEach(c => {
    /* stages are fixed, so a chapter owns exactly its own section of
       scroll: p hits 1 at the precise moment the next one hits 0. */
    const raw = (y - c.top) / Math.max(1, c.height);
    const p = clamp(raw);
    c.p = p;

    const near = y + vh * 1.6 > c.top && y < c.top + c.height + vh * .6;
    const live = raw > -0.03 && raw < 1.03;

    if (near) c.films.forEach(buildFilm);
    if (live && raw < 1) active = c.i;

    /* dissolve out across the last stretch so the cut never shows a seam */
    const FADE_AT = .94;
    let op = 1;
    if (raw >= FADE_AT) op = clamp(1 - (raw - FADE_AT) / (1 - FADE_AT));
    else if (raw < 0) op = 1;
    c.stage.style.opacity = live ? op.toFixed(3) : '0';
    c.stage.style.visibility = live ? 'visible' : 'hidden';
    c.stage.style.zIndex = String(40 - c.i);

    /* copy + slug reveal */
    c.copies.forEach(k => {
      const o = copyOpacity(p, k.in, k.out);
      k.el.style.opacity = o;
      k.el.style.transform =
        (k.el.classList.contains('copy-center') ? 'translate(-50%,-50%) ' :
         k.el.classList.contains('picker') || k.el.classList.contains('menu-wrap') ? 'translateY(-50%) ' : '') +
        `translate3d(0,${(1 - o) * 18}px,0)`;
      k.el.classList.toggle('vis', o > .5);
    });

    if (!near) return;

    /* video scrub targets */
    c.films.forEach((f, fi) => {
      if (!f.v || !f.ready || !f.v.duration) return;
      let fp = p;
      if (c.films.length > 1) {             /* two films share one chapter */
        fp = fi === 0 ? clamp(p / .55) : clamp((p - .45) / .55);
      }
      f.target = clamp(fp) * (f.v.duration - .05);
    });
  });

  /* ── chapter 00 · aerial descent ── */
  const c0 = chapters[0];
  if (aerial && c0) {
    const e = easeInOut(clamp(c0.p));
    const scale = 1 + e * 1.75;
    const dx = -e * 3.5, dy = e * 5.5;
    aerial.style.transform =
      `translate(-50%,-50%) translate3d(${dx}%,${dy}%,0) scale(${scale.toFixed(4)})`;
  }

  /* ── chapter 02 · light bloom through the pergola ── */
  const c2 = chapters[2];
  if (bloom && c2) {
    const b = Math.sin(clamp(c2.p) * Math.PI);
    bloom.style.opacity = (b * .62).toFixed(3);
  }

  /* ── any chapter holding two films crossfades at the midpoint ── */
  chapters.forEach(c => {
    if (c.films[1]) c.films[1].host.style.opacity = clamp((c.p - .45) / .12).toFixed(3);
  });

  /* ── chapter 01 · the entrance mat, in full resolution ── */
  const c1 = chapters[1];
  if (matLayer && c1) {
    matLayer.style.opacity = clamp((c1.p - .70) / .12).toFixed(3);
  }

  /* ── chapter 05 · outside, then inside, then night ── */
  const c5 = chapters[5];
  if (c5) {
    if (insideLayer) insideLayer.style.opacity = clamp((c5.p - .22) / .12).toFixed(3);
    if (nightLayer)  nightLayer.style.opacity  = clamp((c5.p - .50) / .14).toFixed(3);
  }

  /* chrome */
  const doc = document.documentElement;
  const total = doc.scrollHeight - vh;
  if (progFill) progFill.style.width = (clamp(y / Math.max(1, total)) * 100).toFixed(2) + '%';
  navBtns.forEach((b, i) => b.classList.toggle('on', i === active));
  if (scrollCue) scrollCue.style.opacity = y > vh * .3 ? 0 : 1;

  seek();
  requestAnimationFrame(frame);
}

/* Seeking is throttled separately: pushing currentTime every frame
   drowns the decoder and produces the stutter we are trying to avoid. */
function seek() {
  chapters.forEach(c => {
    c.films.forEach(f => {
      if (!f.v || !f.ready) return;
      /* a big delta means the visitor jumped rather than scrolled —
         snap, otherwise the clip visibly rewinds through the gap */
      if (Math.abs(f.target - f.cur) > 1.5) f.cur = f.target;
      else f.cur = lerp(f.cur, f.target, REDUCED ? 1 : .16);
      if (Math.abs(f.cur - f.v.currentTime) > .035 && f.v.readyState >= 2) {
        try { f.v.currentTime = f.cur; } catch (e) {}
      }
    });
  });
}

/* ─────────────────────────────────────────────
   COURT PICKER
   ───────────────────────────────────────────── */
const state = { court: null, date: null, time: null };

function renderCourts() {
  $$('.court-list').forEach(list => {
    const group = list.dataset.group;
    list.innerHTML = '';
    D.courts.filter(c => c.group === group).forEach(c => {
      const b = document.createElement('button');
      b.className = 'court' + (state.court === c.n ? ' sel' : '');
      b.type = 'button';
      b.setAttribute('aria-pressed', state.court === c.n);
      const name = lang === 'es' ? c.name : (c.nameEn || c.name);
      const meta = lang === 'es' ? c.meta : (c.metaEn || c.meta);
      const tag  = lang === 'es' ? c.tagline : (c.taglineEn || c.tagline);
      b.innerHTML =
        `<span class="court-n">0${c.n}</span>` +
        `<span class="court-main"><span class="court-name">${name}</span>` +
        `<span class="court-meta">${meta}</span></span>` +
        `<span class="court-dot ${c.surface}"></span>` +
        (tag ? `<span class="court-tagline">${tag}</span>` : '');
      b.addEventListener('click', () => selectCourt(c.n));
      list.appendChild(b);
    });
  });
}

function selectCourt(n) {
  state.court = state.court === n ? null : n;
  renderCourts(); syncSummary();
  window.dispatchEvent(new CustomEvent('lp:court'));
}

/* ─────────────────────────────────────────────
   DATES / TIMES
   ───────────────────────────────────────────── */
const DAYS_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DAYS_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function renderDates() {
  const strip = $('#dateStrip'); if (!strip) return;
  strip.innerHTML = '';
  const today = new Date();
  for (let i = 0; i < D.daysAhead; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const dow = (lang === 'es' ? DAYS_ES : DAYS_EN)[d.getDay()];
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.date === key ? ' on' : '');
    b.setAttribute('aria-pressed', state.date === key);
    b.innerHTML = `${d.getDate()}<small>${i === 0 ? (lang === 'es' ? 'Hoy' : 'Today') : dow}</small>`;
    b.addEventListener('click', () => {
      state.date = state.date === key ? null : key;
      renderDates(); syncSummary();
    });
    strip.appendChild(b);
  }
}

function renderTimes() {
  const strip = $('#timeStrip'); if (!strip) return;
  strip.innerHTML = '';
  D.times.forEach(t => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.time === t ? ' on' : '');
    b.setAttribute('aria-pressed', state.time === t);
    b.textContent = t;
    b.addEventListener('click', () => {
      state.time = state.time === t ? null : t;
      renderTimes(); syncSummary();
    });
    strip.appendChild(b);
  });
}

function syncSummary() {
  const dash = lang === 'es' ? '— elige arriba —' : '— choose above —';
  const cEl = $('#sumCourt'), dEl = $('#sumDate'), tEl = $('#sumTime');
  if (!cEl) return;

  const c = D.courts.find(x => x.n === state.court);
  cEl.textContent = c ? (lang === 'es' ? c.name : (c.nameEn || c.name)) + (c.meta ? ` · ${lang === 'es' ? c.meta : c.metaEn}` : '') : dash;
  cEl.classList.toggle('set', !!c);

  if (state.date) {
    const d = new Date(state.date + 'T12:00:00');
    const dow = (lang === 'es' ? DAYS_ES : DAYS_EN)[d.getDay()];
    dEl.textContent = `${dow} ${d.getDate()}`;
  } else dEl.textContent = '—';
  dEl.classList.toggle('set', !!state.date);

  tEl.textContent = state.time || '—';
  tEl.classList.toggle('set', !!state.time);

  /* carry the picked court/day/time to the booking page */
  const btn = $('#confirmBtn');
  if (btn) {
    const q = new URLSearchParams();
    if (state.court) q.set('court', state.court);
    if (state.date)  q.set('date', state.date);
    if (state.time)  q.set('time', state.time);
    btn.href = 'reservar.html' + (q.toString() ? '?' + q : '');
  }
}

/* ─────────────────────────────────────────────
   MENU
   ───────────────────────────────────────────── */
function renderMenu() {
  const host = $('#menuCols'); if (!host) return;
  host.innerHTML = '';
  D.menu.sections.forEach(sec => {
    const w = document.createElement('div');
    w.className = 'menu-sec';
    const title = lang === 'es' ? sec.title : (sec.titleEn || sec.title);
    w.innerHTML = `<h4>${title}</h4><ul>` + sec.items.map(it => {
      const n = lang === 'es' ? it.name : (it.nameEn || it.name);
      return `<li><span>${n}</span><span class="dots"></span><span class="price">${it.price}</span></li>`;
    }).join('') + '</ul>';
    host.appendChild(w);
  });
  if (D.menu.isSample) {
    const note = document.createElement('p');
    note.className = 'court-tagline';
    note.style.cssText = 'margin-top:.4rem;font-size:.6rem;opacity:.75';
    note.textContent = lang === 'es'
      ? 'Menú de muestra — pendiente de reemplazar.'
      : 'Sample menu — to be replaced.';
    host.appendChild(note);
  }
}

/* ─────────────────────────────────────────────
   NAV
   ───────────────────────────────────────────── */
navBtns.forEach(b => b.addEventListener('click', () => {
  const c = chapters[+b.dataset.goto]; if (!c) return;
  window.scrollTo({ top: c.top + 10, behavior: REDUCED ? 'auto' : 'smooth' });
}));

/* ─────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────── */
function boot() {
  const bootEl = $('#boot'), fill = $('#bootFill'), pct = $('#bootPct');
  const must = ['assets/img/aerial.jpg', 'assets/poster/ch2-entrance.jpg'];
  let done = 0;
  const step = () => {
    done++;
    const v = Math.round(done / must.length * 100);
    if (fill) fill.style.width = v + '%';
    if (pct) pct.textContent = v;
    if (done >= must.length) setTimeout(() => bootEl?.classList.add('gone'), 420);
  };
  must.forEach(src => {
    const i = new Image();
    i.onload = i.onerror = step;
    i.src = src;
  });
  setTimeout(() => bootEl?.classList.add('gone'), 5000); // never trap the visitor
}

/* ─────────────────────────────────────────────
   INIT
   ───────────────────────────────────────────── */
function init() {
  measure();
  applyLang();
  chapters[0].films.forEach(buildFilm);
  chapters[1]?.films.forEach(buildFilm);
  boot();
  requestAnimationFrame(frame);
}

window.__LP = {
  chapters,
  get state(){ return state; },
  selectCourt,
  refresh(){ renderCourts(); syncSummary(); }
};

addEventListener('resize', () => { measure(); }, { passive: true });
addEventListener('orientationchange', () => setTimeout(measure, 260));
if (document.readyState === 'loading') addEventListener('DOMContentLoaded', init);
else init();

})();

/* ══════════════════════════════════════════════════════════════
   SOCIAL REELS — small vertical loops, only while on screen
   ══════════════════════════════════════════════════════════════ */
(() => {
  const reels = [...document.querySelectorAll('.reel')];
  if (!reels.length) return;

  reels.forEach(r => {
    const img = new Image();
    img.src = r.dataset.poster; img.alt = ''; img.decoding = 'async';
    r.appendChild(img);
  });

  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      const r = e.target;
      if (e.isIntersecting) {
        if (!r._v) {
          const v = document.createElement('video');
          v.src = r.dataset.src;
          v.muted = true; v.defaultMuted = true;
          v.loop = true; v.playsInline = true;
          v.setAttribute('playsinline',''); v.setAttribute('webkit-playsinline','');
          v.preload = 'metadata';
          v.addEventListener('loadeddata', () => v.classList.add('ready'), { once:true });
          r.appendChild(v); r._v = v;
        }
        const p = r._v.play(); if (p && p.catch) p.catch(() => {});
      } else if (r._v) {
        r._v.pause();
      }
    });
  }, { rootMargin: '120px', threshold: .2 });

  reels.forEach(r => io.observe(r));
})();

/* ══════════════════════════════════════════════════════════════
   MEMBERSHIP
   ══════════════════════════════════════════════════════════════ */
(() => {
  const M = window.LP_DATA && window.LP_DATA.membership;
  if (!M) return;
  const pick = () => document.documentElement.lang === 'en' ? 'en' : 'es';

  function paint() {
    const L = pick();
    const q = s => document.querySelector(s);
    q('#memName')  && (q('#memName').textContent  = L === 'en' ? (M.nameEn || M.name) : M.name);
    q('#memPrice') && (q('#memPrice').textContent = M.price);
    q('#memPeriod')&& (q('#memPeriod').textContent= L === 'en' ? (M.periodEn || M.period) : M.period);
    q('#memNote')  && (q('#memNote').textContent  = L === 'en' ? (M.noteEn || M.note) : M.note);
    const perks = q('#memPerks');
    if (perks) perks.innerHTML = M.perks.map(x => `<li>${x[L] || x.es}</li>`).join('');
    const hours = q('#memHours');
    if (hours) hours.innerHTML = M.hours.map(h => `<li><span>${h[L] || h.es}</span><b>${h.t}</b></li>`).join('');
  }
  paint();
  new MutationObserver(paint).observe(document.documentElement, { attributes:true, attributeFilter:['lang'] });
})();

/* ══════════════════════════════════════════════════════════════
   3D CLUB MAP — the real court layout, selectable
   ══════════════════════════════════════════════════════════════ */
(() => {
  const D = window.LP_DATA;
  const plane = document.getElementById('plane');
  const host  = document.getElementById('mapCourts');
  if (!D || !D.map || !plane || !host) return;

  const scene = document.getElementById('scene');
  const byN = n => D.courts.find(c => c.n === n) || {};
  const pct = v => (v * 100).toFixed(3) + '%';

  /* place a rectangle given centre/size in site coordinates */
  const place = (el, g) => {
    el.style.left   = pct(g.x - g.w / 2);
    el.style.top    = pct(g.y - g.h / 2);
    el.style.width  = pct(g.w);
    el.style.height = pct(g.h);
    if (g.r) el.style.transform = `rotateZ(${g.r}deg)`;
  };

  D.map.courts.forEach(g => {
    const c = byN(g.n);
    const el = document.createElement('div');
    el.className = `court3d ${c.surface || 'blue'}`;
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', `${c.name || 'Cancha ' + g.n}${c.meta ? ' — ' + c.meta : ''}`);
    el.dataset.n = g.n;
    el.innerHTML = `<div class="top"><div class="line"></div><div class="net"></div></div><div class="tagn">${g.n}</div>`;
    place(el, g);
    if (g.r) el.style.transform = `rotateZ(${g.r}deg)`;

    el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); window.__LP.selectCourt(g.n); }
    });
    host.appendChild(el);
  });

  place(document.getElementById('mapRest'), D.map.restaurant);
  place(document.getElementById('mapWc'),   D.map.restroom);
  const entry = document.getElementById('mapEntry');
  entry.style.left = pct(D.map.entrance.x);
  entry.style.top  = pct(D.map.entrance.y);

  /* Resolve a pointer position to a court by geometry: the smallest
     projected box that contains the point wins. */
  function courtAt(x, y) {
    let best = null, bestArea = Infinity;
    host.querySelectorAll('.court3d').forEach(el => {
      const r = el.getBoundingClientRect();
      if (x < r.left || x > r.right || y < r.top || y > r.bottom) return;
      const area = r.width * r.height;
      if (area < bestArea) { bestArea = area; best = el; }
    });
    return best;
  }

  scene.addEventListener('click', e => {
    const el = courtAt(e.clientX, e.clientY);
    if (el) window.__LP.selectCourt(+el.dataset.n);
  });

  scene.addEventListener('pointermove', e => {
    const el = courtAt(e.clientX, e.clientY);
    scene.classList.toggle('over', !!el);
    host.querySelectorAll('.court3d').forEach(c => c.classList.toggle('hot', c === el));
  });
  scene.addEventListener('pointerleave', () => {
    scene.classList.remove('over');
    host.querySelectorAll('.court3d').forEach(c => c.classList.remove('hot'));
  });

  function paint() {
    const st = window.__LP && window.__LP.state;
    host.querySelectorAll('.court3d').forEach(el => {
      const on = st && st.court === +el.dataset.n;
      el.classList.toggle('sel', on);
      el.setAttribute('aria-pressed', !!on);
    });
  }
  window.addEventListener('lp:court', paint);
  paint();

  /* cursor parallax — the plan turns gently under the pointer */
  const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!REDUCED && !matchMedia('(pointer: coarse)').matches) {
    let rx = 57, rz = -18, tx = 57, tz = -18, raf = 0;
    scene.addEventListener('pointermove', e => {
      const r = scene.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width  - .5;
      const ny = (e.clientY - r.top)  / r.height - .5;
      tx = 57 + ny * 10; tz = -18 + nx * 14;
      if (!raf) raf = requestAnimationFrame(loop);
    });
    scene.addEventListener('pointerleave', () => { tx = 57; tz = -18; if (!raf) raf = requestAnimationFrame(loop); });
    function loop() {
      rx += (tx - rx) * .08; rz += (tz - rz) * .08;
      plane.style.transition = 'none';
      plane.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateZ(${rz.toFixed(2)}deg) scale(.94)`;
      if (Math.abs(tx - rx) > .05 || Math.abs(tz - rz) > .05) raf = requestAnimationFrame(loop);
      else raf = 0;
    }
  }
})();
