/* ══════════════════════════════════════════════════════════════
   LAS PALMAS — three acts: the club, the map, the walk.
   Nothing scrolls on its own; buttons move you.
   ══════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const D = window.LP_DATA;
const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
const clamp = (v,a=0,b=1) => v<a?a:v>b?b:v;
const COARSE = matchMedia('(pointer: coarse)').matches;
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const DOW_ES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const DOW_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const pad = n => String(n).padStart(2,'0');
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const hhmm = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

let lang = 'es';
const dow = i => (lang === 'es' ? DOW_ES : DOW_EN)[i];

/* ─────────────────────────────────────────────
   ROUTES — which clips you actually walk past
   on the way to each court, read off the club's
   own site plan (entrance north-east).
   ───────────────────────────────────────────── */
const SEG = {
  entrance: { v:'seg-entrance', es:'Entras por la puerta blanca.',      en:'In through the white door.' },
  shop:     { v:'seg-shop',     es:'La tienda, a tu izquierda.',        en:'The pro shop, on your left.' },
  walkway:  { v:'seg-walkway',  es:'El sendero abre entre las palmas.', en:'The path opens between the palms.' },
  court1:   { v:'seg-court1',   es:'Pasas la Chevrolet, la cancha 1.',  en:'Past the Chevrolet — court 1.' },
  court2:   { v:'seg-court2',   es:'A la derecha, la cancha 2.',        en:'To your right, court 2.' },
  circuit:  { v:'seg-circuit',  es:'Sigues el circuito hacia el fondo.',en:'The circuit carries on to the back.' },
  red:      { v:'seg-red',      es:'Las canchas de arcilla.',           en:'The clay courts.' },
  bolea:    { v:'seg-bolea',    es:'Pasas junto a La Bolea.',           en:'Past La Bolea.' }
};

const ROUTES = {
  1: ['entrance','walkway','court1'],
  2: ['entrance','walkway','court2'],
  3: ['entrance','walkway','bolea','red'],
  4: ['entrance','walkway','circuit','red'],
  5: ['entrance','walkway','circuit','red'],
  6: ['entrance','walkway','circuit','red'],
  7: ['entrance','walkway','court1','circuit'],
  8: ['entrance','walkway','court1','circuit'],
  9: ['entrance','shop','walkway','court2']
};

/* ─────────────────────────────────────────────
   ACTS
   ───────────────────────────────────────────── */
/* 'route' is not in this list: the walk is something booking does to you,
   not a page you navigate to. */
const ACTS = ['hero','map','bolea','gallery'];
let act = 'hero';

function go(name) {
  if (name === act) return;
  if (name === 'route' && !state.court) return;
  const from = $(`#act-${act}`), to = $(`#act-${name}`);
  from.classList.add('leaving');
  setTimeout(() => { from.classList.remove('on','leaving'); }, 480);
  to.classList.add('on');
  act = name;
  $$('#actNav button').forEach(b => b.classList.toggle('on', b.dataset.act === name));
  if (name === 'route') startRoute();
  else stopRoute();
}
$$('[data-act]').forEach(b => b.addEventListener('click', () => go(b.dataset.act)));

/* keyboard: left/right move between acts */
addEventListener('keydown', e => {
  if (e.target.matches('input,textarea')) return;
  if ($('#lightbox') && !$('#lightbox').hidden) return;
  const i = ACTS.indexOf(act);
  if (e.key === 'ArrowRight' && i < ACTS.length-1) go(ACTS[i+1]);
  if (e.key === 'ArrowLeft'  && i > 0) go(ACTS[i-1]);
  if (e.key === 'Escape' && act === 'route') go('map');
  if (act === 'route') return;  // the walk has its own controls
});

/* ─────────────────────────────────────────────
   LANGUAGE
   ───────────────────────────────────────────── */
function applyLang() {
  $$('[data-es]').forEach(el => {
    const v = el.dataset[lang];
    if (v == null) return;
    if (/<br\s*\/?>/i.test(v)) el.innerHTML = v; else el.textContent = v;
  });
  document.documentElement.lang = lang;
  const hint = $('#mapHint');
  if (hint && COARSE) { const t = hint.dataset[lang+'Touch']; if (t) hint.textContent = t; }
  const b = $('#langBtn');
  if (b) { b.children[0].classList.toggle('off', lang!=='es'); b.children[2].classList.toggle('off', lang!=='en'); }
  if (typeof drawMap === 'function') drawMap();
  if (state.court) openCourt(state.court, true);
  if (typeof renderBolea === 'function') { renderBolea(); renderGallery(); }
}
$('#langBtn').addEventListener('click', () => { lang = lang==='es'?'en':'es'; applyLang(); });

