# Journey Through Time — build brief

Source: "Journey Through Time — Claude Code build prompt" (Nov 9, 2026, @Claude Team), pasted by
the user. Saved here so every phase can reread it. The implementation plan and phase status live
in [journey-plan.md](journey-plan.md).

The Figma file is the visual reference only. Every animation here replaces the Figma prototype;
ignore Figma's Smart Animate behaviour.

## Master prompt

You are a senior creative developer and motion designer building an award-level interactive
portfolio called "Journey Through Time" for Shreyas Ballari, a student researcher.

**The idea.** A photoreal desk calendar sits at the centre of a dark, golden, cinematic scene. As
the visitor scrolls, the calendar physically flips page by page through 9 chapters of Shreyas's
life. Every flip drives the whole scene: a curved month dial rotates to the new chapter, three
polaroids orbit the calendar, a glass milestone card swaps its story, a vertical timeline
advances, and a pin travels along a parchment "Key Chapters" map. Scrolling down flips forward;
scrolling up flips backward, page by page, with the same physics in reverse.

**Non-negotiables**

1. Scroll is the primary input. Use a pinned scene with scrubbed timelines, smooth scrolling and
   chapter snapping, exactly as specified. Never jump between states.
2. The calendar flip is the hero animation. It must look like real paper: a curling page with a
   moving hinge shadow, a specular highlight sweep, and a page landing with a soft settle. A flat
   rotateX card flip is not acceptable.
3. Every animation is reversible and scrubbable. Scrolling back must replay the motion backward,
   not cut.
4. Content comes only from the chapter data in the brief. Do not invent dates, awards, metrics,
   schools or projects. Unknown facts stay as the labels given.
5. 60 fps on a 2020 MacBook Air and a mid-range Android phone. Respect prefers-reduced-motion with
   the fallbacks in the brief.
6. Keyboard and screen-reader users can reach every chapter and every inner page.
7. Keep scene logic, animation timelines, UI components and content data in separate modules.
   Chapter content lives in one typed data file.

**How to work.** Audit the repo first. Write a short implementation plan mapped to the phases,
then build Phase 1 only. After each phase, run the app, check the acceptance items, list what was
verified and what is left, then stop and wait for approval. Name every placeholder asset clearly
(for example `calendar-render.placeholder.webp`) and list missing assets.

## Experience and information architecture

The home route is one pinned, scroll-driven scene with 9 chapter states; every chapter opens a
detail page, and the nav reaches four inner pages.

Visitor flow on the home route:

1. Loader (0–100%): a page counter riffles from K–5 to Now while assets load.
2. Opening sequence (2.4 s, plays once): the scene lights up and the calendar drops onto the dial
   showing Chapter 01.
3. Chapters 01–09: each scroll segment flips one calendar page and updates the whole scene.
4. Finale (after Chapter 09): the calendar flips to a blank page reading "Your date?" with a
   Let's talk call to action, then normal page scroll continues into a short footer.

| Route | Page | Reached from |
| --- | --- | --- |
| `/` | Journey scene (pinned) + footer | Logo, Journey nav pill |
| `/journey/[slug]` | Chapter detail | View Details on the milestone card, map points |
| `/projects` | Projects index | Projects nav |
| `/projects/[slug]` | Project detail (Oncure, Finance app) | Projects index, chapter detail |
| `/about` | About Shreyas | About nav |
| `/contact` | Contact, "Book a date" | Let's Talk button, finale |
| `/404` | "This date doesn't exist" | Any bad URL |

State in the URL: the active chapter is mirrored in the hash (`/#ch-2023`). Loading that URL
scrolls straight to the chapter with no opening sequence. Returning from a detail page restores
the exact scroll position.

## Design system

Warm gold light on near-black, cream paper, and one yellow accent; everything else stays neutral
so the calendar glows.

