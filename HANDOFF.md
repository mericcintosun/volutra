# HANDOFF: Volutra

You are picking up a working Next.js 15 scaffold. Read this file, then `IDENTITY.md`, then start on the mission below. Keep `npm run build` green after every change.

## 1. Context

**Product:** Volutra. A person with Parkinson's draws a spiral on a phone or laptop in about 20 seconds; Volutra measures tremor frequency and strength and shows on one chart the hour each day when the levodopa dose starts wearing off.

**Plain pitch:** You open the site and trace the guide spiral on screen. A few seconds later a result card shows how fast and how strong the tremor in your hand is. You mark the time you took your medication once, then draw a few more spirals through the day. By evening you have one chart showing the hour the dose started to fade, and a page you can take to your neurologist.

**Hackathon:** ML Empowerment Build Challenge 4.0 (Devpost, online, students only, teams of 1 to 5, solo allowed).
**Deadline:** 1 December 2026, 21:00 Pacific Time (the rules page says 21:00 PT, the schedule says 23:45 PST; plan for 21:00).
**Target track:** 1st place ("For the best project!"). The same submission enters Top 10 Finalists automatically. No cash prizes. The Adaption credits row is a free credit link, not a competition, and is not targeted.

**Judging:** Technical Implementation 30%, Creativity and Innovation 20%, Real-World Impact 20%, Design and UX 15%, Presentation and Documentation 15%.

**Submission requirements:**
- A project that solves a real-world problem or creates positive social impact (web is fine)
- Project title
- Detailed description covering: problem statement, solution overview, key features, technologies used, target users (README already has these exact headings plus a social impact section; copy them into Devpost)
- At least one file showing functionality or design (screenshot or video)
- GitHub repo link (optional, recommended)
- Live demo link for web apps (if possible)
- Team members and roles (solo accepted)

## 2. Current state

Identity: see IDENTITY.md (direction D5, structure S4, archetype L6, kit K6)

Kiln palette (espresso ground, clay accent, olive second), Zilla Slab display plus Karla body, app shell with a persistent left rail that becomes a bottom bar on mobile, `volutra-rise` entrance, React Three Fiber kit.

### Routes

| Route | File | What it shows |
| --- | --- | --- |
| `/` | `app/page.tsx` | Overview: today's six seeded spirals, the 3D coil, the day's verdict in sentences |
| `/spirals` | `app/spirals/page.tsx` | All 13 records with day filter, threshold toggle, search |
| `/spirals/[id]` | `app/spirals/[id]/page.tsx` | One record replayed at recorded speed plus its analysis; `id = new` is the live drawing pad (the rail CTA) |
| `/activity` | `app/activity/page.tsx` | Dose day: timeline chart, wearing-off band, readings table, event history, print and CSV, editable dose time |

All three sections are in the rail (`components/app-rail.tsx`); the rail's single CTA "Draw a spiral" goes to `/spirals/new`.

### File map

- `lib/tremor.ts`: REAL. Polar unwrap, least-squares `r = a + bθ`, resample to 100 Hz, detrend, Hann window, radix-2 FFT, peak with parabolic interpolation, band RMS by Parseval, spectrum, plus `synthesizeTrace` (seed traces) and `coilPath` (3D geometry).
- `lib/model.ts`: logistic regression scorer; loads `lib/model-weights.json` (provisional until `npm run proof` trains it, see Phase 2).
- `lib/data.ts`: seed diary (2 dose days, 11 home spirals, 2 UCI stand-ins), `assessDay` wearing-off rule, `createDiary` summaries. `traceForTest` returns a converted recording when the record has one, otherwise synthesizes from `generator`.
- `lib/local-diary.ts`: localStorage for saved drawings and dose-time overrides.
- `components/spiral-pad.tsx`: canvas, guide spiral, pointer capture with `getCoalescedEvents`, real-time replay.
- `components/spiral-session.tsx`: core screen (pad + result + save).
- `components/result-card.tsx`: readings, spectrum SVG, model similarity bar.
- `components/today-coil.tsx` + `components/coil-canvas.tsx`: the K6 3D coil (dynamic import, `ssr: false`, error boundary, WebGL check, SVG fallback).
- `components/spiral-index.tsx`: list filters. `components/dose-timeline.tsx`: timeline, table, history, CSV, print.
- `components/ui/*`: shadcn primitives restyled for kiln (matte, LINE borders, 0.375rem, fired bottom edge on primary buttons, `segment` button variant, `olive/ok/warn/bad` badges).
- Brand: `public/logo.svg`, `app/icon.svg`, `app/opengraph-image.tsx`, `public/illustrations/scene-1..3.svg` (slots: scene-1 coil fallback on `/`, scene-2 on `/spirals`, scene-3 on `/activity`).

