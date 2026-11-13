# 1. Start here: install and run it

## What you need on your computer

| Tool | What it does | How to get it |
| --- | --- | --- |
| **VS Code** | The editor you read and change code in | https://code.visualstudio.com |
| **Node.js 22** | Runs JavaScript outside the browser (needed to build the site) | https://nodejs.org (choose version 22) |
| **pnpm** | Downloads the libraries the site uses | In a terminal: `npm install -g pnpm@9.15.0` |
| **Git** | Saves versions of the code and sends them to GitHub | https://git-scm.com |

## Run the site on your computer

Open this project folder in VS Code, then open a terminal (menu **Terminal → New Terminal**) and type:

```sh
pnpm install
pnpm dev
```

`pnpm install` only needs to run once (and again whenever `package.json` changes). It downloads
everything into a folder called `node_modules`. Never edit that folder; it is rebuilt automatically.

`pnpm dev` starts a small web server. Open **http://localhost:5173** in Chrome. Leave the terminal
running: every time you save a file, the browser updates by itself. Press `Ctrl + C` in the
terminal to stop it.

Useful addresses while it runs:

| Address | Opens |
| --- | --- |
| http://localhost:5173/?style=classic | The Classic tab |
| http://localhost:5173/?style=creative | The Creative tab |
| http://localhost:5173/?style=studio | The Studio tab |

## Reading the .md files

Every file ending in `.md` (like this one) is **Markdown**: plain text with simple marks for
headings, lists and tables. To read one nicely formatted in VS Code, open it and press
**Ctrl + Shift + V** (or right click the tab and choose **Open Preview**). GitHub also shows them
formatted when you open them on the website.

## Your first change

1. Run `pnpm dev` and open the Classic tab.
2. Open `apps/web/src/content/portfolio.ts`.
3. Find `schoolTown` or one of the course names and change a word.
4. Save (`Ctrl + S`). The browser updates within a second.
5. Change it back.

That file holds almost all of the words on the site; see [Change the text](05-change-text.md).

## Before you send changes to GitHub

Run these three checks. They catch most mistakes before visitors ever see them:

```sh
pnpm typecheck   # finds code that uses something the wrong way
pnpm test        # runs the automatic tests
pnpm build       # proves the final site can be made
```

Then save and send your work:

```sh
git add -A
git commit -m "Describe what you changed"
git push
```

The push publishes the site automatically; see [Publish online](07-publish-online.md).

Next: [How the website works](02-how-it-works.md)
