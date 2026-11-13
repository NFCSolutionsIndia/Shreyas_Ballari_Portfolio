# apps/web: the website

Everything visitors see comes from this folder.

| Path | What |
| --- | --- |
| `src/content/portfolio.ts` | The words on the site (start here to change a fact) |
| `src/portfolios/` | The three tabs: `classic/`, `creative/`, `studio/` |
| `public/assets/` | Pictures, the Oncure video, certificate scans |
| `scripts/list-assets.mjs` | `pnpm assets`: lists every media file and where it is used |
| `tests/` | Automatic tests (`pnpm test`) |
| `vite.config.ts` | Build settings |

Commands (run from here or from the project root):

```sh
pnpm dev          # http://localhost:5173
pnpm build        # final files in dist/
pnpm preview      # open the built site
pnpm typecheck    # check the TypeScript
pnpm test         # run the tests
pnpm assets       # list media files
```

The full guide is in [docs/guide](../../docs/guide/01-start-here.md).