### Kit signature interactions

- **Shipped (1):** one orbitable 3D object on the first screen. `TodayCoil` builds a coil of instanced cylinders from the selected seed spiral's real trace; the time buttons swap the record and the coil rebuilds. `frameloop="demand"`, all text in HTML.
- **Remaining (2):** make the object react to live product state: after a capture on `/spirals/new` (or a dose-time change on `/activity`), show the user's own coil and tint the tile toward BAD when the reading is past threshold.
- **Remaining (3):** a step-linked camera move between two viewpoints (top-down "drawing" view to a low side view that shows wobble height), driven by the replay progress or by the day picker.

### One-mark proof (from `components/app-rail.tsx`)

```tsx
<Link href="/" className="flex items-center gap-2.5">
  <BrandMark size={28} />
  <span className="font-display text-xl font-semibold tracking-tight">Volutra</span>
</Link>
```

## 3. Mission (in order)

1. **Verify the pipeline numbers (0.5 h).** Run the app, open each seed record, check computed Hz and mm are close to each record's `generator` values (tremorHz, tremorMm). The wearing-off flags must land at 14:40 on 24 Nov and 15:10 on 23 Nov. If a margin flips, adjust the generator values, not the rule.
2. **Real UCI replays (2 h).** Download UCI 395, confirm the column format (X; Y; Z; Pressure; GripAngle; Timestamp; Test ID) and the timestamp units, then write `scripts/convert-uci.mjs` that extracts static spiral tests (Test ID 0) for one Parkinson's and one control subject into `data/uci/*.json` (mm, seconds, centered). Swap the two `uci-*` records in `lib/data.ts` to load those points. Done = `/spirals/uci-pwp-sst-07` replays a real recording and shows a peak in the 4 to 6 Hz range; README notes which subjects were used.
3. **Train the model (2.5 h).** `scripts/train-model.mjs`: run the same feature extraction over every static spiral test, class-balanced logistic regression (gradient descent is fine), subject-wise k-fold CV, report balanced accuracy, write `lib/model-weights.json`. Load it in `lib/model.ts`, set `MODEL_CARD.status = "trained"`, `balancedAccuracy`, `folds`. Done = the result card prints the measured number. Report whatever comes out.
4. **Dose timeline polish (1.5 h).** Second dose per day restarts the baseline; local "Your device" days get a proper label; seed day stays the demo default.
5. **Kit signatures 2 and 3 (1.5 h)** as described above.
6. **Printout (0.5 h).** Check the print preview fits one A4 page with chart, table and the "not a diagnostic tool" line.
7. **Wow moment rehearsal (0.5 h).** Open `/spirals/uci-pwp-sst-07`, press Replay: the real tablet spiral redraws itself and the spectrum peaks near 5 Hz. Then draw your own on `/spirals/new`: the spectrum stays flat. Tune replay speed only if the 20 s recording drags in the video (a 2x toggle is acceptable if labelled).
8. **Docs and submission (1.5 h).** Screenshots, README model numbers, 90-second video (builder records it), Devpost form with the five required headings.

90-second demo flow: paper diary problem (0 to 15 s), draw a spiral and read the card (15 to 40 s), replay the UCI Parkinson's recording, peak rises, similarity bar and CV figure (40 to 62 s), `/activity` with the 08:00 dose and the 14:40 band (62 to 80 s), print for the neurologist, "nothing leaves the device" (80 to 90 s).

## 4. Constraints

- Next.js 15 App Router, TypeScript strict, Tailwind v4 (no tailwind.config), Vercel deploy, no server routes needed, no runtime file writes.
- `IDENTITY.md` is law for every color, font, route, layout and animation. Colors only through tokens in `app/globals.css`; no raw hex in components (the 3D scene and canvas read CSS variables at runtime). Radius stays 0.375rem. The rail holds the only CTA; no marketing hero; no second nav in a header.
- Kit packages only inside `"use client"` files; the Canvas loads through `next/dynamic` with `ssr: false`; keep the SVG fallback working without WebGL; honor reduced motion.
- Every user-facing line keeps the "measurement diary, not a diagnostic tool" stance. Never present the provisional model as trained, never print an accuracy number that was not measured.
- Copy style: no em or en dashes, no double-hyphen dashes, no AI-cliche vocabulary (seamless, leverage, empower, robust, unlock and friends), plain human tone, concrete numbers.
- Scope discipline: if something threatens the 1 December deadline, cut scope (signature 3, week view) before polishing.
- `npm run build` must pass after every change.