| Token | Hex | Use |
| --- | --- | --- |
| `--night` | `#0B0B0D` | Page background, vignettes |
| `--ember` | `#1A1408` | Text on paper and yellow |
| `--gold` | `#FFC93C` | Active pill, CTA, active tile, timeline dot, circled tag |
| `--gold-deep` | `#E8A800` | Gradient end on gold surfaces |
| `--glow` | `#FFE7A3` | Sparks, orbit points, active timeline label |
| `--paper` | `#FFFDF7` | Calendar page, milestone card, polaroid frame |
| `--paper-shade` | `#EFE6D2` | Paper gradient end, card edge |
| `--parchment` | `#F6EBD0` | Key Chapters sign |
| `--ink-soft` | `#3A3328` | Body text on paper |
| `--line` | `rgba(255,255,255,0.35)` | Timeline line, hairlines on dark |

| Role | Family | Size / line height | Weight |
| --- | --- | --- | --- |
| Script logo, "Time.", calendar signature, Key Chapters | Kaushan Script | 40/1, 92/1, 26/1, 32/1 | 400 |
| Hero headline | Plus Jakarta Sans | 50/1.0, tracking −2.5% | 800 |
| Calendar month and big date | DM Serif Display | 56/1 and 104–150/1, tracking −4% | 400 |
| Handwritten circled tag, polaroid captions | Caveat | 30/1.1, 20/1.1 | 700 |
| Card title | Plus Jakarta Sans | 26/1.1, tracking −1.5% | 800 |
| Body on paper | Plus Jakarta Sans | 13–15/1.5 | 500 |
| Labels (PORTFOLIO, THE JOURNEY, MILESTONE) | Plus Jakarta Sans | 9.5–12, tracking +14–42% | 700–800 |
| Nav, buttons | Plus Jakarta Sans | 15/1 | 700 |

Shape and depth:

- Spacing scale: 4, 8, 12, 16, 24, 32, 44, 64 px. Page margin 44 px at 1440 wide.
- Radius: pills 999 px, milestone card 24 px, calendar page 18 px, dial tiles 9 px, polaroids 4 px.
- Shadows: paper objects use `0 18px 26px rgba(0,0,0,.55)`; gold objects use a 14–24 px gold glow
  instead of a black shadow.
- Glass: the milestone card is warm paper at 94% opacity with a 20 px backdrop blur, never cold
  white glass.
- Film grain: a 3% animated noise overlay over the whole scene, plus a radial vignette from 0% at
  centre to 70% black at the corners.

Assets (2x WebP, from Figma): cinematic background, desk calendar render with a blank page,
parchment map strip, nine chapter images (backpack, stethoscope certificate, bullseye, writing
award, trophy, science academy, tutoring desk, nanobot, trading phone).

## The Journey screen and its 9 chapter states

One 1440 × 900 composition stays fixed while scrolling; only chapter-driven parts change.
Coordinates are from the Figma frames (x, y from top-left) and scale with the viewport.

Layers, back to front:

1. Backdrop: cinematic image (dark charcoal, golden bokeh, tumbling pages), side vignette (85%
   black at left to 10% at 70% width), bottom vignette 600–900 px.
2. Floating pages: 8–12 blurred torn calendar pages at the edges, drifting slowly.
3. Orbit: ellipse centred at (668, 330), radii 440 × 150; a 6 px blurred gold stroke under a
   1.2 px line, plus 5 glowing spark dots.
4. Dial: ellipse at (668, 514), radii 348 × 118, dark walnut gradient with a gold rim; the inner
   ellipse is 262 × 82. Tiles sit on an ellipse of radii 305 × 96.
5. Parchment map: strip across the bottom (y 640–860), placed under the dial so the dial pointer
   touches it.
6. Desk calendar: render at (388, 58), 560 × 560, blended with Lighten so its dark background
   disappears.
7. Calendar page text (editable, on the blank page): signature "Shreyas" at y 152, month label at
   y 182, big date at y 236, circled handwritten tag at y 404 with a gold ellipse stroke behind
   it, rotated −4°.
