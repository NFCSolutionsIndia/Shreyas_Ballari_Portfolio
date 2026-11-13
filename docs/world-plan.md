# "My World" — implementation plan

Replaces the **Time Travel** tab (renamed **My World**). The previous Time Travel tab is backed up
in `C:\SHREYAS_BALLARI_PORTFOLIO_backups\v13-time-travel-2026-11-09`. Reference breakdown:
[world-reference.md](world-reference.md). Brief: the "recreate the complete Sébastien Lempens
experience" master prompt (2026-11-09), adapted to the Time Travel calendar concept from the
earlier brief where they agree (a giant calendar clock tower is the landmark that ties the world to
"every moment has a story").

## Existing project (Phase B)

- Vite 6 + React 19 + vite-react-ssg + React Router 6; Tailwind 4 + per-tab CSS files.
- Already installed and reused: `three` 0.187, `@react-three/fiber` 9, `@react-three/drei` 10,
  `gsap` 3.15 (ScrollTrigger), `lenis` (global smooth scroll provider). No new dependencies needed
  for Phases D–F. Framer Motion is not installed; DOM transitions use GSAP/CSS.
- Reused assets: the rigged Shreyas character `public/models/shreyas.glb` (idle, walking, talking,
  waving, pointing; built in Blender from `C:\SHREYAS_BALLARI_PORTFOLIO_assets\avatar`), the
  procedural ambient sound (`portfolios/room/ambient.ts`), the verified content
  (`content/portfolio.ts`, `content/journeyChapters.ts`).
- Blender 5.2 is installed (`C:\Program Files\Blender Foundation\Blender 5.2\blender.exe`) with a
  scripted export pipeline already used for the character.

## Original world (what replaces the reference's places)

| Reference | Ours |
| --- | --- |
| River in Paris at sunset, bridge, tower, Ferris wheel | A river through Shreyas's town at sunset: arched footbridge, a **calendar clock tower** (giant clock + day/month drums), a domed science lab and a school, low-poly town blocks |
| Plaza, benches, lamp posts | Town square with benches, lamp posts, trees |
| Character with a scooter | Shreyas (existing rigged model) with a **bicycle** (new Blender asset) |
| Giant "MY WORK" pixel letters, skills appear | Giant voxel letters "MY WORK" by the road; verified fields appear one by one: Research · Biomedical science · Artificial intelligence · Nanotechnology · Peer tutoring · Writing |
| Golden statue with a wreath | A golden statue of a scholar holding a book aloft (achievements: PSAT 1280/1440, Young Authors 2023, Mini-Medical School 2021) |
| Project panels above the clouds | Panels above the clouds: Oncure (research proposal) and the stock trading app (in progress), plus the achievement chapters; each opens a detail view in-world |
| Old-town square, "IN TOUCH", window into a room | A quiet street at dusk, giant voxel "SAY HELLO", camera flies through a lit window into Shreyas's study (desk, calendar on the wall, books), then loops to the river; the contact form link lives there |

