# 3. Publish online, and the privacy rules

## Publish

**Live site:** https://yarnaveen.github.io/Shreyas_Ballari_Portfolio/
**Code:** https://github.com/YarNaveen/Shreyas_Ballari_Portfolio

Check first, then send:

```sh
pnpm typecheck && pnpm test && pnpm build
git add -A
git commit -m "Add science fair award"
git push
```

GitHub then builds and publishes the site by itself (`.github/workflows/pages.yml`). On the
project's GitHub page, open the **Actions** tab:

- Yellow dot: building (3 to 5 minutes).
- Green tick: live. Refresh the site with **Ctrl + F5**.
- Red cross: something failed. Click it and read the red step; `pnpm build` on your computer
  usually shows the same error.

## The contact form

The form on `/contact` sends messages to the address in the setting `VITE_CONTACT_ENDPOINT`. Until
it is set, the form says plainly that it is not connected and sends nothing. To connect it, create a
free form at a service such as Formspree (it forwards messages to a family email address), then add
its form URL as a repository variable and to the build in `.github/workflows/pages.yml`, or to a
local `.env` file:

```sh
VITE_CONTACT_ENDPOINT=https://formspree.io/f/your-form-id
```

To undo a version: `git log --oneline` lists them; `git revert <id>` then `git push` undoes one
while keeping the history.

## Privacy rules

Shreyas is a minor, and this repository and the site are **public**: anyone can read every file,
including old versions in the history.

**Never put these anywhere in the project** (code, text, pictures, scans, PDFs, file names, commit
messages): his email, phone number, home address, home town, ZIP code, birth date or schedule.
The site may show his name, his school (Fulton Science Academy), the school's town (Alpharetta,
Georgia), the state and his work.

**Honest content:** never invent facts; Oncure is always a conceptual research proposal, not an
existing or clinically validated treatment; the trading app shows sample data and is not financial
advice; illustrations are labelled as illustrations.

**Visitors:** the camera (hand control) and microphone (voice control) never start on their own,
and nothing is recorded. The AI voice is muted until the visitor turns it on. Never put secret
keys or passwords in the code: every visitor can read it.

**If something private is pushed by mistake,** deleting it in a new commit is not enough (it stays
in the history). Tell a parent right away so the history can be cleaned.