## Phase 1: seams on the scaffold

### Goal
Add the seams later phases depend on (DEMO.md, CLAUDE.md, seed fixture, `ADAPTER_MODE` adapter, typed API stubs, loading/empty/error surfaces) without changing any visible behavior.

### Status
All five slices written. Not built or run: the agent had no shell. `npm run build`, `npm run seed` twice, and the 14:40 / 15:10 flag check are for the runner and the human.

### Decisions
- **Fixture JSON as the seed source.** `fixtures/seed-diary.json` holds person, dose days and 13 tests with the original generator values (the only change is `5.0` written as `5`, same number). `lib/data/seed.ts` casts it through `SeedDiary`; `lib/data.ts` keeps every public name and the pure helpers, and re-exports the types from `lib/types.ts`.
- **`ApiResponse<T>`** = `{ data, mode: "fake" | "real", source }`. `/api/spirals` returns `TestSummary[]`, `/api/spirals/[id]` returns `{ test, summary }` or 404 with `data: null`, `/api/days` returns each `DoseDay` with its `tests` summaries. Pages call `getAdapter()` directly and never fetch their own API.
- **Weights JSON shape for Phase 2.** `ModelWeights` in `lib/types.ts`: `{ status, features: [{ name, mean, std, weight }], bias, balancedAccuracy, folds }`. `lib/model.ts` maps each feature `name` to an extractor (`EXTRACTORS`) and throws on an unknown name, so the training script must keep the three names exactly. The provisional file is `fixtures/model-weights.provisional.json` (first mean is ln(0.3)); Phase 2 writes `lib/model-weights.json` and swaps the import in `lib/model.ts`.
- `getAdapter()` returns `fakeAdapter` for both modes until Phase 2 adds the real branch.
- The rail's brand strip is now a `<header>` element (landmark for the mobile top strip); styling unchanged.

### Failed attempts
None.

### Files changed
Created: `DEMO.md`, `CLAUDE.md`, `lib/types.ts`, `lib/data/seed.ts`, `lib/adapter.ts`, `fixtures/seed-diary.json`, `fixtures/model-weights.provisional.json`, `scripts/seed.mjs`, `app/api/spirals/route.ts`, `app/api/spirals/[id]/route.ts`, `app/api/days/route.ts`, `app/loading.tsx`, `app/spirals/loading.tsx`, `app/spirals/[id]/loading.tsx`, `app/activity/loading.tsx`.
Edited: `lib/data.ts`, `lib/model.ts`, `package.json`, `.env.example`, `app/page.tsx`, `app/spirals/page.tsx`, `app/spirals/[id]/page.tsx`, `app/activity/page.tsx`, `app/error.tsx`, `app/not-found.tsx`, `components/spiral-index.tsx`, `components/dose-timeline.tsx`, `components/result-card.tsx`, `components/app-rail.tsx`, `HANDOFF.md`.

### Commands run
None, agent has no shell.

### Open questions
- `CLAUDE.md` must list the banned words, so a repo-wide banned-word grep hits that one line by design.
- `package-lock.json` was already modified before this phase; left untouched.

### Next best step
Phase 2: download UCI 395, write `scripts/convert-uci.mjs` into `data/uci/*.json`, add the real adapter branch, train the weights into `lib/model-weights.json`, create `npm run proof` and `.farm-live.json`, record the deploy URL here.

## Phase 2: real UCI recordings and a trained model

### Goal
Make DEMO.md step 3 real: `/spirals/uci-pwp-sst-07` replays a real UCI 395 Parkinson's recording, `/spirals/uci-ctl-sst-02` a real control recording, and the similarity bar uses weights trained on UCI 395 with a measured subject-wise CV balanced accuracy.

### Status
All five slices written. Nothing was built, run or downloaded: the agent had no shell. The mechanism that went real is the UCI replays plus the trained weights, and both are produced by `npm run proof` (convert, train, tests, latency). Until the runner's proof run is committed, `data/uci/manifest.json` is `not-converted` and `lib/model-weights.json` is a copy of the provisional weights; the build passes on those and the UI says it is showing stand-ins.

What stays on fixtures: the 11 home spirals, the two dose days, and the two UCI stand-ins (the fake adapter always, the real adapter until a proof run).

Env keys: none. `.farm-live.json` has `requiredEnv: []` and `optionalEnv: []` because the mechanism is in-browser math over public data, so no secret is needed. `ADAPTER_MODE` is a non-secret switch the runner sets to `real`.

