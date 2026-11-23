/* ══════════════════════════════════════════════════════════════
   BOOKING — day → court → slot, through LP_API
   ══════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const DOW   = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const SLOT  = 90;                      // minutes
const pad   = n => String(n).padStart(2, '0');
const hhmm  = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const dayKey = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

const state = { day: null, courtId: null, start: null, end: null, moved: null };
let COURTS = [], HOURS = [], TAKEN = [];

function badge() {
  if (!LP_API.isMock) return;
  const h = $('#sampleBadge');
  if (h) h.innerHTML = '<div class="sample-badge"><i></i>Disponibilidad de muestra · conecta Supabase para reservas reales</div>';
  const n = $('#bNote');
  if (n) n.textContent = 'Demostración: la reserva se guarda solo en esta pestaña y se pierde al recargar.';
}

/* ── day strip ─────────────────────────────────────────────── */
function renderDays() {
  const strip = $('#dayStrip');
  const today = new Date(); today.setHours(0,0,0,0);
  strip.innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(today); d.setDate(today.getDate() + i);
    const key = dayKey(d);
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (state.day === key ? ' on' : '');
    b.innerHTML = `${d.getDate()}<small>${i === 0 ? 'Hoy' : DOW[d.getDay()]}</small>`;
    b.addEventListener('click', () => { state.day = key; state.courtId = null; state.start = null; load(); });
    strip.appendChild(b);
  }
}

/* ── the grid ──────────────────────────────────────────────── */
function slotsFor(day) {
  const d = new Date(day + 'T00:00:00');
  const h = HOURS.find(x => x.weekday === d.getDay());
  if (!h) return [];
  const [oh, om] = h.opens.split(':').map(Number);
  const [ch, cm] = h.closes.split(':').map(Number);
  const out = [];
  const cur = new Date(d); cur.setHours(oh, om, 0, 0);
  const close = new Date(d); close.setHours(ch, cm, 0, 0);
  while (cur.getTime() + SLOT * 60000 <= close.getTime()) {
    const st = new Date(cur), en = new Date(cur.getTime() + SLOT * 60000);
    out.push({ st, en });
    cur.setMinutes(cur.getMinutes() + SLOT);
  }
  return out;
}

const overlaps = (courtId, st, en) => TAKEN.some(t =>
  t.club_court_id === courtId &&
  new Date(t.during[0]) < en && st < new Date(t.during[1]));

function renderGrid() {
  const host = $('#grid');
  const slots = slotsFor(state.day);
  const now = new Date();

  $('#gridDay').textContent = (() => {
    const d = new Date(state.day + 'T12:00:00');
    return `${DOW[d.getDay()]} ${d.getDate()} de ${d.toLocaleString('es-MX',{month:'long'})}`;
  })();

  /* a slot already in the past is not "taken", it is simply gone */
  const live = slots.filter(s => s.st > now);

  if (!live.length) {
    host.innerHTML = `<div style="padding:2.4rem 1.2rem;text-align:center">
      <p class="body" style="margin:0">Ya no quedan horarios hoy. Elige otro día.</p></div>`;
    return;
  }

  host.innerHTML = COURTS.map(c => `
    <div class="court-row">
      <div class="court-label">
        <b>Cancha ${c.number}</b>
        <span>${esc(c.name || (c.surface === 'clay' ? 'Arcilla' : 'Cristal'))}</span>
      </div>
      <div class="slots" data-court="${c.id}">
        ${live.map(s => {
          const taken = overlaps(c.id, s.st, s.en);
          const pick = state.courtId === c.id && state.start === s.st.toISOString();
          return `<button type="button" class="slot${taken ? ' taken' : ''}${pick ? ' pick' : ''}"
                    ${taken ? 'disabled aria-disabled="true"' : ''}
                    data-st="${s.st.toISOString()}" data-en="${s.en.toISOString()}"
                    aria-label="Cancha ${c.number} a las ${hhmm(s.st)}${taken ? ', ocupada' : ', libre'}">${hhmm(s.st)}</button>`;
        }).join('')}
      </div>
    </div>`).join('');

  host.querySelectorAll('.slot:not(.taken)').forEach(b => {
    b.addEventListener('click', () => {
      state.courtId = b.closest('.slots').dataset.court;
      state.start = b.dataset.st;
      state.end = b.dataset.en;
      renderGrid(); syncPick();
    });
  });
}