/* ─────────────────────────────────────────────
   CLUB MAP — drawn as SVG.
   CSS 3D transforms alias badly on rotated edges and
   their hit-testing is unreliable through preserve-3d.
   SVG is resolution-independent, so it stays crisp at
   any DPI, and each court is its own exact hit area.
   ───────────────────────────────────────────── */
const SVGNS = 'http://www.w3.org/2000/svg';
const svg = document.getElementById('mapSvg');
const byN = n => D.courts.find(c => c.n === n) || {};

/* orthographic projection of rotateX(TILT) rotateZ(SPIN) */
const TILT = 58 * Math.PI / 180;
const SPIN = -19 * Math.PI / 180;
const el = (t, a = {}) => {
  const n = document.createElementNS(SVGNS, t);
  for (const k in a) n.setAttribute(k, a[k]);
  return n;
};
function project(x, y) {
  const sx = x - .5, sy = y - .5;
  return [ sx * Math.cos(SPIN) - sy * Math.sin(SPIN),
          (sx * Math.sin(SPIN) + sy * Math.cos(SPIN)) * Math.cos(TILT) ];
}
/* the four corners of a court in site space, rotation applied */
function corners(g, inset = 0) {
  const r = (g.r || 0) * Math.PI / 180;
  const hw = g.w / 2 - inset * g.w, hh = g.h / 2 - inset * g.h;
  return [[-hw,-hh],[hw,-hh],[hw,hh],[-hw,hh]].map(([dx,dy]) => [
    g.x + dx*Math.cos(r) - dy*Math.sin(r),
    g.y + dx*Math.sin(r) + dy*Math.cos(r)
  ]);
}

