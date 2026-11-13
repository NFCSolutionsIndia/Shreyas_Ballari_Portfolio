# My World: visual upgrade to the stylised "target style" look

Reference: `apps/web/references/target-style.jpg`. Snapshots: `apps/web/screenshots/` (`npm run snap -- <name> [high|medium|low]`, 1536×688, the welcome view; needs `npm run dev`).

## Step 0: audit (before)

- **three.js** 0.187, React Three Fiber 9, drei 10 (only `MeshReflectorMaterial` is used). No `postprocessing` package; three's own passes (`three/examples/jsm/postprocessing`) are available and used instead, so nothing new is downloaded.
- **Renderer** (`three/Experience.tsx`): ACES filmic, sRGB output, `shadows` on desktop (PCF: three 0.187 removed PCFSoft), DPR 1–1.5. No environment map. Rendering was taken over by `Ripple.tsx` for the section ripple.
- **Lighting** (`Atmosphere` in `Experience.tsx`, palettes in `timeOfDay.ts`): one directional sun (shadow box follows the camera), hemisphere and ambient lights; colours from the dawn, day, sunset or night palette, blended to day for the Get in touch city.
- **Atmosphere:** `FogExp2`, density from the palette, thinned above y 60–140. Sky is a custom shader dome (`Landmarks.tsx` Sky): gradient, sun glow, streak clouds, stars.
- **Buildings** (`Town.tsx` Houses): instanced unit boxes with a canvas facade texture repeated per bay (brick, lake, farm, suburb and touch styles), gable or flat roofs, awnings on brick shops. Night window glow in the shader.
- **Trees and lamps** (`Town.tsx` StreetFurniture): instanced cones (pines), icosahedrons (round trees), cylinder lamp posts with emissive spheres.
- **Ground and water:** flat planes with paving and stone canvas textures, and the lake as a drei `MeshReflectorMaterial`.
- **Landmarks:** courthouse (clock and calendar cupola), water tower, lake bridge, interests arch, statue (gold PMREM from `RoomEnvironment`).
- **Camera:** pure function of scroll (`path.ts`), damped, with pointer parallax. The welcome view is p = 0: camera (-9.5, 5.4, 9) looking at (-2, 9, -160).

## Gap list: before.png vs target-style.jpg

| Area | Reference | Ours (before) |
| --- | --- | --- |
| Lighting | Warm low sun, soft long shadows, bright fill in shadows, nothing goes black | Hard, dark shadow sides; the lake and foreground read almost black |
| Ambient / fill | Soft sky bounce on every surface (environment light) | Hemisphere and ambient only, flat and dim |
| Atmosphere | Strong aerial perspective: distance fades to a warm blue haze, clearly layered depth | Uniform fog; distant town and mountains fairly crisp and evenly toned |
| Contact shadows | Soft AO where things meet the ground and in corners | None |
| Glow | Lamps and bright sky bloom softly | No bloom |
| Depth of field | Foreground softly blurred, focus mid-distance | Everything sharp |
| Grade | Warm highlights, cool blue-violet shadows, light vignette | Neutral, slightly muddy mid-tones |
| Materials | Matte, gently saturated, rounded and bevelled edges | Flat boxes, sharp edges |
| Facades | Recessed windows, sills, cornices, fire escapes, shopfront awnings | Painted window texture on boxes |
| Trees and props | Soft, blobby rounded canopies; curved toy-like lamps; signs and traffic light | Cones and icosahedrons; straight posts |
| Water | Soft, bright reflections with a warm glow path | Dark mirror |
| Street life | Taxi, cars, people | Some cars and walkers, but not in the welcome view |

## Step 1: lighting and atmosphere (done, awaiting approval)

Snapshot: `screenshots/step-1.png` (compare with `before.png`).

What changed (`three/Post.tsx`, `Experience.tsx`, `timeOfDay.ts`, `Landmarks.tsx`):
- Soft VSM shadows (radius 7, 14 blur samples). The sunset sun is now low, warm, from behind-left; the hemisphere ground colour is warm brick.
- Environment fill: a PMREM of the live sky, refreshed every 3 s, lights every surface softly (`environmentIntensity` 0.55).
- Height + distance haze: three's fog chunk is patched so haze is thick near the ground and thins with height; the sunset fog is warmer and a little denser.
- Post stack (three's built-in passes): GTAO ambient occlusion, soft bloom (lamps and the sun only, threshold 1.25), foreground-only depth of field (focus follows what the camera looks at), colour grade (cool blue-violet shadows, warm highlights, slight saturation), light vignette. The section ripple now lives in the same grade pass.
- Quality toggle (new tool button, or `?quality=high|medium|low`): high = everything; medium = bloom, grade, vignette; low = direct render (phones default to low).
- Fixed: the sky shader now goes through three's tone mapping and colour space, so it looks right with and without post-processing.

Improved vs before:
- Shadows are soft and no surface goes black; the lake reads as lit water with a warm glow path instead of a near-black mirror.
- Clear aerial perspective: arches, town and mountains sit in layered warm haze.
- The foreground (Shreyas and the rail) is gently out of focus, so the eye goes to the bridge and the town, like the reference.
- Lamps and the sun glow softly.

Remaining differences (later steps):
- Buildings are still flat boxes with painted windows (Step 2: bevels, recessed windows, cornices, shopfronts, fire escapes).
- Trees are cones and icosahedrons; lamps are straight posts (Step 3).
- The lake is still darker and more mirror-like than the reference's soft water; no ripples (Step 4).
- No traffic or people in the welcome view (Step 5).
- The reference's daylight is bluer; ours stays the sunset you asked to keep (live time still switches to day and night).

## Steps 2–5 (done together, at your request)

Snapshot: `screenshots/step-5.png` (welcome view).

- **Buildings** (`three/Buildings.tsx`, a parametric generator used for every house): bevelled walls with a world-space brick, stucco or siding surface (never stretched) and a colour per building; framed windows with sills and lintels; cornice and parapet; ground-floor shopfronts with a sign and an angled awning; black fire escapes on taller brick blocks; gabled roofs for lake, farm and city houses. Windows and shops glow as it gets dark. Each part type is instanced, so it is one draw call per part.
- **Props** (`three/Props.tsx`): blobby broadleaf canopies and soft cartoon pines (merged, noise-displaced spheres with a shade-to-sun gradient) that sway in the wind; curved toy lamps whose heads brighten after dusk; traffic lights that cycle; benches, planters, hydrants, bins and street signs round the square and the waterfront.
- **Ground and water**: curbs and a zebra crossing on the downtown street; the lake is lighter and softer, with a moving ripple distortion.
- **Life**: a yellow taxi (generic, no branding) leads each line of traffic; cars cross the lake bridge in the welcome view; sailboats bob; a flock of birds circles over the lake.

Remaining differences from the reference (by design or for later):
- No New York content (no skyscrapers or Art Deco tower), as you asked; the skyline is your town, the bridge and the ridge.
- The sun's glow path on the lake is bright (your sunset); it can be toned down if wanted.
- The water tower and courthouse kept their existing (already smooth) shapes; not re-modelled.
- Characters are your existing code-built avatars (no rigged GLB characters in `public/models/` for the town).
