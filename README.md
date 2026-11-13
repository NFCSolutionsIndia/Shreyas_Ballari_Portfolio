# Shreyas Ballari: Portfolio Website

The personal portfolio website of Shreyas Ballari, a junior at Fulton Science Academy. It shows his
education, his Oncure research concept, his AI trading app idea, his awards and his technical skills.

**Live site:** https://yarnaveen.github.io/Shreyas_Ballari_Portfolio/

The site has three looks ("tabs") that visitors switch between with the bar at the bottom of the
screen:

| Tab | What it is | Code |
| --- | --- | --- |
| **Classic** | A scroll film: the hero shrinks into a card, then the Oncure video, the trading app, the awards and the skills play as you scroll | `apps/web/src/portfolios/classic/` |
| **Creative** | A 3D house you can walk through, with glass app windows, a voice guide and hand gestures | `apps/web/src/portfolios/creative/` |
| **Studio** | A page that builds itself in front of you, block by block | `apps/web/src/portfolios/studio/` |

## Start here

New to the project? Read the guide in order. Each page takes a few minutes.

1. [Start here: install and run it](docs/guide/01-start-here.md)
2. [How the website works](docs/guide/02-how-it-works.md)
3. [Folder map: where everything lives](docs/guide/03-folder-map.md)
4. [The three tabs explained](docs/guide/04-the-three-tabs.md)
5. [Change the text](docs/guide/05-change-text.md)
6. [Images, videos and 3D models](docs/guide/06-images-and-videos.md)
7. [Publish online](docs/guide/07-publish-online.md)
8. [Privacy rules](docs/guide/08-privacy-rules.md)

## The five commands you need

Run these in a terminal from this folder:

```sh
pnpm install          # once, downloads the libraries the site uses
pnpm dev              # opens the site at http://localhost:5173 and reloads as you edit
pnpm build            # makes the final website files in apps/web/dist
pnpm test             # runs the automatic checks
pnpm assets           # lists every image, video and model and where each is used
```

## Top level folders

```
SHREYAS_BALLARI_PORTFOLIO/
├── apps/web/          The website itself (all code, pictures and videos)
├── packages/          Small shared settings and types used by the website
├── docs/              The guide, the media list, decisions and old notes
├── .github/workflows/ The robot that publishes the site when code is pushed
└── README.md          This page
```

## Rules that always apply

- Shreyas is a minor. Never put his email, phone number, home address, home town, ZIP code,
  birth date or schedule anywhere in this project. See [Privacy rules](docs/guide/08-privacy-rules.md).
- Never invent facts. Example content is labelled as a concept or sample data.
- Oncure is a conceptual research proposal, not an existing or clinically validated treatment.
- The trading app shows hypothetical sample data and is not financial advice.
