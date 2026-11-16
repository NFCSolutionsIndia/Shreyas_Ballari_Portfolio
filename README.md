# Shreyas Ballari: Portfolio Website

The portfolio website of Shreyas Ballari, a junior at Fulton Science Academy.

**Live site:** https://yarnaveen.github.io/Shreyas_Ballari_Portfolio/

The site has three looks. Visitors switch between them with the tab bar at the bottom:

| Tab | What it is |
| --- | --- |
| **Creative** (opens first) | A still 3D living room with glass app windows in front of it, voice control and hand control |
| **Studio** | A folding phone: it unfolds as you scroll, and his whole story scrolls inside its screen |
| **Classic** | A scroll film: the hero turns into a card, then Oncure, the trading app, awards and skills |

---

## The folders

```
SHREYAS_BALLARI_PORTFOLIO/
│
├── src/                      ALL THE CODE
│   ├── content/
│   │   └── portfolio.ts      ★ The words on the site (school, awards, Oncure, skills …)
│   ├── portfolios/
│   │   ├── creative/         ★ Creative tab
│   │   ├── studio/           ★ Studio tab
│   │   ├── classic/          ★ Classic tab
│   │   └── switcher/         The tab bar at the bottom
│   ├── pages/                One file per web address (HomePage shows the tabs)
│   ├── features/             Shared by the tabs: hand control, voice, and details/
│   │                         (the full Oncure and trading app details, "View more")
│   ├── app/, components/,    Small shared parts: page frame, error pages, buttons,
│   │   hooks/, lib/, styles/   smooth scrolling, colours and text styles
│   ├── main.tsx              Where the site starts
│   └── routes.tsx            Which page opens for which address
│
├── public/                   PICTURES, VIDEO, 3D MODELS (served as they are)
│   └── assets/
│       ├── shreyas/          Photos of Shreyas
│       ├── videos/           oncure.mp4
│       ├── certificates/     Put real certificate scans here
│       ├── journey/          Placeholder pictures (replace with real ones)
│       └── house/            Furniture and textures for the 3D house
│
├── docs/                     The guide (start with docs/1-how-it-works.md)
├── tests/                    Automatic checks
├── scripts/list-assets.mjs   Lists every picture and video and where it is used
├── .github/workflows/        Publishes the site when you push to GitHub
├── index.html                The single HTML page that React fills in
├── package.json              The list of libraries and the commands below
└── vite.config.ts            Build settings
```

Everything else at the top (`.gitignore`, `tsconfig.json`, `pnpm-lock.yaml`, `.prettierrc` …) is
settings for the tools. You rarely need to open them. Never edit `node_modules/` or `dist/`:
they are made automatically.

## I want to change …

| I want to change … | Open this |
| --- | --- |
| A fact: school, course, award, score | `src/content/portfolio.ts` |
| Which tab opens first, or the tab names | `src/portfolios/switcher/usePortfolioChoice.ts` |
| His photo | Replace the file in `public/assets/shreyas/` (same name) |
| The Oncure video | Replace `public/assets/videos/oncure.mp4` |
| A certificate picture | Add `public/assets/certificates/<award id>.jpg` |
| Creative: the dashboard cards | `src/portfolios/creative/spatial/os/Dashboard.tsx` |
| Creative: the house tour text | `src/portfolios/creative/spatial/story/tour.ts` |
| Creative: what voice commands do | `src/portfolios/creative/spatial/ui/commands.ts` |
| Classic: the order and speed of the scroll film | `src/portfolios/classic/flow/timeline.ts` |
| Classic: the top menu bar | `src/portfolios/classic/flow/Dock.tsx` |
| Studio: the folding phone and the page inside it | `src/portfolios/studio/StudioPortfolio.tsx` |
| The full Oncure / trading app details ("View more") | `src/features/details/Details.tsx` |
| Where contact form messages go | `VITE_CONTACT_ENDPOINT` in `.env` (see docs/3) |

Can't find a sentence? In VS Code press **Ctrl + Shift + F** and search for a few of its words.

## Commands

You need [Node.js 22](https://nodejs.org) and pnpm (`npm install -g pnpm@9.15.0`). Then, in a
terminal in this folder:

```sh
pnpm install     # once: downloads the libraries
pnpm dev         # opens the site at http://localhost:5173 and updates as you save
pnpm assets      # lists every picture, video and model and where each is used
pnpm typecheck   # checks the code for mistakes
pnpm test        # runs the automatic checks
pnpm build       # makes the final site in dist/
```

To publish: `git add -A`, `git commit -m "what you changed"`, `git push`. GitHub builds and publishes
the site by itself in about 3 to 5 minutes.

## The guide

1. [How the website works](docs/1-how-it-works.md): the tools, and how each tab is built
2. [Change words, pictures and videos](docs/2-change-content.md)
3. [Publish online, and the privacy rules](docs/3-publish-and-privacy.md)

Tip: in VS Code, open any `.md` file and press **Ctrl + Shift + V** to read it formatted.

## Rules that always apply

- Shreyas is a minor. Never put his email, phone number, home address, home town, ZIP code,
  birth date or schedule anywhere in this project.
- Never invent facts. Sample content is labelled as a concept or sample data.
- Oncure is a conceptual research proposal, not an existing or clinically validated treatment.
- The trading app shows hypothetical sample data and is not financial advice.
