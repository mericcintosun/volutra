# Volutra

A person with Parkinson's draws a spiral on a phone or laptop in about 20 seconds. Volutra measures the frequency and strength of their tremor and shows, on one chart, the hour each day when their medication starts to wear off.

> Live demo: https://volutra.vercel.app

## The problem

Levodopa, the main Parkinson's medication, fades between doses. Doctors call it wearing-off. To time doses better, a neurologist relies on the patient's paper on/off diary, filled in from memory. Check-ups come every three to six months, and a ten-minute clinic exam does not see the tremor that starts at 15:00 in the patient's kitchen.

Patients and carers can say "it gets worse in the afternoon". They cannot show a number or a time.

## The solution

Volutra turns a familiar clinical test, the Archimedes spiral, into a reading you can repeat many times a day:

1. The browser records the drawing as timestamped points using Pointer Events, including `getCoalescedEvents()` so fast devices report every sample, not just one per frame.
2. The spiral is unwrapped into polar coordinates and fitted to the ideal line `r = a + bθ` by least squares. What remains is the radial residual, the moment-by-moment wobble.
3. The residual is resampled to 100 Hz, detrended, Hann-windowed and run through a radix-2 FFT written in this repo (`lib/tremor.ts`). The tallest peak between 3 and 12 Hz is the tremor frequency. The RMS energy in that band is the amplitude in millimetres.
4. Each reading lands on a timeline keyed to the dose time. The first two readings at least 30 minutes after the dose set a personal baseline. The first later reading at 1.5 times baseline or more is marked as the point where the dose wears off.
5. A one-page printout and a CSV go to the next appointment.

Nothing is uploaded. All math runs in the tab and the diary lives in `localStorage`.

## Key features

- **Spiral pad with live analysis.** Dominant frequency, band amplitude, spiral fit and the full spectrum within a second of lifting the pen. A warning appears if the device reports fewer than 30 points per second.
- **Recording replay.** Any record redraws itself at the speed it was drawn, then the same pipeline runs again on those points.
- **Dose day timeline.** Amplitude against clock time, the baseline, the 1.5x threshold, a shaded wearing-off band and an event history. Change the dose time and every mark is recomputed.
- **3D coil.** Today's spirals rendered as a fired-clay coil (React Three Fiber). Pick a time and the coil rebuilds from that drawing, its tremor exaggerated three times.
- **Doctor printout and CSV.** Print styles flip the palette to ink on paper.

## How it uses machine learning

The ML piece is a small, inspectable model rather than an API call. The same features the browser extracts (log band amplitude, share of power in the tremor band, distance of the peak from 5 Hz) feed a logistic regression meant to be trained on the [UCI Parkinson Disease Spiral Drawings dataset](https://archive.ics.uci.edu/dataset/395/parkinson+disease+spiral+drawings+using+digitized+graphics+) (62 people with Parkinson's, 15 controls, CC BY 4.0). The output is shown as "resemblance to the dataset's Parkinson's group", always as a secondary signal.

**Honest status of this build:**

- The weights in `lib/model.ts` are hand-set placeholders. The UI labels the score as an uncalibrated preview and claims no accuracy figure. The training script with subject-wise cross-validation is the next milestone, and its balanced accuracy will be reported here as measured, whatever it turns out to be.
- The two "UCI replay" records are synthetic stand-ins shaped like the dataset's static spiral tests. The home diary is also synthesized from per-record parameters (`lib/data.ts`) so every number on screen comes out of the real pipeline.
- The model would learn from Wacom tablet recordings. Finger and trackpad drawings come from a different distribution, which is why frequency and amplitude stay the primary output.

## Technologies

- Next.js 15 (App Router), TypeScript in strict mode, Tailwind CSS v4
- Canvas 2D and Pointer Events with `getCoalescedEvents()`
- Hand-written signal processing: polar unwrap, least-squares fit, linear resampling, Hann window, radix-2 FFT
- Logistic regression in plain TypeScript
- three.js with React Three Fiber and drei for the 3D coil
- SVG charts, `localStorage`, print CSS
- Deployed on Vercel

## Target users

- People with Parkinson's on levodopa whose neurologist is adjusting dose timing
- Carers who keep the on/off diary for them
- Neurologists and Parkinson's nurses who want a dated, numeric record instead of a recollection

## Social impact

More than ten million people live with Parkinson's. For many of them, dose timing decides whether the afternoon is usable. Volutra needs no app install, no account and no special hardware, works in any modern browser, and keeps health data on the device. A clearer picture of when a dose fades can shorten the trial-and-error of adjusting it.

Volutra is a measurement diary, not a diagnostic tool.

## Quickstart

```bash
npm install
npm run dev
# open http://localhost:3000
```

No environment variables are needed (see `.env.example`). `npm run build` produces the production bundle that Vercel deploys.

Routes:

- `/` overview of today's diary and the 3D coil
- `/spirals` every record, with filters and search
- `/spirals/[id]` one record, replayed and analysed; `/spirals/new` is the drawing pad
- `/activity` the dose day timeline, history, printout and CSV

## What we would build next

- The UCI conversion and training script: subject-wise k-fold cross-validation, class-balanced loss, weights written to JSON and loaded by the browser.
- Replace the two stand-in replays with real converted recordings.
- Multi-dose days, so the threshold restarts after every dose.
- A week view that shows whether the wearing-off hour drifts.
- Validation against clinician-rated tremor scores before any claim beyond "measurement diary".

## AI use

> We used AI coding assistants for scaffolding and boilerplate. Architecture, product decisions, and final code review are our own.

(Adjust this section to the hackathon's disclosure rules before submitting.)