/* fit every projected point into the viewBox */
const VB = { w: 1000, h: 640, pad: 54 };
let SCALE = 1, OX = 0, OY = 0;
(function fit() {
  const pts = [];
  D.map.courts.forEach(g => corners(g).forEach(c => pts.push(project(...c))));
  [D.map.restaurant, D.map.restroom].forEach(g => corners(g).forEach(c => pts.push(project(...c))));
  pts.push(project(D.map.entrance.x, D.map.entrance.y));
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  SCALE = Math.min((VB.w - VB.pad*2) / (maxX - minX), (VB.h - VB.pad*2) / (maxY - minY));
  OX = VB.w/2 - (minX + maxX)/2 * SCALE;
  OY = VB.h/2 - (minY + maxY)/2 * SCALE;
})();
const P = (x, y) => { const [a,b] = project(x,y); return [a*SCALE + OX, b*SCALE + OY]; };
const poly = pts => pts.map(([x,y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');

const SURFACE = {
  blue: { a:'#3f9ede', b:'#1d5f94' },
  clay: { a:'#d4714d', b:'#8e3c26' },
  solo: { a:'#b9d64a', b:'#6f8c20' }
};

function drawMap() {
  svg.innerHTML = '';

  /* defs: gradients, the ground fade, the selection glow */
  const defs = el('defs');
  Object.entries(SURFACE).forEach(([k,v]) => {
    const g = el('linearGradient', { id:`s-${k}`, x1:'0', y1:'0', x2:'0.3', y2:'1' });
    g.append(el('stop',{offset:'0',  'stop-color':v.a}),
             el('stop',{offset:'1',  'stop-color':v.b}));
    defs.appendChild(g);
  });
  const fade = el('radialGradient', { id:'groundFade', cx:'.5', cy:'.5', r:'.5' });
  fade.append(el('stop',{offset:'0','stop-color':'#13302a','stop-opacity':'.95'}),
              el('stop',{offset:'.6','stop-color':'#0f2620','stop-opacity':'.7'}),
              el('stop',{offset:'1','stop-color':'#0b1c17','stop-opacity':'0'}));
  defs.appendChild(fade);
  const glow = el('filter', { id:'glow', x:'-60%', y:'-60%', width:'220%', height:'220%' });
  glow.append(el('feGaussianBlur',{stdDeviation:'9','result':'b'}),
              el('feMerge')); 
  glow.lastChild.append(el('feMergeNode',{in:'b'}), el('feMergeNode',{in:'SourceGraphic'}));
  defs.appendChild(glow);
  const soft = el('filter', { id:'soft', x:'-40%', y:'-40%', width:'180%', height:'180%' });
  soft.appendChild(el('feGaussianBlur',{stdDeviation:'7'}));
  defs.appendChild(soft);
  svg.appendChild(defs);

  /* ground: an ellipse that fades out, so there is no hard crooked edge */
  svg.appendChild(el('ellipse', {
    cx: VB.w/2, cy: VB.h/2 + 10, rx: VB.w*0.52, ry: VB.h*0.46,
    fill: 'url(#groundFade)'
  }));

  /* buildings */
  const block = (g, label) => {
    const grp = el('g', { class:'m-block' });
    grp.appendChild(el('polygon', { points: poly(corners(g).map(c => P(...c))) }));
    if (label) {
      const [cx,cy] = P(g.x, g.y);
      const t = el('text', { x:cx, y:cy+3, class:'m-blocklabel', 'text-anchor':'middle' });
      t.textContent = label;
      grp.appendChild(t);
    }
    svg.appendChild(grp);
  };
  block(D.map.restaurant, 'LA BOLEA');
  block(D.map.restroom, '');
  drawRestroom(D.map.restroom);

  /* a small restroom pictogram, upright so it stays legible */
  function drawRestroom(g) {
    const [cx, cy] = P(g.x, g.y);
    const k = 0.62;                      // glyph scale
    const gg = el('g', { class:'m-wc', transform:`translate(${cx} ${cy}) scale(${k})` });
    // female
    gg.append(
      el('circle', { cx:-9, cy:-11, r:3.1 }),
      el('path', { d:'M-9 -7.2 L-14 2.2 L-12.2 2.9 L-10.4 -0.6 L-12.6 8 L-9.9 8 L-9.9 14 L-8.1 14 L-8.1 8 L-5.4 8 L-7.6 -0.6 L-5.8 2.9 L-4 2.2 Z' }),
      el('rect', { x:-0.9, y:-15, width:1.8, height:30, rx:0.9 }),
      el('circle', { cx:9, cy:-11, r:3.1 }),
      el('path', { d:'M5.6 -7.4 h6.8 a1.6 1.6 0 0 1 1.6 1.6 v7.4 h-1.9 v12.4 h-2.3 v-7.2 h-1.6 v7.2 h-2.3 v-12.4 h-1.9 v-7.4 a1.6 1.6 0 0 1 1.6 -1.6 z' })
    );
    svg.appendChild(gg);
  }

  /* courts, far ones first so near ones overlap correctly */
  const order = [...D.map.courts].sort((a,b) => (a.x+a.y) - (b.x+b.y));

  const shadows = el('g', { class:'m-shadows', filter:'url(#soft)' });
  order.forEach(g => shadows.appendChild(el('polygon', {
    class:'m-shadow',
    points: poly(corners(g).map(c2 => { const [x,y] = P(...c2); return [x, y+6]; }))
  })));
  svg.appendChild(shadows);

  order.forEach(g => {
    const c = byN(g.n);
    const surf = c.surface || 'blue';
    const grp = el('g', {
      class: `m-court ${surf}`, tabindex: '0', role: 'button',
      'data-n': g.n, 'aria-label': c.name || ('Cancha ' + g.n)
    });

    grp.appendChild(el('polygon', { class:'m-top', points: poly(corners(g).map(c2 => P(...c2))), fill:`url(#s-${surf})` }));
    grp.appendChild(el('polygon', { class:'m-lines', points: poly(corners(g, .16).map(c2 => P(...c2))) }));

    /* the net, across the short axis at the midpoint */
    const cs = corners(g);
    const mid = (a,b) => [(a[0]+b[0])/2, (a[1]+b[1])/2];
    grp.appendChild(el('line', {
      class:'m-net',
      x1:P(...mid(cs[0],cs[3]))[0], y1:P(...mid(cs[0],cs[3]))[1],
      x2:P(...mid(cs[1],cs[2]))[0], y2:P(...mid(cs[1],cs[2]))[1]
    }));

    const [cx,cy] = P(g.x, g.y);
    grp.appendChild(el('circle', { class:'m-numbg', cx, cy, r:14 }));
    const t = el('text', { class:'m-num', x:cx, y:cy, 'text-anchor':'middle',
                           'dominant-baseline':'central' });
    t.textContent = g.n;
    grp.appendChild(t);

    grp.addEventListener('click', () => openCourt(g.n));
    grp.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCourt(g.n); }
    });
    svg.appendChild(grp);
  });

  /* the entrance, where the club says it is */
  const [ex, ey] = P(D.map.entrance.x, D.map.entrance.y);
  const eg = el('g', { class:'m-entry' });
  eg.append(
    el('circle', { cx:ex, cy:ey, r:'16', class:'m-ping' }),
    el('circle', { cx:ex, cy:ey, r:'5.5', class:'m-dot' })
  );
  const et = el('text', { x:ex, y:ey-24, 'text-anchor':'middle', class:'m-entrylabel' });
  et.textContent = lang === 'es' ? 'ENTRADA' : 'ENTRANCE';
  eg.appendChild(et);
  svg.appendChild(eg);

  markCourts();
}

