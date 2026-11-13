# 5. Change the text

Almost every word on the site comes from **one file**:

> `apps/web/src/content/portfolio.ts`

Change it there, and every tab that uses it updates. You rarely need to touch the tab code to fix
a fact.

## What is in the file

| Name in the file | What it holds | Used by |
| --- | --- | --- |
| `profile` | Name, grade, school, school town, state, portrait | Every tab |
| `subjects` | Subjects he loves | Classic, Creative |
| `courses` | AP and honors courses | Classic, Creative |
| `languages` | JavaScript, Python, Java | Classic, Creative |
| `stockApp` | The AI trading app concept | Classic, Creative |
| `achievements` | Awards, scores, programs and certificates | Every tab |
| `percentiles` | PSAT and MAP percentiles | Classic, Creative |
| `activities`, `volunteering`, `goals` | What he does outside class, and his goals | Classic, Creative |
| `oncure` | The Oncure research concept, its video and its sections | Every tab |
| `resume` | Resume summary | Classic, Creative |
| `resumeExtra` | Headline, scores and skill groups from the latest resume | Classic |
| `faq` | Questions and answers | Not shown yet (ready for a future FAQ page) |

## How a value looks

```ts
export const profile = {
  name: 'Shreyas Ballari',
  grade: 'Junior',
  school: 'Fulton Science Academy',
  schoolTown: 'Alpharetta, Georgia',
};
```

- Text goes between quotes: `'like this'`.
- If the text itself contains an apostrophe, use the curly one (`’`), as the file already does:
  `'Principal’s Honors List'`.
- Keep the comma at the end of each line.
- A list is written between square brackets: `['JavaScript', 'Python', 'Java']`.

## Adding an award

Add one line to `achievements`:

```ts
{ id: 'science-fair', kind: 'Award', title: 'Regional Science Fair', value: '1st place', when: '2026', detail: 'First place at the regional science fair, 2026.' },
```

- `id` must be unique, lowercase, with dashes instead of spaces. It also names the certificate
  picture: `public/assets/certificates/science-fair.jpg` (see the next page).
- `kind` is one of `Score`, `Award`, `Honor`, `Program`, `Certificate`.
- The issuer printed on the certificate card is set in the `ISSUER` list in
  `src/portfolios/classic/flow/sequel.tsx`.

## Confirmed, draft and placeholder text

Some text is wrapped in a label:

| Wrapped in | Meaning |
| --- | --- |
| `confirmed('...')` | A fact the family confirmed |
| `draft('...')` | Wording written around confirmed facts; Shreyas should read and approve or rewrite it |
| `placeholder('...')` | Not supplied yet; shows on the site with a visible "To be supplied" label |

To replace a placeholder, change `placeholder('...')` to `confirmed('your real text')`.

## Text that lives in a tab's own code

A few headings and short lines belong to one design and are written in that tab's files, for
example the "Three languages, and the tools around them." heading in
`portfolios/classic/flow/sequel.tsx`. To find any sentence, press **Ctrl + Shift + F** in VS Code
and search for a few of its words.

## Check your change

Save, look at the page in `pnpm dev`, then run `pnpm typecheck`. A missing quote or comma shows a
red underline in VS Code and an error in the check.

Next: [Images, videos and 3D models](06-images-and-videos.md)
