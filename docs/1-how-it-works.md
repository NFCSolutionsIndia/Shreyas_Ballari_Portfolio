# 1. How the website works

## From code to the live site

```
 You edit files in src/   →   pnpm build makes plain website files in dist/   →   GitHub publishes dist/
```

1. You write **React components** in TypeScript (`.tsx` files) and styles in CSS (`.css` files).
2. **Vite** (the build tool) turns them into plain HTML, CSS and JavaScript any browser can run.
3. On every `git push`, GitHub runs the build and puts the result on **GitHub Pages**.

## The tools

| Tool | What it does here |
| --- | --- |
| **TypeScript** | JavaScript that checks itself: mistakes show as red underlines while you type |
| **React** | Builds the page from small pieces called components |
| **Vite** | Runs `pnpm dev` and `pnpm build` |
| **three.js** (with React Three Fiber) | Draws the 3D: the house, the headset, the sparkle and particles |
| **Lenis** | Smooth scrolling |
| **pnpm** | Downloads the libraries listed in `package.json` into `node_modules/` |

## What happens when someone opens the site

1. The browser loads `index.html`, which starts `src/main.tsx`.
2. `src/routes.tsx` decides the page: the address `/` shows `src/pages/HomePage.tsx`.
3. `HomePage` shows the tab bar and one of the three tabs (Creative, Studio, Classic). Creative opens first; after that the
   site remembers the visitor's last tab. `?style=classic` in the address opens a given tab.
4. Every tab takes its words from `src/content/portfolio.ts` and its pictures from `public/assets/`.

## A component in one minute

```tsx
export function Hello() {
  return <h1 className="title">Hey, I’m {profile.firstName}</h1>;
}
```

- It looks like HTML, but it is TypeScript (called JSX). `{profile.firstName}` puts a value in.
- `className="title"` connects to a rule `.title { … }` in a CSS file.
- Other components use it like a tag: `<Hello />`.

---

## Creative tab: `src/portfolios/creative/spatial/`

| Folder or file | What it is |
| --- | --- |
| `SpatialPortfolio.tsx` | Puts the tab together: the headset intro, then the house and the apps |
| `intro/` | The opening: a 3D headset you look into |
| `house/` | The 3D house, one file per room (`LivingRoom.tsx`, `Lab.tsx`, `Garden.tsx` …) and the glowing points (`hotspots.ts`) |
| `os/` | The glass app windows: `Dashboard.tsx` (the cards), `Profile.tsx`, `OncureApp.tsx`, `Awards.tsx`, `Chat.tsx`, `Tour.tsx` (house tour), `games/` |
| `story/` | The list of apps (`chapters.ts`) and the house tour text (`tour.ts`) |
| `ui/` | Buttons on top of the 3D: `SpatialUI.tsx`, voice control (`VoiceControl.tsx`, `commands.ts`) and hand control (`Hands.tsx`) |
| `fun/` | The quiz, the music player and the cell game |
| `store.ts` | What is open right now (which app, the tour, the light …) |
| `*.css` | Styles. `os/vision.css` loads last; its "FINAL PASS" section at the end holds the phone layout |

**Voice and hands work the same way:** each asks first, explains what it does, and only then
turns on the microphone or camera. Nothing is recorded. Voice commands are matched in
`ui/commands.ts`; to add one, copy an existing `if (has('…')) { … }` block.

**On phones** the dashboard is one column (no clock or pinboard), each app is one full card that
scrolls as a whole, and the house tour shows the room first: a small bar names the room and the
details open only when you tap "About".

**Speed:** in vision mode (the apps) the camera stays in the living room, and the 3D view is
drawn only when something in it changes (the light at day, golden hour or night), so most of the
time it costs nothing. Only the living room and the garden load at first; the other rooms load
the first time the house tour opens (`house/House.tsx`), and the camera walks through them. Oncure, Awards, AI Chat and Games download the
first time they open. On lighter computers and phones (`?quality=low` forces this,
`?quality=high` turns it off) there are no shadows and the glass has no blur. `?perf` in the
address shows the renderer to the browser console for measuring.

## Classic tab: `src/portfolios/classic/`

```
classic/
├── ClassicPortfolio.tsx   The intro, then the film
├── intro/ArcIntro.tsx     The light arc that charges to 100%
├── hero/StageHero.tsx     The photo hero with the "Hey, I'm Shreyas" card
└── flow/                  THE SCROLL FILM
    ├── timeline.ts        When each chapter starts and ends
    ├── Flow.tsx           Hero → card ring (education) → sparkle
    ├── sequel.tsx         Oncure film → trading app → awards → technical skills
    ├── Dock.tsx           The menu bar at the top
    ├── FlowCanvas.tsx     The 3D particles, ribbons and star
    └── fx.ts              The animation loop
```

The film is one very tall section with a screen that stays pinned while you scroll. How far you
have scrolled is a number from **0** (top) to **1** (end). Each chapter has a start and an end
in `timeline.ts`:

```ts
hero:    [0, 0.05],      // the hero shrinks into a card
video:   [0.335, 0.475], // the Oncure film, full screen
finance: [0.49, 0.69],   // the trading app
tech:    [0.865, 1],     // technical skills
```

To make a chapter last longer, widen its numbers. Chapters set to 2 or more are not shown.

## Studio tab: `src/portfolios/studio/`

A folding phone. Closed, it shows a lock screen in front of his name; scrolling unfolds it into a
wide screen, and his whole story scrolls inside that screen (work, education, courses, awards,
activities, goals). At the end it folds shut on an "incoming call" screen that opens the contact
form. One number, the scroll progress from 0 to 1, drives everything (`T` in
`StudioPortfolio.tsx`). The colour dots change the phone; Basic, Glow and Orbit the background.

## "View more": `src/features/details/`

`Details.tsx` holds the full Oncure details (with the film) and the full trading app details.
`<DetailSheet>` opens them like an app on a phone: it grows out of the card you tapped and shrinks
back when closed. Studio opens it inside the phone screen, Classic over the page, and the pages
`/research/oncure` and `/projects/stock-trading-app` show the same content.

## Addresses on the live site

The live site lives in a sub folder (`…github.io/Shreyas_Ballari_Portfolio/`). So pictures load
there too, code never writes `/assets/...`. It writes:

```ts
`${import.meta.env.BASE_URL}assets/shreyas/hero-cutout.webp`
```

Next: [Change words, pictures and videos](2-change-content.md)