function markCourts() {
  svg.querySelectorAll('.m-court').forEach(g => {
    const on = +g.dataset.n === state.court;
    g.classList.toggle('sel', on);
    g.setAttribute('aria-pressed', on);
  });
}

/* ─────────────────────────────────────────────
   BOOKING — all of it inside the box
   ───────────────────────────────────────────── */
const state = { court:null, day:null, time:null, start:null, end:null };
let COURTS=[], HOURS=[], TAKEN=[];
const SLOT = 90;

function surfaceLabel(c) {
  if (c.surface === 'clay') return lang==='es' ? 'Arcilla' : 'Clay';
  if (c.surface === 'solo') return lang==='es' ? 'Cristal · 1v1' : 'Glass · 1v1';
  return lang==='es' ? 'Cristal' : 'Glass';
}

async function openCourt(n, keepTime) {
  state.court = n;
  if (!keepTime) { state.time = null; state.start = null; }
  markCourts();
  const c = byN(n);
  $('#bkEmpty').hidden = true;
  $('#bkBody').hidden = false;
  $('#bkCourt').textContent = lang==='es' ? c.name : (c.nameEn || c.name);
  const meta = lang==='es' ? c.meta : (c.metaEn || c.meta);
  $('#bkMeta').textContent = [meta, surfaceLabel(c)].filter(Boolean).join(' · ');
  if (!state.day) state.day = dayKey(new Date());
  renderDays();
  await loadTimes();
  syncGo();
}

$('#bkClose').addEventListener('click', () => {
  state.court = null; state.time = null; state.start = null;
  markCourts();
  $('#bkBody').hidden = true; $('#bkEmpty').hidden = false;
});

function renderDays() {
  const strip = $('#bkDays'); strip.innerHTML='';
  const today = new Date(); today.setHours(0,0,0,0);
  for (let i=0;i<7;i++){
    const d = new Date(today); d.setDate(today.getDate()+i);
    const k = dayKey(d);
    const b = document.createElement('button');
    b.type='button'; b.className='chip'+(state.day===k?' on':'');
    b.innerHTML = `${d.getDate()}<small>${i===0?(lang==='es'?'Hoy':'Today'):dow(d.getDay())}</small>`;
    b.addEventListener('click', async () => {
      state.day=k; state.time=null; state.start=null;
      renderDays(); await loadTimes(); syncGo();
    });
    strip.appendChild(b);
  }
}

function slotsFor(dayISO) {
  const d = new Date(dayISO+'T00:00:00');
  const h = HOURS.find(x => x.weekday === d.getDay());
  if (!h) return [];
  const [oh,om]=h.opens.split(':').map(Number), [ch,cm]=h.closes.split(':').map(Number);
  const out=[]; const cur=new Date(d); cur.setHours(oh,om,0,0);
  const close=new Date(d); close.setHours(ch,cm,0,0);
  while (cur.getTime()+SLOT*60000 <= close.getTime()){
    out.push({ st:new Date(cur), en:new Date(cur.getTime()+SLOT*60000) });
    cur.setMinutes(cur.getMinutes()+SLOT);
  }
  return out;
}

