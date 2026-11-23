# Club de Padel Las Palmas — cinematic site

A single scroll-driven journey through the real club, in six chapters, ending in
a 3D court picker and booking hand-off.

```
00  Llegada    real aerial of the club, scroll drives the descent
01  La Entrada approach → the white door → the pro shop → the Las Palmas mat
02  El Sendero the pergola walkway, light through the leaves
03  Canchas    Court 1 (Chevrolet) and Court 2 — the two main courts
04  El Circuito courts 3–8 and Court 9, the 1v1
05  La Bolea   restaurant by day, then the club at night + the menu
→   Reserva    3D club map, date/time, membership, socials
```

## Run it

Any static host works, **but the server must support HTTP Range requests** —
without them the browser cannot seek a video and the whole journey freezes on
frame 0. Netlify, Vercel, Cloudflare Pages, S3+CloudFront and nginx all do by
default. Python's `python -m http.server` does **not**.

```bash
npx serve .          # fine
php -S localhost:8000 # fine
python3 -m http.server # NO — video will not scrub
```

## Editing

Everything the club changes lives in **`js/data.js`** — no need to touch logic:

| Key | What it controls |
|---|---|
| `courts` | names, sub-labels, surface dot, which chapter lists them |
| `map` | each court's position on the 3D plan (`x,y` centre, `w,h`, `r` rotation) |
| `times`, `daysAhead` | the booking chips |
| `playtomic` | where the confirm button sends people |
| `membership` | price, perks, hours |
| `menu` | La Bolea's menu — **currently sample content**, see below |

### The menu is a placeholder
`menu.isSample` is `true`, which shows a "menú de muestra" note under the list.
Replace the items with La Bolea's real dishes and prices, then set
`isSample: false` to remove the note.

### Moving a court on the 3D map
Positions came from the club's own satellite plan. `x`/`y` are the court's
centre as a fraction of the site (0–1), `w`/`h` its size, `r` its rotation in
degrees. Nudge and reload.

## How the scroll engine works

Each chapter is a tall `<section>` whose `.stage` is **`position: fixed`**.
Scroll position inside a section becomes a 0→1 progress value which drives:

- the aerial's `scale`/`translate` (chapter 00),
- `video.currentTime` on that chapter's clip(s), smoothed and then snapped when
  the visitor jumps rather than scrolls,
- copy fades via `data-in` / `data-out` (progress fractions),
- the day→night dissolves in chapter 05.

Stages cross-fade over their last 6% so chapters never show a seam. Fixed
stages are why there is no sticky "slide past" artefact.

Videos are encoded at 20 fps with a 10-frame GOP: scroll sets the rate, so the
lower frame rate is invisible, and the short GOP keeps seeking responsive while
keeping files roughly a third of the size.

## Accessibility
`prefers-reduced-motion` disables grain, parallax, the pulse and the smoothing.
Courts are keyboard-reachable (Tab, then Enter/Space).
