# CLAUDE.md: Volutra agent rules

`IDENTITY.md` is law for every color, font, route, layout and animation. Read it first. Then `HANDOFF.md` and `DEMO.md`.

## Commands (this repo uses npm)

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # must stay green after every change
npm run seed    # validates and normalizes fixtures/seed-diary.json (idempotent)
```

## Stack pitfalls

- Next.js 15: `params` in pages, layouts, metadata and route handlers is a Promise. Always `const { id } = await params`.
- Kit imports (`three`, `@react-three/fiber`, `@react-three/drei`) live only in files that start with `"use client"`.
- The Canvas loads through `next/dynamic` with `ssr: false`, inside a client component, with the SVG fallback kept working without WebGL. `frameloop="demand"`.
- `process.env` is not readable in client components for keys without the `NEXT_PUBLIC_` prefix. `ADAPTER_MODE` is read server-side only, in `lib/config.ts`; `lib/adapter.ts` selects the fake or real adapter from it. Tests: `npm test`. Proof run: `npm run proof`.
- Data flows: `fixtures/seed-diary.json` to `lib/data/seed.ts` to `lib/data.ts` to `lib/adapter.ts`. Pages call `getAdapter()`; they never import diary literals.
- Tailwind v4: tokens live in `app/globals.css`. No `tailwind.config`. No hex in components.

## Never touch

`node_modules/`, `.next/`, `.farm-*` (except writing `.farm-commits.json`), `public/illustrations/*`, `app/opengraph-image.tsx`. Never commit or write secrets. Never add pages outside `/`, `/spirals`, `/spirals/[id]`, `/activity`. No theme toggle. No second animation library.

## Vercel guardrails

- Grep `writeFile\|appendFile\|mkdirSync` in `app lib components`, which must give no match. Grep `useSearchParams`, and any hit must sit under `<Suspense>`. No `output: "export"` in `next.config.ts`, no `export const runtime = "edge"`. Every `process.env.X` has `X=` in `.env.example`.
- No fixed pixel width on a container (`max-w-[360px]` on the pad is a max-width and allowed). Every `<table>` and chart SVG sits in an `overflow-x-auto` wrapper.
- `tsconfig.json` has `"strict": true`. `.gitignore` has `.env*` and `!.env.example`. No real-looking secret is in any file.

## Product stance

Every user-facing line keeps the "measurement diary, not a diagnostic tool" stance. Never present the provisional model as trained, and never print an accuracy number that was not measured.

## Writing rules

- No em dash, no en dash, no double-hyphen used as a dash.
- Banned words: seamless, leverage, empower, revolutionize, streamline, game-changer, cutting-edge, delve, robust, unlock, elevate, harness, effortless.
- Plain human tone, concrete numbers.

## Context

when compacting preserve the list of modified files and test commands