async function loadTimes() {
  const host2 = $('#bkTimes');
  host2.innerHTML = '<span class="chip" style="opacity:.4">···</span>';
  TAKEN = await LP_API.availability(state.day);
  const c = COURTS.find(x => x.number === state.court);
  const now = new Date();
  const live = slotsFor(state.day).filter(s => s.st > now);

  if (!live.length) {
    host2.innerHTML = `<p class="bk-empty-line">${lang==='es'?'Ya no hay horarios hoy.':'No times left today.'}</p>`;
    return;
  }
  host2.innerHTML = '';
  live.forEach(s => {
    const taken = c && TAKEN.some(t =>
      t.club_court_id === c.id &&
      new Date(t.during[0]) < s.en && s.st < new Date(t.during[1]));
    const b = document.createElement('button');
    b.type='button';
    b.className = 'chip'+(state.start===s.st.toISOString()?' on':'');
    b.textContent = hhmm(s.st);
    b.disabled = taken;
    if (taken) b.title = lang==='es'?'Ocupada':'Taken';
    b.addEventListener('click', () => {
      state.start = s.st.toISOString(); state.end = s.en.toISOString();
      state.time = hhmm(s.st);
      loadTimesMark(); syncGo();
    });
    host2.appendChild(b);
  });
}
function loadTimesMark(){
  $$('#bkTimes .chip').forEach(b =>
    b.classList.toggle('on', !b.disabled && b.textContent === state.time));
}
function syncGo(){
  $('#bkGo').disabled = !(state.court && state.day && state.start);
}

/* ─────────────────────────────────────────────
   ACT 03 — walk the route to the chosen court
   ───────────────────────────────────────────── */
const vid = $('#routeVideo'), poster = $('#routePoster');
const cap = $('#routeCap').firstElementChild;
let route = [], step = 0, timer = 0, playing = false;

$('#bkGo').addEventListener('click', () => go('route'));

function startRoute() {
  route = (ROUTES[state.court] || ROUTES[1]).slice();
  step = 0; playing = true;
  $('#arrive').hidden = true;
  $('#arriveBg').hidden = true;
  $('#routeSkip').classList.remove('gone');
  const steps = $('#routeSteps');
  steps.innerHTML = route.map(() => '<i></i>').join('');
  playStep();
}
function stopRoute(){
  playing = false; clearTimeout(timer);
  try { vid.pause(); } catch(e){}
}
function playStep() {
  if (!playing) return;
  if (step >= route.length) return arrive();
  const seg = SEG[route[step]];
  const marks = $$('#routeSteps i');
  marks.forEach((m,i) => {
    m.classList.toggle('done', i < step);
    m.classList.remove('now');
  });
  poster.src = `assets/poster/${seg.v}.jpg`;
  poster.hidden = false;
  vid.classList.remove('ready');
  vid.src = `assets/video/${seg.v}.mp4`;
  vid.currentTime = 0;
  const p = vid.play();
  if (p && p.catch) p.catch(()=>{});
  vid.addEventListener('loadeddata', () => vid.classList.add('ready'), { once:true });

  cap.classList.remove('show');
  cap.textContent = lang==='es' ? seg.es : seg.en;
  setTimeout(() => cap.classList.add('show'), 240);

  const dur = REDUCED ? 1200 : 5600;
  if (marks[step]) {
    marks[step].style.setProperty('--dur', dur+'ms');
    marks[step].classList.add('now');
  }
  clearTimeout(timer);
  timer = setTimeout(() => { cap.classList.remove('show'); step++; setTimeout(playStep, 320); }, dur);
}
$('#routeSkip').addEventListener('click', () => { clearTimeout(timer); step = route.length; arrive(); });

/* the walk ends on a real photograph of that court, not a video frame */
const ARRIVE_IMG = {
  blue:  'assets/photo/court-night.jpg',
  clay:  'assets/photo/clay-dusk.jpg',
  solo:  'assets/photo/court-dusk.jpg'
};

function arrive() {
  playing = false;
  try { vid.pause(); } catch(e){}
  const cc = byN(state.court);
  const img = $('#arriveImg');
  img.src = ARRIVE_IMG[cc.surface] || ARRIVE_IMG.blue;
  $('#arriveBg').hidden = false;
  $$('#routeSteps i').forEach(m => { m.classList.add('done'); m.classList.remove('now'); });
  cap.classList.remove('show');
  $('#routeSkip').classList.add('gone');
  const c = byN(state.court);
  $('#arCourt').textContent = lang==='es' ? c.name : (c.nameEn || c.name);
  const d = new Date(state.day+'T12:00:00');
  $('#arDay').textContent = `${dow(d.getDay())} ${d.getDate()}`;
  $('#arTime').textContent = state.time || '—';
  $('#arSurf').textContent = surfaceLabel(c);
  $('#arMsg').className = 'msg';
  $('#arrive').hidden = false;
}
$('#arBack').addEventListener('click', () => go('map'));

