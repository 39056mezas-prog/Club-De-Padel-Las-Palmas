/* ══════════════════════════════════════════════════════════════
   MOCK DATA — rows shaped exactly like the Supabase tables.

   The league table below is the club's real Palmas Padel League
   2026 Group A standing as of 22 Nov 2026. It is a snapshot, so
   it goes stale: the UI shows a "datos de muestra" badge while
   LP_API.cfg.mode is 'mock'.

   Opening hours are a sensible default, NOT confirmed by the club
   — membership hours are Mon–Fri 06:00–18:00 and Sat–Sun
   08:00–20:00, but evening play clearly happens. Confirm, then
   edit club_hours below (and seed the real values in Supabase).
   ══════════════════════════════════════════════════════════════ */
window.LP_MOCK = (() => {
  const CLUB = 'las-palmas';
  const iso = d => d.toISOString();

  /* ── the club's nine courts ─────────────────────────────── */
  const club_courts = [
    { id:'c1', club_id:CLUB, number:1, name:'Chevrolet', surface:'glass', singles:false, active:true },
    { id:'c2', club_id:CLUB, number:2, name:null,        surface:'glass', singles:false, active:true },
    { id:'c3', club_id:CLUB, number:3, name:null,        surface:'clay',  singles:false, active:true },
    { id:'c4', club_id:CLUB, number:4, name:null,        surface:'clay',  singles:false, active:true },
    { id:'c5', club_id:CLUB, number:5, name:null,        surface:'clay',  singles:false, active:true },
    { id:'c6', club_id:CLUB, number:6, name:null,        surface:'clay',  singles:false, active:true },
    { id:'c7', club_id:CLUB, number:7, name:null,        surface:'glass', singles:false, active:true },
    { id:'c8', club_id:CLUB, number:8, name:null,        surface:'glass', singles:false, active:true },
    { id:'c9', club_id:CLUB, number:9, name:'1v1',       surface:'glass', singles:true,  active:true }
  ];

  const club_hours = [
    { club_id:CLUB, weekday:0, opens:'08:00', closes:'22:00' },
    { club_id:CLUB, weekday:1, opens:'06:00', closes:'23:00' },
    { club_id:CLUB, weekday:2, opens:'06:00', closes:'23:00' },
    { club_id:CLUB, weekday:3, opens:'06:00', closes:'23:00' },
    { club_id:CLUB, weekday:4, opens:'06:00', closes:'23:00' },
    { club_id:CLUB, weekday:5, opens:'06:00', closes:'23:00' },
    { club_id:CLUB, weekday:6, opens:'08:00', closes:'22:00' }
  ];

  /* ── a believable day of bookings, so the grid is not empty ── */
  const bookings = [];
  (function seed() {
    const today = new Date(); today.setHours(0,0,0,0);
    // deterministic pseudo-random so the demo looks the same each load
    let s = 7;
    const rnd = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
    for (let d = 0; d < 7; d++) {
      const day = new Date(today); day.setDate(today.getDate() + d);
      club_courts.forEach(c => {
        for (let hh = 7; hh <= 21; hh += 1.5) {
          // evenings and weekends fill up; mornings stay open
          const weekend = [0,6].includes(day.getDay());
          const peak = hh >= 17 || (weekend && hh >= 9);
          if (rnd() < (peak ? .42 : .12)) {
            const st = new Date(day); st.setHours(Math.floor(hh), (hh % 1) * 60, 0, 0);
            const en = new Date(st.getTime() + 90 * 60000);
            bookings.push({
              id:`b${bookings.length}`, club_court_id:c.id,
              during_start: iso(st), during_end: iso(en),
              status:'confirmed', source: rnd() < .4 ? 'playtomic' : 'web',
              contact_name:null, created_at: iso(today)
            });
          }
        }
      });
    }
  })();

  /* ── Palmas Padel League 2026 ─────────────────────────────── */
  const T_ID = 'palmasleague';
  const tournaments = [{
    id: T_ID, slug: 'palmasleague',
    name: 'Palmas Padel League 2026',
    description: 'Liga por equipos · 8 organizaciones · 28 encuentros',
    format: 'fixed_team', status: 'in_progress', visibility: 'public',
    registration_status: 'closed',
    starts_at: '2026-09-06T16:00:00Z',
    venue: 'Club de Padel Las Palmas, Ensenada',
    config: { ranking: { primary: 'ranking_points', tiebreakers: ['sets_diff','point_diff','head_to_head'] } },
    config_version: 1,
    matches_played: 108, matches_total: 252, ties_total: 28, orgs_total: 8
  }];

  const TEAMS = [
    ['t1','Padelisa Padel Club','PA'], ['t2','MUVA','MU'], ['t3','M7','M7'],
    ['t4','Fundación Zoe','FU'],       ['t5','Universe Power','UN'],
    ['t6','RH (Rancho Huesca)','RH'],  ['t7','Travis Kicks','TR'],
    ['t8','Hotel Las Palmas','HO']
  ];
  const teams = TEAMS.map(([id,name,abbr], i) => ({
    id, tournament_id:T_ID, name, abbr, seed:i+1, group_label:'A', status:'active'
  }));

  /* Real Group A table, 22 Nov 2026.
     Mapped onto the engine's `Standing` shape (src/engine/rankings.ts). */
  const RAW = [
    //                      pts  W   L  setsW setsL  gamesF gamesA
    ['t1','Padelisa Padel Club', 23, 20,  7,   43,  19,   304, 226],
    ['t2','MUVA',                23, 20,  7,   43,  23,   331, 257],
    ['t3','M7',                  16, 14, 13,   31,  28,   269, 265],
    ['t4','Fundación Zoe',       15, 14, 13,   33,  29,   280, 260],
    ['t5','Universe Power',      13, 12, 15,   33,  32,   286, 296],
    ['t6','RH (Rancho Huesca)',  12, 11, 16,   25,  37,   261, 280],
    ['t7','Travis Kicks',        12, 11, 16,   24,  38,   242, 301],
    ['t8','Hotel Las Palmas',     6,  6, 21,   19,  45,   244, 332]
  ];

  const standingsRows = RAW.map((r, i) => {
    const [id, name, pts, w, l, sw, sl, pf, pa] = r;
    const played = w + l;
    return {
      position: i + 1,
      competitor: id,
      competitorName: name,
      played, wins: w, draws: 0, losses: l,
      pointsFor: pf, pointsAgainst: pa, pointDiff: pf - pa,
      setsWon: sw, setsLost: sl,
      rankingPoints: pts,
      restCredit: 0, rests: 0,
      totalPoints: pf,
      winPct: played ? w / played : 0,
      // 1 and 2 are level on points and match record — separated on sets
      tied: pts === 23
    };
  });

  /* ── rounds + a readable slice of the schedule ────────────── */
  const rounds = [];
  const matches = [];
  (function sched() {
    const base = new Date('2026-09-06T16:00:00Z');
    let mid = 0;
    for (let r = 1; r <= 7; r++) {
      const when = new Date(base); when.setDate(base.getDate() + (r - 1) * 14);
      const done = r <= 4;
      rounds.push({
        id:`r${r}`, tournament_id:T_ID, stage_id:'s1', number:r,
        status: done ? 'completed' : (r === 5 ? 'in_progress' : 'published'),
        starts_at: iso(when), label:`Jornada ${r}`
      });
      // 4 ties per round across 8 teams
      const order = teams.map(t => t.id);
      for (let p = 0; p < 4; p++) {
        const a = order[p], b = order[7 - p];
        const sa = done ? (3 + ((r + p) % 4)) : null;
        const sb = done ? (1 + ((r * 2 + p) % 4)) : null;
        matches.push({
          id:`m${mid++}`, tournament_id:T_ID, round_id:`r${r}`,
          court_id: club_courts[p % 9].id,
          bracket_code:null,
          status: done ? 'completed' : (r === 5 ? 'in_progress' : 'scheduled'),
          scheduled_at: iso(new Date(when.getTime() + p * 90 * 60000)),
          sideA: a, sideB: b,
          score: done ? { a: sa, b: sb } : null
        });
      }
    }
  })();

  return {
    club_courts, club_hours, bookings,
    tournaments, teams, rounds, matches,
    standings: { [T_ID]: standingsRows }
  };
})();
