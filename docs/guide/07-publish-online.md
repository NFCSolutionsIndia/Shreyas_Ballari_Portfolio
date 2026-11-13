# 7. Publish online

**Live site:** https://yarnaveen.github.io/Shreyas_Ballari_Portfolio/
**Code:** https://github.com/YarNaveen/Shreyas_Ballari_Portfolio

## It publishes itself

Every time code is pushed to the `main` branch, GitHub builds the site and publishes it. You do
not upload anything by hand.

```sh
git add -A
git commit -m "Add science fair award"
git push
```

Then open the **Actions** tab on the GitHub page of the project:

- A yellow dot means it is building (about 3 to 5 minutes).
- A green tick means the new version is live. Refresh the site with **Ctrl + F5**.
- A red cross means something failed. Click it, then click the red step to read the error.
  Usually it is a mistake that `pnpm build` on your computer would also show.

## How it works

The instructions are in `.github/workflows/pages.yml`:

1. **build**: GitHub takes a fresh computer, installs Node and pnpm, runs `pnpm install` and
   `pnpm build`, and packs `apps/web/dist`.
2. **deploy**: GitHub Pages takes that pack and serves it at the live address.

The build sets `BASE_PATH=/Shreyas_Ballari_Portfolio/`, because GitHub Pages serves the site in that
sub folder. That is why the code uses `import.meta.env.BASE_URL` for every picture and link (see
[How it works](02-how-it-works.md)).

## One time setup (already done)

In the project's GitHub page: **Settings → Pages → Source: GitHub Actions**.

## Test the live version on your computer first

To see exactly what the live site will look like:

```sh
cd apps/web
BASE_PATH=/Shreyas_Ballari_Portfolio/ pnpm build
BASE_PATH=/Shreyas_Ballari_Portfolio/ pnpm preview
```

Then open http://localhost:4173/Shreyas_Ballari_Portfolio/. (In Windows PowerShell set the variable
first with `$env:BASE_PATH="/Shreyas_Ballari_Portfolio/"`, then run the two commands without it.)

## Go back to an earlier version

Every push is saved. On GitHub, open **Commits**, find the last good version, and ask for help to
revert to it, or in a terminal:

```sh
git log --oneline          # list of versions
git revert <commit id>     # undo one version, keeping history
git push
```

Next: [Privacy rules](08-privacy-rules.md)