### Decisions
- **Config and errors.** `lib/config.ts` is the only reader of server env (`ADAPTER_MODE`) and holds the fetch, CV and training constants. `CORE_LOG` lives in `lib/log.ts` and is re-exported by config, so `lib/model.ts` (bundled into the client through `result-card`) can log without importing config. `lib/errors.ts` holds the `ErrorCode` union and one-sentence `HINTS`.
- **Adapter split.** `lib/adapter-fake.ts` (source `seed`), `lib/adapter-real.ts` (source `uci-395`, or `uci-395-pending` with the stand-ins when the manifest fails zod or is not converted), `lib/adapter.ts` only selects. `DiaryAdapter`, `DiarySource` and `AdapterMode` moved to `lib/types.ts` and are re-exported from `lib/adapter.ts`.
- **createDiary(tests).** `lib/data.ts` builds the lookup and summary helpers over any record list; the old exported names are bound to the seed diary, so `today-coil`, `dose-timeline` and `spiral-index` did not change. Analysis is memoized by trace content (`lib/cache.ts`, FNV-1a), synthesized traces by record object, so fake and real records with the same id never collide.
- **Source line.** The detail page computes the trace and the line under the pad on the server from `adapter.source` and passes them to `SpiralSession`, which no longer imports `@/lib/data`. Home records get "Sample data: a synthesized home spiral from the seed diary." (not in the spec table, added for honesty).
- **Converter.** Zip read with `node:zlib` and the central directory (nested zips recursed). Group from the folder name (`control` or `parkinson`). Timestamps in ms when the median spacing is over 1. Y flipped (tablet origin assumed top-left). Centre: grid search of plus or minus 15 units in 64 by 64 steps around the first pen-down point (or the bounding-box centre if that fits better), on at most 600 sampled points per file to keep the proof under 2 minutes. One scale for all files: median 95th-percentile radius maps to `GUIDE_MAX_RADIUS_MM` (45 mm, now exported from `lib/tremor.ts`). Points are rounded and re-analysed so the proof numbers match the UI. If the download fails, `.cache/uci/extracted/` is used when present.
- **Training.** Features from `lib/features.ts` (moved out of `lib/model.ts`). Class-balanced logistic regression, gradient descent from zero, 4000 iterations, rate 0.05; 5-fold stratified folds by sorted file name within each class; balanced accuracy on pooled out-of-fold predictions; refit on all and validated with zod before writing. Each file counts as one subject.
- **Model loading.** `lib/model.ts` validates `lib/model-weights.json` with zod and checks every feature name; on failure it falls back to `fixtures/model-weights.provisional.json` instead of throwing. `MODEL_CARD.subjects` is null until training, and the result card prints accuracy only when `status === "trained"` and `balancedAccuracy !== null`.
- **API edge.** `/api/spirals/[id]` parses the id with `SpiralIdSchema` before `getAdapter()`; 400 `invalid_input` and 404 `not_found` return `{ error, hint }`. All three routes return `source: adapter.source`.
- **No `prompts/` folder.** Nothing in Volutra generates text; every sentence around a number is composed by code.
- `lib/data/seed.ts` now imports with relative paths so tsx can load it in tests and scripts.

### Failed attempts
None. (Nothing could be executed, so the zip reader, the converter and the training script are untested until the proof run.)

### Files changed
Created: `lib/config.ts`, `lib/log.ts`, `lib/errors.ts`, `lib/schemas.ts`, `lib/cache.ts`, `lib/features.ts`, `lib/adapter-fake.ts`, `lib/adapter-real.ts`, `lib/model-weights.json`, `data/uci/manifest.json`, `scripts/lib/unzip.ts`, `scripts/lib/fetch.ts`, `scripts/convert-uci.ts`, `scripts/train-model.ts`, `scripts/proof.ts`, `tests/core.test.ts`, `tests/fixtures/uci-sample.txt`, `.farm-live.json`, `.farm-commits.json`.
Edited: `lib/adapter.ts`, `lib/data.ts`, `lib/data/seed.ts`, `lib/model.ts`, `lib/types.ts`, `lib/tremor.ts`, `app/api/spirals/route.ts`, `app/api/spirals/[id]/route.ts`, `app/api/days/route.ts`, `app/spirals/[id]/page.tsx`, `components/spiral-session.tsx`, `components/result-card.tsx`, `package.json`, `.env.example`, `.gitignore`, `README.md`, `DEMO.md`, `CLAUDE.md` (line 19 only), `HANDOFF.md`.

### Commands run
None, agent has no shell.

