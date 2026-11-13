# 2. How the website works

## The big picture

```
 You write code             The build turns it into          GitHub hosts it         Visitors
 (apps/web/src)   ──────▶   plain website files      ──────▶  on GitHub Pages  ──────▶ open the link
 TypeScript, CSS            (apps/web/dist)                   (free)
```

1. **You write** React components in TypeScript (`.tsx` files) and styles in CSS (`.css` files).
2. **The build** (`pnpm build`) uses a tool called **Vite** to turn those files into plain HTML,
   CSS and JavaScript that any browser understands. They land in `apps/web/dist`.
3. **GitHub Actions** runs that build on GitHub's computers every time you push, and puts the
   result on **GitHub Pages**, which serves it at the live link.

## The tools, in one line each

| Tool | Job | Where you see it |
| --- | --- | --- |
| **TypeScript** | JavaScript with types, so mistakes show up while you type | every `.ts` and `.tsx` file |
| **React** | Builds the page out of small reusable pieces called components | `function StageHero() { return <section>...</section> }` |
| **Vite** | Runs the dev server and does the build | `apps/web/vite.config.ts` |
| **vite-react-ssg** | Saves each page as ready-made HTML during the build, so the page shows fast and search engines can read it | `apps/web/src/main.tsx` |
| **React Router** | Decides which page to show for each address (`/`, `/about`, ...) | `apps/web/src/routes.tsx` |
| **three.js + React Three Fiber** | Draws 3D graphics (the sparkle, the 3D house, the headset) | files that import `@react-three/fiber` |
| **Lenis** | Makes scrolling smooth | `apps/web/src/app/providers/SmoothScroll.tsx` |
| **Tailwind CSS** | Short class names for styling (`flex`, `p-4`); used in a few shared parts | `className="..."` |
| **pnpm + Turborepo** | Install libraries and run commands across the project | `package.json`, `turbo.json` |

## What happens when someone opens the site

1. The browser loads `index.html`, then `src/main.tsx`, which starts React with the list of
   pages in `src/routes.tsx`.
2. The address `/` shows `src/pages/HomePage.tsx`.
3. `HomePage` reads which tab the visitor chose (from `?style=` in the address, or the last tab
   they used) and shows one of the three portfolios, plus the tab bar at the bottom.
4. Each portfolio reads its words from `src/content/portfolio.ts` and its pictures from
   `public/assets/`.

## Components: the building blocks

A component is a function that returns what to draw. For example, the hero:

```tsx
// apps/web/src/portfolios/classic/hero/StageHero.tsx (simplified)
export function StageHero() {
  return (
    <section className="sh">
      <img className="sh-bg" src=".../hero-backdrop.jpg" alt="" />
      <aside className="sh-card">Hey, I'm {profile.firstName}</aside>
      <h1 className="sh-name">{profile.name}</h1>
    </section>
  );
}
```

- The HTML-like part is **JSX**. `{profile.name}` drops a value from the content file in.
- `className="sh-card"` connects it to styles in the matching CSS file (`stage.css`).
- Components are used like tags: `<StageHero />`.

## How the scroll animations work (Classic)

The Classic tab is one long, tall section with a screen that stays pinned while you scroll.
How far you have scrolled becomes a number from **0** (top) to **1** (end). Each chapter has a
start and end on that line, written in `classic/flow/timeline.ts`:

```ts
hero:    [0, 0.05],     // the photo hero shrinks into a card
video:   [0.335, 0.475],// the Oncure film plays full screen
finance: [0.49, 0.69],  // the trading app card
tech:    [0.865, 1],    // technical skills
```

On every frame, each chapter checks the number and moves its pieces. To make a chapter longer or
shorter, change its numbers. More in [The three tabs](04-the-three-tabs.md).

## Addresses on the live site

GitHub Pages serves the site in a sub folder: `https://yarnaveen.github.io/Shreyas_Ballari_Portfolio/`.
So that pictures still load there, the code never writes `/assets/...` directly. It writes:

```ts
`${import.meta.env.BASE_URL}assets/shreyas/hero-cutout.png`
```

`BASE_URL` is `/` on your computer and `/Shreyas_Ballari_Portfolio/` on the live site.
**Always use this pattern when you add a picture or a link.**

Next: [Folder map](03-folder-map.md)
