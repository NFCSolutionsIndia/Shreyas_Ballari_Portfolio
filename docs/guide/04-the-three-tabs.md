# 4. The three tabs explained

The home page shows one of three portfolios. The tab bar at the bottom switches between them; the
code is in `src/portfolios/switcher/`, and the list of tabs is at the top of
`switcher/usePortfolioChoice.ts`.

---

## Classic: the scroll film

**Folder:** `src/portfolios/classic/` · **Open:** `/?style=classic`

### What the visitor sees, in order

| # | Chapter | What happens | Code |
| --- | --- | --- | --- |
| 0 | Intro | A light arc charges from 4% to 100%, then fades (skip button, skipped for reduced motion) | `intro/ArcIntro.tsx` |
| 1 | Hero | Photo, giant name, a "Hey, I'm Shreyas" card that follows the mouse | `hero/StageHero.tsx` |
| 2 | Hero to card | Scrolling shrinks the whole hero into the front card of a 3D ring | `flow/Flow.tsx` → `HeroLayer` |
| 3 | Education ring | Cards for his schools, courses, languages and subjects spin past | `flow/Flow.tsx` → `Ring` |
| 4 | Sparkle | A chrome star grows until it fills the screen | `flow/Flow.tsx` → `Star`, `FlowCanvas.tsx` |
| 5 | Oncure film | The video plays full screen with its own controls | `flow/sequel.tsx` → `Film` |
| 6 | Trading app | A blue card opens to full screen with the app concept | `flow/sequel.tsx` → `Finance` |
| 7 | Awards | The trading card closes into a stack of certificate cards | `flow/sequel.tsx` → `Stack3D` |
| 8 | Skills | Three language cards fly out of the stack into a row | `flow/sequel.tsx` → `TechSkills` |

The menu bar at the top is `flow/Dock.tsx`. Its links jump to a point in the film; those points
are the `JUMP` list in `Flow.tsx`.

### How the timing works

The film is one very tall section (`flow.css`, `.fl { height: 1800svh }`) with a screen that
stays pinned while you scroll past it. Scroll progress becomes a number `t` from 0 to 1.

`flow/timeline.ts` gives each chapter a start and end:

```ts
export const F = {
  hero:    [0, 0.05],
  carousel:[0.05, 0.19],
  video:   [0.335, 0.475],
  finance: [0.49, 0.69],
  mara:    [0.68, 0.875],  // the awards stack
  tech:    [0.865, 1],
};
```

Each chapter registers a small function with `useFx`. On every frame, `fx.ts` calls all of them
with the current `t`, and each one moves its own elements. Helpers in `timeline.ts`:

| Helper | Meaning |
| --- | --- |
| `seg(t, a, b)` | 0 before `a`, 1 after `b`, a smooth line between |
| `within(t, 'video')` | Progress through one chapter, from 0 to 1 |
| `smooth(x)`, `out(x)` | Easing: start or end gently instead of moving at a constant speed |
| `show(el, on)` | Hide or show an element |

**To change the pace**, change numbers in `timeline.ts`. Chapters that overlap slightly hand over
smoothly. Chapters with numbers of 2 or more are "parked": built but not shown.

### Hidden older sections

`ClassicPortfolio.tsx` has `const SHOW_SECTIONS = false;`. Set it to `true` to see the previous
Classic sections (about, keyboard, particles) instead of the film.

---

## Creative: the 3D house

**Folder:** `src/portfolios/creative/spatial/` · **Open:** `/?style=creative`

1. **Intro** (`intro/`): a 3D headset; the visitor looks into it to enter.
2. **House** (`house/`): a 3D home with a room for each topic: living room, study, lab (Oncure),
   gallery (awards), kitchen, music room, garden. Furniture comes from `public/assets/house/`.
3. **Apps** (`os/`): glass windows that open on top: Oncure, the trading app, awards, a chat
   guide, games.
4. **Tour** (`story/`): a guided walk that visits each room and explains it.
5. **Controls** (`ui/`): the buttons, the Control Center, walking freely, voice and hand control.

The list of apps, and which room each one lives in, is `story/chapters.ts`. The tour text is
`story/tour.ts`.

The camera and microphone never start on their own, and the voice is muted until the visitor
turns it on.

---

## Studio: the page that builds itself

**Folder:** `src/portfolios/studio/` · **Open:** `/?style=studio`

Small named cursors ("agents") fly in and build the page block by block: first a dashed outline,
then a grey sketch, then the real content. A real scroll hands control to the visitor;
`/?style=studio&play` keeps it playing.

- `StudioPortfolio.tsx`: the page. Every element with `data-block` is built by an agent.
- `engine.ts`: moves the cursors and changes each block from empty to sketch to done.

---

## Adding or removing a tab

1. Add or remove its entry in `PORTFOLIOS` in `switcher/usePortfolioChoice.ts`.
2. Add or remove its line in `src/pages/HomePage.tsx`.
3. Change `grid-cols-3` in `switcher/PortfolioSwitcher.tsx` to the new number of tabs.
4. Run `pnpm typecheck`.

Next: [Change the text](05-change-text.md)
