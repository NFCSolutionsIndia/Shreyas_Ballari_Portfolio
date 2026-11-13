# Classic: the particle portfolio

Previous Classic (Oryven style, liquid cursor, awards stage, gestures) is backed up in
`C:\SHREYAS_BALLARI_PORTFOLIO_backups\v15-classic-before-particles-2026-11-10\classic`.

## Reference: spartanai.framer.website (section map)

| Reference | Ours |
| --- | --- |
| Floating pill nav, CTA right | Floating pill nav: name left; Home, About, Work, Expertise, Process, Contact; scroll progress line |
| Hero: big two-tone heading left, featured card right, CTA, trust line, logo marquee | Hero: "Hello, I'm" + particle name left, particle point-cloud portrait right, CTAs, HUD labels, recognition marquee |
| Word-reveal statement + metrics ($, x, %) | About (particle heading + scanned portrait) and In numbers (particle 99th / 99th / 5 / 3) |
| Logo strip / scrolling text | Particle marquee stream of his subjects |
| Our Works: case cards with stats | Selected work: Oncure, AI stock trading app, Peer tutoring as particle illustrations |
| Capabilities: numbered list | Expertise: six particle shapes (code, neural network, chart, DNA helix, equation, book) |
| Our Vision: large statement | Vision: "Curiosity has no limits." in particles over a gold wave field |
| Our Process: numbered steps | Process: seven particle rings joined by trails |
| Testimonials, team | Learning journey (no testimonials were supplied, none invented): schools timeline, volunteering, activities, courses |
| Insights / blog | Experiments: the other tabs of this site, plus an interactive particle sphere |
| FAQ, footer | Contact: particle heading and orb, contact form, footer |
| Pricing | Left out (not relevant to a student portfolio) |

## Engine (`src/portfolios/classic/particles/`)

- `ParticleField.tsx`: one persistent `THREE.Points` (131,072 particles desktop, 65,536 tablet,
  32,768 phone) with a custom `ShaderMaterial`. Each formation is two float textures (position
  and size, colour and alpha). The vertex shader morphs between the current and the next
  formation. Each particle has its own delay, a flowing turbulence, depth scatter and size swell
  in flight. It also handles the edge-stream intro, the marquee scroll-and-wrap, pointer
  repulsion and nav-hover ripples. Uniforms: `uMix`, `uOffA/uOffB` (both formations move with
  the page), `uTime`, `uIntro`, `uTurb`, `uMouse`, `uRipple`, `uRepel`, `uSize`, `uPR`, marquee
  speed and length.
- Hero portrait: `imageGrid()` gives one particle per photo pixel on a grid, in the photo's exact
  colours. The grid shrinks until every pixel fits the budget, so nothing is skipped and there are
  no holes. The idle breathing motion is spatially coherent, so neighbours move together. Points
  under 3 px draw as solid squares so they tile cleanly. A share of particles on the right side
  drift off as smoke (`drift`).
- `sample.ts`: text, image, sphere, ring, line, frame and dust samplers, plus `pack()`, which
  shuffles particle order per formation so particles cross the screen between sections.
- `formations.ts`: one builder per section, anchored to DOM slots (`data-slot`). The particle
  visuals line up with the HTML at every screen size, and are rebuilt on resize.
- Scroll: native scrolling (Lenis-smoothed). Each frame, the scroll position gives formation A
  (current section), formation B (next) and the morph amount, so scrolling back reverses it
  exactly.
- Accessibility: all content is real HTML (headings, lists, links). Slot text and images stay in
  the page for screen readers and become visible when WebGL is missing. Reduced motion turns off
  turbulence, the intro streams and the marquee motion.

## Needs from the family

- Screenshots of the stock trading app, to sample real project assets into particles.
- Oncure figures or diagrams from the proposal.
- Email or LinkedIn for the contact section.
