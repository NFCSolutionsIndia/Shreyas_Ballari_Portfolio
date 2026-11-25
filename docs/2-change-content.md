# 2. Change words, pictures and videos

## Words: `src/content/portfolio.ts`

Almost every fact on the site comes from this one file. Change it there and every tab updates.

| Name in the file | What it holds |
| --- | --- |
| `profile` | Name, grade, school, school town, state |
| `subjects`, `courses`, `languages` | What he studies and the languages he codes in |
| `achievements`, `percentiles` | Awards, scores, programs and certificates |
| `stockApp` | The AI trading app concept |
| `oncure` | The Oncure research concept and its video |
| `activities`, `volunteering`, `goals` | Life outside class |
| `resume`, `resumeExtra` | Resume summary, scores and skill groups |

How a value looks:

```ts
school: 'Fulton Science Academy',
languages: ['JavaScript', 'Python', 'Java'],
```

Text goes between quotes, lists between square brackets, and each line ends with a comma. If the
text has an apostrophe, use the curly one (`’`), as in `'Principal’s Honors List'`.

**Labels:** `confirmed('…')` is a checked fact, `draft('…')` is wording Shreyas should approve,
and `placeholder('…')` shows "To be supplied" on the site until real text replaces it.

### Add an award

Add one line to `achievements`:

```ts
{ id: 'science-fair', kind: 'Award', title: 'Regional Science Fair', value: '1st place', when: '2026', detail: 'First place at the regional science fair, 2026.' },
```

`id` is lowercase with dashes; it also names the certificate picture (below). `kind` is one of
`Score`, `Award`, `Honor`, `Program`, `Certificate`.

## Pictures and videos: `public/`

See every file, its size and which code uses it:

```sh
pnpm assets            # in the terminal
pnpm assets --write    # also saves the full list to docs/assets-list.md
```

**To replace a picture, save the new one with exactly the same name in the same folder.** No code
changes are needed. Keep photos under about 500 KB (https://squoosh.app makes them smaller).

| Folder | Contents |
| --- | --- |
| `public/assets/shreyas/` | His photos: `hero-cutout.webp`, `hero-backdrop.jpg`, `portrait.webp`, `portrait-studio.jpg` |
| `public/assets/videos/oncure.mp4` | The Oncure film |
| `public/assets/certificates/` | Real certificate scans (empty until you add them) |
| `public/assets/photos/` | Real photographs of each topic (sources and licences in `CREDITS.md`) |
| `public/assets/house/` | 3D furniture and textures (free, CC0; credits in `house/ASSETS.md`) |
| `public/models/apple_vision_pro.glb` | The headset in the Creative intro |

### Certificates

Save a scan as `public/assets/certificates/<id>.jpg`, using the award's `id`: `cbnrp.jpg`,
`honors.jpg`, `psat.jpg`, `map.jpg`, `arrow.jpg`, `authors.jpg`, `minimed.jpg`. It replaces the
designed card in the Classic awards stack. **Cover any address, email, phone number or birth date
on the scan first.**

### The resume PDF

The Resume button downloads `public/assets/Shreyas_Ballari_Resume.pdf`. That file is kept off
GitHub on purpose (it is in `.gitignore`) because the current copy shows his email, phone and ZIP
code. To make the button work online: make a copy without those, save it under the same name,
remove its line from `.gitignore`, then commit and push.

### Pictures in code

```tsx
<img src={`${import.meta.env.BASE_URL}assets/shreyas/new-photo.jpg`} alt="Shreyas presenting his poster" />
```

Never write `src="/assets/..."`: it breaks on the live site. Describe the picture in `alt`, or use
`alt=""` for pure decoration.

Next: [Publish online, and the privacy rules](3-publish-and-privacy.md)