Loader: Shreyas rides the bicycle on the spot in front of a grey town silhouette with a real
progress counter (three's loading manager). Start screen: "Every moment has a story — Enter the
journey", sound suggestion.

## Architecture

```
src/portfolios/world/
  WorldPortfolio.tsx          tab entry: DOM chrome (loader, start, menu, sound, panels, a11y list)
  data/worldData.ts           all text and content (name, about, fields, projects, contact) — no 3D code
  three/Experience.tsx        Canvas, lazy-loaded; quality tiers
  three/scenes/*.tsx          River, Square, Road, Statue, Sky, Study (each a group placed along the path)
  three/objects/*.tsx         Bicycle, ClockTower, VoxelText, Buildings (instanced), Trees, Lamps, Water
  three/camera/cameraPath.ts  keyframed camera rig: position, look-at, fov per scroll stop
  three/camera/CameraRig.tsx  damped follow of the scroll-driven keyframes + mouse look
  animations/scrollTimeline.ts  ScrollTrigger: pinned scroll length → progress 0–1
  hooks/useDeviceTier.ts      desktop / tablet / mobile / no-WebGL
```

## Phases (each ends with a browser check and a comparison against the reference)

- **D — Opening environment**: lazy Canvas, sunset grade, river with reflective water, embankment,
  footbridge, calendar clock tower, town blocks (instanced), trees and lamps, 3D name text,
  letterbox, loader with real progress, start screen, mouse look.
- **E — Camera and scrolling**: the full camera path (river → square → Shreyas → ride → statue →
  sky → clouds → study → loop), scroll-scrubbed, reversible, damped; menu jumps.
- **F — Objects and interactions**: bicycle (Blender), Shreyas poses (stand, ride), voxel letters,
  statue, cloud deck, project panels with hover/click, study room.
- **G — Content**: worldData wired in; project detail views; contact.
- **H — Polish**: lighting, shadows, materials, sound design (ambient, transitions, clicks),
  typography.
- **I — Responsive**: tablet tuning; mobile simplified path with touch; reduced motion; no-WebGL
  fallback page with the same content.
- **J — Final verification** at 1440×900, 1366×768, 768×1024 and 390×844, side by side with the
  reference.

## Content rules

Only verified facts from `content/portfolio.ts` / `journeyChapters.ts`; unknown items are marked
"To be supplied"; no city, phone or email (contact goes through the form).

## Status

- [x] A — reference inspected (world-reference.md)
- [x] B — project inspected
- [x] C — plan (this file)
- [x] D — opening environment built and checked in the browser (2026-11-09): loader with real
  step progress (3D code, fonts, first scene), start screen with sound choice, letterbox, sunset
  sky, mirrored river, stone embankments and quays, instanced houses with windows and gabled roofs,
  lamps and trees, arched bridge, calendar clock tower (real time and today's date), domed lab,
  name title in the sky, mouse look, scroll pushes the camera down the river.
- [x] E/F/G — full journey built and checked in the browser (2026-11-09): one continuous world
  (three/path.ts holds every stop and the camera keyframes; scroll ↔ camera is a pure function,
  so scrolling back plays it in reverse). River → square with the clock tower and lab → Shreyas
  greets the visitor next to his bicycle (about card) → he gets on and rides the winding road
  (chase camera, pedalling, the six fields light up one by one, giant voxel "MY WORK" sign) →
  golden scholar statue (recognition card) → panels above pink clouds (Oncure, stock app, three
  achievements; hover lifts, click opens a detail sheet with "To be supplied" notes) → white-out
  dive → dusk street with voxel "SAY HELLO" → through the lit window into the study (calendar
  shows today) → contact card (Let's talk → /contact, Travel again → start). Menu (Home, About,
  Work, Projects, Contact) jumps along the path; scroll is locked until the visitor enters.
  Sky, haze and light shift from sunset to dusk; the shadow box follows the camera.
- [x] Round 2 (2026-11-09, family feedback): world rebuilt after Cumming, Georgia: lake with
  docks and sailboats, pine shores with lake houses, wooded ridge on the horizon, red-brick
  historic downtown with awnings, courthouse with clock + calendar cupola, water tower lettered
  CUMMING, country road through the pines with farmhouses, suburban home street at dusk.
  New stylised avatar built in code (Avatar.tsx) with two-bone IK: feet locked to the pedals,
  hands on the bars, cadence from distance, bike leans into bends, right-hand lane. Full screen
  (letterbox removed). Location label per scene. About + journey cards (city, school, schools,
  interests, roles). Contact card: name, city, phone (approved), email/links "To be supplied".
  Oncure detail sheet has a 5-step animated explainer (OncureExplainer.tsx); `?project=oncure`
  deep-links to it. Study rebuilt: motto banner, framed PSAT / Young Authors / Mini-Med, journey
  pinboard, Oncure poster, laptop with the stock app, microscope, books, globe, fairy lights.
  Checked headless at 1440×900 and 390×844.
- [ ] H — polish: sound cues per scene, finer rider animation, more street detail
- [ ] I — responsive QA at 768×1024 and 390×844 (mobile overlays are in place, not yet checked)
- [ ] J — final side-by-side verification
