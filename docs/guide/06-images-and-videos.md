# 6. Images, videos and 3D models

All pictures, videos and 3D models live in **`apps/web/public/`**. Files there are copied to the
website exactly as they are.

## See every file and where it is used

From the project folder run:

```sh
pnpm assets
```

It prints each folder with its files and sizes, and warns about any file that no code uses.
To save the complete list (every file, with the code files that use it) to
[`docs/assets-list.md`](../assets-list.md), run:

```sh
pnpm assets --write
```

You can also simply open the folders in VS Code: clicking an image shows it, and clicking the
video plays it.

## What each folder is for

| Folder | Contents | Shown in |
| --- | --- | --- |
| `public/assets/shreyas/` | Photos of Shreyas: `hero-cutout.png` (cut out portrait), `hero-backdrop.jpg`, `portrait.png`, `portrait-studio.jpg` | Classic hero, Studio, Creative |
| `public/assets/videos/` | `oncure.mp4`, the Oncure film | Classic film, Creative lab |
| `public/assets/certificates/` | Real certificate scans (empty until you add them) | Classic awards stack |
| `public/assets/journey/` | Placeholder illustrations named `*.placeholder.jpg` | Classic ring and topics, Creative tour |
| `public/assets/house/` | 3D furniture, textures and sky for the house, all free (CC0); credits in `house/ASSETS.md` | Creative |
| `public/models/` | `apple_vision_pro.glb`, the headset (CC BY 4.0, credited in the app) | Creative intro |
| `public/favicon.svg` | The icon in the browser tab | Every page |

## Replace a picture

The easiest way: **keep the same file name**. Put your new picture in the same folder with exactly
the same name, replacing the old one. No code changes needed.

Tips:

- Photos: `.jpg`, about 1600 pixels wide, under 500 KB. Cut out shapes: `.png` with a transparent
  background.
- Large files make the site slow on phones. https://squoosh.app makes them smaller in the browser.

## Add a real certificate

1. Scan or photograph the certificate.
2. Save it as `.jpg` in `public/assets/certificates/`, named after the award's `id` in
   `content/portfolio.ts`:

   | Award | File name |
   | --- | --- |
   | College Board National Recognition Program | `cbnrp.jpg` |
   | Principal's Honors List | `honors.jpg` |
   | PSAT | `psat.jpg` |
   | MAP | `map.jpg` |
   | Project Arrow | `arrow.jpg` |
   | Young Authors Contest | `authors.jpg` |
   | Mini-Medical School | `minimed.jpg` |

3. Reload. The scan replaces the designed card automatically. Without a scan, the designed card
   shows.

**Before adding a scan, cover his home address, email, phone number and birth date** if any of them
appear on it.

## Add a new picture in code

Always build the address from `BASE_URL`, so it works on the live site too:

```tsx
<img src={`${import.meta.env.BASE_URL}assets/shreyas/new-photo.jpg`} alt="Shreyas presenting his poster" />
```

- Never write `src="/assets/..."`: it breaks on the live site.
- Write an `alt` text that describes the picture for people who cannot see it. Use `alt=""` for
  pictures that are only decoration.

## The resume PDF

The **Resume** button downloads `public/assets/Shreyas_Ballari_Resume.pdf`. That file is kept
**off GitHub on purpose** (it is listed in `.gitignore`) because the current copy shows his email,
phone number and home ZIP code. To make the button work on the live site:

1. Make a copy of the resume without email, phone and address.
2. Save it with the same name in `public/assets/`.
3. Remove the line `apps/web/public/assets/Shreyas_Ballari_Resume.pdf` from `.gitignore`.
4. Commit and push.

## The video

`oncure.mp4` is 42 MB. Browsers stream it, but a smaller file starts faster on phones. To replace
it, keep the name `oncure.mp4` (or change the `video:` line under `oncure` in `content/portfolio.ts`).
GitHub refuses single files over 100 MB.

Next: [Publish online](07-publish-online.md)