### Open questions
- The UCI 395 tablet coordinate units and the exact folder layout inside the archive are assumed from the dataset description, not checked. The converter logs the folder names it finds; if the centre search window (plus or minus 15 units) is wrong for the real units, replays will look off-centre and the peak may move. Check the `[core] uci convert ... unitsPerMm=` log line.
- If no Parkinson's file peaks in 4 to 6 Hz, the converter writes nothing and the README says why. The rule is not relaxed silently.
- The test "patientGroupSimilarity increases with amplitude" runs against whatever weights are committed. If training ever gives the amplitude feature a negative weight, that test fails; report it, do not edit the weights.
- `lib/brand-files.ts` reads `NEXT_PUBLIC_BRAND_FILES` (pre-existing, build-time, not a secret). It was left there so client code does not import `lib/config.ts`.
- `.gitignore` has `.farm-*`, so `.farm-live.json` and `.farm-commits.json` are ignored by git unless the runner adds them with force.

### Manual checklist (needs a person)
- Confirm hackathon eligibility (students only) for every team member.
- Team members and roles for the Devpost form.
- After the proof run: open `/spirals/uci-pwp-sst-07`, press Replay twice, and check the peak is in 4 to 6 Hz and the numbers match both times.
- Recorded from the committed proof run: subject-wise CV balanced accuracy 0.661 over 61 Parkinson's and 15 control subjects; replay files `H_p000-0043.txt` (Parkinson's, peak 5.76 Hz) and `C_0002.txt` (control).
- Clear this device before recording (the button under the event history on `/activity`), after `npm run demo:reset`.

### Next best step (Phase 3)
Dose timeline polish: a second dose restarts the baseline, local "Your device" days get a proper label, and the seed day stays the demo default. Before that, read the proof blocks in README and record the measured balanced accuracy and the chosen subject files here.

## Phase 3: demo path on real data with a hardened device diary

### Goal
Every DEMO.md step runs on the real adapter with a fallback in the same file. Step 5 (step 6 since Phase 4) moves forward: a saved drawing lands once on a labelled "Your device" day, a second dose closes the first dose's window, the seeded 24 Nov day with its 14:40 band stays the default, and "Clear this device" plus `npm run demo:reset` return everything to the demo start state.

### Status
All five slices written; nothing cut. Not built or run: the agent had no shell, so `npm run build`, `npm test`, `npm run proof` and `npm run demo:reset` are unverified and belong to the runner. Still on fixtures: the 11 home spirals and both dose days (`fixtures/seed-diary.json`, 13 tests, 2 dose days, unchanged).

### Decisions
- **Store decision table.** Chosen row: "none" on the server, `localStorage` in the browser through the single wrapper `lib/local-diary.ts`. Rejected: Vercel KV and Postgres. Reason: no DEMO step needs data shared across devices or visitors, and "nothing leaves the device" is a product promise in the README, the pad copy and the closing line of the demo. A server store would break that promise and add an env key and a dependency.
- **Idempotent save.** `saveLocalTestOnce(analysis, key)` with `key = hashTrace(points)` (`lib/cache.ts`). A second press with the same trace returns the stored entry and writes nothing. The 60-entry cap stays. Entries now carry `key`.
- **Validated reads.** `LocalTestSchema`, `LocalTestsSchema` and `DoseClocksSchema` in `lib/schemas.ts`. A store that fails zod is read as empty and logs `[core] local diary parse failure, starting empty` (via `lib/log.ts`). Consequence: readings saved before this phase have no `key` and fail the schema, so a browser that saved under Phase 2 starts empty once. The key name stayed `v1` (`LOCAL_DIARY_VERSION`) as the spec asks; the old data is not migrated because there is no schema to migrate on the server and the device data is demo data.
- **Second dose window.** `assessDay(points, doseClock, ratio, nextDoseClock?)` uses `[dose + 30, nextDose)`. Seed check before the change: 24 Nov has no reading at or after 16:30. 23 Nov has one, 17:05 (0.5 mm, after the 16:30 dose), so the spec premise "no seeded reading at or after 16:30" is false for that day. The 15:10 flag still cannot move: the rule takes the first crossing in time, 15:10 comes before 16:30, and the baseline readings (08:55, 10:40) are inside the window. So `assessDay` was not reverted and no seed number was edited. `createDiary`, `app/page.tsx` and `DoseTimeline` all pass `nextDoseClock`; device days pass `""` so the window stays open.
- **Device days.** Label `Your device, <Wed> <25> <Nov>` built from the ISO day with fixed arrays and `Date.UTC` (no locale). Listed after the seed days, newest first. The default selection is `initialDay` from `?day=` or the first seed day (24 Nov); the empty fallback is still `allDays[0]`.
- **URL state.** `/activity?day=YYYY-MM-DD` is read in the server page (awaited `searchParams`, regex checked) and written with `router.replace(..., { scroll: false })` from the day picker. `/spirals` filters are `?day=` (a diary day or `uci`), `?past=1`, `?q=`, read with `useSearchParams` under `<Suspense fallback={<SpiralsSkeleton />}>`. The search box is uncontrolled (`defaultValue`) so typing never waits on the router; one effect copies the URL value back into the box only when the box is not focused (Clear filters, back button).
- **Triad.** `components/route-states.tsx` exports `RouteSkeleton`, `ErrorState`, `EmptyState` (no directive: no hooks, usable from server and client files). The "No spirals match" empty state uses the link `/spirals` as "Clear filters", which drops every param.
- **Adapter fallback.** `getAdapter()` catches a throw from `getRealAdapter()`, logs `[core] real adapter failed, serving seed` and serves `fakeAdapter`.
- **Images.** `SceneSlot` and `BrandMark` now render through `next/image`. SVG sources pass `unoptimized`, PNG uploads go through the optimizer. No `next.config.ts` change was needed because every source is local.
- **demo:reset.** `scripts/demo-reset.mjs` spawns `scripts/seed.mjs` with `execFileSync(process.execPath, [seedPath])`, then exits 1 unless the manifest is `converted` and the weights are `trained`. No migration script: there is no schema. The chain part of the reset checklist is not applicable (plain web app, no wallet, no contracts).
- **Proof.** `scripts/proof.ts` adds a fifth block, `demo-path`, with the measured verdict per seed dose day. README holds a placeholder line between the markers until the runner's proof run rewrites it.

