# Shreyas Ballari — Portfolio

Monorepo for the portfolio website, its API and shared code.

| Path                | What                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `apps/web`          | React 19 + Vite site, pre-rendered to static HTML (vite-react-ssg); admin panel at `/admin` |
| `apps/api`          | Node.js + Express + Prisma API (not started yet)                                            |
| `packages/shared`   | Types, Zod schemas and constants used by web and API                                        |
| `packages/tsconfig` | Base TypeScript configs                                                                     |
| `docs/adr`          | Architecture decisions                                                                      |

## Setup

Needs Node 22+ and pnpm 9.15.0. Turbo (which `npm run dev` / `pnpm dev` use) looks for the
`pnpm` binary and fails with "Unable to find package manager binary" without it, so install it
once per machine:

```sh
npm install -g pnpm@9.15.0   # no admin rights needed
```

Then, from the project root (`npm run dev` works too):

```sh
pnpm install
cp .env.example .env
pnpm dev          # web on http://localhost:5173
pnpm test         # unit + component tests
pnpm build        # static HTML for every public route in apps/web/dist
```

`pnpm typecheck` and `pnpm format:check` run the same checks CI will.

## Choosing a portfolio

The home page currently offers five styles behind a tab bar at the top, so the family can
compare them. Links can open a specific one: `/?style=classic`, `/?style=creative`, `/?style=studio`, `/?style=desk`, `/?style=travel`.

| Style   | Folder                              | Notes                                                                 |
| ------- | ----------------------------------- | --------------------------------------------------------------------- |
| Classic | `apps/web/src/portfolios/classic/`  | Dark studio style: counter intro, scroll motion, optional hand gestures |
| Creative | `apps/web/src/portfolios/creative/` | Lemon page with an octagon clock whose letters spell PORTFOLIO; click a letter for that story |
| Time Travel | `apps/web/src/portfolios/travel/` | Full-screen cinematic journey after the "Shreyas · Journey Calendar" Figma board: portal, tunnel, 8 chapter gates, future doorway (art in `public/travel/`) |
| Studio  | `apps/web/src/portfolios/agents/`   | A page that builds itself: named agent cursors build every block live |
| 3D Desk | `apps/web/src/portfolios/room/`     | 3D room with Shreyas as a guide (three.js, models in `public/models`) |

Studio plays its build on first load; a deliberate scroll hands control to the visitor, and
`/?style=studio&play` keeps it playing. The 3D characters are built in Blender from
`C:\SHREYAS_BALLARI_PORTFOLIO_assets\avatar` (see the README there).

### Classic style

Dark studio layout (Manrope and Geist Mono, one orange accent `#f45212`, film grain). A 000 to 100
counter intro plays on every load (skipped under reduced motion), then the hero slides in. Scroll
motion uses GSAP ScrollTrigger on the site's Lenis scroll: masked heading reveals, blur fade ins,
count ups, the pill gallery, the word by word tagline and the split Projects heading. The giant name in
the hero and footer is drawn through a small WebGL2 fluid simulation (`classic/liquid.ts`) that
the cursor stirs; without WebGL2 or under reduced motion the plain text shows instead. Dark and
light themes switch from the nav (remembered in `localStorage` as `cs-theme`). Awards live in
`classic/Awards.tsx`: a gauge, medal, certificate and 1 in 100 grid that play through on their
own. The style
switcher sits at the bottom on this style so it doesn't cover the nav. Previous version:
`C:\SHREYAS_BALLARI_PORTFOLIO_backups\v8-classic-before-studio-2026-11-05`.

### Hand gestures (Classic)

"Explore with Hand Gestures" (bottom left) turns on the webcam only after the visitor agrees.
Tracking uses MediaPipe Hand Landmarker (`@mediapipe/tasks-vision`) entirely in the browser:
no video is stored or sent anywhere. The WebAssembly runtime is served from
`apps/web/public/mediapipe/wasm/` (copied from `node_modules/@mediapipe/tasks-vision/wasm`;
copy again after upgrading the package). The hand model (~7.5 MB) is fetched from Google's
MediaPipe model storage the first time the camera is turned on.

| Gesture                         | Action                                        |
| ------------------------------- | --------------------------------------------- |
| Open palm                       | Turns gesture navigation on, or resumes       |
| Move open hand down / up        | Next / previous section (once per movement)   |
| Move open hand right / left     | Also next / previous section                  |
| Rest the cursor on a button     | A ring fills for about a second, then clicks  |
| Pinch and move                  | Grabs the page and stretches it like rubber (other fingers can be curled; works without an open palm first) |
| Open the hand after a pinch     | Lets go: the page springs back exactly        |
| Closed fist                     | Pauses                                        |
| Hold open palm still            | Shows the gesture guide                       |

The camera prompt opens by itself once per visit on laptops and desktops; the camera only
starts if the visitor chooses "Turn on camera".

The panel's pinch meter fills as thumb and index come together and turns yellow when the page is
grabbed. To try the stretch without a camera, hold Shift and drag with the mouse.

The rubber page (`features/gestures/rubber/`) bends the live page with an SVG displacement
filter on the root element while it is held, and removes it when the page comes to rest, so
nothing is ever moved or replaced. The code is in `apps/web/src/features/gestures/` (geometry,
smoothing, recogniser, camera engine, rubber page, UI); `apps/web/tests/gestures.test.ts` covers the recogniser. Mouse, keyboard
(`[` and `]`), touch and the nav links all work without the camera. On phones the
button explains that gestures need a laptop or desktop webcam.

Once one is chosen:

1. In `apps/web/src/pages/HomePage.tsx`, render only the chosen portfolio and remove the
   `PortfolioSwitcher` and `usePortfolioChoice` lines.
2. Delete `apps/web/src/portfolios/switcher/` and the folders of the two styles not chosen.
   Studio uses the illustrative photos in `portfolios/room/photos.ts`: move that file into
   `portfolios/agents/` if the room is removed.
3. If both Studio and Classic are removed, remove `@fontsource/instrument-serif`,
   `@fontsource-variable/geist` and `@fontsource-variable/geist-mono`. If Classic is removed,
   also remove `apps/web/src/features/gestures/`, `apps/web/tests/gestures.test.ts`,
   `apps/web/public/mediapipe/`, `gsap` and `@mediapipe/tasks-vision` (and their
   `optimizeDeps` entries). If the 3D Desk is removed, remove
   `@fontsource/schibsted-grotesk`, `three`,
   `@react-three/fiber`, `@react-three/drei`, `public/models/`, and the three.js entries in
   `vite.config.ts` `optimizeDeps`.
4. Run `pnpm typecheck && pnpm build`.

## Editing content

All home-page text lives in [`apps/web/src/content/portfolio.ts`](apps/web/src/content/portfolio.ts).
Values wrapped in `placeholder(...)` render with a visible "To be supplied" tag; `draft(...)` is
wording written around confirmed facts that Shreyas should approve. Add photos by setting the
`portrait` / `images` fields. The design reference notes are in
[`docs/reference-analysis.md`](docs/reference-analysis.md).

## Privacy rules

Shreyas is a minor. Never commit or publish his phone number, email address, home city, ZIP,
birth date or schedule; not in seed data, fixtures, screenshots, docs or commit messages.
The public site shows only name, school, state and his work.
