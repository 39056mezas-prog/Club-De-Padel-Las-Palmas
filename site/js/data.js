/* ══════════════════════════════════════════════════════════════
   LAS PALMAS — EDITABLE DATA
   Everything the club changes day-to-day lives in this one file.
   ══════════════════════════════════════════════════════════════ */

window.LP_DATA = {

  /* ── COURTS ────────────────────────────────────────────────
     surface: "blue" | "clay" | "solo"   (controls the dot colour)
     group:   "main" shows in chapter 03, "rest" shows in chapter 04
     Edit names / meta freely — the booking flow picks these up.    */
  courts: [
    { n:1, name:"Cancha 1",  nameEn:"Court 1",  meta:"Chevrolet",        metaEn:"Chevrolet",
      surface:"blue", group:"main",
      tagline:"La primera que ves al entrar", taglineEn:"The first one you see" },

    { n:2, name:"Cancha 2",  nameEn:"Court 2",  meta:"Central",          metaEn:"Centre",
      surface:"blue", group:"main",
      tagline:"A tu derecha, junto a la 1",   taglineEn:"To your right, beside court 1" },

    { n:3, name:"Cancha 3",  nameEn:"Court 3",  meta:"Junto al restaurante", metaEn:"Beside the restaurant",
      surface:"clay", group:"rest" },

    { n:4, name:"Cancha 4",  nameEn:"Court 4",  meta:"Bloque sur",       metaEn:"South block",
      surface:"clay", group:"rest" },

    { n:5, name:"Cancha 5",  nameEn:"Court 5",  meta:"Bloque sur",       metaEn:"South block",
      surface:"clay", group:"rest" },

    { n:6, name:"Cancha 6",  nameEn:"Court 6",  meta:"Bloque sur",       metaEn:"South block",
      surface:"clay", group:"rest" },

    { n:7, name:"Cancha 7",  nameEn:"Court 7",  meta:"Ala oriente",      metaEn:"East wing",
      surface:"blue", group:"rest" },

    { n:8, name:"Cancha 8",  nameEn:"Court 8",  meta:"Ala oriente",      metaEn:"East wing",
      surface:"blue", group:"rest" },

    { n:9, name:"Cancha 9",  nameEn:"Court 9",  meta:"1 v 1",            metaEn:"1 v 1",
      surface:"solo", group:"rest",
      tagline:"Cancha individual, más corta", taglineEn:"Singles court, shorter" }
  ],

  /* ── CLUB MAP ──────────────────────────────────────────────
     Positions traced from the club's own satellite plan.
     x,y = centre (0-1 across the site), w,h = size, r = rotation°.
     Tweak these to nudge a court on the 3D map.                  */
  map: {
    courts: [
      { n:9, x:.343, y:.186, w:.075, h:.175, r:-8 },
      { n:2, x:.449, y:.292, w:.092, h:.200, r:-6 },
      { n:1, x:.474, y:.545, w:.100, h:.235, r:-6 },
      { n:3, x:.246, y:.530, w:.088, h:.215, r:-4 },
      { n:4, x:.312, y:.765, w:.082, h:.205, r:-3 },
      { n:5, x:.386, y:.762, w:.082, h:.205, r:-3 },
      { n:6, x:.462, y:.752, w:.082, h:.205, r:-3 },
      { n:7, x:.646, y:.530, w:.110, h:.245, r:-6 },
      { n:8, x:.822, y:.494, w:.110, h:.245, r:-6 }
    ],
    restaurant: { x:.380, y:.515, w:.115, h:.235, r:-5 },
    restroom:   { x:.552, y:.755, w:.045, h:.075, r:-4 },
    entrance:   { x:.737, y:.283 }
  },

  /* ── BOOKING SLOTS ─────────────────────────────────────── */
  times: ["07:00","08:30","10:00","11:30","13:00","14:30","16:00","17:30","19:00","20:30"],
  daysAhead: 7,
  playtomic: "https://4j9o.short.gy/PadelPalmas",

  /* ── MEMBERSHIP ────────────────────────────────────────── */
  membership: {
    name:"Membresía Pádel Sin Límite",  nameEn:"Unlimited Padel Membership",
    price:"$1,400",
    period:"al mes",                     periodEn:"per month",
    perks:[
      { es:"Juego ilimitado", en:"Unlimited play" },
      { es:"Clase personalizada incluida", en:"Personal lesson included" }
    ],
    hours:[
      { es:"Lunes a viernes", en:"Monday to Friday", t:"6:00 — 18:00" },
      { es:"Sábado y domingo", en:"Saturday and Sunday", t:"8:00 — 20:00" }
    ],
    note:"Sujeto a disponibilidad de canchas.",
    noteEn:"Subject to court availability."
  },

  /* ── MENU ──────────────────────────────────────────────────
     ⚠️  SAMPLE STRUCTURE — replace with La Bolea's real menu.
     Set `isSample:false` once the real items and prices are in
     and the "menú de muestra" badge disappears.                 */
  menu: {
    isSample: true,
    sections: [
      { title:"Para empezar", titleEn:"To start",
        items:[
          { name:"Guacamole de la casa",  nameEn:"House guacamole",     price:"—" },
          { name:"Aguachile de camarón",  nameEn:"Shrimp aguachile",    price:"—" },
          { name:"Tostadas de atún",      nameEn:"Tuna tostadas",       price:"—" }
        ]},
      { title:"Fuerte", titleEn:"Mains",
        items:[
          { name:"Tacos de pescado",      nameEn:"Fish tacos",          price:"—" },
          { name:"Hamburguesa La Bolea",  nameEn:"La Bolea burger",     price:"—" },
          { name:"Pasta del día",         nameEn:"Pasta of the day",    price:"—" }
        ]},
      { title:"Barra", titleEn:"Bar",
        items:[
          { name:"Cerveza de barril",     nameEn:"Draft beer",          price:"—" },
          { name:"Michelada Las Palmas",  nameEn:"Las Palmas michelada",price:"—" },
          { name:"Vino de Valle",         nameEn:"Valle de Guadalupe wine", price:"—" }
        ]}
    ]
  }
};