### Failed attempts
None. (Nothing could be executed.)

### Files changed
Created: `components/route-states.tsx`, `app/spirals/error.tsx`, `app/spirals/[id]/error.tsx`, `app/activity/error.tsx`, `scripts/demo-reset.mjs`, `.farm-commits.json`.
Edited: `lib/local-diary.ts`, `lib/schemas.ts`, `lib/data.ts`, `lib/adapter.ts`, `components/spiral-session.tsx`, `components/dose-timeline.tsx`, `components/spiral-index.tsx`, `components/scene-slot.tsx`, `components/brand-mark.tsx`, `app/page.tsx`, `app/error.tsx`, `app/loading.tsx`, `app/spirals/page.tsx`, `app/spirals/loading.tsx`, `app/spirals/[id]/loading.tsx`, `app/activity/page.tsx`, `app/activity/loading.tsx`, `tests/core.test.ts`, `scripts/proof.ts`, `package.json`, `README.md`, `DEMO.md`, `HANDOFF.md`.

### Commands run
None, agent has no shell.

### Open questions
- Does the runner want old Phase 2 device entries (no `key`) migrated instead of dropped? Today they fail zod and the device diary starts empty once. Bumping `LOCAL_DIARY_VERSION` to `v2` would make that explicit; not done because the spec fixes `v1`.
- `router.replace` on `/activity` refetches the server component (the page reads `searchParams`), one small request per day click. If that is visible on a slow phone, switch the write to `window.history.replaceState`, which Next 15 also syncs.
- With the `Suspense` boundary, the static HTML of `/spirals` shows the skeleton in place of the list until JavaScript runs. Reading `searchParams` in the page and passing the filters down would make the list server-rendered; left as is because the spec asks for `useSearchParams` under `Suspense`.
- HANDOFF.md line 91 (section 4, written before this phase) lists banned words on purpose, the same way `CLAUDE.md:40` does, so a banned-word grep over HANDOFF.md hits it.
- `.farm-commits.json` is under the `.farm-*` ignore rule, as Phase 2 noted.

### Next best step (Phase 4)
Run `npm run build`, `npm test` and `npm run proof`, confirm the `demo-path` block reads 14:40 (400 min) and 15:10, then walk DEMO.md on the live URL in a private window three times after `npm run demo:reset`. Then the printout check (one A4 page) and the wow-moment rehearsal before kit signatures 2 and 3 in Phase 5.

## Phase 4: spectrum comparison, prize-track docs, mobile polish, security pass

### Goal
Put the second half of the wow moment on screen (DEMO step 4: "Compare with my last drawing" draws the presenter's spectrum as an olive line on the UCI Parkinson's chart), document the prize tracks, make every demo control 44px, add OG and Twitter meta and a short intro on `/`, then run the web security pass and write `SECURITY.md`.