8. Polaroids (156 × 180): three visible slots. Top-right (912, 150) at −9°, top-left (470, 150)
   at +9°, left (396, 398) at +14°. Hidden polaroids wait behind the calendar at (668, 300),
   scale 0.5, opacity 0.
9. UI: nav, left hero copy, milestone card, right timeline, map labels, pin, flag, scroll hint.

Fixed UI:

- Nav (y 14): script logo "Shreyas" at left; pills Journey (gold, active), Projects, About,
  Contact centred; white "Let's Talk ↗" pill at right.
- Left hero: "PORTFOLIO" label, "My Journey Through" in two lines, gold script "Time." with a
  brush swoosh under it, a 2-line intro, and an "Explore the Journey" gold pill with a play icon.
- Milestone card (1004, 146, 282 × 362): MILESTONE pill, title, date row with calendar icon,
  place row with building icon, description, tag chips, "View Details ↗" gold pill, page-curl
  corner.
- Right timeline (x 1318): "THE JOURNEY" label, a vertical line, 9 stops 42 px apart. Active
  stop: 20 px gold dot with glow, gold label. Others: 9 px white dot.
- Key Chapters map: a tilted parchment sign "Key Chapters" at left, a dashed path through 6
  points, an icon and label at each, a gold pin on the active position, and a gold flag labelled
  "The Next Chapter" at the right end.
- Scroll hint at the bottom centre: mouse outline with a moving wheel dot and "Scroll to Explore".

### Chapter content (use exactly this; nothing else)

| # | Dial / timeline label | Calendar month · big · circled | Card title | Date · place | Description | Tags | Image · polaroid caption | Map position |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | K–5 · The Beginning | Early · K–5 · Ch. 01 | The Beginning | Elementary years · Nancy Young Elementary | Where the journey began — the first school days and the first big questions. | School, Curiosity | backpack · First days | 0 |
| 2 | 2021 · Mini-Med | Jul · 2021 · Ch. 02 | Mini-Medical School | July 2021 · Certificate | Earned a Mini-Medical School certificate — a first real look at how medicine works. | Medicine, Certificate | stethoscope · Mini-Med | 1 |
| 3 | 6–8 · Project Arrow | Middle · 6–8 · Ch. 03 | Project Arrow | Middle school · Francis Granger MS | Selected for Project Arrow, an advanced academic program at Francis Granger Middle School. | Advanced program | bullseye · Project Arrow | 1.5 |
| 4 | 2023 · Young Authors | Award · 2023 · Ch. 04 | Young Authors Winner | 2023 · District 204 | Won the Young Authors Contest in District 204. | Writing, Award | writing · Young Authors | 2 |
| 5 | 1280 · Top 1% | PSAT · 1280 · Top 1% | Top 1% Nationwide | PSAT 8/9 · 1280 / 1440 | Scored 1280 out of 1440 on the PSAT 8/9 — top 1% nationwide. | PSAT 8/9, Top 1% | trophy · PSAT 8/9 | 3 |
| 6 | 9–12 · Fulton | High · 9–12 · Ch. 06 | Fulton Science Academy | High school · Alpharetta, GA | Honors and AP coursework at Fulton Science Academy. | Honors, AP | academy · Fulton | 3.5 |
| 7 | Tutor · Giving back | Giving · Tutor · Ch. 07 | Peer Tutor | Ongoing · Peer tutoring | Helping fellow students learn as a peer tutor. | Mentoring | tutoring · Tutoring | 3.8 |
| 8 | 2026 · Oncure | Research · 2026 · Ch. 08 | Oncure | 2026 · Research proposal | A research proposal for AI-guided nanobot cancer therapy — a concept, not a cure. | AI, Nanobots | nanobot · Oncure | 4 |
| 9 | Now · What's next? | Building · Now · Ch. 09 | Finance App | In progress · Stock trading app | Currently building a stock trading finance app. | Finance, In progress | trading phone · Finance app | 5 |

Map points 0–5 are labelled The Beginning (K–5), Medicine (2021), Young Authors (2023), Top 1%
(PSAT), Oncure (2026) and Building now (Now). Fractional positions place the pin between points.

