# Journey Through Time — implementation plan

Brief: [journey-brief.md](journey-brief.md). Built as the **Creative** tab of the home page
(`/?style=creative`); the previous Creative tab (the portfolio clock) is backed up in
`C:\SHREYAS_BALLARI_PORTFOLIO_backups\v11-creative-clock-2026-11-09`.

## Repo audit (2026-11-09)

| Brief asks for | This repo has | Decision |
| --- | --- | --- |
| Next.js App Router | Vite 6 + React 19 + vite-react-ssg (static pre-render) + React Router 6 | Keep (brief: "keep it and map these parts onto it") |
| CSS Modules / Tailwind | Tailwind 4 + plain CSS files per portfolio | Plain CSS file for the scene, tokens as custom properties |
| Lenis | `lenis` 1.3, global provider in `app/providers/SmoothScroll.tsx` | Reuse; tune to the brief's values for this tab in Phase 2 |
| GSAP + ScrollTrigger + MotionPathPlugin | `gsap` 3.15 (plugins ship inside the package) | Use |
| React Three Fiber | `three`, `@react-three/fiber`, `drei` installed | Use for the page curl (Phase 3), lazy-loaded |
| Framer Motion | not installed | Phase 5 needs a decision: add it, or do route transitions with GSAP |
| next/font | — | Google Fonts stylesheet (Plus Jakarta Sans, DM Serif Display, Kaushan Script, Caveat) |
| next/image, WebP | no WebP encoder on this machine | JPEG within the brief's byte budgets (backdrop 95 KB, calendar 76 KB, chapters 13–27 KB) |
| Routes `/journey/:slug`, `/projects`, `/about`, `/contact`, 404 | `/projects`, `/projects/:slug`, `/about`, `/contact`, `/research/:slug`, `*` already exist for the whole site | Phase 5 decision (see below) |

Assets: `apps/web/public/assets/journey/*.placeholder.jpg`, exported from the Figma "Assets" page
(AI renders: replace with real photos or licensed art before launch).

## Phases

Each phase ends with a browser check against its acceptance items, then a stop for approval.

1. **Static scene and data** — typed chapter data; tokens and fonts; the 1440×900 composition
   scaled to the viewport with every layer from the J frames (backdrop, vignettes, orbit, dial
   with tiles on the ellipse, parchment map with path/points/pin/flag, calendar render with page
   text, three polaroid slots, nav, hero, milestone card, timeline, scroll hint); one store with
   `progress` (0–8 float) that every part reads; chevrons, tiles, timeline stops, map points and
   keys change chapter (eased, not scroll-driven yet); hash `#ch-<slug>`; accessible chapter list
   with aria-live.
2. **Scroll choreography** — pinned ScrollTrigger over 8 × 100vh, master timeline with 8 labelled
   transitions, `labelsDirectional` snapping, Lenis tuned per brief, keyboard/click tween to
   labels, per-transition timing table for dial, polaroids (along the orbit), card swap, timeline
   fill, MotionPath pin; velocity effects; progress bar.
3. **Calendar page curl** — R3F canvas over the blank page, canvas page textures, curl vertex
   shader, shadows/specular, settle and reactions, riffle for multi-chapter jumps, CSS 10-strip
   fallback, reduced-motion crossfade.
4. **Loader, opening sequence and atmosphere** — riffle loader with real progress, 2.4 s opening
   (skippable), floating pages, bokeh, grain, custom cursor, magnetic pills, optional sound,
   finale page "Your date?" and footer.
5. **Inner pages and transitions** — chapter detail, projects, project detail, about, contact,
   404, paper-sheet route transition. Needs a decision first: these routes already serve the whole
   site (Classic, Studio, 3D Desk, Time Travel link to them). Options: restyle the shared pages, or
   add Journey-only routes (e.g. `/journey/:slug`, and journey-styled variants).
6. **Responsive, accessibility and performance** — the four breakpoints, reduced-motion audit,
   keyboard/screen-reader pass, fps and bundle budgets.

## Content notes (to confirm with the family)

- Chapter 6 place: the brief says "Alpharetta, GA". The site's privacy rule publishes only the
  school and the state, never a city, so the build shows "Georgia" until the family says otherwise.
- Chapter 5 "Top 1% nationwide": the content file records top 1% for MAP & i-Ready as still to be
  confirmed, not for the PSAT. Shown as written in the brief, with `verified: false`.
- K–5, 6–8, 9–12 and the tutoring dates stay as labels (`verified: false`).

## Status

- [x] Phase 1 — built, waiting for review (2026-11-09)
  - Verified in the browser at 1536×695: composition matches J05 (calendar text, dial tiles on the
    ellipse with the gold active tile, three polaroid slots, card, timeline, map path/pin/flag,
    nav, hero); timeline stops and chevrons glide between states; `#ch-<slug>` deep links load the
    right chapter; typecheck, 29 tests and the static build pass.
  - Stand-ins until later phases: chapter changes are a 0.9 s eased glide (Phase 2 makes them
    scroll-scrubbed); one wheel notch = one chapter; page text crossfades (Phase 3 curl); View
    Details only links where a page exists (Oncure, Finance app) until Phase 5.
  - Not checked yet: narrow screens (Phase 6), screen reader pass (Phase 6).
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] Phase 6
