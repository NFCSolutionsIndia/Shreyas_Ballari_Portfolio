# 0001 — pnpm monorepo, and React Router 6 for now

Date: 2026-11-03 · Status: accepted

## Decision

One pnpm + Turborepo workspace holds `apps/web`, `apps/api` and `packages/shared`, so a change to a
type or a Zod rule updates the website, the admin forms and the API in one pull request.

Public pages are pre-rendered with vite-react-ssg. The architecture doc names React Router 7, but
every vite-react-ssg release up to 0.9.2 declares `react-router-dom ^6.14.1` as its peer, so the
site uses React Router 6.30 with all `v7_*` future flags on.

## Consequences

- Moving to React Router 7 later is a version bump plus import changes (`react-router-dom` → `react-router`),
  once vite-react-ssg supports it. The alternative is switching pre-rendering to React Router 7's own
  framework mode (`prerender` in `react-router.config.ts`), which replaces vite-react-ssg entirely.
- Routes are lazy (`lazy: () => import(...)`, each page exports `Component`); admin routes are excluded
  from pre-rendering in `vite.config.ts` and carry `noindex`.