function syncPick() {
  const c = COURTS.find(x => x.id === state.courtId);
  $('#pCourt').textContent = c ? `Cancha ${c.number}${c.name ? ' · ' + c.name : ''}` : '—';
  const d = state.day ? new Date(state.day + 'T12:00:00') : null;
  $('#pDay').textContent = d ? `${DOW[d.getDay()]} ${d.getDate()}` : '—';
  $('#pTime').textContent = state.start
    ? `${hhmm(new Date(state.start))} – ${hhmm(new Date(state.end))}` : '—';
}

function say(kind, text) {
  const m = $('#bMsg');
  m.className = `msg on ${kind}`;
  m.textContent = text;
}

/* ── confirm ───────────────────────────────────────────────── */
$('#bConfirm').addEventListener('click', async () => {
  if (!state.courtId || !state.start) return say('err', 'Elige una cancha y una hora.');
  const name = $('#bName').value.trim();
  if (!name) return say('err', 'Escribe tu nombre para apartar la cancha.');

  const btn = $('#bConfirm');
  btn.disabled = true; btn.style.opacity = '.6';
  try {
    await LP_API.hold({
      courtId: state.courtId, startISO: state.start, endISO: state.end,
      name, phone: $('#bPhone').value.trim()
    });
    const c = COURTS.find(x => x.id === state.courtId);
    say('ok', `Listo — Cancha ${c.number}, ${hhmm(new Date(state.start))}. Apartada 10 minutos; recepción te confirma por WhatsApp.`);
    state.start = null; state.courtId = null;
    await load(); syncPick();
  } catch (e) {
    say('err', e.message === 'taken'
      ? 'Alguien tomó ese horario hace un momento. Elige otro.'
      : 'No se pudo apartar. Intenta de nuevo.');
    await load();
  } finally {
    btn.disabled = false; btn.style.opacity = '';
  }
});

/* ── load ──────────────────────────────────────────────────── */
async function load() {
  renderDays();
  $('#grid').innerHTML = '<div style="padding:2rem"><div class="skeleton" style="height:14px;width:40%"></div></div>';
  TAKEN = await LP_API.availability(state.day);
  renderGrid(); syncPick();
}

(async function init() {
  badge();
  const d = new Date(); d.setHours(0,0,0,0);
  state.day = dayKey(d);
  [COURTS, HOURS] = await Promise.all([LP_API.courts(), LP_API.hours()]);

  /* the film hands over ?court=1&date=…&time=19:00 — honour it */
  const q = new URLSearchParams(location.search);
  const qDate = q.get('date');
  if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate) && qDate >= state.day) state.day = qDate;

  await load();

  const qCourt = parseInt(q.get('court'), 10);
  const qTime  = q.get('time');
  if (qCourt) {
    const c = COURTS.find(x => x.number === qCourt);
    if (c) {
      state.courtId = c.id;
      if (qTime && /^\d{2}:\d{2}$/.test(qTime)) {
        const free = [...document.querySelectorAll(`.slots[data-court="${c.id}"] .slot:not(.taken)`)];
        const want = +qTime.slice(0,2) * 60 + +qTime.slice(3);
        /* exact slot if it is free, else the closest free one — never a
           silent jump to the first of the day */
        let hit = free.find(b => b.textContent.trim() === qTime);
        if (!hit && free.length) {
          hit = free.reduce((best, b) => {
            const t = b.textContent.trim();
            const d = Math.abs((+t.slice(0,2) * 60 + +t.slice(3)) - want);
            return (!best || d < best.d) ? { b, d } : best;
          }, null).b;
        }
        if (hit) {
          state.start = hit.dataset.st; state.end = hit.dataset.en;
          if (hit.textContent.trim() !== qTime) state.moved = qTime;
        }
      }
      renderGrid(); syncPick();
      if (state.moved) say('err', `Las ${state.moved} ya no está libre en la cancha ${qCourt}. Te dejamos la hora más cercana.`);
      document.querySelector('.slot.pick')?.scrollIntoView({ block:'nearest', inline:'center' });
    }
  }
})();
})();