Polaroid slot rule: for chapter i, top-right shows chapter i + 2, top-left shows i + 1, left shows
i − 1. Every other polaroid is hidden behind the calendar.

Open data: exact years for K–5, 6–8, 9–12 and the tutoring dates are unknown. Keep these labels
until Shreyas confirms them; never fill in a guessed year.

## Calendar page-flip animation (the hero)

Each chapter change tears the front page up and over the gold rings to the back of the tent
calendar, with a real paper curl, a moving shadow and a soft landing. It is scroll-scrubbed and
fully reversible.

How it is built:

- Render the pages in WebGL (React Three Fiber) on a transparent canvas placed exactly over the
  blank page of the calendar render, so the photoreal body stays an image and only the paper moves.
- Each page is a PlaneGeometry with 48 × 56 segments, hinged along its top edge just under the rings.
- Page faces are canvas textures drawn from the chapter data (signature, month, big date, circled
  tag) with the same fonts as the DOM, generated after `document.fonts.ready`. The page that flips
  shows its real text.
- The page back is paper at 92% brightness with the front text mirrored at 6% opacity, like ink
  showing through.
- Keep a stack: the current page on top, the next chapter's page already sitting underneath, and
  6 offset sheet edges (1 px apart) visible on the sides for thickness.

The curl (vertex shader):

1. Flip progress p runs 0 → 1.
2. Wrap the page around a cylinder whose axis is parallel to the hinge. Radius
   R = mix(4.0·L, 0.28·L, sin(π·p)), where L is the page height: flat at rest, tightest mid-flip.
3. Rotate the whole page around the hinge by θ = p · 196°, so it passes over the rings and comes
   to rest leaning against the back.
4. Lag the bottom corners: add 0.18 · sin(π·p) · (x/W)² radians of extra rotation toward the outer
   edges, so the corners trail the centre like real paper.
5. Add a 0.6% flutter in the last 25% of the flip: 0.006 · sin(18·p) · (1 − p).

Light and shadow:

- Moving shadow: the page underneath darkens in a soft band that follows the curl line. Darkness
  = 35% at the crease, falling to 0 over 18% of the page height.
