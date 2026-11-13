# Reference breakdown — sebastien-lempens.com

Inspected live in Chrome on 2026-11-09 (desktop, 1536×695 viewport), twice: once start to finish
by scrolling, once through the menu (Home, About, Contact), with mouse movement and sound
prompt. Analytics cookies were declined. Notes below are what was observed; where something
could not be observed it says so.

## Overall

- One continuous WebGL world. There are no HTML sections: scrolling moves a camera through the
  world, and the few text blocks live inside the 3D scene.
- Art direction: soft low-poly/stylised architecture, flat-ish PBR materials, a warm sunset
  grade (salmon, peach, dusty violet sky, golden sun), soft shadows, light fog, water with
  reflections. Later scenes switch to a cool, blue-grey daylight grade.
- Letterbox: black bars top and bottom (about 7% each) during the cinematic parts.
- Chrome UI: only "menu" (hamburger) and "sound" (equaliser bars) at the top right, plus a small
  boxed "SCR(mouse)LL" hint. Display type is a wide, techno sans for headings; body copy is a light
  geometric sans.
- Sound: ambient music and effects, offered on the start screen ("Turn your sound on").

## Scenes in order

| # | What the visitor sees | Camera | Scroll does | Content | Transition out |
| --- | --- | --- | --- | --- | --- |
| 0 | **Loader**: light grey page; a 3D character rides a scooter on the spot in front of a grey city silhouette; a large outlined counter (000→100) under him; award badges along the bottom | Static, side view | — | Progress counter | Counter completes |
| 0b | **Start screen**: a row of small grey landmark statues on a mauve "START" bar; "For the best experience — Turn your sound on / Switch to desktop" | Static | — | — | Click START: a white flash/fade |
| 1 | **Opening**: hovering low over a river at sunset; stone embankment with lamp posts on the left, an arched bridge, the landmark tower and a Ferris wheel on the skyline, city blocks either side; the owner's name and title floating in the sky in thin 3D text | Low, just above the water, looking at the bridge | Small push forward along the river | Name + title, "SCROLL" hint | Camera rises over the embankment |
| 2 | **Plaza**: wide paved plaza with benches, trees and lamp posts, the bridge arches behind; "my World" floats in the sky | Eye level, gliding | Glides forward, slight yaw | — | Pans under the tower legs |
| 3 | **Meeting the character**: under the tower, the character stands by his scooter and gestures; a large translucent dark panel with a pixel logotype and the "about" paragraphs fades in beside him | Eye level, frames character right and panel left | Panel text reveals; camera holds | About text | Character mounts the scooter |
| 4 | **The ride**: third-person chase camera behind the character riding a winding road between low-poly buildings, pine trees and wind turbines; giant 3D pixel letters "MY WORK" beside the road; skill names appear one by one in big white techno type on the right | Behind and slightly above the rider, banking with the road | Rides forward along the road; each skill line appears at a scroll point | Skills list | Road passes a tall column |
| 5 | **The statue**: camera tilts up a column to a golden statue holding a wreath against a pink cloudy sky | Low angle, tilting up | Tilt continues up into the sky | — | Rises into clouds |
| 6 | **Projects above the clouds**: a row of tall portrait project panels floats in the sky behind a sea of pink clouds; each has a brand title and a small rocket button; panels slide sideways as you scroll | Above the cloud deck, looking across | Panels slide; clouds part and close | Project titles + buttons | Camera pushes into the clouds |
| 7 | **Cloud flight**: flying through bright pink cloud layers into a white-out | Forward dolly through clouds | Speed lines, white-out | — | Fades white |
| 8 | **Falling**: the character free-falls through white clouds towards the camera | Below the character, looking up | Character falls | — | (end of the scroll journey observed) |
| 9 | **Contact** (via menu, likely also the end of the journey): blue-grey old-town square with gabled houses and a church tower in daylight; giant pink pixel letters "IN TOUCH" across the square | Low, behind the letters | Camera flies toward a lit window of a house, through it into a small blue room (sofa, shelves, a glowing curtained window); then the experience loops back to scene 1 | Contact | Loops to the opening |

## Navigation

- Menu: the scene dims; four icon buttons with labels across the top right — Home (compass),
  About (tower), Projects (statue), Contact (atom-like monument) — plus a back arrow. Choosing one
  plays a fast camera move (or a white flash) to that scene.
- Mouse: the camera turns gently toward the pointer (a few degrees of yaw/pitch), smoothed.
- Hover: buttons brighten; not every 3D object is interactive.

## Not observed

- Exact project detail view after pressing a project's rocket button (not opened).
- Mobile behaviour (the site asks to switch to desktop).

## What we keep and what we change

We reproduce the **principles** — one continuous scroll-driven camera journey through a stylised,
warmly graded low-poly world; a character who carries the story; text set into the world;
set-piece transitions (rise into clouds, fly through, loop back); minimal chrome; optional sound —
with **original assets, places and content** for Shreyas. We do not copy the reference's landmarks
(Paris/Brussels monuments), scooter, logotype, texts or code.
