# Club de Padel Las Palmas

Three pages, static, no build step.

| Page | What it is |
|---|---|
| `index.html` | the cinematic scroll journey through the club, ending in a 3D court map |
| `reservar.html` | court booking — day → court → 90-minute slot |
| `torneos.html` | Palmas Padel League: live table, ties, schedule |

## Deploying on Vercel

Push to the repo; Vercel builds nothing and serves the folder as-is.
Framework preset: **Other**. Build command: **none**. Output directory: **./**

`vercel.json` is included and sets long cache lifetimes on the video and images,
plus the usual security headers. Vercel serves HTTP Range requests, which the
scroll-scrubbed video needs — so the journey works on Vercel with no extra setup.

> If you ever preview locally, do **not** use `python -m http.server`: it does not
> serve Range requests, so every clip freezes on frame one. Use `npx serve .`.

## Live data

Everything currently reads mock data shaped exactly like the Supabase tables, and
both pages show a "datos de muestra" badge while that is true.

To go live, edit **`js/api.js`**:

```js
const cfg = {
  mode: 'supabase',                       // was 'mock'
  supabase: { url: 'https://xxx.supabase.co', key: 'sb_publishable_...' },
  clubId: '<the club row uuid>'
};
```

Nothing else changes — every function in `api.js` already returns the shape the
pages expect.

### Database

The tournament engine's own three migrations live in your `padel-tournaments`
repo. This site adds one more, in `supabase/`:

- `20261123000004_club_booking.sql` — `club_courts`, `club_hours`,
  `club_closures`, `bookings`, plus the `court_availability` view and RLS.

It exists because the tournament schema has no booking concept: its `courts`
table is `tournament_id not null`, so it cannot represent the club's nine
permanent courts or day-to-day reservations. Double-booking is prevented by a
GiST exclusion constraint in the database, not by application code.

The seed for the nine real courts is commented at the bottom of that file.

## Editing content

| File | Controls |
|---|---|
| `js/data.js` | court names, 3D map positions, membership, menu, booking chips |
| `js/mock.js` | sample courts, hours, bookings, league table |

**The La Bolea menu is placeholder.** `menu.isSample: true` shows a "menú de
muestra" note; replace the items and set it to `false`.

**Opening hours in `mock.js` are a reasonable default, not confirmed.**
Membership hours are Mon–Fri 06:00–18:00 and Sat–Sun 08:00–20:00, but evening
play clearly happens, so the grid currently runs later. Confirm and correct.

**The league table is a real snapshot** of Palmas Padel League 2026 Group A as of
22 Nov 2026. It will go stale until Supabase is connected.
