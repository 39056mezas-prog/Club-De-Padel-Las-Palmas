/* ══════════════════════════════════════════════════════════════
   TOURNAMENTS — standings, ties, schedule
   Reads only through LP_API, so mock and Supabase are identical.
   ══════════════════════════════════════════════════════════════ */
(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));

const DOW = ['dom','lun','mar','mié','jue','vie','sáb'];
const fmtDate = iso => {
  const d = new Date(iso);
  return `${DOW[d.getDay()]} ${d.getDate()} ${d.toLocaleString('es-MX',{month:'short'})}`;
};

function sampleBadge() {
  if (!LP_API.isMock) return;
  const h = $('#sampleBadge');
  if (h) h.innerHTML = '<div class="sample-badge"><i></i>Datos de muestra · conecta Supabase para datos en vivo</div>';
}

let TEAMS = {};
const teamName = id => (TEAMS[id] && TEAMS[id].name) || id;
const teamAbbr = id => (TEAMS[id] && TEAMS[id].abbr) || String(id).slice(0,2).toUpperCase();

/* ── standings ─────────────────────────────────────────────── */
function renderStandings(rows) {
  const body = $('#standBody');
  if (!body) return;
  const maxPts = Math.max(1, ...rows.map(r => r.rankingPoints));

  body.innerHTML = rows.map((r, i) => {
    const diff = r.pointDiff;
    const cut = i === 1 ? ' class="cut"' : '';
    return `<tr${cut}>
      <td class="pos${i < 2 ? ' top' : ''}">${r.position}</td>
      <td>
        <div class="team">
          <span class="abbr">${esc(teamAbbr(r.competitor))}</span>
          <span class="team-name">${esc(r.competitorName || teamName(r.competitor))}</span>
          ${r.tied ? '<span class="tied-flag">empate</span>' : ''}
        </div>
      </td>
      <td>
        <div style="display:flex;align-items:center;gap:.6rem;justify-content:flex-end">
          <span class="bar"><i style="width:${(r.rankingPoints/maxPts*100).toFixed(1)}%"></i></span>
          <span class="num big">${r.rankingPoints}</span>
        </div>
      </td>
      <td class="num">${r.played}</td>
      <td class="num">${r.wins}–${r.losses}</td>
      <td class="num">${r.setsWon}–${r.setsLost}</td>
      <td class="num">${r.pointsFor}–${r.pointsAgainst}</td>
      <td class="num ${diff >= 0 ? 'pos-d' : 'neg-d'}">${diff >= 0 ? '+' : ''}${diff}</td>
      <td class="num">${Math.round(r.winPct * 100)}%</td>
    </tr>`;
  }).join('');
}

/* ── ties grouped by round ─────────────────────────────────── */
function renderRounds(host, rounds, matches, opts = {}) {
  const el = $(host);
  if (!el) return;
  const byRound = r => matches.filter(m => m.round_id === r.id);

  el.innerHTML = rounds.map((r, i) => {
    const ms = byRound(r);
    const open = opts.openAll || r.status === 'in_progress' || i === 0;
    const state = r.status === 'completed' ? '<span class="state done">Jugada</span>'
                : r.status === 'in_progress' ? '<span class="state live">En curso</span>'
                : '<span class="state">Próxima</span>';
    return `<div class="round${open ? ' open' : ''}">
      <div class="round-head" role="button" tabindex="0">
        <b>${esc(r.label || 'Jornada ' + r.number)}</b>
        <span class="when">${fmtDate(r.starts_at)}</span>
        ${state}
      </div>
      <div class="round-body">
        ${ms.map(m => {
          const s = m.score;
          const aWin = s && s.a > s.b, bWin = s && s.b > s.a;
          return `<div class="tie">
            <div class="side a${aWin ? ' win' : ''}">
              <span class="abbr">${esc(teamAbbr(m.sideA))}</span>
              <span class="team-name">${esc(teamName(m.sideA))}</span>
            </div>
            <div class="sc${s ? '' : ' pending'}">${s ? `${s.a} – ${s.b}` : 'vs'}</div>
            <div class="side b${bWin ? ' win' : ''}">
              <span class="team-name">${esc(teamName(m.sideB))}</span>
              <span class="abbr">${esc(teamAbbr(m.sideB))}</span>
            </div>
            <div class="court">${m.court_id ? 'Cancha ' + String(m.court_id).replace('c','') : ''}</div>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');

  el.querySelectorAll('.round-head').forEach(h => {
    const toggle = () => h.parentElement.classList.toggle('open');
    h.addEventListener('click', toggle);
    h.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
    });
  });
}

/* ── tabs ──────────────────────────────────────────────────── */
document.querySelectorAll('.tabs button').forEach(b => {
  b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.panel').forEach(p =>
      p.classList.toggle('on', p.id === 'p-' + b.dataset.panel));
  });
});

/* ── boot ──────────────────────────────────────────────────── */
(async function init() {
  sampleBadge();
  try {
    const t = await LP_API.tournament('palmasleague');
    $('#tName').textContent = t.name;
    $('#tMeta').textContent =
      `${t.orgs_total ?? ''} organizaciones · ${t.ties_total ?? ''} encuentros · ` +
      `${t.matches_played ?? 0}/${t.matches_total ?? 0} partidos jugados`;
    const mc = $('#mCount');
    if (mc) mc.textContent = `${t.matches_played ?? 0}/${t.matches_total ?? 0} partidos`;

    const teams = await LP_API.competitors(t.id);
    TEAMS = Object.fromEntries(teams.map(x => [x.id, x]));

    renderStandings(await LP_API.standings(t.id));

    const [rounds, matches] = await Promise.all([LP_API.rounds(t.id), LP_API.matches(t.id)]);
    const played = rounds.filter(r => r.status !== 'published');
    renderRounds('#p-ties', played.length ? played : rounds, matches);
    renderRounds('#p-schedule', rounds, matches, { openAll: true });
  } catch (e) {
    console.error(e);
    const h = $('#tMeta');
    if (h) h.textContent = 'No se pudieron cargar los datos del torneo.';
  }
})();
})();
