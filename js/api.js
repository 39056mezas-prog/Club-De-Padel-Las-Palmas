/* ══════════════════════════════════════════════════════════════
   DATA ADAPTER
   The only file that knows where data comes from.

   Today  : LP_MOCK (js/mock.js) — rows shaped exactly like the
            Supabase tables, so nothing downstream has to change.
   Later  : set LP_API.mode = 'supabase' and fill LP_API.supabase
            with { url, key }. Every function below already returns
            the shape the UI expects.
   ══════════════════════════════════════════════════════════════ */
window.LP_API = (() => {
  'use strict';

  const cfg = {
    mode: 'mock',            // 'mock' | 'supabase'
    supabase: { url: '', key: '' },
    clubId: 'las-palmas'
  };

  /* ── tiny Supabase REST helper (no SDK needed) ────────────── */
  async function sb(path, params = {}) {
    const u = new URL(`${cfg.supabase.url}/rest/v1/${path}`);
    Object.entries(params).forEach(([k, v]) => u.searchParams.set(k, v));
    const r = await fetch(u, {
      headers: {
        apikey: cfg.supabase.key,
        Authorization: `Bearer ${cfg.supabase.key}`,
        Accept: 'application/json'
      }
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    return r.json();
  }

  const M = () => window.LP_MOCK;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  /* ── COURTS ───────────────────────────────────────────────── */
  async function courts() {
    if (cfg.mode === 'supabase')
      return sb('club_courts', { select: '*', active: 'eq.true', order: 'number.asc' });
    await sleep(60);
    return M().club_courts.filter(c => c.active);
  }

  /* ── OPENING HOURS ────────────────────────────────────────── */
  async function hours() {
    if (cfg.mode === 'supabase') return sb('club_hours', { select: '*' });
    await sleep(20);
    return M().club_hours;
  }

  /* ── AVAILABILITY for one day ─────────────────────────────────
     Returns taken ranges only — never who booked them, matching
     the court_availability view's privacy rule.                  */
  async function availability(dayISO) {
    /* The grid builds its slots in the club's local time, so the day's
       bounds must be local too. Filtering on a UTC date string silently
       hides evening bookings that fall on the next UTC day. */
    const from = new Date(`${dayISO}T00:00:00`);
    const to   = new Date(from); to.setDate(from.getDate() + 1);

    if (cfg.mode === 'supabase') {
      return sb('court_availability', {
        select: 'club_court_id,during,status',
        during: `ov.[${from.toISOString()},${to.toISOString()})`
      });
    }
    await sleep(90);
    return M().bookings
      .filter(b => ['held', 'confirmed', 'played'].includes(b.status))
      .filter(b => new Date(b.during_start) < to && from < new Date(b.during_end))
      .map(b => ({ club_court_id: b.club_court_id, during: [b.during_start, b.during_end], status: b.status }));
  }

  /* ── HOLD a slot ──────────────────────────────────────────────
     Mock mode writes into the in-memory array so the UI behaves
     exactly as it will against the real exclusion constraint:
     a clashing hold is refused.                                   */
  async function hold({ courtId, startISO, endISO, name, phone }) {
    if (cfg.mode === 'supabase') {
      const r = await fetch(`${cfg.supabase.url}/rest/v1/bookings`, {
        method: 'POST',
        headers: {
          apikey: cfg.supabase.key,
          Authorization: `Bearer ${cfg.supabase.key}`,
          'Content-Type': 'application/json',
          Prefer: 'return=representation'
        },
        body: JSON.stringify({
          club_court_id: courtId,
          during: `[${startISO},${endISO})`,
          status: 'held',
          hold_expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
          contact_name: name, contact_phone: phone,
          idempotency_key: crypto.randomUUID()
        })
      });
      if (r.status === 409) throw new Error('taken');
      if (!r.ok) throw new Error(await r.text());
      return (await r.json())[0];
    }

    await sleep(240);
    const clash = M().bookings.some(b =>
      b.club_court_id === courtId &&
      ['held', 'confirmed', 'played'].includes(b.status) &&
      b.during_start < endISO && startISO < b.during_end);
    if (clash) throw new Error('taken');

    const row = {
      id: crypto.randomUUID(),
      club_court_id: courtId,
      during_start: startISO, during_end: endISO,
      status: 'held', source: 'web',
      contact_name: name || null, contact_phone: phone || null,
      hold_expires_at: new Date(Date.now() + 10 * 60000).toISOString(),
      created_at: new Date().toISOString()
    };
    M().bookings.push(row);
    return row;
  }

  /* ── TOURNAMENTS ──────────────────────────────────────────── */
  async function tournaments() {
    if (cfg.mode === 'supabase')
      return sb('tournaments', { select: '*', visibility: 'eq.public', order: 'starts_at.desc' });
    await sleep(40);
    return M().tournaments;
  }

  async function tournament(slug) {
    const all = await tournaments();
    return all.find(t => t.slug === slug) || all[0];
  }

  /* ── STANDINGS ────────────────────────────────────────────────
     Shape is the engine's `Standing` interface, straight from
     src/engine/rankings.ts, so the real snapshot drops in as-is. */
  async function standings(tournamentId) {
    if (cfg.mode === 'supabase') {
      const snap = await sb('standings_snapshots', {
        select: 'rows,computed_at,config_version',
        tournament_id: `eq.${tournamentId}`,
        order: 'computed_at.desc', limit: '1'
      });
      return snap[0] ? snap[0].rows : [];
    }
    await sleep(120);
    return M().standings[tournamentId] || [];
  }

  /* ── TIES / MATCHES ───────────────────────────────────────── */
  async function matches(tournamentId) {
    if (cfg.mode === 'supabase')
      return sb('matches', {
        select: '*,rounds(number,status),match_results(score,status,outcome)',
        tournament_id: `eq.${tournamentId}`
      });
    await sleep(100);
    return M().matches.filter(m => m.tournament_id === tournamentId);
  }

  async function rounds(tournamentId) {
    if (cfg.mode === 'supabase')
      return sb('rounds', { select: '*', tournament_id: `eq.${tournamentId}`, order: 'number.asc' });
    await sleep(50);
    return M().rounds.filter(r => r.tournament_id === tournamentId);
  }

  async function competitors(tournamentId) {
    if (cfg.mode === 'supabase')
      return sb('teams', { select: 'id,name,seed,group_label,status', tournament_id: `eq.${tournamentId}` });
    await sleep(40);
    return M().teams.filter(t => t.tournament_id === tournamentId);
  }

  return {
    cfg, courts, hours, availability, hold,
    tournaments, tournament, standings, matches, rounds, competitors,
    get isMock() { return cfg.mode === 'mock'; }
  };
})();
