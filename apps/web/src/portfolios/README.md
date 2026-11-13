# portfolios: the three tabs

| Folder | Tab | Start reading at |
| --- | --- | --- |
| `classic/` | Classic, the scroll film | `classic/flow/timeline.ts`, then `classic/flow/Flow.tsx` |
| `creative/` | Creative, the 3D house | `creative/spatial/SpatialPortfolio.tsx` |
| `studio/` | Studio, the page that builds itself | `studio/StudioPortfolio.tsx` |
| `switcher/` | The tab bar at the bottom | `switcher/usePortfolioChoice.ts` |

`src/pages/HomePage.tsx` picks which one to show. Each tab takes its words from
`src/content/portfolio.ts`.

Explained in detail: [docs/guide/04-the-three-tabs.md](../../../../docs/guide/04-the-three-tabs.md)
