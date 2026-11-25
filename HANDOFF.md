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
- `lib/model.ts`: logistic regression scorer is real code; **weights are a mock** (`FEATURES`, `BIAS`, `MODEL_CARD.status = "provisional"`). UI says so.
- `lib/data.ts`: seed diary (2 dose days, 11 home spirals, 2 UCI stand-ins), `assessDay` wearing-off rule, summaries. **Mock:** the UCI records are synthetic (`traceForTest` synthesizes every trace from `generator`).
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

## 5. Definition of done

- Deployed on Vercel at https://volutra.vercel.app and the README demo link works.
- The 90-second flow above runs end to end on seed data, cold, on a fresh browser.
- UCI replays are real recordings, and the model card shows a measured subject-wise CV balanced accuracy.
- Wow moment rehearsed twice on the deployed URL (desktop and phone).
- Devpost form filled: title, the five description headings, social impact, screenshots, repo link, demo link, team roles.
