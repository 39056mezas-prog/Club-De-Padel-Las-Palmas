# Club de Padel Las Palmas

Static site, no build step. Three pages.

| Page | What it is |
|---|---|
| `index.html` | the club in four screens — hero, court map, La Bolea, gallery |
| `reservar.html` | full booking grid (day × court × 90-min slot) |
| `torneos.html` | Palmas Padel League — live table, ties, schedule |

## The flow on `index.html`

Nothing scrolls on its own. Buttons move you between acts, and arrow keys work too.

```
01 El club      drone shot of the club, cross-fading through real photos
02 Reservar     the 3D map of the nine courts in their true positions.
                Pick a court and the box beside it becomes the whole booking —
                day, time, name — without leaving the screen.
   El camino    not a page. Press "Recorrer y reservar" and the site walks you
                from the entrance to that court, step by step, arriving on a
                real photograph of it. Court 5 plays the route to court 5.
03 La Bolea     the restaurant: menu on one side, its own food gallery on the
                other, and the Instagram link.
04 Galería      every photo, filterable by Padel / El club / La Bolea.
                Click any image to open it full size; arrow keys move through.
```

Photos are grouped by what they are, in `PHOTOS` in `js/app.js` — each row is
`[filename, tag, Spanish caption, English caption]`. Add a photo by dropping
`name.jpg` and `name-sq.jpg` into `assets/photo/` and adding one row.

Routes are defined in `js/app.js` under `ROUTES` — each court lists the clips
you actually pass on the way there, read off the club's own site plan.

## Deploying on Vercel

Push to the repo. Framework preset **Other**, build command **none**, output
directory **./**. `vercel.json` sets long cache lifetimes on media and the usual
security headers. Vercel serves HTTP Range requests, which video needs.

> Previewing locally: use `./serve-local.sh` or `npx serve .`.
> Do **not** use `python -m http.server` — it does not serve Range requests.

## Live data

Both `reservar.html` and `torneos.html` read mock data shaped exactly like the
Supabase tables, and show a "datos de muestra" badge while that is true.

To go live, edit **`js/api.js`**:

```js
const cfg = {
  mode: 'supabase',                 // was 'mock'
  supabase: { url: 'https://xxx.supabase.co', key: 'sb_publishable_...' },
  clubId: '<the club row uuid>'
};
```

Nothing else changes.

### Database
`supabase/20261123000004_club_booking.sql` adds `club_courts`, `club_hours`,
`club_closures`, `bookings`, the `court_availability` view and RLS. It exists
because the tournament schema has no booking concept — its `courts` table is
`tournament_id not null`, so it cannot hold the club's nine permanent courts.
Double-booking is blocked by a GiST exclusion constraint in the database, not by
application code. The seed for the nine real courts is at the bottom of the file.

## Editing

| File | Controls |
|---|---|
| `js/data.js` | court names, 3D map positions, membership, menu |
| `js/app.js` | `ROUTES` (which clips lead to each court), `GALLERY` (captions) |
| `js/mock.js` | sample courts, hours, bookings, league table |

### Look
Glass panels (`backdrop-filter`) over three slow-drifting colour orbs — frosted
surfaces only read as glass when something sits behind them to refract. The orbs
live in `.orbs` and the material is the `.bk / .arrive / .bolea-left.glass`
rule in `css/cine.css`. There is a `@supports not (backdrop-filter)` fallback.

### Brand
Colours come straight from the logo: green `#184D39`, cream `#ECEFE2`,
orange `#F76114`. `logo-lockup.png` is the horizontal lockup used in the header,
`logo-full.png` the stacked version in the hero, `logo-mark.png` the mark alone.
All three are the real artwork with transparency — the wordmark is never
re-set in CSS, so the typography always matches.

## Still placeholder
- **The La Bolea menu.** `menu.isSample: true` in `js/data.js` shows a
  "menú de muestra" note. Replace the items and set it to `false`.
- **Opening hours** in `js/mock.js` are a reasonable default, not confirmed.
  Membership hours are Mon–Fri 06:00–18:00 and Sat–Sun 08:00–20:00, but evening
  play clearly happens, so the grid runs later.
- **Court surfaces for 3–8** were inferred from satellite colour.
- **The league table** is a real snapshot of Group A as of 22 Nov 2026.
