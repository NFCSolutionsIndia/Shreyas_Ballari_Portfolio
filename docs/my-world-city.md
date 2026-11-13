# My World: real Cumming, natural motion

## The city (OpenStreetMap)

- **Data source:** OpenStreetMap, © OpenStreetMap contributors, ODbL. My World shows a credit with a link under the place label. Google Maps data is not used, because its terms forbid copying building data.
- **Raw extract:** `references/osm/cumming.json`, an Overpass API download of the downtown box (34.196–34.222 N, 84.160–84.122 W).
- **Converter:** `python -I apps/web/tools/osm/build_cumming.py`. It writes:
  - `src/portfolios/world/data/cumming.json`: buildings, roads, lots and parks
  - `src/portfolios/world/data/cummingRide.json`: the ride route
- **Frame:** the square (Tribble Gap Road at North Main Street and Dahlonega Street) is at (0, −340), where Shreyas waits with his bike.
  - The map is rotated so that the ride runs down −z. The ride follows the real route south along Tribble Gap Road into Veterans Memorial Boulevard.
  - Scale is 1.3 world units per metre, which matches the journey's slightly larger-than-life people and cars.
  - Buildings north of z −208 are left out, because that is the lake.
- **Privacy:** residential buildings never carry names, and nothing marks any home.
- **Rendering:** `three/City.tsx`.
  - Rectangular buildings use the parametric builder: windows, shopfronts, awnings and gable roofs. Each one keeps its real position, size and rotation, and its front faces the nearest street.
  - Irregular buildings (the courthouse, the jail, churches) are extruded from their exact outline, with a window shader that lights up at night.
  - Names go on the street-facing facade.
  - Streets get asphalt, lane markings and sidewalks. Parking lots and parks are drawn as surfaces. Street trees and lamps are added, and green street-name blades stand at the corners along the journey.
  - The story's open spaces stay clear: the arch, ABOUT ME, the square, the ride road, the schools, the sign, the screens and the statue.
- **Traffic:** `three/CityTraffic.tsx`.
  - Cars drive in lanes on the real streets and turn onto connecting streets at the end of each block.
  - They follow the car ahead using the Intelligent Driver Model, slow for curves and turns, and sometimes stop at junctions.
  - Bodies pitch and roll, the front wheels steer, and brake lights and headlights work.
- **People:** `three/gait.ts` holds the walk cycle.
  - Feet are planted while they carry weight (no foot skating), with heel-off, knee lift, heel strike, hip bob and sway, and opposite arm swing.
  - At the end of each route, walkers slow down and turn around before setting off again.
- **Birds:** `three/Wildlife.tsx`.
  - Flocks follow boids rules, flap in bursts and glide in between, and bank into turns.
  - Hawks circle higher up.
- **Sky:** `three/Landmarks.tsx`.
  - Domain-warped cumulus clouds lit from the sun's side, with high cirrus.
  - A sun halo and disc, and horizon haze.
  - Everything follows the time-of-day palette.

## Avatar (Blender) and Mixamo clips

The avatar is built locally in Blender 5.2 by `apps/web/tools/blender/build_avatar.py`. His photo never leaves this PC. The rig uses Mixamo bone names, so motion-capture clips can be retargeted onto it.

To get natural motion-capture walks, download these from https://www.mixamo.com (free with an Adobe account). Choose the default character (Y Bot), and do not upload the avatar:

| Clip (search name) | Settings | Save as |
| --- | --- | --- |
| Walking | FBX Binary, Without Skin, 30 fps, In Place on | `references/mixamo/walk.fbx` |
| Female Walk | the same | `references/mixamo/walk_f.fbx` |
| Breathing Idle | FBX Binary, Without Skin, 30 fps | `references/mixamo/idle.fbx` |
| Waving | the same | `references/mixamo/wave.fbx` |
| Talking | the same | `references/mixamo/talk.fbx` |
| Y Bot (character only, T-pose) | FBX Binary, With Skin | `references/mixamo/ybot.fbx` |

When the files are in place, the next step is to retarget them in Blender onto the avatar and the townsperson. The procedural walk cycle stays as the fallback.