### Status
- **A1 touch targets and overflow: done.** `components/ui/button.tsx:24,28` default `h-11`, icon `h-11 w-11`; `components/ui/input.tsx:10` `h-11`. Every `size="sm"` on the demo path removed (day buttons and "Clear this device" in `dose-timeline.tsx`, filter buttons in `spiral-index.tsx`, coil time buttons in `today-coil.tsx`, the empty-state CTA in `route-states.tsx`). Rail section links carry `min-h-11 min-w-11`; the bottom bar (`fixed inset-x-0 bottom-0 ... md:static`) still holds Overview, Spirals, Dose day and "Draw a spiral". Overflow: the timeline SVG (`dose-timeline.tsx:266`), the readings table (`:283`) and the spectrum SVG (`result-card.tsx`) were already under `overflow-x-auto`. Long strings: the UCI source line got `break-all` (below sm) plus `title`, the list note `truncate` plus `title`, the compare legend label `break-all` plus `title`. The CSV file name is never displayed and record ids are not printed on the detail page. Error and not-found pages render inside the layout (only `app/layout.tsx` uses `min-h-screen`).
- **A2 compare: done.** `LastSpectrumSchema` (`lib/schemas.ts`), `writeLastSpectrum`, `readLastSpectrum`, `LastSpectrumUnreadable`, `LAST_SPECTRUM_KEY` (`lib/local-diary.ts`). The session writes the spectrum on every capture (before Save), and the replay footer has "Compare with my last drawing" (outline, default size, enabled when `phase === "done"`; a second press hides it). The detail page passes `fallbackCompare` for `uci-pwp-*` ids. All five microcopy states are in `components/result-card.tsx` (`compareMessage`). DEMO.md steps now run 1 to 7. New test in `tests/core.test.ts`.
- **A3 prize docs: done.** README "Prize tracks" after "Social impact"; `DELIVERY.md` created.
- **A4 meta and intro: done.** `SITE_URL` in `lib/config.ts`; `app/layout.tsx` has `metadataBase`, title default "Volutra: a spiral that times wearing-off", template "%s | Volutra", description of 125 characters, `openGraph`, `twitter.card: "summary_large_image"`. Intro sentence plus two `kiln-underline` links in the `/` header.
- **B0: done (no commit).** Contract front skipped: no `contracts/` directory; Volutra has no chain. Wallet front verified vacuously: grep `eth_requestAccounts|personal_sign|eth_sign|wagmi|ethers|viem|connect\(` over `app`, `components`, `lib` returned zero matches.
- **B1: done.** See the sweep results below. Added "Source on GitHub" to the rail's bottom paragraph with `target="_blank" rel="noopener noreferrer"`.
- **B2: done.** `SECURITY.md` with the four sections.

### B1 sweep results
- Secrets: grep `sk-|PRIVATE_KEY|[0-9a-fA-F]{64}|api[_-]?key` (case-insensitive) over `app components lib public`: zero matches. The only `NEXT_PUBLIC_` key is `NEXT_PUBLIC_BRAND_FILES` (a list of public image names, set in `next.config.ts:17`).
- External links: the only `target="_blank"` is the new rail link, and it carries `rel="noopener noreferrer"`.
- Mixed content: the only `http://` in `app components lib` is the SVG namespace in `app/icon.svg:1` (allowed).
- Forms: no `<form>` and no `action=` in `app components lib`. The `/spirals` search writes the URL with `router.replace`, the dose time writes `localStorage`, and the CSV is a Blob plus `URL.createObjectURL` download (`dose-timeline.tsx`, `downloadCsv`).
- Console: zero `console.` calls in `app` or `components`. The `lib` calls all carry the `CORE_LOG` prefix (`lib/adapter.ts`, `lib/adapter-real.ts`, `lib/local-diary.ts`, `lib/model.ts`).
- Found but unfixed: none of severity above low. Low: `lib/adapter-real.ts:45,56` use `console.log` (server-side, prefixed, counts only); shortest fix is `console.info`, which is not worth churn. No Blockaid warning is expected because no wallet code exists.