- Specular sweep: a warm highlight (#FFE7A3, up to 30%) rides the crest of the curl using a
  fresnel term.
- Self-shadow: the inside of the curl is 12% darker than the outside.
- Ring glint: as the page passes under the rings, a highlight sweeps across the gold rings in
  300 ms and each ring wobbles 2°.

Timing when triggered by click or key (900 ms):

| Phase | Time | What happens | Easing |
| --- | --- | --- | --- |
| Anticipation | 0–120 ms | Page lifts 2 px, bottom corners curl 6° | power1.out |
| Flip | 120–700 ms | p goes 0 → 0.97 | cubic-bezier(0.7, 0, 0.2, 1) |
| Settle | 700–900 ms | Overshoots 3°, settles against the back | spring, stiffness 260, damping 22 |
| Calendar reaction | 640–1000 ms | Calendar body dips 3 px and tilts −0.6°, springs back | spring, stiffness 300, damping 18 |
| Ink settle | 700–1000 ms | New big date de-blurs 4 → 0 px; tracking −6% → −4% | power3.out |
| Circle draw | 820–1270 ms | Gold ellipse around the tag draws in (stroke-dashoffset 100% → 0) | power2.out |
| Dust | 700–1300 ms | 12 gold dust specks puff from the bottom edge and fade | power2.out |

Scroll behaviour:

- In each chapter's scroll segment, the flip is scrubbed between 15% and 65% of the segment
  (scrub: 0.6). Anticipation, settle and the reactions play as time-based follow-ups once p
  crosses 0.97.
- Reverse: scrolling up runs the curl backward. The page comes back over the rings and lands on
  the front, covering the newer chapter.
- Riffle: when one gesture crosses 2 or more chapters, or scroll speed exceeds 2,500 px/s, the
  intermediate pages flip in 140 ms each with a 60 ms stagger and half the curl, like thumbing
  through. Only the final page plays the full settle.
- Never show two pages mid-flip with conflicting content; queue flips and collapse extra ones
  into the riffle.

Fallbacks:

- No WebGL: CSS 3D with the page split into 10 horizontal strips, `transform-origin: top`, strip
  k rotated p·196° + 22°·sin(π·p)·(k/10)², with a gradient overlay for shading.
- Reduced motion: no flip. Crossfade the page text in 200 ms and draw the circle instantly.

## Scroll choreography

The scene is pinned for 9 segments of 100vh each; scrolling scrubs one master timeline, and the
page snaps to the nearest chapter when the visitor stops.

Setup:

- Smooth scrolling with Lenis: `lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4`, synced
  to GSAP's ticker.
- One GSAP ScrollTrigger pins the scene: `start: "top top"`, `end: "+=" + 8 * innerHeight`
  (8 transitions between 9 chapters), `scrub: 0.6`.
- The master timeline holds 8 labelled transitions (ch1→ch2 … ch8→ch9), each 1 unit long, built
  from the same function with that pair's data.
- Snap: `snap: { snapTo: "labelsDirectional", duration: { min: 0.35, max: 0.9 }, delay: 0.12,
  ease: "power3.inOut" }`. A visitor can never rest half-way through a flip.

Inside one transition (percent of the 100vh segment):

| Scroll % | Calendar | Dial | Polaroids | Card | Timeline and map |
| --- | --- | --- | --- | --- | --- |
| 0–15 | At rest; corner lifts 0 → 6° as an affordance | Still | Idle float | Still | Still |
| 15–65 | Page flips (p 0 → 1) | Tiles slide one step along the ellipse; the new tile lifts and glows from 50% | Orbit one slot clockwise; the new top-right slides in from behind the calendar | 35–50% old content wipes out; 50–65% new content builds in | Gold fill grows down the line; pin travels along the path |
| 65–100 | Settle, circle draw, ink settle | Pointer bounces under the new tile | Settle with spring | Chips pop in | Active dot pulses once |

Velocity and feel:

- Read `ScrollTrigger.getVelocity()` each frame and smooth it (v = v·0.85 + raw·0.15).
- Speed effects, capped at 2,000 px/s: polaroids skew up to 4° and gain up to 3 px motion blur;
  orbit sparks speed up to 3×; floating background pages drift up to 2× faster; the vignette
  tightens by 8%.
- Riffle mode for fast multi-chapter scrolls.
- A single wheel notch must never skip a chapter: snapping resolves to the next label in the
  scroll direction.

Other inputs:

- Keyboard: ↓, →, Page Down and Space go to the next chapter; ↑, ←, Page Up and Shift+Space go
  back. Each tweens the scroll position to that label over 1.1 s, power3.inOut, which plays the
  same scrubbed animation.
- Clicks: dial chevrons, dial tiles, timeline stops, map points and "Explore the Journey" all
  tween the scroll to the target label. A jump of several chapters triggers the riffle.
- Touch: native momentum with snapping. Add swipe-left and swipe-right on the dial for the next
  and previous chapter.
- Hash: update `location.hash` to `#ch-<slug>` when a chapter settles (history.replaceState, no
  new history entries).
- Leaving the pin: after Chapter 09, keep scrolling for 100vh more to play the finale page flip
  ("Your date?"), then unpin into the footer.

Scroll progress UI: a 2 px gold bar on the right timeline line shows overall progress (0–100%)
and moves continuously, not per chapter.

## Supporting animations

Every moving part answers the calendar: one shared motion language of weighty paper, springy gold
and slow atmosphere.

Motion language:

- Paper (calendar, polaroids, card, map): springs with stiffness 220–300 and damping 18–24, small
  overshoot, never bouncy.
- Gold UI (pills, tiles, dots, pin): quick power3.out in 250–400 ms, with a glow pulse instead of
  scaling.
- Atmosphere (bokeh, floating pages, orbit sparks, grain): slow loops of 8–30 s, sine.inOut,
  always running and never synced to each other.

Loader: a small tent calendar outline in the centre riffles through K–5, 2021, 6–8 … Now, one
page every 180 ms, with a thin gold progress line under it showing real asset progress. At 100%
the loader page flips away using the same curl as the hero flip, revealing the dark scene.

Opening sequence (2.4 s, once per session, skippable by any scroll or key):

| Time | Animation |
| --- | --- |
| 0–600 ms | Backdrop fades from black; bokeh lights blink on in random order over 500 ms |
| 200–900 ms | Calendar drops 80 px onto the dial with a heavy spring (stiffness 180, damping 16); the dial ring flashes gold on contact |
| 500–1100 ms | Orbit line draws around the calendar (stroke-dashoffset); sparks ignite one by one |
| 700–1300 ms | Polaroids fly in from off-screen along curved paths, rotating into their slots, staggered 120 ms |
| 900–1500 ms | Headline lines rise from a mask, stagger 90 ms; script "Time." writes itself (SVG stroke reveal, 700 ms), then the swoosh draws |
| 1200–1800 ms | Milestone card slides in from the right 40 px with a fade; timeline stops pop in top to bottom, stagger 40 ms |
| 1500–2400 ms | Parchment map unrolls left to right (clip-path reveal); dashed path draws; pin drops into point 0 with a bounce; flag waves once |

Dial:

- Tiles are positioned on the ellipse by angle, not by a rotating group: tile j sits at
  angle = 90° − (j − active)·24°. Animate active as a float so tiles glide along the curve.
- Scale tiles by depth (0.72 + 0.28·sin(angle)), rotate them to the ellipse tangent, and fade
  those beyond ±3 steps.
- The active tile lifts 6 px, swaps to the gold gradient and gains a 24 px gold glow. The pointer
  under it bounces 4 px when a chapter settles.
- Hover a tile: it lifts 3 px and shows its chapter title in a small tooltip.

Polaroids:

- Move them along the orbit ellipse by parameter, not straight lines, so they visibly travel
  around the calendar. Each slot has a fixed angle on the ellipse.
- The polaroid entering from behind starts at scale 0.5 and opacity 0 behind the calendar, then
  swings out. The one leaving tucks behind it.
- Idle float: each polaroid bobs 4–6 px and rotates ±1.5° on its own 5–7 s loop.
- Mouse parallax: polaroids shift up to 12 px against the pointer, the calendar 4 px, the
  backdrop 2 px, all smoothed with a lerp of 0.08.
- Hover a polaroid: it straightens to 0°, scales to 1.06 and its shadow deepens. Click opens that
  chapter's detail page.

Milestone card swap:

- Old content leaves upward, line by line (8 px up, fade), stagger 25 ms, 220 ms total.
- The image or title area gets a paper-wipe: a cream gradient sweeps across left to right in 260 ms.
- New content rises in with the same stagger. Tag chips pop in last (scale 0.9 → 1, spring).
- The card itself tilts −1° and springs back as if a page were laid on it.

Right timeline:

- A gold fill line grows from the first stop to the active stop, scrubbed with scroll.
- The active dot grows 9 → 20 px with a ripple ring that expands and fades once (600 ms). Its
  label slides 6 px right and turns gold.

Key Chapters map:

- The pin moves along the dashed SVG path using GSAP MotionPathPlugin, scrubbed with scroll,
  tilting with the path direction.
- Path segments behind the pin turn solid gold; segments ahead stay dashed and brown.
- The milestone icon at the pin glows briefly on arrival. The flag waves continuously (a 3-point
  SVG path morph, 2.4 s loop).

Background:

- Floating pages: 8–12 blurred torn pages drift diagonally and tumble (rotateX, rotateY) on
  14–30 s loops at three depths. The nearest layer is the most blurred.
- Bokeh: 20 soft gold circles slowly breathe in opacity (0.3–0.8) on random 4–9 s loops.
- Grain: an animated noise texture shifted every 80 ms at 3% opacity.

Micro-interactions:

- Custom cursor: a 10 px gold dot plus a 36 px ring that trails with a lerp of 0.18. Over
  interactive items the ring grows to 56 px and shows a label ("Flip", "Open", "Drag"). Hidden on
  touch devices.
- Magnetic buttons: pills pull up to 6 px toward the cursor within 60 px, springing back on leave.
- Optional sound (muted by default, toggle in the nav): a paper flip per page, a soft tick for
  dial steps, and a low room tone. The site never autoplays sound.

## Inner pages UI

Inner pages keep the same night-and-gold world but switch to calm, readable layouts on a
12-column grid (1200 px max, 24 px gutters). The calendar page is the thread that ties every
transition together.

- Page transition (all routes): the current view is covered by a paper sheet that flips down from
  the top, using the same curl as the hero flip (700 ms). The new route loads behind it, then the
  sheet flips away upward. When the destination is a chapter detail, the sheet is that chapter's
  calendar page.
- Chapter detail `/journey/[slug]`: shared-element transition from the milestone card's View
  Details (the calendar page grows into the page header; spring stiffness 220, damping 26).
  Header (full width, 60vh): the large calendar page on the left with the month, the big date and
  the circled tag; on the right the kicker "Chapter 04 of 09", the title at 64 px, the date and
  place rows, and the tags. Story: the description in an 18 px, 640 px-wide column; leave clearly
  marked empty slots for longer text Shreyas will add. Image: the chapter image as a large
  polaroid, tilted 3°, with a slow parallax. Footer: previous and next chapter cards that look like
  the neighbouring calendar pages, peeking with a curled corner; "Back to the journey" returns to
  the exact scroll position with a reverse flip.
- Projects `/projects`: a corkboard of project pages pinned to the dark scene: Oncure (2026
  research proposal) and the stock trading finance app (in progress). Each is a large polaroid with
  a gold pin, title, status chip and one line. Hover lifts, straightens and drops the shadow lower.
  Cards fall from above and pin with a small spring, staggered 120 ms. One dashed "Next project"
  slot as the empty state.
- Project detail `/projects/[slug]`: hero image, a one-line summary, then sections for problem,
  approach, current status and tools — only sections that have real content. Oncure carries "A
  research proposal — a concept, not a cure." near the top.
- About `/about`: portrait slot (placeholder until a photo is supplied) in a polaroid frame; a
  short bio, school, interests and a compact timeline of the 9 chapters reusing the dial tile
  style. Clicking a tile opens that chapter's detail.
- Contact `/contact`: "Book a date with the next chapter." A month-view calendar on the left;
  picking a day stamps a gold circle with the circle-draw animation. A short form on the right
  (name, email, message, "Send ↗"). On submit, the form folds into a paper note and slides into an
  envelope, then shows "Sent. Talk soon." Show Shreyas's email only once it is supplied.
- 404: a torn calendar page reading "This date doesn't exist." with a "Back to the journey" pill.
  The torn edge flutters gently.
- Footer (after the finale): the script logo, the nav links, "Let's Talk ↗", and a small
  "© 2026 Shreyas Ballari" line.

## Tech stack, structure and data

Next.js + TypeScript, GSAP (ScrollTrigger, MotionPathPlugin), React Three Fiber only for the paper
curl, Framer Motion for route and UI transitions, Lenis. **If the repo already uses another
framework, keep it and map these parts onto it.** (This repo: Vite + React 19 + vite-react-ssg +
React Router; see journey-plan.md.)

```ts
export type Chapter = {
  slug: string;            // "2023-young-authors"
  label: string;           // dial and timeline label: "2023"
  timelineSub: string;     // "Young Authors"
  page: { month: string; big: string; circled: string }; // calendar page text
  title: string;
  date: string;
  place: string;
  description: string;
  tags: string[];
  image: string;           // /assets/journey/writing.webp
  polaroidCaption: string;
  mapPosition: number;     // 0–5, fractions allowed
  verified: boolean;       // false where the year is still a label
};
```

All scene parts read the active chapter and a continuous progress value (0–8) from one store, so
nothing keeps its own copy of the state.

## Responsive, accessibility and performance

| Width | Layout |
| --- | --- |
| ≥ 1280 px | Full composition as specified |
| 900–1279 px | Hero copy shrinks to 40 px; right timeline becomes dots only; polaroids drop to two slots |
| 600–899 px | Calendar centred at the top; dial below it; milestone card becomes a bottom sheet; map and timeline hidden; a horizontal chapter pill row replaces them |
| < 600 px | Calendar at 80vw; no polaroids or orbit; card as a bottom sheet with 15 px body text; swipe and snap per chapter; floating pages limited to 3 |

Accessibility:

- Every chapter is also present as real HTML: an `<ol>` of 9 `<article>`s with headings. The
  visual scene is aria-hidden, and the active article is announced through an aria-live="polite"
  region.
- All controls are buttons or links with visible gold focus rings (2 px, 3 px offset) and
  accessible names ("Go to chapter 4: Young Authors Winner").
- Text on paper meets 4.5:1 contrast; gold text never sits on paper.
- Reduced motion: no Lenis, no pinning longer than one screen, no flip (200 ms crossfade instead),
  no parallax, no floating pages, no cursor trail. Snapping still works, as instant jumps.
- A "Skip intro" link is the first focusable element, and the opening sequence never blocks input.

Performance budgets:

- 60 fps on a 2020 MacBook Air (Chrome) and a Pixel 6a; no long tasks over 50 ms while scrolling.
- LCP under 2.5 s on 4G; CLS under 0.05.
- JavaScript under 220 KB gzipped on first load, excluding Three.js, which is lazy-loaded after
  the opening sequence. Until it loads, the CSS-strip flip is used.
- Animate only transform and opacity in the DOM; use will-change only during a transition.
- Images: backdrop at most 220 KB, calendar render at most 180 KB, chapter images at most 60 KB
  each; preload the backdrop and calendar.
- Pause all loops when the tab is hidden or the scene is off-screen; dispose of WebGL resources on
  route change.

## Figma references

- File: Portfolio (key `GkTL27JiFuNy16KAPRPAiO`), page "Shreyas · Journey Calendar (portfolio)".
- Build from frames J01–J09 ("J01 · Journey Through Time · K–5" … "J09 · Journey Through Time ·
  Now"), each one chapter state at 1440 × 900.
- Ignore the S01–S03 splash frames, the C01–C10 yellow calendar version, and the T and TT Time
  Travel versions.

| Figma layer | Use in code |
| --- | --- |
| Cinematic backdrop (AI) | Backdrop image |
| Desk calendar (AI render) | Calendar body image under the WebGL page |
| Cal · month, Cal · big, Cal · circled, Cal · circle | Calendar page text positions and sizes |
| Tile · <label> | Dial tile positions per state |
| Polaroid · <label> | Slot positions and rotations |
| Milestone card | Card layout, spacing and type |
| Timeline item · <label> | Timeline spacing and active style |
| Paper map (AI render), Key Chapters sign, Map path, Map pin, Flag | Map composition and pin positions |
| Nav · active pill, CTA · Explore the Journey | Button styles |

| Figma layer (Assets page) | Save as |
| --- | --- |
| HQ · journey bg | backdrop |
| HQ · journey cal | calendar-render |
| HQ · journey paper | parchment-map |
| Prop · backpack | backpack |
| Prop · medical | medical |
| Prop · arrow | arrow |
| Image · writing | writing |
| Prop · trophy | trophy |
| Prop · academy | academy |
| Image · tutor | tutor |
| Image · oncure | oncure |
| Image · trading | trading |

These images are AI renders. Mark them as placeholders in the code, and replace them with real
photos or licensed art before launch.
