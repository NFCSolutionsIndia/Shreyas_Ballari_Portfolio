# portfolios: the three tabs

| Folder | Tab | Start reading at |
| --- | --- | --- |
| `creative/` | Creative, the 3D house (opens first) | `creative/spatial/SpatialPortfolio.tsx` |
| `classic/` | Classic, the scroll film | `classic/flow/timeline.ts`, then `classic/flow/Flow.tsx` |
| `studio/` | Studio, the page that builds itself | `studio/StudioPortfolio.tsx` |
| `switcher/` | The tab bar at the bottom, and which tab opens first | `switcher/usePortfolioChoice.ts` |

`src/pages/HomePage.tsx` shows the chosen tab. Every tab takes its words from
`src/content/portfolio.ts`. Explained in [docs/1-how-it-works.md](../../docs/1-how-it-works.md).