$('#arConfirm').addEventListener('click', async () => {
  const name = $('#bkName').value.trim();
  const msg = $('#arMsg');
  if (!name) {
    msg.className = 'msg on err';
    msg.textContent = lang==='es'
      ? 'Escribe tu nombre en el paso anterior para confirmar.'
      : 'Add your name on the previous step to confirm.';
    return;
  }
  const c = COURTS.find(x => x.number === state.court);
  const btn = $('#arConfirm'); btn.disabled = true;
  try {
    await LP_API.hold({ courtId:c.id, startISO:state.start, endISO:state.end,
                        name, phone:$('#bkPhone').value.trim() });
    msg.className='msg on ok';
    msg.textContent = lang==='es'
      ? `Apartada: ${c.name||'Cancha '+c.number}, ${state.time}. Recepción te confirma por WhatsApp.`
      : `Held: court ${c.number} at ${state.time}. Reception will confirm by WhatsApp.`;
  } catch(e) {
    msg.className='msg on err';
    msg.textContent = e.message === 'taken'
      ? (lang==='es'?'Alguien tomó ese horario. Elige otro.':'Someone just took that slot. Pick another.')
      : (lang==='es'?'No se pudo apartar. Intenta de nuevo.':'Could not hold it. Try again.');
  } finally { btn.disabled = false; }
});

/* ─────────────────────────────────────────────
   HERO — a slow cross-fade keeps the club alive
   ───────────────────────────────────────────── */
(() => {
  const slides = $$('.hero-slide');
  if (slides.length < 2 || REDUCED) return;
  slides.forEach((s, i) => { if (i && s.dataset.src) s.src = s.dataset.src; });
  let i = 0;
  setInterval(() => {
    slides[i].classList.remove('on');
    i = (i + 1) % slides.length;
    slides[i].classList.add('on');
  }, 7000);
})();

/* ─────────────────────────────────────────────
   PHOTOS — grouped by what they are, not dumped
   ───────────────────────────────────────────── */
const PHOTOS = [
  // name,            tag,        es caption,                     en caption
  ['aerial-top',   'club',   'El club desde el aire',      'The club from the air'],
  ['court-night',  'padel',  'Cancha 1, de noche',         'Court 1 at night'],
  ['court-serve',  'padel',  'Saque bajo las luces',       'Serving under the lights'],
  ['highfive',     'padel',  'Punto ganado',               'Point won'],
  ['women-night',  'padel',  'Liga nocturna',              'League night'],
  ['kid',          'padel',  'La siguiente generación',    'The next generation'],
  ['walking',      'padel',  'Entre puntos',               'Between points'],
  ['clay-dusk',    'club',   'Arcilla, hora morada',       'Clay, purple hour'],
  ['court-dusk',   'club',   'Atardecer en la cancha',     'Dusk on court'],
  ['entrance-dusk','club',   'La entrada al caer la tarde','The entrance at dusk'],
  ['lounge',       'club',   'Lounge junto a la cancha',   'Lounge beside the court'],
  ['palms-night',  'club',   'Las palmas, de noche',       'The palms at night'],
  ['brand-court',  'club',   'Las Palmas',                 'Las Palmas'],
  ['dish-plate',   'bolea',  'Camarón y chorizo',          'Shrimp and chorizo'],
  ['dish-fork',    'bolea',  'Del mar a la mesa',          'From the sea to the table'],
  ['tacos',        'bolea',  'Tacos en La Bolea',          'Tacos at La Bolea'],
  ['nachos',       'bolea',  'Nachos de media tarde',      'Mid-afternoon nachos'],
  ['michelada',    'bolea',  'Michelada de la casa',       'House michelada'],
  ['drinks-two',   'bolea',  'Dos para la mesa',           'Two for the table'],
  ['toast',        'bolea',  'Después del partido',        'After the match'],
  ['waiter',       'bolea',  'Servicio en cancha',         'Court-side service'],
  ['sharing',      'bolea',  'Para la mesa',               'For the table']
];
const capOf = p => (lang === 'es' ? p[2] : p[3]);