### Decisions
- **New key `volutra:last-spectrum:v1`** (pre-approved). The spec fixed this colon-separated name; the older keys use dots (`volutra.local-tests.v1`, `volutra.dose-clock.v1`). Both forms are listed in `SECURITY.md`. Only bins from 0 to 15 Hz are stored (about 150 bins). `LocalTestSchema` and `LOCAL_DIARY_VERSION` are unchanged. `clearDeviceDiary()` now also removes the new key.
- **Read errors.** `readLastSpectrum` throws `LastSpectrumUnreadable` on bad JSON or a zod failure (unlike the other readers, which fall back to empty), so the compare view can show its error line. Writes are wrapped in try/catch so blocked storage never breaks capture.
- **Control fallback.** For `uci-pwp-*` ids the server analyses `uci-ctl-sst-02` through the same adapter and passes `fallbackCompare` with the label "UCI control recording uci-ctl-sst-02". Other records get no fallback, so they show the "empty" line.
- **Loading state.** The storage read runs in a `setTimeout(0)` after setting `"loading"` so the loading line can paint; on most devices it is shown for one frame only.
- **Peak marker** is now `stroke-foreground` at `strokeOpacity={0.5}`; olive means "the comparison line" only on that chart.
- **`SITE_URL`** is a literal `https://volutra.vercel.app` in `lib/config.ts`, imported by `app/layout.tsx` (server). No env key added.
- **Twitter image.** There is no `app/twitter-image.tsx`; crawlers fall back to `og:image`. If the runner's view-source shows no `twitter:image`, the shortest fix is a `twitter-image.tsx` that re-exports the OG image, but that file is new and was not added in this phase.
- **Dropped row.** Adaption credits for everyone, expectedValueUsd null. Not a judged track, and the only real path needs a hosted API key the build cannot hold. Restore path: claim credits by hand; no code change.
- **OG image check (read only).** `app/opengraph-image.tsx` renders "Volutra" and the claim at 1200x630 using IDENTITY hexes (GROUND, SURFACE, LINE, INK, ACCENT, SECOND). It renders in the default `ImageResponse` font, not Zilla Slab, and its `alt` still uses the older title. Both left alone because the file is fenced.

### Failed attempts
None.

### Files changed
Created: `DELIVERY.md`, `SECURITY.md`, `.farm-commits.json`.
Edited: `components/ui/button.tsx`, `components/ui/input.tsx`, `components/app-rail.tsx`, `components/dose-timeline.tsx`, `components/spiral-index.tsx`, `components/today-coil.tsx`, `components/route-states.tsx`, `components/spiral-session.tsx`, `components/result-card.tsx`, `app/spirals/[id]/page.tsx`, `app/layout.tsx`, `app/page.tsx`, `lib/schemas.ts`, `lib/local-diary.ts`, `lib/config.ts`, `tests/core.test.ts`, `scripts/proof.ts` (comment only, step 5 to step 6), `DEMO.md`, `README.md`, `HANDOFF.md`.

### Commands run
None, agent has no shell.

### Acceptance gaps and unverified items (honest list)
- Unverified until the runner: `npm run build`, `npm test` (including the new `LastSpectrumSchema` test), `npm run proof`, and every visual check (360, 768 and 1280 px, print, Lighthouse, live OG image).
- Hex tripwire: `#[0-9a-fA-F]{6}` also hits `app/opengraph-image.tsx:24-36` and `app/icon.svg:2-4`. Both are pre-existing, fenced or brand files, and use IDENTITY hexes only. Strictly, that is a fail of "any hit outside `app/globals.css`"; not changed because the OG file is fenced and the icon must be a standalone SVG.
- Banned-word grep also hits `HANDOFF.md:11`, "ML Empowerment Build Challenge 4.0", the event's proper name. Not changed.
- The rail's "Source on GitHub" link sits in the bottom paragraph, which is `hidden` below md (as before), so on phones the source link is only in README and SECURITY.md.
- Text links in the `/` intro (`kiln-underline`, text-sm) are not padded to 44px; the spec treats them as text links, not buttons.
- `break-all` on the source line applies only below the `sm` breakpoint (above it the line wraps at words inside `max-w-[44ch]`), to avoid mid-word breaks on wide screens.

### Open questions
- Should the compare view also be offered on `/spirals/new` after a capture (comparing with the UCI Parkinson's recording)? Not in scope; it would need a reverse fallback prop.
- The device spectrum is from a finger or trackpad drawing, while the clay curve is a Wacom recording. The legend labels both; amplitude scales are comparable only roughly (README already says UCI amplitude is approximate millimetres).

### Next best step (Phase 5)
Frontend pass: kit signatures 2 (the coil reacts to the live capture, which `volutra:last-spectrum:v1` can feed) and 3 (a step-linked camera move), then visual polish from the live screenshots at 360, 768 and 1280 px.

## 5. Definition of done

- Deployed on Vercel at https://volutra.vercel.app and the README demo link works.
- The 90-second flow above runs end to end on seed data, cold, on a fresh browser.
- UCI replays are real recordings, and the model card shows a measured subject-wise CV balanced accuracy.
- Wow moment rehearsed twice on the deployed URL (desktop and phone).
- Devpost form filled: title, the five description headings, social impact, screenshots, repo link, demo link, team roles.
