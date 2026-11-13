# 3. Folder map: where everything lives

Most of your time is spent in two places: **`apps/web/src/content/`** (the words) and
**`apps/web/src/portfolios/`** (the three tabs). Pictures and videos are in **`apps/web/public/assets/`**.

## The whole project

```
SHREYAS_BALLARI_PORTFOLIO/
│
├── README.md                  Front page: what this is and where to start
├── package.json               Project wide commands (pnpm dev, pnpm build, ...)
├── pnpm-lock.yaml             Exact library versions (made by pnpm, never edit)
├── pnpm-workspace.yaml        Tells pnpm which folders are parts of the project
├── turbo.json                 Runs commands in every part at once
├── .env.example               Example settings; copy to .env if you need to change one
├── .gitignore                 Files Git must never upload (for example the resume PDF)
│
├── .github/workflows/
│   └── pages.yml              Builds and publishes the site on every push to main
│
├── apps/
│   └── web/                   THE WEBSITE (details below)
│
├── packages/
│   ├── shared/                Types and rules shared by the site (and a future server)
│   └── tsconfig/              TypeScript settings shared by every part
│
└── docs/
    ├── guide/                 This guide, numbered in reading order
    ├── assets-list.md         Every image, video and model and where it is used (generated)
    ├── decisions/             Why big technical choices were made
    └── archive/               Old notes, old screenshots and the old Classic backup
```

## The website: `apps/web/`

```
apps/web/
├── index.html                 The one HTML file; React fills it in
├── vite.config.ts             Build settings
├── package.json               The site's libraries and commands
├── public/                    Files served exactly as they are (pictures, video, 3D models)
├── scripts/
│   └── list-assets.mjs        Lists every media file and where it is used (pnpm assets)
├── tests/                     Automatic tests (pnpm test)
└── src/                       ALL THE CODE (details below)
```

## The code: `apps/web/src/`

```
src/
├── main.tsx                   Starting point: starts React with the list of pages
├── routes.tsx                 Which page shows for which address
│
├── content/                   ★ THE WORDS. Edit these to change what the site says
│   ├── portfolio.ts           Profile, schools, courses, awards, Oncure, trading app, skills
│   └── photos.ts              Illustration photos used by Creative and Studio (with credits)
│
├── portfolios/                ★ THE THREE TABS
│   ├── classic/               Classic tab (see below)
│   ├── creative/              Creative tab: the 3D house
│   ├── studio/                Studio tab: the page that builds itself
│   ├── switcher/              The tab bar at the bottom of the screen
│   └── portfolios.css         Page background colour for each tab
│
├── pages/                     One file per address
│   ├── HomePage.tsx           "/" : shows the chosen tab
│   ├── PrivacyPage.tsx        "/privacy"
│   ├── AboutPage.tsx ...      Planned pages; they show a "coming soon" placeholder for now
│   └── admin/                 Planned admin area (not public, not indexed)
│
├── features/                  Abilities shared between tabs
│   ├── gestures/              Hand tracking with the webcam (only after the visitor agrees)
│   └── voice/                 The spoken guide (muted until the visitor turns it on)
│
├── app/                       The frame around every page
│   ├── layouts/               Page frames (public pages, admin)
│   ├── providers/             Smooth scrolling and other page wide helpers
│   └── error/                 Error page and "page not found"
│
├── components/                Small reusable parts
│   ├── ui/                    Button, Card, Badge, Input ...
│   ├── layout/                Container, Section, skip link
│   └── seo/                   Page title and sharing preview for search engines
│
├── styles/                    Site wide styles: colours (tokens.css), text styles, base CSS
├── hooks/                     Reusable React logic (smooth scroll to a section)
└── lib/                       Tiny helpers (site name, settings check, class names)
```

## Inside the Classic tab: `portfolios/classic/`

```
classic/
├── ClassicPortfolio.tsx       Puts the tab together: the intro, then the scroll film
├── intro/ArcIntro.tsx         The opening light arc that charges to 100%
├── hero/StageHero.tsx         The photo hero with the "Hey, I'm Shreyas" card
├── flow/                      ★ THE SCROLL FILM
│   ├── timeline.ts            When each chapter starts and ends (0 = top, 1 = end)
│   ├── Flow.tsx               The film: hero to card, education ring, sparkle, chapters
│   ├── Dock.tsx               The menu bar at the top (Work, Oncure, Awards, Resume ...)
│   ├── sequel.tsx             Oncure video, trading app, awards stack, technical skills
│   ├── FlowCanvas.tsx         The 3D layer: particle sphere, ribbons, chrome star
│   ├── fx.ts                  The animation loop and small motion helpers
│   └── *.css                  Styles for the film
├── about/, particles/         Older sections, hidden for now (switch: SHOW_SECTIONS)
└── classic.css, crt.css       Styles for the older sections
```

## Inside the Creative tab: `portfolios/creative/spatial/`

```
spatial/
├── SpatialPortfolio.tsx       Puts the tab together: headset intro, then the house
├── intro/                     The opening: a 3D headset you look into
├── house/                     The 3D house: one file per room (LivingRoom, Lab, Garden ...)
├── os/                        The glass app windows (Oncure, trading, awards, chat, games)
├── story/                     The guided house tour and its chapters
├── ui/                        Buttons and controls on top of the 3D scene, hand control
└── fun/                       Small extras: quiz, music player, cell game
```

## Inside the Studio tab: `portfolios/studio/`

```
studio/
├── StudioPortfolio.tsx        The page and its content blocks
├── engine.ts                  The "agents" that draw each block in turn
└── studio.css                 Styles
```

## Pictures, video and models: `apps/web/public/`

```
public/
├── assets/
│   ├── shreyas/               Photos of Shreyas (hero cut out, backdrop, portraits)
│   ├── videos/oncure.mp4      The Oncure film (plays in Classic and Creative)
│   ├── certificates/          Drop real certificate scans here (see the guide)
│   ├── journey/               Placeholder illustrations (replace with real photos)
│   └── house/                 Furniture, textures and sky for the 3D house (free, CC0)
├── models/apple_vision_pro.glb  The headset in the Creative intro
├── mediapipe/                 The hand tracking engine (do not edit)
└── favicon.svg                The little icon in the browser tab
```

## Files you should never edit by hand

| File or folder | Why |
| --- | --- |
| `node_modules/` | Downloaded libraries, rebuilt by `pnpm install` |
| `apps/web/dist/` | Build output, rebuilt by `pnpm build` |
| `pnpm-lock.yaml` | Updated by pnpm when libraries change |
| `docs/assets-list.md` | Made by `pnpm assets --write` |
| `public/mediapipe/` | Copied from the hand tracking library |

Next: [The three tabs explained](04-the-three-tabs.md)