/* ── lightbox, shared by both galleries ───────── */
const lb = $('#lightbox'), lbImg = $('#lbImg');
let lbSet = PHOTOS, lbAt = 0;
function openLb(set, i) {
  lbSet = set;
  lbAt = (i + set.length) % set.length;
  lbImg.src = `assets/photo/${lbSet[lbAt][0]}.jpg`;
  lbImg.alt = capOf(lbSet[lbAt]);
  lb.hidden = false;
}
$('#lbClose').addEventListener('click', () => { lb.hidden = true; });
$('#lbPrev').addEventListener('click', e => { e.stopPropagation(); openLb(lbSet, lbAt - 1); });
$('#lbNext').addEventListener('click', e => { e.stopPropagation(); openLb(lbSet, lbAt + 1); });
lb.addEventListener('click', e => { if (e.target === lb) lb.hidden = true; });
addEventListener('keydown', e => {
  if (lb.hidden) return;
  if (e.key === 'Escape') lb.hidden = true;
  if (e.key === 'ArrowLeft')  openLb(lbSet, lbAt - 1);
  if (e.key === 'ArrowRight') openLb(lbSet, lbAt + 1);
});

function tile(p, set, i, cls) {
  const b = document.createElement('button');
  b.type = 'button';
  if (cls) b.className = cls;
  b.setAttribute('aria-label', capOf(p));
  const img = document.createElement('img');
  img.src = `assets/photo/${p[0]}-sq.jpg`;
  img.alt = capOf(p); img.loading = 'lazy'; img.decoding = 'async';
  const cap = document.createElement('span');
  cap.className = 'tile-cap'; cap.textContent = capOf(p);
  b.append(img, cap);
  b.addEventListener('click', () => openLb(set, i));
  return b;
}

/* ── ACT 04 · La Bolea: its own food gallery + menu ── */
function renderBolea() {
  const host = $('#foodGrid');
  if (!host) return;
  const set = PHOTOS.filter(p => p[1] === 'bolea');
  host.innerHTML = '';
  set.forEach((p, i) => host.appendChild(tile(p, set, i, i === 0 ? 'wide' : '')));

  const mb = $('#menuBlock');
  const M = D.menu;
  if (!mb || !M) return;
  mb.innerHTML = M.sections.map(sec => {
    const title = lang === 'es' ? sec.title : (sec.titleEn || sec.title);
    return `<div class="menu-sec"><h4>${title}</h4><ul>` + sec.items.map(it => {
      const n = lang === 'es' ? it.name : (it.nameEn || it.name);
      return `<li><span>${n}</span><i></i><b>${it.price}</b></li>`;
    }).join('') + '</ul></div>';
  }).join('') + (M.isSample
    ? `<p class="menu-note">${lang==='es'?'Menú de muestra — pendiente de reemplazar.':'Sample menu — to be replaced.'}</p>`
    : '');
}

/* ── ACT 05 · Galería: everything, filterable ── */
let galTag = 'all';
function renderGallery() {
  const host = $('#mosaic'), fil = $('#galFilters');
  if (!host) return;
  const TAGS = [['all', 'Todo', 'All'], ['padel','Padel','Padel'],
                ['club','El club','The club'], ['bolea','La Bolea','La Bolea']];
  fil.innerHTML = '';
  TAGS.forEach(([t, es, en]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip' + (galTag === t ? ' on' : '');
    b.textContent = lang === 'es' ? es : en;
    b.addEventListener('click', () => { galTag = t; renderGallery(); });
    fil.appendChild(b);
  });
  const set = galTag === 'all' ? PHOTOS : PHOTOS.filter(p => p[1] === galTag);
  host.innerHTML = '';
  set.forEach((p, i) => host.appendChild(tile(p, set, i, i === 0 ? 'wide' : '')));
}

/* ─────────────────────────────────────────────
   BOOT
   ───────────────────────────────────────────── */
(async function init(){
  drawMap(); renderBolea(); renderGallery();
  applyLang();
  [COURTS, HOURS] = await Promise.all([LP_API.courts(), LP_API.hours()]);
  state.day = dayKey(new Date());
  // warm the first clip so act 3 starts instantly
  const warm = document.createElement('link');
  warm.rel='prefetch'; warm.as='video'; warm.href='assets/video/seg-entrance.mp4';
  document.head.appendChild(warm);
})();
})();
