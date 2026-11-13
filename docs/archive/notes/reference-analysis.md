# Reference analysis — jordan-delcros.com

Inspected 2026-11-03 in Chrome at 1536 × 695 (desktop). Earlier references (gianmediagroup.com,
foldfolio.framer.website) were superseded; their builds are in `C:\SHREYAS_BALLARI_PORTFOLIO_backups`.

The reference is used for design language only. None of its 3D models, captions, project names or
branding are reused; every object on Shreyas's desk is built procedurally in code.

## What the reference does

| Aspect      | Reference                                                                                  | Our build                                                                       |
| ----------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Stack       | Three.js, single full-screen canvas, no page scroll                                        | three.js via react-three-fiber + drei; hidden-scrollbar page scroll drives the camera (keeps keyboard/trackpad scrolling) |
| Entry       | Black screen, white pill "DISCOVER PORTFOLIO" in Bebas, letter-spaced                       | Same; the 3D bundle loads only after this click                                 |
| World       | Endless lavender-grey desk seen from above, white haze toward the horizon, soft shadows    | Same: desk plane, fog to near-white, PCF soft shadows from a key light that follows the camera |
| Title       | "JORDAN" as extruded italic 3D letters, gold "CREATIVE DEVELOPER" below                     | "SHREYAS / BALLARI" extruded Bebas sheared into italic, gold "STUDENT RESEARCHER" |
| Objects     | Clusters per project: polaroids with handwritten captions, sticky notes, keycaps spelling names, phone, keys, trophy, figurine | Clusters per part of Shreyas's story: keycaps, polaroids, sticky notes (Caveat), proposal sheet, pill capsule, phone, trophy, medal, certificates, books, pencils, whiteboard, markers |
| Scroll      | Camera glides across the desk; objects drift up, new ones arrive from below                 | Same, with damped camera and slight pointer parallax                            |
| Menu        | Hamburger top-left; page blurs; centred list "CLIENT — PROJECT" in small Bebas caps          | Same; picking an item flies the camera there and opens its detail card          |
| Ending      | 3D "YOU'VE REACHED THE END" + gold "THANKS FOR WATCHING" + sticky note about contact        | 3D "THANKS FOR VISITING" + gold "EVERY GREAT DISCOVERY STARTS WITH CURIOSITY" + contact note |
| Fonts       | Bebas (UI/3D), Caveat (handwriting)                                                         | Bebas Neue, Caveat (both OFL, self-hosted)                                     |

## Additions for this site

- Clicking any object opens an accessible detail card for that cluster (the reference shows none).
- A complete text version of the content is in the HTML for screen readers and search engines,
  and is shown instead of the desk when WebGL or JavaScript is unavailable.
- Reduced-motion users get a camera that follows scroll without easing, and no hover wobble.
